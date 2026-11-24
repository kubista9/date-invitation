// GIPHY helpers shared by the picker and the invitation. Plain script, attaches to window.Giphy.
// Rules this file keeps: calls go straight from the browser to api.giphy.com (no proxy), nothing from GIPHY
// is cached or stored, returned media URLs are used exactly as received.
(() => {
  const API = "https://api.giphy.com/v1/gifs";
  const RENDITION = "original"; // saved with each selection; its mp4 is preferred at render time
  const LOGO_SRC = "giphy/assets/giphy-logo.png"; // official GIPHY mark, add it yourself (see README)
  const ID_RE = /^[A-Za-z0-9]{5,30}$/;

  const clean = (s, max) =>
    String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  const cleanSource = (u) => {
    try {
      const x = new URL(String(u));
      return x.protocol === "https:" && /(^|\.)giphy\.com$/.test(x.hostname) && x.href.length <= 300 ? x.href : "";
    } catch { return ""; }
  };
  // Accepts a GIPHY page, embed or media link and returns only the GIF ID ("" if it isn't one). The link itself is never kept.
  const idFromLink = (link) => {
    try {
      const u = new URL(String(link).trim());
      if (u.protocol !== "https:" || !/(^|\.)giphy\.com$/.test(u.hostname)) return "";
      const parts = u.pathname.split("/").filter(Boolean);
      let id = "";
      if (parts[0] === "media") id = parts.slice(1).find((x) => !x.startsWith("v1.")) || ""; // media[2].giphy.com/media/[v1.x/]<id>/giphy.gif
      else if (["gifs", "embed"].includes(parts[0]) && parts[1]) id = parts[1].split("-").pop(); // /gifs/<slug>-<id> or /gifs/<id>
      return ID_RE.test(id) ? id : "";
    } catch { return ""; }
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // kind: config (no/bad key) | rate | notfound | network | http | query
  class GiphyError extends Error {
    constructor(kind, status) { super(kind); this.kind = kind; this.status = status; }
  }

  async function call(path, params, signal) {
    const key = String(window.GIPHY_API_KEY || "").trim();
    if (!key) throw new GiphyError("config");
    const url = `${API}/${path}?${new URLSearchParams({ api_key: key, ...params })}`; // URL-encodes every value
    let res;
    try { res = await fetch(url, { signal, cache: "no-store" }); }
    catch (e) { if (e && e.name === "AbortError") throw e; throw new GiphyError("network"); }
    if (res.status === 429) throw new GiphyError("rate", 429);
    if (res.status === 401 || res.status === 403) throw new GiphyError("config", res.status);
    if (res.status === 400 || res.status === 404) throw new GiphyError("notfound", res.status);
    if (!res.ok) throw new GiphyError("http", res.status);
    try { return (await res.json()).data; } catch { throw new GiphyError("http", res.status); }
  }

  async function searchGifs(raw, signal) {
    const q = clean(raw, 50); // GIPHY allows 50 characters
    if (q.length < 2) throw new GiphyError("query");
    const data = await call("search", { q, limit: "24", rating: "g", lang: "en" }, signal);
    return Array.isArray(data) ? data : [];
  }

  async function getGif(id, signal) {
    if (typeof id !== "string" || !ID_RE.test(id)) throw new GiphyError("notfound");
    const data = await call(id, { rating: "g" }, signal);
    if (!data || Array.isArray(data) || data.id !== id) throw new GiphyError("notfound");
    return data;
  }

  // What we save: only these fields, never a media URL.
  const toSelection = (g) => ({
    id: g.id,
    title: clean(g.title, 120),
    alt: clean(g.alt_text || g.title || "Animated GIF", 200),
    username: clean(g.username, 60),
    sourceUrl: cleanSource(g.url),
    rendition: RENDITION,
    selectedAt: new Date().toISOString(),
  });
  // Re-sanitize on read, so a hand-edited config can't inject anything.
  const normalizeSelection = (s) =>
    s && typeof s.id === "string" && ID_RE.test(s.id)
      ? { id: s.id, title: clean(s.title, 120), alt: clean(s.alt || s.title || "Animated GIF", 200),
          username: clean(s.username, 60), sourceUrl: cleanSource(s.sourceUrl),
          rendition: clean(s.rendition, 30) || RENDITION, selectedAt: clean(s.selectedAt, 40) }
      : null;

  const https = (u) => (/^https:\/\//.test(String(u || "")) ? String(u) : ""); // used as-is, never rewritten
  const mediaFor = (g, rendition) => {
    const r = (g.images && (g.images[rendition] || g.images.original)) || {};
    return { mp4: https(r.mp4), gif: https(r.url) };
  };
  const thumbFor = (g) => {
    const r = (g.images && (g.images.fixed_width_small || g.images.fixed_width || g.images.original)) || {};
    return https(r.url);
  };

  // A looping, muted clip (mp4 preferred, GIF otherwise). Returns null if there is no usable URL.
  function makeMedia(m, alt, onError) {
    let n;
    if (m.mp4) {
      n = el("video");
      n.src = m.mp4;
      n.autoplay = n.loop = n.muted = n.playsInline = true;
      n.setAttribute("role", "img");
      n.setAttribute("aria-label", alt);
    } else if (m.gif) {
      n = el("img");
      n.src = m.gif;
      n.alt = alt;
    } else return null;
    n.addEventListener("error", onError);
    return n;
  }

  window.Giphy = Object.assign(window.Giphy || {}, {
    RENDITION, LOGO_SRC, ID_RE, GiphyError, clean, cleanSource, idFromLink, el, searchGifs, getGif,
    toSelection, normalizeSelection, mediaFor, thumbFor, makeMedia,
    hasKey: () => !!String(window.GIPHY_API_KEY || "").trim(),
  });
})();
