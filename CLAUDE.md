# TripRate

Offline-first PWA for rating trip activities (coffee, food, sights…). React +
TypeScript + Vite, Dexie (IndexedDB), vite-plugin-pwa. Deployed to GitHub Pages
at https://ilaylavy.github.io/rating-app/.

## ⚠️ Data safety — read before any change

All user data (trips, categories, entries, photos) lives ONLY in the user's
browser IndexedDB (`triprate` database, see `src/db.ts`). There is no server
copy. An app update must NEVER cause data loss. Hard rules:

1. **Never edit an existing `db.version(n).stores({...})` in place** and never
   lower the version. To change indexes/tables, add `db.version(n + 1)` with an
   `.upgrade()` callback so Dexie migrates existing rows forward.
2. **Never rename the database** (`new Dexie('triprate')`) — a new name orphans
   all existing data.
3. **Never call `db.delete()` or `table.clear()`** outside the two
   user-confirmed flows in `src/pages/Settings.tsx` (erase all / import backup).
4. **New fields on stored types must be optional** (`?:`) so rows written by
   older versions remain valid, and backup import (`src/utils/backup.ts`) stays
   backward-compatible. Never make an old field required or repurpose it.
5. **Keep the Pages base path** (`BASE_PATH=/rating-app/` in the deploy
   workflow). Changing the origin/path would leave the user's IndexedDB behind
   on the old URL.
6. `src/main.tsx` requests `navigator.storage.persist()` — keep it.

After changes, verify persistence end-to-end: `npm run build`, start
`vite preview`, and run `node scripts/smoke.mjs` (its final step reloads the
app and asserts the data is still there). All steps must pass before pushing.

## Commands

- `npm run dev` — dev server
- `npm run lint` && `npx tsc --noEmit` — lint + type-check
- `npm run build` — production build (set `BASE_PATH=/rating-app/` for Pages)
- `npx vite preview --port 4173` then `node scripts/smoke.mjs` — e2e smoke test
  (headless Chrome; writes screenshots to `shots/`)

## Deploy

Pushing to `claude/trip-activity-rating-app-xz7lsh` (or `main`) runs
`.github/workflows/deploy.yml`: it builds with the Pages base path and
force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves.
The artifact-based Pages flow does NOT work here (the workflow `GITHUB_TOKEN`
cannot create the Pages site) — keep the gh-pages branch approach.
