import JSON5 from "json5";

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
            /^`{4}code-movie\|(?<lang>[a-z-]+)(?<meta>\|meta={.*?}(?=\s+```))?(?<content>.*?)`{4}/s;
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
        start: (src) => src.match(/^%%\(.*\)\n/)?.index,
        tokenizer(src) {
          const rule =
            /^%%\((?<lang>[A-Za-z-]+)?(?<args>(?!\)).*)?\)\n(?<content>.*?\n)%%/s;
          const match = rule.exec(src);
          if (!match) {
            return;
          }
          const { content, lang, args = "" } = match.groups;
          const { meta, decorations } = parseArgs(args);
          return {
            type: "codeMovieHighlight",
            raw: match[0],
            content: content.trim(),
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
            { code: token.content, decorations: token.decorations },
            languages[token.lang],
            token,
          );
        },
      },
    ],
  };
}
