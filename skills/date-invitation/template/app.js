(() => {
  const C = window.CONFIG;
  const TZ = C.timezone;
  const $ = (s) => document.querySelector(s);
  document.documentElement.dataset.theme = C.theme || "blush"; // skin: blush | christmas | valentine | midnight
  const state = { slot: null, food: new Set(), drinks: new Set(), activity: "", note: "" };
  const title = `${C.recipientName}, will you go on a date with me?`;

  // --- time helpers: "YYYY-MM-DD HH:MM" is local time in TZ; strings with Z/offset are used as-is.
  const offsetMs = (ms) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(ms).map((x) => [x.type, +x.value]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  };
  // shortcut: times inside a DST gap resolve to the nearest valid instant, fine for invitations.
  const instant = (str) => {
    if (/(Z|[+-]\d\d:\d\d)$/i.test(str)) return new Date(str);
    const guess = Date.parse(str.replace(" ", "T") + ":00Z");
    return new Date(guess - offsetMs(guess - offsetMs(guess)));
  };
  const fmt = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
  const dateStr = (ymd) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric",
    month: "long", year: "numeric" }).format(new Date(ymd + "T12:00:00Z"));

  C.slots.forEach((s) => (s.at = s.start ? instant(s.start) : null));
  const label = (s) => (s.at ? fmt(s.at) : dateStr(s.date));
  const when = (s) => (s.at ? fmt(s.at) : `${dateStr(s.date)} (time to be decided)`);
  const period = (s) => s.period || (s.at
    ? ((h) => (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"))(
        +new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(s.at))
    : "afternoon");
  const menu = (s, k) => s[k] || C.menus[period(s)][k];
  const hasActs = () => menu(state.slot, "activities").length > 0;

  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    kids.forEach((k) => e.append(k));
    return e;
  };

  // --- navigation
  function setLabels() {
    const order = ["date", "food", ...(!state.slot || hasActs() ? ["activity"] : []), "note"];
    document.querySelectorAll("[data-step] .label[data-n]").forEach((l) => {
      const i = order.indexOf(l.closest("[data-step]").dataset.step);
      if (i >= 0) l.textContent = `Step ${i + 1} of ${order.length}`; // skipped steps keep no label
    });
  }
  function show(id) {
    document.querySelectorAll("[data-step]").forEach((s) => (s.hidden = s.dataset.step !== id));
    const h = document.querySelector(`[data-step="${id}"] h1, [data-step="${id}"] h2`);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
    if (window.Giphy) loadGifs(id);
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

  // --- celebration effect
  const FX = { confetti: ["🎉", "✨", "💖", "🌸"], hearts: ["💖", "💗", "💕", "❤️"],
    stars: ["⭐", "✨", "🌟", "💫"], balloons: ["🎈", "🎈", "🎉", "🎈"],
    snow: ["❄️", "✨", "🎄", "⭐"], roses: ["🌹", "💖", "🌸", "💗"] };
  function burst() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = $("#confetti"), set = FX[C.effect] || FX.confetti;
    box.dataset.fx = C.effect;
    for (let i = 0; i < 28; i++) {
      const s = el("span", { textContent: set[i % set.length] });
      s.style.left = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 0.6 + "s";
      box.append(s);
      setTimeout(() => s.remove(), 3500);
    }
  }

  // --- titles + images
  document.querySelectorAll("[data-title]").forEach((e) => (e.textContent = title));
  $("#sadText").textContent = C.sadText;
  // GIF slots: a saved GIPHY GIF (looked up by ID when the page is about to be seen), your own file or link,
  // or a written placeholder (hide: true removes the box). A GIF that fails shows a "GIF unavailable" box, never a broken image.
  const G = window.Giphy;
  const unavailable = (f) => G && f.replaceChildren(G.GiphyFallback());
  document.querySelectorAll("[data-img]").forEach((f) => {
    const page = f.dataset.img, { url, giphy, hide } = C.images[page];
    const fail = function () { this.remove(); unavailable(f); }; // a clip that failed to load
    if (giphy && G) f.replaceWith(G.GiphyGif(giphy)); // loaded in show()
    else if (!url && hide) f.remove(); // the creator chose to leave this page without a GIF
    else if (!url) { f.classList.add("gif-placeholder"); f.textContent = "Placeholder for your GIF"; }
    else if (/\.(mp4|webm)(\?|$)/i.test(url)) // short looping clips: ~30x smaller than a GIF
      f.append(el("video", { src: url, autoplay: true, loop: true, muted: true, playsInline: true, onerror: fail }));
    else f.append(el("img", { src: url, alt: "", onerror: fail }));
  });
  const loadGifs = (id) => document.querySelectorAll(`[data-step="${id}"] .gg-wrap`).forEach((w) => w.load());
  loadGifs("open");

  // --- Yes / No (size caps keep the layout safe on phones)
  let no = 0;
  const resetNo = () => {
    no = 0; $("#noMsg").textContent = "";
    ["yes", "no"].forEach((id) => ($("#" + id).style.cssText = ""));
  };
  $("#no").addEventListener("click", () => {
    if (no >= C.noMessages.length) return show("sad");
    no++;
    $("#noMsg").textContent = C.noMessages[no - 1];
    $("#yes").style.fontSize = Math.min(1 + no * 0.1, 1.7) + "rem";
    $("#yes").style.padding = `${Math.min(0.75 + no * 0.06, 1.2)}em ${Math.min(1.5 + no * 0.2, 2.4)}em`;
    $("#no").style.fontSize = Math.max(1 - no * 0.04, 0.8) + "rem";
  });
  $("#tryAgain").addEventListener("click", () => { resetNo(); show("ask"); });
  $("#yes").addEventListener("click", () => { show("happy"); burst(); });

  // --- options
  function option(type, name, value, text, onChange) {
    const input = el("input", { type, name, value });
    input.addEventListener("change", () => onChange(input));
    return { input, node: el("label", { className: "opt" }, input, el("b", { textContent: text })) };
  }

  C.slots.forEach((s) => {
    const o = option("radio", "slot", s.start || s.date, label(s), () => { state.slot = s; renderMenus(); });
    if (s.note) o.node.append(el("small", { textContent: s.note }));
    $("#slots").append(o.node);
  });
  $("#dateNext").addEventListener("click", () => {
    if (!state.slot) { $("#dateErr").textContent = "Please pick one option."; return; }
    $("#dateErr").textContent = ""; show("food");
  });

  // Food, drinks and activities depend on the chosen slot.
  function chips(box, list, set, name) {
    [...set].forEach((v) => !list.includes(v) && set.delete(v));
    box.replaceChildren(...list.map((v) => {
      const o = option("checkbox", name, v, v, (i) => (i.checked ? set.add(v) : set.delete(v)));
      o.input.checked = set.has(v);
      return o.node;
    }));
    box.closest(".grp").hidden = !list.length;
  }
  function renderMenus() {
    const s = state.slot, acts = menu(s, "activities");
    chips($("#food"), menu(s, "food"), state.food, "food");
    chips($("#drinks"), menu(s, "drinks"), state.drinks, "drink");
    if (!acts.includes(state.activity)) state.activity = "";
    $("#acts").replaceChildren(...acts.map((a) => {
      const o = option("radio", "act", a, a, () => (state.activity = a));
      o.input.checked = a === state.activity;
      return o.node;
    }));
    setLabels();
  }
  setLabels();

  $("#foodNext").addEventListener("click", () => show(hasActs() ? "activity" : "note"));
  $("#noteBack").addEventListener("click", () => show(hasActs() ? "activity" : "food"));
  $("#actNext").addEventListener("click", () => {
    if (!state.activity) { $("#actErr").textContent = "Please pick one option."; return; }
    $("#actErr").textContent = ""; show("note");
  });
  $("#note").addEventListener("input", (e) => (state.note = e.target.value.trim()));

  // --- summary
  const list = (set) => [...set].join(", ") || "No preference";
  const plan = () => [
    ["When", when(state.slot)],
    ["Food", list(state.food)],
    ["Drinks", list(state.drinks)],
    ...(hasActs() ? [["Activity", state.activity]] : []),
    ["Note", state.note || "—"],
  ];
  const fill = (dl) => {
    dl.replaceChildren();
    plan().forEach(([k, v]) => dl.append(el("dt", { textContent: k }), el("dd", { textContent: v })));
  };
  $("#toReview").addEventListener("click", () => { fill($("#reviewList")); show("review"); });

  // --- send (success only when the endpoint confirms)
  $("#send").addEventListener("click", async () => {
    const btn = $("#send"), err = $("#sendErr");
    err.textContent = "";
    if (!C.endpoint || /YOUR_FORM_ID/.test(C.endpoint)) { err.textContent = "The form endpoint isn’t configured yet, so nothing was sent."; return; }
    btn.disabled = true; btn.textContent = "Sending…";
    const s = state.slot;
    try {
      const res = await fetch(C.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: C.emailSubject,
          invitation_id: C.invitationId,
          response: "yes",
          recipient_name: C.recipientName,
          selected_date: s.at ? `${when(s)} (${s.at.toISOString()})` : when(s),
          timezone: TZ,
          alternative_time: "",
          food_choices: [...state.food].join(", "),
          drink_choices: [...state.drinks].join(", "),
          activity: state.activity,
          custom_activity: "",
          note: state.note,
          submitted_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(res.status);
      fill($("#finalList")); showIcs(); show("success"); burst();
    } catch {
      err.textContent = "Hmm, that didn’t go through. Your answers are saved here, please try again.";
      btn.disabled = false; btn.textContent = "Send my answer";
    }
  });

  // --- .ics: only for a specific time; written in UTC so no timezone label is wrong
  function showIcs() {
    const s = state.slot;
    if (!s || !s.at) return;
    const z = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const end = new Date(+s.at + C.event.durationMinutes * 60000);
    const esc = (t) => t.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//date-invite//EN", "BEGIN:VEVENT",
      `UID:${C.invitationId}@date-invite`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(s.at)}`, `DTEND:${z(end)}`,
      `SUMMARY:${esc(C.event.title)}`, `LOCATION:${esc(s.location || C.event.location)}`,
      `DESCRIPTION:${esc(plan().slice(1, -1).map((p) => p.join(": ")).join("\n"))}`,
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = $("#ics");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "date.ics"; a.hidden = false;
  }
})();
