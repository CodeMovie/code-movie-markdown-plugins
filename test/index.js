import test, { suite } from "node:test";
import assert from "node:assert";
import { marked, Marked } from "marked";
import { markedCodeMoviePlugin } from "../src/index.js";

marked.use(
  markedCodeMoviePlugin({
    adapter: (frames, lang, token) =>
      JSON.stringify({ frames, lang, meta: token.meta }),
    languages: {
      json: "json",
    },
  }),
);

suite("General plugin functionality", () => {
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
      `{"frames":[{"code":"[23]","decorations":[]},{"code":"[42]","decorations":[]}],"lang":"json","meta":{}}`,
    );
  });

  test("content before and after", () => {
    const text = `Text

\`\`\`\`code-movie|json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
\`\`\`\`

Text`;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `<p>Text</p>\n{"frames":[{"code":"[23]","decorations":[]},{"code":"[42]","decorations":[]}],"lang":"json","meta":{}}<p>Text</p>\n`,
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
      `{"frames":[{"code":"[23]","decorations":[]},{"code":"[42]","decorations":[]}],"lang":"json","meta":{}}`,
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
        adapter: (frames, lang, token) =>
          JSON.stringify({ frames, lang, meta: token.meta }),
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
      `<code-movie-runtime keyframes="0 1">{"frames":[{"code":"[23]","decorations":[]},{"code":"[42]","decorations":[]}],"lang":"json","meta":{}}</code-movie-runtime>`,
    );
  });

  test("adding markup for <code-movie-runtime> with controls", () => {
    const instance = new Marked(
      markedCodeMoviePlugin({
        addRuntime: {
          controls: true,
        },
        adapter: (frames, lang, token) =>
          JSON.stringify({ frames, lang, meta: token.meta }),
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
      `<code-movie-runtime keyframes="0 1" controls="controls">{"frames":[{"code":"[23]","decorations":[]},{"code":"[42]","decorations":[]}],"lang":"json","meta":{}}</code-movie-runtime>`,
    );
  });
});

suite("Decorations", () => {
  test("single gutter decoration", () => {
    const text = `\`\`\`\`code-movie|json
\`\`\`|decorations={ kind: "GUTTER", line: 1, text: "❌" }
[23]
\`\`\`
\`\`\`|decorations={ kind: "GUTTER", line: 1, text: "✅" }
[42]
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}]},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}]}],"lang":"json","meta":{}}`,
    );
  });

  test("gutter decoration arrays", () => {
    const text = `\`\`\`\`code-movie|json
\`\`\`|decorations=[{ kind: "GUTTER", line: 1, text: "❌" }]
[23]
\`\`\`
\`\`\`|decorations=[{ kind: "GUTTER", line: 1, text: "✅" }]
[42]
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}]},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}]}],"lang":"json","meta":{}}`,
    );
  });

  test("mixed decorations", () => {
    const text = `\`\`\`\`code-movie|json

\`\`\`
[]
\`\`\`

\`\`\`|decorations={ kind: "TEXT", from: 1, to: 8 }
["World"]
\`\`\`

\`\`\`|decorations=[{ kind: "TEXT", from: 1, to: 8 }, { kind: "TEXT", from: 10, to: 17, data: { class: "error" } }]
["Hello", "World"]
\`\`\`

\`\`\`|decorations=[{ kind: "GUTTER", text: "✅", line: 2 }, { kind: "GUTTER", text: "❌", line: 3 }]
[
  "Hello",
  "World"
]
\`\`\`

\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"[]","decorations":[]},{"code":"[\\"World\\"]","decorations":[{"kind":"TEXT","from":1,"to":8,"data":{}}]},{"code":"[\\"Hello\\", \\"World\\"]","decorations":[{"kind":"TEXT","from":1,"to":8,"data":{}},{"kind":"TEXT","from":10,"to":17,"data":{"class":"error"}}]},{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[{"kind":"GUTTER","text":"✅","line":2,"data":{}},{"kind":"GUTTER","text":"❌","line":3,"data":{}}]}],"lang":"json","meta":{}}`,
    );
  });

  test("parsing single decorations with curly braces present in the content", () => {
    const text = `\`\`\`\`code-movie|json
\`\`\`|decorations={ kind: "GUTTER", line: 1, text: "❌" }
{ "a": 1 }
\`\`\`
\`\`\`|decorations={ kind: "GUTTER", line: 1, text: "✅" }
{ "a": 2 }
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"{ \\"a\\": 1 }","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}]},{"code":"{ \\"a\\": 2 }","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}]}],"lang":"json","meta":{}}`,
    );
  });

  test("parsing gutter decoration arrays with curly braces present in the content", () => {
    const text = `\`\`\`\`code-movie|json
\`\`\`|decorations=[{ kind: "GUTTER", line: 1, text: "❌" }]
{ "a": 1 }
\`\`\`
\`\`\`|decorations=[{ kind: "GUTTER", line: 1, text: "✅" }]
{ "a": 2 }
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"{ \\"a\\": 1 }","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}]},{"code":"{ \\"a\\": 2 }","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}]}],"lang":"json","meta":{}}`,
    );
  });
});

suite("Metadata", () => {
  test("parsing metadata", () => {
    const text = `\`\`\`\`code-movie|json|meta={ value: 42 }
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
      `{"frames":[{"code":"[23]","decorations":[]},{"code":"[42]","decorations":[]}],"lang":"json","meta":{"value":42}}`,
    );
  });

  test("parsing metadata with curly braces present in the content", () => {
    const text = `\`\`\`\`code-movie|json|meta={ value: 42 }
\`\`\`
{ "a": 1 }
\`\`\`
\`\`\`
{ "a": 2 }
\`\`\`
\`\`\`\``;
    const actual = marked.parse(text);
    assert.strictEqual(
      actual,
      `{"frames":[{"code":"{ \\"a\\": 1 }","decorations":[]},{"code":"{ \\"a\\": 2 }","decorations":[]}],"lang":"json","meta":{"value":42}}`,
    );
  });
});
