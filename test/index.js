import { spec } from "node:test/reporters";
import { run } from "node:test";
import process from "node:process";
import path from "node:path";

if (
  process.argv.includes("--marked") &&
  process.argv.includes("--markdown-it")
) {
  throw new Error("Run tests for only one target at a time");
}

const files = [
  path.resolve("./test/animation.js"),
  path.resolve("./test/highlight.js"),
];

if (process.argv.includes("--marked")) {
  run({ files, argv: ["--marked"] })
    .compose(spec)
    .pipe(process.stdout);
}

if (process.argv.includes("--markdown-it")) {
  run({ files, argv: ["--markdown-it"] })
    .compose(spec)
    .pipe(process.stdout);
}
