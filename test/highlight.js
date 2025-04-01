import test, { suite } from "node:test";
import assert from "node:assert";
import { Marked } from "marked";
import { markedCodeMoviePlugin } from "../src/index.js";

const marked = new Marked();

const plugin = markedCodeMoviePlugin({
  adapter: (frame, lang, token) =>
    JSON.stringify({ frame, lang, meta: token.meta }),
  languages: {
    json: "json",
  },
});

marked.use(plugin);

suite("Highlighting", () => {
  suite("General plugin functionality", () => {
    test("parsing markdown into a frame", () => {
      const text = `%%(json)
[
  "Hello",
  "World"
]
%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[]},"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into a frame (leading and trailing whitespace)", () => {
      const text = `

%%(json)
[
  "Hello",
  "World"
]
%%

`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[]},"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into a frame (leading and trailing content)", () => {
      const text = `Hello!

%%(json)
[
  "Hello",
  "World"
]
%%

World!`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `<p>Hello!</p>
{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[]},"lang":"json","meta":{}}<p>World!</p>\n`,
      );
    });

    test("handing multiple instances", () => {
      const text = `Hello!

%%(json)
[
  "Hello",
  "World"
]
%%

World!

%%(json)
[1, 2, 3]
%%

More content!`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `<p>Hello!</p>
{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[]},"lang":"json","meta":{}}<p>World!</p>
{"frame":{"code":"[1, 2, 3]","decorations":[]},"lang":"json","meta":{}}<p>More content!</p>\n`,
      );
    });

    test("handling no content", () => {
      const actual = marked.parse("%%(json)\n%%");
      assert.strictEqual(
        actual,
        '{"frame":{"code":"","decorations":[]},"lang":"json","meta":{}}',
      );
    });

    test("handling whitespace-only content", () => {
      const actual = marked.parse("%%(json)\n  \n  \n%%");
      assert.strictEqual(
        actual,
        '{"frame":{"code":"","decorations":[]},"lang":"json","meta":{}}',
      );
    });

    test("error on unavailable language", () => {
      const text = `%%(foobar)
[
  "Hello",
  "World"
]
%%`;
      assert.throws(() => marked.parse(text), Error, /not available/);
    });

    test("error on missing language (with parens)", () => {
      const text = `%%()
[
  "Hello",
  "World"
]
%%`;
      assert.throws(() => marked.parse(text), Error, /not available/);
    });

    test("error on missing language (without parens)", () => {
      const text = `%%
[
  "Hello",
  "World"
]
%%`;
      assert.throws(() => marked.parse(text), Error, /not available/);
    });
  });

  suite("Arguments", () => {
    test("handing metadata", () => {
      const text = `%%(json|meta={ test: 42 })
[
  "Hello",
  "World"
]
%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[]},"lang":"json","meta":{"test":42}}`,
      );
    });

    test("handing multi-line metadata", () => {
      const text = `%%(json|meta={
  test: 42
})
[
  "Hello",
  "World"
]
%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[]},"lang":"json","meta":{"test":42}}`,
      );
    });

    test("handing a single gutter decoration", () => {
      const text = `%%(json|decorations=[{ kind: "GUTTER", line: 1, text: "❌" }])
[
  "Hello",
  "World"
]
%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}]},"lang":"json","meta":{}}`,
      );
    });

    test("handing multiple decorations, multiline", () => {
      const text = `%%(json|decorations=[
  { kind: "GUTTER", line: 1, text: "❌" },
  { kind: "TEXT", from: 10, to: 17, data: { class: "error" } }
])
[
  "Hello",
  "World"
]
%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}},{"kind":"TEXT","from":10,"to":17,"data":{"class":"error"}}]},"lang":"json","meta":{}}`,
      );
    });

    test("handing metadata and multiple decorations with large amounts of whitespace", () => {
      const text = `%%(json
  |decorations=[
    { kind: "GUTTER", line: 1, text: "❌" },
    { kind: "TEXT", from: 10, to: 17, data: { class: "error" } }
  ]
  |meta={
    value: 42
  }
)
[
  "Hello",
  "World"
]
%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frame":{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}},{"kind":"TEXT","from":10,"to":17,"data":{"class":"error"}}]},"lang":"json","meta":{"value":42}}`,
      );
    });
  });
});
