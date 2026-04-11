import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = join(__dirname, "dist");

// Clean dist folder
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true });
}
mkdirSync(outdir);

// Build
await esbuild.build({
  entryPoints: ["src/server.js"],
  bundle: true,
  platform: "node",
  target: "node20",
  outdir: outdir,
  format: "esm",
  sourcemap: true,
  external: ["node_modules"],
});

// Copy package.json
copyFileSync(join(__dirname, "package.json"), join(outdir, "package.json"));

// Copy .env.example if exists
if (existsSync(join(__dirname, ".env.example"))) {
  copyFileSync(join(__dirname, ".env.example"), join(outdir, ".env.example"));
}

console.log("Build complete! Output in dist/");