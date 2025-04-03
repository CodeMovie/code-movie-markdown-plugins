import JSON5 from "json5";

const START_HIGHLIGHT_BLOCK_RE = /^%{2}\(.*?\)\n/;
const MATCH_HIGHLIGHT_BLOCK_RE =
  /^%{2}(\((?<lang>[A-Za-z-]+)?(?<args>(?!\)).*?)?\))?\n(?<content>.*?\n?)%{2}/s;

const START_ANIMATE_BLOCK_RE = /`{^%{3}\(.*?\)\n/;
const MATCH_ANIMATE_BLOCK_RE =
  /^%{3}(\((?<lang>[A-Za-z-]+)?(?<args>(?!\)).*?)?\))?\n(?<content>.*?\n?)%{3}/s;

function parseArgs(args) {
  let meta = {};
  let decorations = [];
  const metaMatch = /(^|\|)meta=(?<data>.*?)($|\|[a-z]+=)/s.exec(args);
  if (metaMatch) {
    try {
      meta = JSON5.parse(metaMatch.groups.data) || {};
    } catch {
      meta = {};
    }
  }
  const decoMatch = /(^|\|)decorations=(?<data>.*?)($|\|[a-z]+=)/s.exec(args);
  if (decoMatch) {
    try {
      let parsed = JSON5.parse(decoMatch.groups.data);
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      decorations = parsed.flatMap((decoration) => {
        if (["GUTTER", "LINE", "TEXT"].includes(decoration.kind)) {
          decoration.data ??= {};
          return [decoration];
        }
        return [];
      });
    } catch {
      decorations = [];
    }
  }
  return { meta, decorations };
}

export function markedCodeMoviePlugin({ adapter, languages, addRuntime }) {
  return {
    extensions: [
      // Highlighting extension, also used as a building block of animations
      {
        name: "codeMovieHighlight",
        level: "block",
        start: (src) => src.match(START_HIGHLIGHT_BLOCK_RE)?.index,
        tokenizer(src) {
          const match = MATCH_HIGHLIGHT_BLOCK_RE.exec(src);
          if (!match) {
            return;
          }
          const { content, lang, args = "" } = match.groups;
          const { meta, decorations } = parseArgs(args);
          return {
            type: "codeMovieHighlight",
            raw: match[0],
            code: content.trim(),
            decorations,
            lang,
            meta,
          };
        },
        renderer(token) {
          if (!(token.lang in languages)) {
            throw new Error(
              `Highlighting failed: language '${token.lang}' not available`,
            );
          }
          return adapter(
            { code: token.code, decorations: token.decorations },
            languages[token.lang],
            token,
          );
        },
      },

      // Animation extension, builds on top of the highlighting extension
      {
        name: "codeMovie",
        level: "block",
        start: (src) => src.match(START_ANIMATE_BLOCK_RE)?.index,
        tokenizer(src) {
          const match = MATCH_ANIMATE_BLOCK_RE.exec(src);
          if (!match) {
            return;
          }
          const { content, lang, args = "" } = match.groups;
          return {
            type: "codeMovie",
            raw: match[0],
            tokens: this.lexer.blockTokens(content, []),
            meta: parseArgs(args).meta,
            lang,
          };
        },
        renderer(token) {
          if (!(token.lang in languages)) {
            throw new Error(
              `Animating failed: language '${token.lang}' not available`,
            );
          }
          const frames = token.tokens.flatMap(
            ({ type, code, decorations, meta }) => {
              if (type !== "codeMovieHighlight") {
                return [];
              }
              return [{ code, decorations, meta }];
            },
          );
          const html = adapter(frames, languages[token.lang], token);
          if (addRuntime) {
            const controlsAttr =
              typeof addRuntime === "object" && addRuntime.controls
                ? ' controls="controls"'
                : "";
            const keyframesAttr = Object.keys(frames).join(" ");
            return `<code-movie-runtime keyframes="${keyframesAttr}"${controlsAttr}>${html}</code-movie-runtime>`;
          }
          return html;
        },
      },
    ],
  };
}
