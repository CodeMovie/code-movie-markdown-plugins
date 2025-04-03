%%%(json)

%%
[]
%%

%%(|meta={ info: "Frame 1" }|decorations=[{ kind: "TEXT", from: 1, to: 8 }])
["World"]
%%

%%(|meta={ info: "Frame 2" }|decorations=[{ kind: "TEXT", from: 1, to: 8 }, { kind: "TEXT", from: 10, to: 17, data: { class: "error" } }])
["Hello", "World"]
%%

%%(|meta={ info: "Frame 3" }|decorations=[{ kind: "GUTTER", text: "✅", line: 2 }, { kind: "GUTTER", text: "🚫", line: 3 }])
[
  "Hello",
  "World"
]
%%

%%%
