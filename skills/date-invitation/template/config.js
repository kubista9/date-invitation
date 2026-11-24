// Example config. Edit by hand, or let the date-invitation skill interview you and write it.
window.CONFIG = {
  invitationId: "date-001",
  recipientName: "Alex",
  endpoint: "https://formspree.io/f/YOUR_FORM_ID", // your Formspree form link (public, not a secret)
  emailSubject: "A reply to your date invitation",
  timezone: "Europe/Amsterdam", // IANA name; slot times below are local times in this zone
  event: { title: "Our date", durationMinutes: 120, location: "To be confirmed" }, // length is not asked: 2 hours by default

  theme: "blush", // skin: blush (romantic pink) | christmas | valentine | midnight
  effect: "confetti", // confetti | hearts | stars | balloons | snow | roses

  // GIF slots. Empty ones show "Placeholder for your GIF" so you can't miss them; the build lists them.
  // To fill one: `giphy: { id, ... }` (run `npm run giphy-id -- <GIPHY link>`, or pick on choose-gif.html),
  // or `url` = your own clip in gifs/ (.mp4, .webm, .gif) or a direct link to one. Never paste media.giphy.com links.
  // `hide: true` removes the box for that page. If a GIF fetched through the API can't be shown, a "GIF unavailable" box appears instead.
  images: {
    open:    { url: "" },
    ask:     { url: "" },
    sad:     { url: "" },
    happy:   { url: "" },
    note:    { url: "" },
    success: { url: "" },
  },

  sadText: "So you don’t want to go on a date with me?",
  noMessages: [
    "Are you sure?",
    "Really sure?",
    "There might be hot chocolate involved.",
    "Pretty please?",
    "I promise I’m good company.",
    "I’ll even pick the place!",
    "Think about it once more…",
    "The dog is sad now. 🐶",
    "I’ll bring snacks.",
    "Okay, one last little ask.",
  ],

  // "YYYY-MM-DD HH:MM" = local time in `timezone`. "date" only = time to be decided (no calendar file).
  // Optional per slot: note, location, period ("morning"|"afternoon"|"evening"), food, drinks, activities.
  slots: [
    { start: "2026-12-12 19:00", note: "Dinner night" },
    { start: "2026-12-13 15:00", note: "Lazy Sunday", location: "Utrecht" },
    { date: "2026-12-18", note: "Free all day, time to be decided" },
  ],

  // Choices depend on the slot's time: before 12:00 morning, before 17:00 afternoon, else evening.
  // An empty activities list skips the activity step.
  menus: {
    morning: {
      food: ["Breakfast", "Brunch", "Pastry", "Surprise me"],
      drinks: ["Coffee", "Matcha", "Tea", "Hot chocolate"],
      activities: ["A walk", "Museum", "Market"],
    },
    afternoon: {
      food: ["Lunch", "Dessert", "Pancakes", "Surprise me"],
      drinks: ["Coffee", "Matcha", "Tea", "Hot chocolate"],
      activities: ["A walk", "Museum", "Cinema", "Board games"],
    },
    evening: {
      food: ["Dinner", "Dessert", "Tapas", "Street food", "Surprise me"],
      drinks: ["Cocktails", "Wine", "Beer", "Mocktails", "Matcha"],
      activities: ["Cinema", "Comedy night", "Bowling", "Live music"],
    },
  },
};
