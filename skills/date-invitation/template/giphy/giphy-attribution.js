// "Powered by GIPHY" + official logo + the GIF's creator, wherever a GIPHY GIF or the picker is shown.
(() => {
  const { el, clean, cleanSource, LOGO_SRC } = window.Giphy;

  const link = (href, text) => {
    const a = el("a", "", text);
    a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
    return a;
  };

  window.Giphy.GiphyAttribution = ({ username, sourceUrl } = {}) => {
    const root = el("div", "gg-attr");
    const who = clean(username, 60), src = cleanSource(sourceUrl);
    if (who || src) {
      const p = el("p", "gg-credit", "GIF ");
      if (who) p.append("by ", src ? link(src, "@" + who) : "@" + who);
      else p.append(link(src, "on GIPHY"));
      root.append(p);
    }
    const powered = el("p", "gg-powered");
    // The official badge already reads "Powered by GIPHY", so the text only shows if the badge file is missing.
    const logo = el("img");
    const text = el("span", "", "Powered by GIPHY");
    logo.src = LOGO_SRC; logo.alt = "Powered by GIPHY"; logo.width = 133; logo.height = 28; // keeps the badge's 200:42 ratio
    logo.addEventListener("load", () => text.remove());
    logo.addEventListener("error", () => logo.remove());
    powered.append(logo, text);
    root.append(powered);
    return root;
  };
})();
