import test, { suite } from "node:test";
import assert from "node:assert";
import { Marked } from "marked";
import markdownIt from "markdown-it";
import { markedCodeMoviePlugin } from "../src/marked.js";
import { markdownItCodeMoviePlugin } from "../src/markdown-it.js";

const [target, parse] = process.argv.includes("--marked")
  ? [
      "Marked",
      (text, config = {}) => {
        const plugin = markedCodeMoviePlugin({
          adapter: (frames, lang, token) =>
            JSON.stringify({ frames, lang, meta: token.meta }),
          languages: {
            json: "json",
            plaintext: "plaintext",
          },
          ...config,
        });
        return new Marked(plugin).parse(text);
      },
    ]
  : [
      "markdown-it",
      (text, config = {}) => {
        const plugin = markdownItCodeMoviePlugin({
          adapter: (frames, lang, token) =>
            JSON.stringify({ frames, lang, meta: token.meta }),
          languages: {
            json: "json",
            plaintext: "plaintext",
          },
          ...config,
        });
        return markdownIt().use(plugin).render(text);
      },
    ];

suite(`${target}: Animations`, () => {
  suite(`${target}: General plugin functionality`, () => {
    test("parsing markdown into frames - regular fenced code blocks", () => {
      const text = `!!!json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames - regular fenced code blocks, multi-line content", () => {
      const text = `!!!json
\`\`\`
[
  23
]
\`\`\`
\`\`\`
[
  42
]
\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[\\n  23\\n]","decorations":[],"annotations":[],"meta":{}},{"code":"[\\n  42\\n]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames - quad-backtick fenced code blocks", () => {
      const text = `!!!json
\`\`\`\`
[23]
\`\`\`\`
\`\`\`\`
[42]
\`\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames - quad-backtick fenced code blocks over regular fenced code blocks", () => {
      const text = `!!!json
\`\`\`\`
\`\`\`
[23]
\`\`\`
\`\`\`\`
\`\`\`\`
\`\`\`
[42]
\`\`\`
\`\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"\`\`\`\\n[23]\\n\`\`\`","decorations":[],"annotations":[],"meta":{}},{"code":"\`\`\`\\n[42]\\n\`\`\`","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames - code movie highlight code blocks", () => {
      const text = `!!!json
\`\`\`()
[23]
\`\`\`
\`\`\`()
[42]
\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames - quad-backtick code movie blocks over regular fenced code blocks", () => {
      const text = `!!!json
\`\`\`\`()
\`\`\`
[23]
\`\`\`
\`\`\`\`
\`\`\`\`()
\`\`\`
[42]
\`\`\`
\`\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"\`\`\`\\n[23]\\n\`\`\`","decorations":[],"annotations":[],"meta":{}},{"code":"\`\`\`\\n[42]\\n\`\`\`","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames (extra whitespace, fenced code blocks)", () => {
      const text = `

!!!json

\`\`\`
[23]
\`\`\`

\`\`\`
[42]
\`\`\`

!!!

`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("parsing markdown into frames (leading and trailing content)", () => {
      const text = `Hello!

!!!json

\`\`\`
[23]
\`\`\`

\`\`\`
[42]
\`\`\`

!!!

World!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `<p>Hello!</p>\n{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}<p>World!</p>\n`,
      );
    });

    test("multiple instances", () => {
      const text = `!!!json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
!!!

Text

!!!json
\`\`\`()
[23]
\`\`\`
\`\`\`()
[42]
\`\`\`
!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}<p>Text</p>
{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("ignoring non-code children", () => {
      const text = `!!!json

\`\`\`()
[23]
\`\`\`

whatever

\`\`\`
[42]
\`\`\`

**asdf**

!!!`;
      const actual = parse(text);
      assert.strictEqual(
        actual,
        `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
      );
    });

    test("handling no content", () => {
      const actual = parse("!!!json\n!!!");
      assert.strictEqual(actual, '{"frames":[],"lang":"json","meta":{}}');
    });

    test("handling whitespace-only content", () => {
      const actual = parse("!!!json\n  \n  \n!!!");
      assert.strictEqual(actual, '{"frames":[],"lang":"json","meta":{}}');
    });

    test("error on unavailable language", () => {
      const text = `!!!something
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
!!!`;
      assert.throws(() => parse(text), Error, /not available/);
    });

    test("adding markup for <code-movie-runtime>", () => {
      const text = `!!!json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
!!!`;
      const actual = parse(text, {
        addRuntime: true,
      });
      assert.strictEqual(
        actual,
        `<code-movie-runtime keyframes="0 1">{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}</code-movie-runtime>`,
      );
    });

    test("adding markup for <code-movie-runtime> with controls", () => {
      const text = `!!!json
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
!!!`;
      const actual = parse(text, {
        addRuntime: {
          controls: true,
        },
      });
      assert.strictEqual(
        actual,
        `<code-movie-runtime keyframes="0 1" controls="controls">{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}</code-movie-runtime>`,
      );
    });
  });

  suite(`${target}: Arguments`, () => {
    suite(`${target}: On the top level wrapper`, () => {
      test("Metadata", () => {
        test("parsing metadata", () => {
          const text = `!!!json(@meta={ value: 42 })
\`\`\`
[23]
\`\`\`
\`\`\`
[42]
\`\`\`
!!!`;
          const actual = parse(text);
          assert.strictEqual(
            actual,
            `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{"value":42}}`,
          );
        });
      });
    });

    suite(`${target}: On code blocks`, () => {
      test("empty", () => {
        const text = `!!!json
\`\`\`()
[23]
\`\`\`
\`\`\`()
[42]
\`\`\`
!!!`;
        const actual = parse(text);
        assert.strictEqual(
          actual,
          `{"frames":[{"code":"[23]","decorations":[],"annotations":[],"meta":{}},{"code":"[42]","decorations":[],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
        );
      });

      test("single gutter decoration", () => {
        const text = `!!!json
\`\`\`(@decorations=[{ kind: "GUTTER", line: 1, text: "❌" }])
[23]
\`\`\`
\`\`\`(@decorations=[{ kind: "GUTTER", line: 1, text: "✅" }])
[42]
\`\`\`
!!!`;
        const actual = parse(text);
        assert.strictEqual(
          actual,
          `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}],"annotations":[],"meta":{}},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
        );
      });

      test("single gutter decoration, quad backticks", () => {
        const text = `!!!json
\`\`\`\`(@decorations=[{ kind: "GUTTER", line: 1, text: "❌" }])
[23]
\`\`\`\`
\`\`\`\`(@decorations=[{ kind: "GUTTER", line: 1, text: "✅" }])
[42]
\`\`\`\`
!!!`;
        const actual = parse(text);
        assert.strictEqual(
          actual,
          `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}],"annotations":[],"meta":{}},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
        );
      });

      test("multi-line gutter decoration syntax", () => {
        const text = `!!!json
\`\`\`(@decorations=[
  { kind: "GUTTER", line: 1, text: "❌" }
])
[23]
\`\`\`
\`\`\`(@decorations=[
  { kind: "GUTTER", line: 1, text: "✅" }
      ])
[42]
\`\`\`
!!!`;
        const actual = parse(text);
        assert.strictEqual(
          actual,
          `{"frames":[{"code":"[23]","decorations":[{"kind":"GUTTER","line":1,"text":"❌","data":{}}],"annotations":[],"meta":{}},{"code":"[42]","decorations":[{"kind":"GUTTER","line":1,"text":"✅","data":{}}],"annotations":[],"meta":{}}],"lang":"json","meta":{}}`,
        );
      });

      test("mixed decorations and metadata with whitespace", () => {
        const text = `!!!json

\`\`\`(@meta={ frame: 0 })
[]
\`\`\`

\`\`\`(
  @meta={ frame: 1 }
  @decorations=[{ kind: "TEXT", from: 1, to: 8 }]
)
["World"]
\`\`\`

\`\`\`(
  @decorations=[
    { kind: "TEXT", from: 1, to: 8 },
    { kind: "TEXT", from: 10, to: 17, data: { class: "error" } }
  ]
  @meta={
    frame: 2
  }
)
["Hello", "World"]
\`\`\`

\`\`\`(@meta={ frame: 3 }@decorations=[{ kind: "GUTTER", text: "✅", line: 2 }, { kind: "GUTTER", text: "❌", line: 3 }])
[
  "Hello",
  "World"
]
\`\`\`

!!!`;
        const actual = parse(text);
        assert.strictEqual(
          actual,
          '{"frames":[{"code":"[]","decorations":[],"annotations":[],"meta":{"frame":0}},{"code":"[\\"World\\"]","decorations":[{"kind":"TEXT","from":1,"to":8,"data":{}}],"annotations":[],"meta":{"frame":1}},{"code":"[\\"Hello\\", \\"World\\"]","decorations":[{"kind":"TEXT","from":1,"to":8,"data":{}},{"kind":"TEXT","from":10,"to":17,"data":{"class":"error"}}],"annotations":[],"meta":{"frame":2}},{"code":"[\\n  \\"Hello\\",\\n  \\"World\\"\\n]","decorations":[{"kind":"GUTTER","text":"✅","line":2,"data":{}},{"kind":"GUTTER","text":"❌","line":3,"data":{}}],"annotations":[],"meta":{"frame":3}}],"lang":"json","meta":{}}',
        );
      });
    });
  });
});
