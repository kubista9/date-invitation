// Optional, user-initiated GIPHY picker (modal). No request is made until the user types a search.
// Results are shown in the order GIPHY returns them, never mixed with other providers, never cached:
// closing the modal clears them. Only the selection record (no media URL) is handed to onSelect.
(() => {
  const G = window.Giphy;
  const { el, clean, searchGifs, toSelection, mediaFor, thumbFor, makeMedia, hasKey,
    GiphyAttribution, GiphyGif, GiphyFallback } = G;

  const MSG = {
    network: "Couldn’t reach GIPHY. Check your connection.",
    rate: "GIPHY is busy right now (rate limit). Please try again in a little while.",
    config: "GIF search isn’t set up yet (missing or invalid API key).",
    http: "GIPHY had a problem. Please try again.",
    query: "Type at least 2 letters to search.",
  };
  const btn = (cls, text, onClick) => {
    const b = el("button", cls, text);
    b.type = "button";
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };
  let uid = 0;

  G.GiphyPicker = ({ selection = null, onSelect = () => {}, onRemove = () => {}, 
    title = "Choose a GIF (optional)" } = {}) => {
    const id = ++uid;
    let current = G.normalizeSelection(selection), ctrl = null, timer = 0, lastQuery = "", results = [], lastTile = null;

    const root = el("section", "gp");
    const currentBox = el("div", "gp-current");
    const openBtn = btn("btn ghost gp-open", "Search GIPHY");

    // --- modal
    const dlg = el("dialog", "gp-dialog");
    dlg.setAttribute("aria-labelledby", `gp-title-${id}`);
    const heading = el("h2", "", "Search GIPHY");
    heading.id = `gp-title-${id}`;
    const closeBtn = btn("btn ghost gp-close", "Close");
    const form = el("form", "gp-search");
    form.setAttribute("role", "search");
    const label = el("label", "", "Search GIPHY");
    label.className = "sr-only"; label.htmlFor = `gp-q-${id}`;
    const input = el("input");
    Object.assign(input, { id: `gp-q-${id}`, type: "search", maxLength: 50, autocomplete: "off",
      placeholder: "Try “excited”, “celebration” or “funny robot”" });
    form.append(label, input);
    const status = el("div", "gp-status");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const grid = el("div", "gp-grid");
    grid.setAttribute("role", "group"); grid.setAttribute("aria-label", "GIF results");
    const resultsView = el("div", "gp-results");
    resultsView.append(form, status, grid);
    const preview = el("div", "gp-preview");
    preview.hidden = true;
    const footer = el("div", "gp-foot");
    footer.append(GiphyAttribution());
    const body = el("div", "gp-body");
    body.append(resultsView, preview);
    const inner = el("div", "gp-inner");
    const head = el("div", "gp-head");
    head.append(heading, closeBtn);
    inner.append(head, body, footer);
    dlg.append(inner);

    // --- current selection (rendered by ID, like the invitation does)
    const renderCurrent = () => {
      currentBox.replaceChildren();
      if (!current) { openBtn.textContent = "Search GIPHY"; return; }
      const gif = GiphyGif(current);
      currentBox.append(gif, btn("btn ghost gp-remove", "Remove GIF", () => {
        current = null; renderCurrent(); onRemove(); openBtn.focus();
      }));
      gif.load();
      openBtn.textContent = "Choose a different GIF";
    };

    // --- search
    const setStatus = (msg, retry) => {
      status.replaceChildren(msg);
      if (retry) status.append(" ", btn("btn ghost gp-retry", "Try again", () => run(lastQuery)));
    };
    const skeleton = () =>
      grid.replaceChildren(...Array.from({ length: 24 }, () => el("div", "gp-tile skel")));

    function renderGrid() {
      grid.replaceChildren(...results.map((g) => {
        const t = btn("gp-tile");
        t.setAttribute("aria-label", clean(g.alt_text || g.title || "GIF", 120));
        const url = thumbFor(g);
        if (url) {
          const img = el("img");
          Object.assign(img, { src: url, alt: "", width: 120, height: 120 });
          img.addEventListener("error", () => img.remove());
          t.append(img);
        }
        t.addEventListener("click", () => { lastTile = t; showPreview(g); });
        return t;
      }));
    }

    async function run(raw) {
      const q = clean(raw, 50);
      lastQuery = q;
      if (ctrl) ctrl.abort();
      if (q.length < 2) { grid.replaceChildren(); setStatus(String(raw).trim() ? MSG.query : ""); return; }
      const mine = (ctrl = new AbortController());
      setStatus("Searching…"); skeleton();
      try {
        results = await searchGifs(q, mine.signal);
        if (mine.signal.aborted) return;
        if (!results.length) { grid.replaceChildren(); setStatus(`No GIFs found for “${q}”. Try another word.`); return; }
        setStatus(""); renderGrid();
      } catch (e) {
        if (e && e.name === "AbortError") return;
        grid.replaceChildren();
        setStatus(MSG[e.kind] || MSG.http, e.kind !== "config" && e.kind !== "query");
      }
    }

    // arrow keys move between results
    grid.addEventListener("keydown", (e) => {
      const tiles = [...grid.querySelectorAll("button.gp-tile")];
      const i = tiles.indexOf(document.activeElement);
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (i < 0 || !step) return;
      e.preventDefault();
      (tiles[i + step] || tiles[i]).focus();
    });
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => run(input.value), 400); });
    form.addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(timer); run(input.value); });

    // --- preview step ("Use this GIF")
    function showPreview(g) {
      const alt = clean(g.alt_text || g.title || "Animated GIF", 200);
      const frame = el("figure", "pic gp-pic");
      const media = makeMedia(mediaFor(g, G.RENDITION), alt, () => frame.replaceChildren(GiphyFallback()));
      frame.append(media || GiphyFallback());
      const back = btn("btn ghost", "Back to results", () => {
        preview.hidden = true; resultsView.hidden = false; if (lastTile) lastTile.focus();
      });
      const use = btn("btn primary", "Use this GIF", () => {
        current = toSelection(g);
        renderCurrent(); onSelect(current); closeDialog(); openBtn.focus();
      });
      const row = el("div", "nav");
      row.append(back, use);
      preview.replaceChildren(frame, el("p", "gp-title", clean(g.title, 120)),
        GiphyAttribution({ username: g.username, sourceUrl: g.url }), row);
      resultsView.hidden = true; preview.hidden = false;
      use.focus();
    }

    // --- open / close
    openBtn.addEventListener("click", () => {
      dlg.showModal();
      input.disabled = !hasKey();
      if (input.disabled) { setStatus(MSG.config); return; }
      input.focus();
    });
    // Nothing from GIPHY is kept once the modal is closed. Cleanup runs right away where we close the modal;
    // the 'close' event (Esc key) calls it too, and does nothing if the modal was reopened in the meantime.
    const cleanup = () => {
      if (dlg.open) return;
      if (ctrl) ctrl.abort();
      clearTimeout(timer);
      results = []; lastTile = null; input.value = "";
      grid.replaceChildren(); status.replaceChildren(); preview.replaceChildren();
      preview.hidden = true; resultsView.hidden = false;
      openBtn.focus();
    };
    const closeDialog = () => { dlg.close(); cleanup(); };
    closeBtn.addEventListener("click", closeDialog);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(); }); // click on the backdrop
    dlg.addEventListener("close", cleanup);

    root.append(el("h3", "", title),
      el("p", "gp-hint", "Optional. Search GIPHY and pick a GIF. Nothing is searched until you do."),
      currentBox, openBtn, dlg);
    root.setSelection = (s) => { current = G.normalizeSelection(s); renderCurrent(); };
    root.getSelection = () => current;
    renderCurrent();
    return root;
  };
})();
