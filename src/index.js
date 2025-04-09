import JSON5 from "json5";

const START_HIGHLIGHT_BLOCK_RE = /^`{3}[ a-zA-Z_-]*\((?:.*?\n?)?\)/;
const MATCH_HIGHLIGHT_BLOCK_RE =
  /^`{3}(?<lang>[a-zA-Z_-]*) *(?:\((?<args>.*?)\))(?<content>.*?)`{3}/s;

const START_ANIMATE_BLOCK_RE = /^!{3}[a-zA-Z_-]+(\(.*?\))?\n/;
const MATCH_ANIMATE_BLOCK_RE =
  /^!{3}(?<lang>[a-zA-Z_-]+) *(?:\((?<args>.*?)\))?(?<content>.*?)!{3}/s;

// MATCH_ANIMATE_BLOCK_RE differs from MATCH_HIGHLIGHT_BLOCK_RE in that it
// starts and ends with exclamation points and has an optional args list

function parseArgs(args, source) {
  let meta = {};
  let decorations = [];
  const metaMatch = /(^|\|)meta=(?<data>.*?)($|\|[a-z]+=)/s.exec(args);
  if (metaMatch) {
    try {
      meta = JSON5.parse(metaMatch.groups.data) || {};
    } catch (error) {
      throw new SyntaxError("Unable to parse JSON5 for argument '|meta':", {
        cause: { error, json5: metaMatch.groups.data, source },
      });
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
    } catch (error) {
      throw new SyntaxError(
        "Unable to parse JSON5 for argument '|decorations':",
        { cause: { error, json5: metaMatch.groups.data, source } },
      );
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
          const { meta, decorations } = parseArgs(args, match[0]);
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
              { cause: token },
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
            meta: parseArgs(args, match[0]).meta,
            lang,
          };
        },
        renderer(token) {
          if (!(token.lang in languages)) {
            throw new Error(
              `Animating failed: language '${token.lang}' not available`,
              { cause: token },
            );
          }
          const frames = token.tokens.flatMap((token) => {
            if (token.type === "codeMovieHighlight") {
              return [
                {
                  code: token.code,
                  decorations: token.decorations,
                  meta: token.meta,
                },
              ];
            }
            if (token.type === "code") {
              return [{ code: token.text, decorations: [], meta: {} }];
            }
            return [];
          });
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
