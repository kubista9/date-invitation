// Pure logic for choose-times.html: turns the picked days into the `timezone` and `slots` parts of config.js,
// or an error message. No page access here, so it can be tested (npm test).
(() => {
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const DATE_RE = /^\d{4}-\d\d-\d\d$/;
  const TZ_RE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/;
  const PERIODS = ["morning", "afternoon", "evening"];
  const clean = (s, max) =>
    String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

  // days: [{ date: "YYYY-MM-DD", time: "HH:MM", tbd, period, note, location, activities }]
  // settings: { timezone }  (the page uses the computer's timezone)
  function buildOutput(days, settings) {
    if (!days.length) return { error: "Pick at least one day." };
    const slots = [];
    for (const d of [...days].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
      if (!DATE_RE.test(String(d.date))) return { error: `That date is not valid: ${d.date}` };
      const slot = {};
      if (d.tbd) {
        slot.date = d.date;
        slot.period = PERIODS.includes(d.period) ? d.period : "evening";
      } else {
        if (!TIME_RE.test(String(d.time || ""))) return { error: `Add a time for ${d.date}, or tick "time to be decided".` };
        slot.start = `${d.date} ${d.time}`;
      }
      const note = clean(d.note, 120), location = clean(d.location, 80);
      if (note) slot.note = note;
      if (location) slot.location = location;
      const acts = (Array.isArray(d.activities) ? d.activities : String(d.activities || "").split(","))
        .map((a) => clean(a, 40)).filter(Boolean).slice(0, 8);
      if (acts.length) slot.activities = acts;
      slots.push(slot);
    }
    if (!TZ_RE.test(String(settings.timezone || ""))) return { error: "The timezone could not be read." };
    return { json: { timezone: settings.timezone, slots } };
  }

  window.ChooseTimes = { buildOutput };
})();
