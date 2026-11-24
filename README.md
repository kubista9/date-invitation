# Date invitation template

A small, free, static website: a playful date invitation with a growing Yes button, a "No" that runs out of excuses, a plan builder (date, food, drinks, activity, note) and a calendar file. Plain HTML, CSS and JS. No build step, no dependencies.

## Use it with an AI agent

[skills/date-invitation/SKILL.md](skills/date-invitation/SKILL.md) is a Claude Code skill (this repo is a Claude Code plugin). Any other coding agent can follow it too. The agent interviews you one question at a time (name, skin, dates with a place, activities and note for each, food and drinks, GIF links), writes `config.js`, checks the site and deploys it to Netlify. You only answer questions and sign up for the free accounts it opens for you.

## Use it by hand

1. Copy `skills/date-invitation/template/` and edit its `config.js`.
2. Open its `index.html` to preview.
3. Run `npm run build` and host the `dist/` folder on any static host (Netlify: drag it onto `app.netlify.com/drop`).
4. Replies arrive by email through a free [Formspree](https://formspree.io) form. Put your form link in `config.js` as `endpoint`.

## Files

| Path | What it is |
|---|---|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `skills/date-invitation/SKILL.md` | The interview and deploy instructions for the agent |
| `skills/date-invitation/template/` | The invitation website: `index.html`, `style.css`, `app.js`, `config.js` (all the content), `choose-times.html` (calendar picker for dates and times), `choose-gif.html` and `giphy/` (the optional GIPHY picker), `scripts/` and `.github/workflows/` (build and the daily GIPHY check), and an empty `gifs/` folder for your own clips |

## Notes

- Times in `config.js` are local to `timezone` (the agent uses your computer's). The calendar file is written in UTC, so it is right in every timezone. The date length is not asked: it is 2 hours (`event.durationMinutes`).
- Four skins: `blush` (romantic pink, the default), `christmas`, `valentine` and `midnight` (dark). Set `theme` in `config.js`, and pick an `effect` to match (`confetti`, `hearts`, `stars`, `balloons`, `snow`, `roses`).
- Each date has its own place, activities and note. `choose-times.html` is a calendar page for picking them by clicking.
- Food, drinks and activities change with the time of day. Edit `menus` or override per date.
- No GIFs ship with the template. Every empty GIF slot shows a box that reads "Placeholder for your GIF", and `npm run build` lists the ones left. Fill a slot with a clip you filmed (put it in `gifs/`), a pasted GIPHY link (no account or key needed, see below), or a direct link to a file. Use `hide: true` in `config.js` to remove a page's box. If a GIF fetched through the API can't be displayed, a plain "GIF unavailable" box shows instead. The project ships no artwork of its own: you supply the clips.
- The page says the answer is on its way only when Formspree accepts it. That is not proof the email arrived: send a test and check spam.

## GIPHY GIFs

### The simple way: paste a link (no account, no key)

Open a GIF on giphy.com, copy its page link, and run `npm run giphy-id -- "https://giphy.com/gifs/your-gif-here"`. It prints the entry (the ID only, never a media URL); put it in `images.<page>.giphy` in `config.js`. The invitation then shows the GIF with GIPHY's own embed, which needs only the ID.

### Optional: an API key, for searching

With a free key from [developers.giphy.com](https://developers.giphy.com/) (create an app, choose **API**) you also get a search page and the official API rendering:

1. Copy `.env.example` to `.env` and put the key in it. Never commit `.env` (it is in `.gitignore`).
2. `npm run env`, serve the folder (for example `python3 -m http.server`) and open `choose-gif.html`. It only searches when you type. Pick a page, search, preview, press **Use this GIF**, then copy the JSON it shows into `config.js`.

A new key is a *beta* key, limited to 100 calls an hour; GIPHY must approve a production key for more. With a key in the build, the page uses the API instead of the embed (GIF removed or rate-limited: a "GIF unavailable" box shows instead of a broken image).

| Variable | Where | Used by |
|---|---|---|
| `GIPHY_API_KEY` | `.env` or your shell | `npm run env` / `npm run build` write it into `giphy-env.js` (not committed) for the page |
| `GIPHY_API_KEY` | GitHub repository secret | the daily check workflow |

The key ends up in the web page. That is how GIPHY's browser-side API works, which is why you should use a key made for this app and watch its usage. The build refuses a value that does not look like a key.

### Why the app does not download or rehost GIFs

GIPHY's rules say not to cache or store its media or API responses, not to rewrite media URLs, and to call the API from the browser. So the app saves only a small record per GIF (ID, title, alt text, creator, page link, rendition, timestamp) and never a media URL. Every time the invitation is viewed, the visitor's browser loads the GIF straight from GIPHY (its embed by ID, or the API with a key, playing the returned URL untouched). Nothing is proxied through a server, and search results are cleared when the picker closes. With an API key, if the GIF was removed, GIPHY is rate-limiting, or the network fails, the invitation shows a "GIF unavailable" box instead of a broken image. The embed can't report failures, so a removed GIF shows GIPHY's own message there.

### Attribution (required)

Wherever the picker or a GIPHY GIF appears, the app shows "Powered by GIPHY", the GIPHY logo, and a link to the GIF's GIPHY page (plus the creator's name when GIPHY provides it). It does not mix GIPHY results with other providers, and it does not suggest GIPHY endorses or is affiliated with this project.

The official "Powered by GIPHY" badge is included at `giphy/assets/giphy-logo.png`, taken from GIPHY's attribution marks (`media.giphy.com/giphy-attribution-marks.zip`, the light-background horizontal badge). It is GIPHY's trademark, provided for attribution only, and is **not** covered by this repository's MIT licence. You can swap in another variant from that zip (same file name) to suit your background. Follow GIPHY's current terms and brand guidelines.

### Daily availability check

`.github/workflows/check-giphy-ids.yml` runs every day (and on demand). It reads every `config.js` in the repository, asks GIPHY's *Get GIF by ID* endpoint about each saved ID, and writes `giphy-report.json` (IDs and status codes only) as a build artifact. If any GIF is gone, it opens a GitHub issue (or comments on the open one). It never edits or deletes anything. A rate limit or network error is reported as "not checked", not as a failure, and a rejected key fails the run so GitHub notifies you. Add the `GIPHY_API_KEY` repository secret for it to work. The workflow only runs if this template folder is the root of the GitHub repository.

`npm test` checks the input cleaning, the request shape and the error handling.
