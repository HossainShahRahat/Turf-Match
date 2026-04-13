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

// Build backend
await esbuild.build({
  entryPoints: ["backend/src/server.js"],
  bundle: true,
  packages: "external",
  platform: "node",
  target: "node20",
  outdir: outdir,
  format: "esm",
  sourcemap: true,
});

// Copy backend package.json
copyFileSync(join(__dirname, "backend/package.json"), join(outdir, "package.json"));

console.log("Backend build complete! Output in dist/");
