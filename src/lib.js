import JSON5 from "json5";

export function assertLanguage(language, languages, cause) {
  if (!(language in languages)) {
    throw new Error(
      `Failure in Code.Movie plugin: language '${language}' not available`,
      { cause },
    );
  }
}

const name = (x) =>
  Object.prototype.toString.call(x).slice(8, -1).toLowerCase();

export function parseOptions(options) {
  if (typeof options !== "object" || options === null) {
    throw new Error(
      `Expected 'options' to be an object, got ${name(options)}`,
      { cause: options },
    );
  }
  if (typeof options.adapter !== "function") {
    throw new Error(
      `Expected 'options.adapter' to be a function, got ${name(options.adapter)}`,
      { cause: options },
    );
  }
  if (typeof options.languages !== "object" || options === null) {
    throw new Error(
      `Expected 'options.languages' to be an object, got ${name(options.languages)}`,
      { cause: options },
    );
  }
  return options;
}

export function parseArgs(args, source = args) {
  let meta = {};
  let decorations = [];
  const metaMatch = /(^|\|)meta=(?<data>.*?)($|\|[a-z]+=)/s.exec(args);
  if (metaMatch) {
    try {
      meta = JSON5.parse(metaMatch.groups.data) || {};
    } catch (error) {
      throw new SyntaxError("Unable to parse JSON5 for argument '|meta':", {
        cause: { error, json5: metaMatch.groups.data, source },
      });
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
    } catch (error) {
      throw new SyntaxError(
        "Unable to parse JSON5 for argument '|decorations':",
        { cause: { error, json5: metaMatch.groups.data, source } },
      );
    }
  }
  return { meta, decorations };
}

export function wrapWithRuntime(html, frames, configuration) {
  if (configuration) {
    const controlsAttr =
      typeof configuration === "object" && configuration.controls
        ? ' controls="controls"'
        : "";
    const keyframesAttr = Object.keys(frames).join(" ");
    return `<code-movie-runtime keyframes="${keyframesAttr}"${controlsAttr}>${html}</code-movie-runtime>`;
  }
  return html;
}
