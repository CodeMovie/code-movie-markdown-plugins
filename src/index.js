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
          const rule = /^`{4}code-movie\|(?<lang>[a-z-]+)(?<content>.*)`{4}/s;
          const match = rule.exec(src);
          if (!match) {
            return;
          }
          const { content, lang } = match.groups;
          const tokens = this.lexer.blockTokens(content.trim(), []);
          const invalid = !(lang in languages);
          return {
            type: "codeMovie",
            raw: match[0],
            lang,
            invalid,
            tokens,
          };
        },
        renderer(token) {
          if (token.invalid) {
            token.tokens.forEach((child) => (child.lang = token.lang));
            return this.parser.parse(token.tokens);
          }
          const frames = token.tokens.flatMap((child) =>
            child.type === "code" ? [{ code: child.text }] : [],
          );
          const html = adapter(frames, languages[token.lang]);
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
