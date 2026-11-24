// npm run giphy-id -- <GIPHY link>   -> prints the `giphy` entry for config.js (the ID only, never a media URL).
// Title, creator and alt text are looked up from GIPHY when the invitation is viewed.
import vm from "node:vm";
import { readFileSync } from "node:fs";

const win = {};
vm.runInNewContext(readFileSync(new URL("../giphy/giphy-core.js", import.meta.url), "utf8"),
  { window: win, document: {}, URL, URLSearchParams, fetch: () => {} });
const link = process.argv[2] || "";
const id = win.Giphy.idFromLink(link);
if (!id) {
  console.error("That is not a GIPHY GIF link. Use a link like https://giphy.com/gifs/your-gif-here-<id> (short gph.is links need to be opened first).");
  process.exit(1);
}
const page = win.Giphy.cleanSource(link);
console.log(JSON.stringify({ id, sourceUrl: page.includes("/gifs/") ? page.split("?")[0] : `https://giphy.com/gifs/${id}`,
  rendition: "original", selectedAt: new Date().toISOString() }, null, 2));
