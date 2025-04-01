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

suite("Animations", () => {
  suite("General plugin functionality", () => {
    test("parsing markdown into frames", () => {
      const text = `%%%(json)
%%
[23]
%%
%%
[42]
%%
%%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames (extra whitespace)", () => {
      const text = `

%%%(json)

%%
[23]
%%

%%
[42]
%%

%%%

`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames (leading and trailing content)", () => {
      const text = `Hello!

%%%(json)

%%
[23]
%%

%%
[42]
%%

%%%

World!`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `<p>Hello!</p>\n{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}<p>World!</p>\n`,
      );
    });

    test("multiple instances", () => {
      const text = `%%%(json)
%%
[23]
%%
%%
[42]
%%
%%%

Text

%%%(json)
%%
[23]
%%
%%
[42]
%%
%%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}<p>Text</p>
{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("ignoring non-code children", () => {
      const text = `%%%(json)

%%
[23]
%%

whatever

%%
[42]
%%

**asdf**

%%%`;
      const actual = marked.parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("handling no content", () => {
      const actual = marked.parse("%%%(json)\n%%%");
      assert.strictEqual(actual, '{"frames":[],"lang":"json","meta":{}}');
    });

    test("handling whitespace-only content", () => {
      const actual = marked.parse("%%%(json)\n  \n  \n%%%");
      assert.strictEqual(actual, '{"frames":[],"lang":"json","meta":{}}');
    });

    test("error on unavailable language", () => {
      const text = `%%%(something)
%%
[23]
%%
%%
[42]
%%
%%%`;
      assert.throws(() => marked.parse(text), Error, /not available/);
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
      const text = `%%%(json)
%%
[23]
%%
%%
[42]
%%
%%%`;
      const actual = instance.parse(text);
      assert.strictEqual(
        actual,
        `<code-movie-runtime keyframes="0 1">{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}</code-movie-runtime>`,
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
      const text = `%%%(json)
%%
[23]
%%
%%
[42]
%%
%%%`;
      const actual = instance.parse(text);
      assert.strictEqual(
        actual,
        `<code-movie-runtime keyframes="0 1" controls="controls">{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{}}</code-movie-runtime>`,
      );
    });
  });

  suite("Arguments", () => {
    suite("On the top level wrapper", () => {
      test("Metadata", () => {
        test("parsing metadata", () => {
          const text = `%%%(json|meta={ value: 42 })
%%
[23]
%%
%%
[42]
%%
%%%`;
          const actual = marked.parse(text);
          assert.strictEqual(
            actual,
            `{"frames":[{"code":"[23]","decorations":[],"meta":{}},{"code":"[42]","decorations":[],"meta":{}}],"lang":"json","meta":{"value":42}}`,
          );
        });
      });
    });

    suite("On code blocks", () => {
      test("single gutter decoration", () => {
        const text = `%%%(json)
%%(|decorations=[{ kind: "GUTTER", line: 1, text: "❌" }])
[23]
%%
%%(|decorations=[{ kind: "GUTTER", line: 1, text: "✅" }])
[42]
%%
%%%`;
        const actual = marked.parse(text);
        assert.strictEqual(
          actual,
          `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}],"meta":{}},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}],"meta":{}}],"lang":"json","meta":{}}`,
        );
      });

      test("multi-line gutter decoration syntax", () => {
        const text = `%%%(json)
%%(|decorations=[
  { kind: "GUTTER", line: 1, text: "❌" }
])
[23]
%%
%%(|decorations=[
  { kind: "GUTTER", line: 1, text: "✅" }
      ])
[42]
%%
%%%`;
        const actual = marked.parse(text);
        assert.strictEqual(
          actual,
          `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}],"meta":{}},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}],"meta":{}}],"lang":"json","meta":{}}`,
        );
      });

      test("mixed decorations and metadata with whitespace", () => {
        const text = `%%%(json)
%%(|meta={ frame: 0 })
[]
%%

%%(
  |meta={ frame: 1 }
  |decorations=[{ kind: "TEXT", from: 1, to: 8 }]
)
["World"]
%%

%%(
  |decorations=[
    { kind: "TEXT", from: 1, to: 8 },
    { kind: "TEXT", from: 10, to: 17, data: { class: "error" } }
  ]
  |meta={
    frame: 2
  }
)
["Hello", "World"]
%%

%%(|decorations=meta={ frame: 3 }[{ kind: "GUTTER", text: "✅", line: 2 }, { kind: "GUTTER", text: "❌", line: 3 }])
[
  "Hello",
  "World"
]
%%
%%%`;
        const actual = marked.parse(text);
        assert.strictEqual(
          actual,
          '{"frames":[{"code":"[]","decorations":[],"meta":{"frame":0}},{"code":"[\\"World\\"]","decorations":[{"kind":"TEXT","from":1,"to":8,"data":{}}],"meta":{"frame":1}},{"code":"[\\"Hello\\", \\"World\\"]","decorations":[{"kind":"TEXT","from":1,"to":8,"data":{}},{"kind":"TEXT","from":10,"to":17,"data":{"class":"error"}}],"meta":{"frame":2}},{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[],"meta":{}}],"lang":"json","meta":{}}',
        );
      });
    });
  });
});
