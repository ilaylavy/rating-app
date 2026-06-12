# TripRate ⭐

An offline-first, installable web app (PWA) for rating the things you do on your trips —
coffee, food, sights, activities, stays, or any category you invent.

## Features

- **Trips** — group everything by trip (e.g. "Japan 2026") and switch between them.
- **Custom categories** — each category has its own emoji, color and rating criteria
  (Coffee → Taste, Vibe, Service, Value…). Five sensible defaults are seeded; create your own.
- **Multi-criteria ratings** — 1–5 stars per criterion; the overall score is the average.
- **Photos & notes** — attach photos (auto-compressed before storing) and free-text notes.
- **Stats** — best-of-the-trip ranking, per-category averages and per-criterion breakdowns.
- **Offline-first** — all data lives on the device in IndexedDB; the app shell is cached by a
  service worker, so it works with no signal. Nothing is sent to any server.
- **Backup** — export/import everything (photos included) as a single JSON file in Settings.

## Tech

Vite + React + TypeScript, Dexie (IndexedDB), `vite-plugin-pwa`, hash-based routing.
No backend.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run lint
```

## Test

An end-to-end smoke test drives the real production build in headless Chrome
(onboarding → add entries with photo → journal → filters → stats → persistence):

```bash
npm run build
npm run preview &        # serves on :4173
node scripts/smoke.mjs   # screenshots land in shots/
```

## Deploy

The app is fully static — host the `dist/` folder anywhere. A GitHub Actions workflow
(`.github/workflows/deploy.yml`) builds and publishes it to GitHub Pages on every push
(requires Pages to be available for the repository, i.e. a public repo on the free plan).

`BASE_PATH` controls the base URL at build time, e.g. `BASE_PATH=/rating-app/ npm run build`
for project pages.

## Icons

PWA icons are generated from an inline SVG: `node scripts/make-icons.mjs`.
