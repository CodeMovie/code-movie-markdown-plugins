import test, { suite } from "node:test";
import assert from "node:assert";
import { marked, Marked } from "marked";
import { markedCodeMoviePlugin } from "../src/index.js";

marked.use(
  markedCodeMoviePlugin({
    adapter: (frames, lang) => JSON.stringify({ frames, lang }),
    languages: {
      json: "json",
    },
  }),
);

suite("Marked plugin", () => {
  test("parsing markdown into frames", () => {
    const text = `\`\`\`\`code-movie|json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"[23]"},{"code":"[42]"}],"lang":"json"}`,
    );
  });

  test("ignoring whitespace and non-code children", () => {
    const text = `\`\`\`\`code-movie|json

\`\`\`
[23]
\`\`\`

whatever

\`\`\`
[42]
\`\`\`

**asdf**

\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"[23]"},{"code":"[42]"}],"lang":"json"}`,
    );
  });

  test("ignoring unavailable languages", () => {
    const text = `\`\`\`\`code-movie|something
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `<pre><code class="language-something">[23]
</code></pre>
<pre><code class="language-something">[42]
</code></pre>
`,
    );
  });

  test("adding markup for <code-movie-runtime>", () => {
    const instance = new Marked(
      markedCodeMoviePlugin({
        addRuntime: true,
        adapter: (frames, lang) => JSON.stringify({ frames, lang }),
        languages: {
          json: "json",
        },
      }),
    );
    const text = `\`\`\`\`code-movie|json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
\`\`\`\``;
    const actual = instance.parse(text);
    assert.strictEqual(
      actual,
      `<code-movie-runtime keyframes="0 1">{"frames":[{"code":"[23]"},{"code":"[42]"}],"lang":"json"}</code-movie-runtime>`,
    );
  });

  test("adding markup for <code-movie-runtime> with controls", () => {
    const instance = new Marked(
      markedCodeMoviePlugin({
        addRuntime: {
          controls: true,
        },
        adapter: (frames, lang) => JSON.stringify({ frames, lang }),
        languages: {
          json: "json",
        },
      }),
    );
    const text = `\`\`\`\`code-movie|json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
\`\`\`\``;
    const actual = instance.parse(text);
    assert.strictEqual(
      actual,
      `<code-movie-runtime keyframes="0 1" controls="controls">{"frames":[{"code":"[23]"},{"code":"[42]"}],"lang":"json"}</code-movie-runtime>`,
    );
  });
});
