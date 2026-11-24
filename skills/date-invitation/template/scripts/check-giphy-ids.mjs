// Daily availability check for saved GIPHY GIFs (run by .github/workflows/check-giphy-ids.yml).
// Reads every config.js in the repo, asks GIPHY's "Get GIF by ID" endpoint about each saved ID, and writes
// giphy-report.json (IDs and status codes only: no API responses, no media URLs). It never edits or deletes data.
//   node scripts/check-giphy-ids.mjs             run the check
//   node scripts/check-giphy-ids.mjs --markdown  print the last report as an issue body
import { readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ID_RE = /^[A-Za-z0-9]{5,30}$/;
const REPORT = "giphy-report.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function* configFiles(dir = ".") {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* configFiles(p);
    else if (e.name === "config.js") yield p;
  }
}

function savedIds() {
  const found = [];
  for (const file of configFiles()) {
    const sandbox = { window: {} };
    try { vm.runInNewContext(readFileSync(file, "utf8"), sandbox, { timeout: 1000 }); } catch { continue; }
    for (const [page, v] of Object.entries(sandbox.window.CONFIG?.images || {})) {
      if (v?.giphy?.id) found.push({ id: String(v.giphy.id), file, page });
    }
  }
  return found;
}

if (process.argv.includes("--markdown")) {
  const r = JSON.parse(readFileSync(REPORT, "utf8"));
  const rows = (list) => list.map((x) => `| \`${x.id}\` | ${x.file} | ${x.page} | ${x.status} |`).join("\n");
  console.log(`These saved GIPHY GIFs are no longer available (checked ${r.checkedAt}).\n\n` +
    `| GIF ID | File | Page | Status |\n|---|---|---|---|\n${rows(r.failed)}\n\n` +
    `Those pages show the fallback animation instead. Nothing was changed or deleted. ` +
    `Pick a new GIF on \`choose-gif.html\` and update \`config.js\`.` +
    (r.unchecked.length ? `\n\nNot checked (rate limit or network): ${r.unchecked.length}.` : ""));
  process.exit(0);
}

const key = process.env.GIPHY_API_KEY || "";
const ids = savedIds();
let keyRejected = false;
const report = { checkedAt: new Date().toISOString(), skipped: "", total: 0, ok: 0, failed: [], unchecked: [] };
const byId = new Map();
for (const s of ids) byId.set(s.id, [...(byId.get(s.id) || []), s]);
report.total = byId.size;

if (!byId.size) report.skipped = "no saved GIPHY IDs found";
else if (!key) report.skipped = "GIPHY_API_KEY secret is not set";
else {
  let limited = false;
  for (const [id, where] of byId) {
    const mark = (list, status) => where.forEach((w) => list.push({ ...w, status }));
    if (limited) { mark(report.unchecked, "not checked (rate limit)"); continue; }
    if (!ID_RE.test(id)) { mark(report.failed, "invalid id"); continue; }
    try {
      const url = `https://api.giphy.com/v1/gifs/${id}?${new URLSearchParams({ api_key: key, rating: "g" })}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 429) { limited = true; mark(report.unchecked, "rate limited"); }
      else if (res.status === 401 || res.status === 403) { keyRejected = true; mark(report.unchecked, "API key rejected"); }
      else if (res.status === 404 || res.status === 400) mark(report.failed, res.status);
      else if (!res.ok) mark(report.unchecked, res.status);
      else {
        const { data } = await res.json();
        if (data && !Array.isArray(data) && data.id === id) report.ok++;
        else mark(report.failed, "removed");
      }
    } catch { mark(report.unchecked, "network error"); }
    await sleep(300); // be gentle: a beta key allows 100 calls an hour
  }
}

writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
console.log(report.skipped
  ? `Skipped: ${report.skipped}.`
  : `Checked ${report.total} GIF(s): ${report.ok} ok, ${report.failed.length} failed, ${report.unchecked.length} not checked.`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `failed=${report.failed.length}\n`);
if (keyRejected) { // fail the run so GitHub notifies the owner: a bad key means nothing is being checked
  console.error("GIPHY rejected the API key. Fix the GIPHY_API_KEY secret.");
  process.exitCode = 1;
}
