// Shown in a GIF's frame when a GIPHY GIF can't be displayed (API path only). A plain box on purpose: the project
// ships no artwork, so there is nothing to mismatch. Style: .gf-unavailable in giphy.css.
(() => {
  window.Giphy.GiphyFallback = () => {
    const box = document.createElement("div");
    box.className = "gf-unavailable";
    box.textContent = "GIF unavailable";
    return box;
  };
})();
