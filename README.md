# [Code.Movie](https://code.movie) plugin for [Marked](https://marked.js.org/)

Author animated code examples with markdown! This plugin extends markdown with a
wrapper syntax for fenced code blocks:

<!-- prettier-ignore -->
    ````code-movie|json

    ```
    []
    ```

    ```
    ["World"]
    ```

    ```
    ["Hello", "World"]
    ```

    ```
    [
      "Hello",
      "World"
    ]
    ```

    ````

With just a little configuration this turns into animated, syntax highlighted
code:

![animated code sample](https://raw.githubusercontent.com/CodeMovie/code-movie-marked-plugin/main/demo.gif)

## Installation

You can install the library as `@codemovie/code-movie-marked-plugin` from NPM,
[download the latest release from GitHub](https://github.com/CodeMovie/code-movie-marked-plugin/releases)
or just grab index.js` [from the source code](https://github.com/CodeMovie/code-movie-marked-plugin/tree/main/dist).

## Setup

**This plugin does _not_ bundle the core library!** You have to either manually
install [@codemovie/code-movie](https://www.npmjs.com/package/@codemovie/code-movie)
or load the relevant files from a CDN like [jsDelivr](https://www.jsdelivr.com/)
as shown below:

```javascript
// Import Marked and the plugin
import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.6/lib/marked.esm.js";
import { markedCodeMoviePlugin } from "./plugin/code-movie-marked-plugin/index.js";
// For flexibility reasons, the plugin does not ship with the main library.
// You need to load the required functions, themes and language modules from
// somewhere, either a CDN as shown below or from your local installation of
// @codemovie/code-movie.
import {
  animateHTML,
  monokaiDark,
} from "https://cdn.jsdelivr.net/npm/@codemovie/code-movie/dist/index.js";
import json from "https://cdn.jsdelivr.net/npm/@codemovie/code-movie/dist/languages/json.js";
import ecmascript from "https://cdn.jsdelivr.net/npm/@codemovie/code-movie/dist/languages/ecmascript.js";

// The plugin can automatically add markup for <code-movie-runtime> custom
// elements, but this too requires the module for the element to be loaded
import "https://cdn.jsdelivr.net/npm/@codemovie/code-movie-runtime";

// Set the options for the plugin
const codeMoviePlugin = markedCodeMoviePlugin({
  // Because the core library is not bundled with the plugin, you need to
  // provide an adapter function. The adapter function is called with frame
  // objects and the appropriate language module, which you can pass on to
  // your particular version of the core library. If you want to tweak the tab
  // size, theme, or run some side effects, this is the place to do that. You
  // can also add extra HTML before, after, or around the output.
  adapter: (frames, language) =>
    animateHTML(frames, { tabSize: 2, language, theme: monokaiDark }),

  // Because the language modules are HUGE and can be configured in a variety
  // of ways, you may want to be selective about what you include and how you
  // configure each language.
  languages: {
    // Every entry in the languages object maps a class name ("json" in this
    // case) to a language module instance. To then create an animation for
    // JSON, you'll need an element with the class "code-movie" (as defined in
    // the selector option above) and also the class "json". <pre> elements
    // inside this element (again, as defined by the selector option) will
    // then be processed and animated als JSON.
    json: json(),

    // Here, the class "javascript" maps to the ecmascript module with types
    // disabled, while the class "typescript" maps to the same language
    // module, but with types enabled.
    javascript: ecmascript({ ts: false }),
    typescript: ecmascript({ ts: true }),
  },

  // To automatically add markup for <code-movie-runtime> custom elements, set
  // the "addRuntime" option to something truthy. To initialize the
  // <code-movie-runtime> tags with the "controls" attribute, pass an object
  // with the controls property set to something truthy. If you need more
  // customization, consider extending the adapter function.
  addRuntime: {
    controls: true,
  },
});

// Pass the plugin to Marked. Done!
marked.use(codeMoviePlugin);

// Time to parse some markdown...
document.body.innerHTML += marked.parse(`\`\`\`\`code-movie|json

\`\`\`
[]
\`\`\`

\`\`\`
["World"]
\`\`\`

\`\`\`
["Hello", "World"]
\`\`\`

\`\`\`
[
  "Hello",
  "World"
]
\`\`\`

\`\`\`\``);
```

## Limitations

There is currently no support for [decorations](https://code.movie/docs/guides/decorations.html).

## Customization

You can read up on [styling and theming in the Code.Movie documentation!](https://code.movie/docs/guides/styling.html)
