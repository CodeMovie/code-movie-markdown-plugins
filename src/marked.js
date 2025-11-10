import {
  parseArgs,
  parseOptions,
  defaultMissingLanguage,
  wrapWithRuntime,
  dropLineBreaks,
} from "./lib.js";

const START_HIGHLIGHT_BLOCK_RE = /^`{3}[ a-zA-Z_-]*\((?:.*?\n?)?\)/;
const MATCH_HIGHLIGHT_BLOCK_RE =
  /^(?<backticks>`{3}`?)(?<lang>[a-zA-Z_-]*) *(?:\((?<args>.*?)\))(?<content>.*?)\k<backticks>/s;

const START_ANIMATE_BLOCK_RE = /^!{3}[a-zA-Z_-]+(\(.*?\))?\n/;
const MATCH_ANIMATE_BLOCK_RE =
  /^!{3}(?<lang>[a-zA-Z_-]+) *(?:\((?<args>.*?)\))?(?<content>.*?)!{3}/s;

// MATCH_ANIMATE_BLOCK_RE differs from MATCH_HIGHLIGHT_BLOCK_RE in that it
// starts and ends with exclamation points and has an optional args list

export function markedCodeMoviePlugin(options) {
  const {
    adapter,
    languages,
    addRuntime,
    missingLanguage = defaultMissingLanguage,
  } = parseOptions(options);
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
          const { meta, decorations, annotations } = parseArgs(args, match[0]);
          return {
            type: "codeMovieHighlight",
            raw: match[0],
            code: dropLineBreaks(content),
            decorations,
            annotations,
            lang,
            meta,
          };
        },
        renderer(token) {
          const language =
            token.lang in languages
              ? languages[token.lang]
              : missingLanguage(token.lang, languages, token);
          return adapter(
            {
              code: token.code,
              decorations: token.decorations,
              annotations: token.annotations,
            },
            language,
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
            meta: parseArgs(args, match[0]).meta,
            lang,
          };
        },
        renderer(token) {
          const language =
            token.lang in languages
              ? languages[token.lang]
              : missingLanguage(token.lang, languages, token);
          const frames = token.tokens.flatMap((token) => {
            if (token.type === "codeMovieHighlight") {
              return [
                {
                  code: token.code,
                  decorations: token.decorations,
                  annotations: token.annotations,
                  meta: token.meta,
                },
              ];
            }
            if (token.type === "code") {
              return [
                {
                  code: token.text,
                  decorations: [],
                  annotations: [],
                  meta: {},
                },
              ];
            }
            return [];
          });
          return wrapWithRuntime(
            adapter(frames, language, token),
            frames,
            addRuntime,
          );
        },
      },
    ],
  };
}
