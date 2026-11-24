// npm run env   -> writes giphy-env.js from GIPHY_API_KEY (environment variable, or a local .env file)
// npm run build -> same, then copies only what the website needs into dist/ (never .env, scripts or .github)
// The GIPHY key ends up in the page: that is how browser-side GIPHY calls work, so use a key made for this app.
import { readFileSync, writeFileSync, existsSync, rmSync, cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { basename } from "node:path";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

let key = process.env.GIPHY_API_KEY || "";
if (!key && existsSync(".env")) {
  const m = readFileSync(".env", "utf8").match(/^\s*GIPHY_API_KEY\s*=\s*(.*?)\s*$/m);
  if (m) key = m[1].replace(/^["']|["']$/g, "");
}
if (key && !/^[A-Za-z0-9]{16,64}$/.test(key)) {
  console.error("GIPHY_API_KEY does not look like a GIPHY key (letters and digits only). Nothing written.");
  process.exit(1);
}
if (!key) console.log("No GIPHY_API_KEY: fine. GIPHY GIFs use GIPHY's embed. (A key only turns on GIF search in choose-gif.html.)");
writeFileSync("giphy-env.js", `window.GIPHY_API_KEY = ${JSON.stringify(key)};\n`);

if (!process.argv.includes("--env-only")) {
  // remind about GIF slots that still show the written placeholder
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync("config.js", "utf8"), sandbox, { timeout: 1000 });
  const empty = Object.entries(sandbox.window.CONFIG?.images || {})
    .filter(([, v]) => !v.url && !v.giphy?.id && !v.hide).map(([page]) => page);
  if (empty.length) console.warn(`"Placeholder for your GIF" still shows on: ${empty.join(", ")}. Add a GIF (your own clip is safest) or set hide: true.`);
  rmSync("dist", { recursive: true, force: true });
  mkdirSync("dist");
  const skip = (src) => !src.endsWith(".d.ts") && !basename(src).startsWith("."); // no dotfiles (.env, .impeccable, .gitkeep) ever ship
  for (const f of ["index.html", "style.css", "app.js", "config.js", "giphy-env.js", "giphy", "gifs"]) {
    cpSync(f, `dist/${f}`, { recursive: true, filter: skip });
  }
  console.log("Built dist/. Upload that folder, not this one.");
}
