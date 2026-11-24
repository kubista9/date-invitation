// Shows a saved GIPHY GIF by ID. Two ways, nothing is ever cached or stored:
//  - no API key (the default): GIPHY's own embed (giphy.com/embed/<id>) in a sandboxed frame. It needs only the ID.
//  - with an API key: ask the official API for the GIF and play the returned media URL untouched (with attribution).
// Anything that fails to load (API path) shows a plain "GIF unavailable" box instead of a broken image.
// Call .load() when the GIF is about to be seen (it only runs once).
(() => {
  const G = window.Giphy;
  const { el, clean, normalizeSelection, getGif, mediaFor, makeMedia, hasKey, GiphyAttribution, GiphyFallback } = G;

  G.GiphyGif = (selection) => {
    const sel = normalizeSelection(selection);
    const wrap = el("div", "gg-wrap");
    const frame = el("figure", "pic gg-frame"); // fixed square box, so nothing shifts while loading
    const slot = el("div", "gg-attr-slot");     // space reserved for the attribution
    wrap.append(frame, slot);
    let started = false;

    const fail = () => {
      frame.replaceChildren(GiphyFallback());
      slot.remove(); // no GIPHY GIF is shown, so no GIPHY attribution
    };

    const embed = () => {
      const f = el("iframe", "gg-embed");
      f.src = `https://giphy.com/embed/${sel.id}`;
      f.title = sel.alt;
      f.loading = "lazy";
      f.referrerPolicy = "strict-origin-when-cross-origin";
      f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
      frame.replaceChildren(f);
      slot.replaceChildren(GiphyAttribution({ username: sel.username, sourceUrl: sel.sourceUrl || `https://giphy.com/gifs/${sel.id}` }));
    };

    wrap.load = async () => {
      if (started) return;
      started = true;
      if (!sel) return fail();
      if (!hasKey()) return embed();
      try {
        const g = await getGif(sel.id);
        const media = makeMedia(mediaFor(g, sel.rendition), sel.alt, fail);
        if (!media) return fail();
        frame.replaceChildren(media);
        slot.replaceChildren(GiphyAttribution({
          username: clean(g.username, 60) || sel.username,
          sourceUrl: g.url || sel.sourceUrl,
        }));
      } catch { fail(); }
    };
    return wrap;
  };
})();
