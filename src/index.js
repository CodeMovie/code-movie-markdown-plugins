import JSON5 from "json5";

function parseMeta(meta) {
  if (meta.startsWith("|meta=")) {
    meta = meta.slice(6) || [];
    try {
      return JSON5.parse(meta) || {};
    } catch {
      return {};
    }
  }
  return {};
}

function parseDecorations(declaration) {
  if (declaration.startsWith("|decorations=")) {
    declaration = declaration.slice(13) || [];
    try {
      let parsed = JSON5.parse(declaration);
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      return parsed.flatMap((decoration) => {
        if (["GUTTER", "LINE", "TEXT"].includes(decoration.kind)) {
          decoration.data ??= {};
          return [decoration];
        }
        return [];
      });
    } catch {
      return [];
    }
  }
  return [];
}

export function markedCodeMoviePlugin({
  adapter,
  languages,
  addRuntime = false,
}) {
  return {
    extensions: [
      {
        name: "codeMovie",
        level: "block",
        start: (src) => src.match(/`{4}code-movie\|[a-z-]+/)?.index,
        tokenizer(src) {
          const rule =
            /^`{4}code-movie\|(?<lang>[a-z-]+)(?<meta>\|meta={.*?}(?=\s+```))?(?<content>.*)`{4}/s;
          const match = rule.exec(src);
          if (!match) {
            return;
          }
          const { content, lang, meta = "" } = match.groups;
          const tokens = this.lexer.blockTokens(content.trim(), []);
          const invalid = !(lang in languages);
          return {
            type: "codeMovie",
            raw: match[0],
            lang,
            meta: parseMeta(meta),
            invalid,
            tokens,
          };
        },

        renderer(token) {
          if (token.invalid) {
            token.tokens.forEach((child) => (child.lang = token.lang));
            return this.parser.parse(token.tokens);
          }
          const frames = token.tokens.flatMap((child) => {
            if (child.type !== "code") {
              return [];
            }
            return [
              {
                code: child.text,
                decorations: parseDecorations(child.lang),
              },
            ];
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

export function markedCodeMovieHighlightPlugin({ adapter, languages }) {
  return {
    extensions: [
      {
        name: "codeMovieHighlight",
        level: "block",
        start: (src) => src.match(/`{4}code-movie-highlight\|[a-z-]+/)?.index,
        tokenizer(src) {
          const rule =
            /^`{4}code-movie-highlight\|(?<lang>[a-z-]+)?(?<decorations>\|decorations=.*?)?\n(?<content>.*)`{4}/s;
          const match = rule.exec(src);
          if (!match) {
            return;
          }
          const { content, lang, decorations = "" } = match.groups;
          const invalid = !(lang in languages);
          const fallback = new this.lexer.constructor(this.lexer.options).lex(
            "```" + lang + "\n" + content + "\n```",
          );
          return {
            type: "codeMovieHighlight",
            raw: match[0],
            lang,
            decorations: parseDecorations(decorations),
            invalid,
            content: content.trim(),
            fallback,
          };
        },

        renderer(token) {
          if (token.invalid) {
            return this.parser.parse(token.fallback);
          }
          return adapter(
            { code: token.content, decorations: token.decoration },
            languages[token.lang],
            token,
          );
        },
      },
    ],
  };
}
