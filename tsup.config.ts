import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/notslop.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  shims: true,
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
  minify: false,
  dts: false,
});
