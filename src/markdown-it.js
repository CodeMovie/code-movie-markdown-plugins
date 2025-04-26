// https://github.com/markdown-it/markdown-it/blob/master/lib/rules_block/fence.mjs
// https://github.com/markdown-it/markdown-it-container

import { parseArgs, parseOptions, assertLanguage } from "./lib.js";

const START_FRAME_BLOCK_RE =
  /^(?<mark>`{3}`?)(?<lang>[a-zA-Z_-]*) *\((?<args>.*)/;

function readArgs(args, state, nextLine, endLine, pos, max) {
  while (!args.trim().endsWith(")")) {
    nextLine++;
    if (nextLine >= endLine) {
      break; // unclosed args list
    }
    pos = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];
    args += state.src.slice(pos, max);
  }
  args = args.slice(0, -1); // delete trailing ")"
  return { pos, max, nextLine, args };
}

function matchStart(state, startLine, endLine, regExp) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  const matchStart = regExp.exec(state.src.slice(pos, max));

  if (!matchStart) {
    return false;
  }

  const { mark, lang } = matchStart.groups;

  return {
    ...readArgs(matchStart.groups.args, state, startLine, endLine, pos, max),
    mark,
    lang,
  };
}

function matchEnd(mark, pos, max, state, endLine, nextLine) {
  let hasEndMarker = false;
  const END_RE = new RegExp(`^${mark} *$`);
  const from = max + 1; // account for line break
  let to = from - 1;

  while (true) {
    nextLine++;
    if (nextLine >= endLine) {
      break; // unclosed block
    }

    pos = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];

    if (END_RE.test(state.src.slice(pos, max))) {
      to = pos - 1; // account for line break
      hasEndMarker = true;
      break;
    }
  }

  return { hasEndMarker, from, to, nextLine };
}

export function markdownItCodeMoviePlugin(options) {
  const { adapter, languages, addRuntime } = parseOptions(options);
  return function (md) {
    function parseFrame(state, startLine, endLine, silent) {
      const start = matchStart(state, startLine, endLine, START_FRAME_BLOCK_RE);

      if (!start) {
        return false;
      }

      if (silent) {
        return true; // validation mode
      }

      const { mark, lang, args } = start;
      let { pos, max, nextLine } = start;
      const end = matchEnd(mark, pos, max, state, endLine, nextLine);
      const { hasEndMarker, from, to } = end;
      nextLine = end.nextLine;

      const { meta, decorations } = parseArgs(args);
      state.line = nextLine + (hasEndMarker ? 1 : 0);
      const token = state.push("codeMovieFrame", 0);
      token.info = lang;
      token.meta = meta;
      token.decorations = decorations;
      token.content = state.getLines(startLine, nextLine - 1, 0, true).trim();
      token.markup = state.src.slice(from, to);
      token.map = [startLine, state.line];

      return true;
    }

    function renderFrame(tokens, idx) {
      const token = tokens[idx];
      assertLanguage(token.info, languages, token);
      return adapter(
        { code: token.markup, decorations: token.decorations },
        languages[token.info],
        token,
      );
    }

    md.block.ruler.before("fence", "codeMovieFrame", parseFrame);
    md.renderer.rules["codeMovieFrame"] = renderFrame;

    function parseAnimation(md) {}

    function renderAnimation(tokens, idx) {}

    md.block.ruler.before("fence", "codeMovieAnimation", parseAnimation);
    md.renderer.rules["codeMovieAnimation"] = renderAnimation;
  };
}
