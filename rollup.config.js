// rollup.config.js
import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
// import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";
// import json from "@rollup/plugin-json";
import alias from "@rollup/plugin-alias";
import path from "node:path";

export default defineConfig(() => {
  const output_dir = "dist";

  function buildAliases(aliases) {
    return {
      entries: Object.entries(aliases).reduce((acc, [find, replacement]) => {
        return [...acc, { find, replacement }];
      }, []),
    };
  }

  const aliases = buildAliases({
    "@util": path.join(output_dir, "util"),
    "@models": path.join(output_dir, "models"),
    "@cli": path.join(output_dir, "cli"),
    "@commands": path.join(output_dir, "commands"),
    "@constants": path.join(output_dir, "constants"),
    "@interfaces": path.join(output_dir, "types", "interfaces"),
    "@paths": path.join(output_dir, "paths.ts"),
  });

  return {
    input: "src/index.ts",
    output: {
      format: "es",
      file: path.join(output_dir, "bundle.js"),
      inlineDynamicImports: true,
    },
    plugins: [typescript(), alias(aliases), commonjs()],
    logLevel: "silent",
  };
});
