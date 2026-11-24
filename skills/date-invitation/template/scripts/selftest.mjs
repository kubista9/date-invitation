// npm test: checks the safety-critical GIPHY helpers (input cleaning, request shape, error handling, no media URLs saved).
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const calls = [];
let next = { status: 200, body: { data: [] } };
const win = { GIPHY_API_KEY: "A".repeat(32) };
const ctx = vm.createContext({
  window: win, document: {}, URL, URLSearchParams, AbortController,
  fetch: async (url, opts) => { calls.push({ url: String(url), opts }); return { status: next.status, ok: next.status < 300, json: async () => next.body }; },
});
vm.runInContext(readFileSync(new URL("../giphy/giphy-core.js", import.meta.url), "utf8"), ctx);
const G = win.Giphy;
const kind = async (p) => { try { await p; return "none"; } catch (e) { return e.kind; } };

// cleaning
assert.equal(G.clean("<b>Hi</b>\u0000 there\n\n  you", 50), "bHi/b there you");
assert.equal(G.clean("x".repeat(500), 10).length, 10);
assert.equal(G.cleanSource("https://giphy.com/gifs/abc-123"), "https://giphy.com/gifs/abc-123");
for (const bad of ["http://giphy.com/x", "https://evilgiphy.com/x", "https://giphy.com.evil.com/x", "javascript:alert(1)", "nope"]) {
  assert.equal(G.cleanSource(bad), "", bad);
}
assert.ok(G.ID_RE.test("8geLUnJPuw2E8") && !G.ID_RE.test("../x") && !G.ID_RE.test("a b"));

// pasted links -> ID only
const ids = {
  "https://giphy.com/gifs/please-camera-8geLUnJPuw2E8": "8geLUnJPuw2E8",
  "https://giphy.com/gifs/swagrman-hi-pet-happy-dog-QUWfwKoKGcQRG2XdIn?x=1": "QUWfwKoKGcQRG2XdIn",
  "https://giphy.com/gifs/8geLUnJPuw2E8": "8geLUnJPuw2E8",
  "https://giphy.com/embed/8geLUnJPuw2E8/": "8geLUnJPuw2E8",
  "https://media.giphy.com/media/UuebWyG4pts3rboawU/giphy.gif": "UuebWyG4pts3rboawU",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3/UuebWyG4pts3rboawU/giphy.gif?cid=x": "UuebWyG4pts3rboawU",
  "http://giphy.com/gifs/x-8geLUnJPuw2E8": "",
  "https://evilgiphy.com/gifs/x-8geLUnJPuw2E8": "",
  "https://giphy.com/search/funny": "",
  "https://tenor.com/view/x-123456": "",
  "not a link": "",
};
for (const [link, id] of Object.entries(ids)) assert.equal(G.idFromLink(link), id, link);

// saved record: exact fields, never a media URL
const g = { id: "8geLUnJPuw2E8", title: "<Yay>", alt_text: "", username: "someone", url: "https://giphy.com/gifs/x-8geLUnJPuw2E8",
  images: { original: { url: "https://media2.giphy.com/media/v1.x/giphy.gif?cid=1&ep=2", mp4: "https://media2.giphy.com/m.mp4?cid=1&ep=2" } } };
const sel = G.toSelection(g);
assert.deepEqual(Object.keys(sel).sort(), ["alt", "id", "rendition", "selectedAt", "sourceUrl", "title", "username"]);
assert.ok(!JSON.stringify(sel).includes("media"));
assert.equal(sel.title, "Yay");
assert.equal(G.normalizeSelection({ id: "../etc" }), null);

// media URLs pass through untouched (query parameters kept); non-https is dropped
assert.equal(G.mediaFor(g, "original").mp4, g.images.original.mp4);
assert.equal(G.mediaFor({ images: { original: { url: "http://x/y.gif" } } }, "original").gif, "");

// search: safe-for-work, 24, English, encoded, not cached
next = { status: 200, body: { data: [g] } };
assert.equal((await G.searchGifs("  funny robot ")).length, 1);
const u = new URL(calls.at(-1).url);
assert.equal(u.pathname, "/v1/gifs/search");
assert.deepEqual([u.searchParams.get("q"), u.searchParams.get("rating"), u.searchParams.get("limit"), u.searchParams.get("lang")], ["funny robot", "g", "24", "en"]);
assert.equal(calls.at(-1).opts.cache, "no-store");
assert.equal(await kind(G.searchGifs("a")), "query");
await G.searchGifs("y".repeat(80));
assert.equal(new URL(calls.at(-1).url).searchParams.get("q").length, 50);

// by id
const before = calls.length;
assert.equal(await kind(G.getGif("../../x")), "notfound");
assert.equal(calls.length, before, "invalid IDs must not reach the network");
next = { status: 200, body: { data: g } };
assert.equal((await G.getGif("8geLUnJPuw2E8")).id, "8geLUnJPuw2E8");
assert.equal(new URL(calls.at(-1).url).searchParams.get("rating"), "g");
next = { status: 200, body: { data: [] } };
assert.equal(await kind(G.getGif("8geLUnJPuw2E8")), "notfound");
next = { status: 200, body: { data: { id: "someOtherId1" } } };
assert.equal(await kind(G.getGif("8geLUnJPuw2E8")), "notfound");
for (const [status, k] of [[404, "notfound"], [429, "rate"], [401, "config"], [500, "http"]]) {
  next = { status, body: {} };
  assert.equal(await kind(G.getGif("8geLUnJPuw2E8")), k, String(status));
}
win.GIPHY_API_KEY = "";
assert.equal(await kind(G.getGif("8geLUnJPuw2E8")), "config");
// choose-times: picked days -> config parts
const tw = { window: {} };
vm.runInNewContext(readFileSync(new URL("../choose-times-core.js", import.meta.url), "utf8"), tw);
const bo = tw.window.ChooseTimes.buildOutput;
const base = { timezone: "Europe/Amsterdam" };
let r = bo([{ date: "2026-12-13", tbd: true, period: "bogus", note: "free", activities: "" },
  { date: "2026-12-12", time: "19:00", location: "Utrecht", note: "", activities: " Cinema, <b>Dinner</b> ,, A walk " }], base);
// compared as JSON: objects built inside the vm have another realm's prototypes
assert.equal(JSON.stringify(r.json), JSON.stringify({ timezone: "Europe/Amsterdam", slots: [
  { start: "2026-12-12 19:00", location: "Utrecht", activities: ["Cinema", "bDinner/b", "A walk"] },
  { date: "2026-12-13", period: "evening", note: "free" }] }));
assert.match(bo([], base).error, /at least one/);
assert.match(bo([{ date: "2026-12-12", time: "" }], base).error, /Add a time/);
assert.match(bo([{ date: "2026-12-12", time: "25:00" }], base).error, /Add a time/);
assert.match(bo([{ date: "12/12/2026", time: "19:00" }], base).error, /not valid/);
assert.match(bo([{ date: "2026-12-12", time: "19:00" }], { timezone: "../x" }).error, /timezone/);
assert.equal(bo([{ date: "2026-12-12", time: "19:00", activities: Array(20).fill("x").join(",") }], base).json.slots[0].activities.length, 8);

console.log("giphy selftest: all checks passed");
