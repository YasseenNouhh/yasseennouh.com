# Loki's Kitchen

A roulette wheel that decides what's for dinner, backed by your own recipe book.
Deployed on Cloudflare Workers + D1 at `kitchen.yasseennouh.com`.

## Stack

| Layer | Choice |
| --- | --- |
| Host | Cloudflare Workers (single Worker serving API + static assets) |
| Database | Cloudflare D1 (SQLite) |
| API | Hono |
| Frontend | Vite + React + TypeScript |
| Recipe search | Spoonacular `complexSearch` |
| Styling | Hand-written CSS (no framework), Press Start 2P + VT323 |

## Features

- **Spin** — a roulette wheel of 8–12 candidates sampled from the book. Recipes
  eaten in the last 14 days sit out; among the rest, the longest-unspun are
  likelier to appear. Filter the wheel by tag before spinning.
- **Add** — type a dish name, get ten real recipes with photo, time, servings
  and full method; pick one and it's saved. One API call covers both the
  previews and the saved payload, so saving costs no extra quota.
- **Remove** — delete from the recipe modal. Tags and spin history cascade.
- **Tags** — spin within a mood (`quick`, `veggie`, `comfort`, …).
- **Log** — every spin recorded; stats for most-spun, this month, and what you
  actually eat by tag.
- **Shopping list** — tick what you're missing in a recipe, copy it out.

## Local development

```bash
npm install
npm run db:local          # apply schema to the local D1
npx vite build            # the Worker serves ./dist
npx wrangler dev          # http://127.0.0.1:8787
```

`.dev.vars` (git-ignored) holds local secrets:

```
SPOONACULAR_KEY=...
DEV_ADMIN_KEY=loki-local-dev
```

To act as admin locally, open the site, click **cook's entrance** in the footer
and enter the `DEV_ADMIN_KEY` value.

For hot-reloading the UI, run `npx vite` alongside `wrangler dev` — Vite proxies
`/api` to port 8787.

## Testing

Both suites run against a live `wrangler dev`, so they exercise the real Worker
and the real local D1 -- no mocks.

```bash
npm run dev:server     # terminal 1: builds the client, serves on :8787
npm test               # terminal 2: API tests, then browser tests
```

- `npm run test:api` (vitest, 22 tests) -- auth on every admin route, recipe
  CRUD, duplicate rejection, tag creation and replacement, cascade delete,
  cooldown behaviour including the small-pool relaxation, history, stats, and
  JSON 404s for unknown API paths.
- `npm run test:ui` (Playwright/Chromium, 11 tests) -- boot and loading screen,
  the hub photo, spinning (asserting the announced dish **is** the slice under
  the pointer), spin-again, COOK IT with the shopping list, the unlock dialog
  with a wrong and a right key, add-a-recipe end to end through Spoonacular,
  tag filtering, and every tab rendering. Any uncaught page error fails the test.

Search tests skip themselves rather than fail if the daily Spoonacular quota is
exhausted, since that is not a code failure.

## Deploying

```bash
npm run db:remote                        # once, applies schema to remote D1
npx wrangler secret put SPOONACULAR_KEY
npx wrangler secret put DEV_ADMIN_KEY    # fallback lock; see Access below
npm run deploy
```

`wrangler.jsonc` already claims `kitchen.yasseennouh.com` as a custom domain.

### Locking the kitchen

Everything under `/api/admin/*` is gated. Two mechanisms, checked in order:

1. **Cloudflare Access** (preferred). Create a self-hosted Access application
   covering `kitchen.yasseennouh.com/api/admin/*`, with a policy allowing your
   email. Then set the Worker vars so the JWT is *verified*, not merely
   trusted:

   ```bash
   npx wrangler secret put CF_ACCESS_TEAM_DOMAIN   # e.g. yourteam.cloudflareaccess.com
   npx wrangler secret put CF_ACCESS_AUD           # the application's Audience tag
   ```

   `src/worker/auth.ts` fetches the team JWKS and checks signature, `exp`,
   `iss` and `aud`. Without this, anyone able to reach the Worker origin
   directly could forge the header.

2. **Shared key** — `DEV_ADMIN_KEY`, sent as `x-admin-key`. Used for local dev
   and as a fallback if Access isn't configured.

Read endpoints (`/api/recipes`, `/api/spin`, `/api/history`, `/api/stats`) are
public, so anyone can spin; only you can change the book.

## Layout

```
src/
  worker/      index.ts (routes), auth.ts, spoonacular.ts, db.ts
  client/      App.tsx, api.ts, styles.css, components/
  shared/      types.ts  (shared between both)
schema.sql     tables + seed tags
```

## Notes and limits

- **Spoonacular coverage is patchy.** Its index is title-matched and misses
  plenty of dishes — "shakshuka" returns nothing, even via autocomplete. Free
  tier is 150 points/day; a search costs ~1.1, so roughly 130 searches a day.
- **Wheel size is capped at 12 slices** — a wheel with 40 labels is unreadable.
  Candidates are resampled on every spin, so the full book still gets used.
- **Art is hand-drawn SVG/CSS**, not sourced sprites (see the asset note in the
  project discussion). Swapping in a Kenney CC0 pack is a contained change:
  the garden lives in `components/Garden.tsx`, the wheel rim and pointer in
  `components/Wheel.tsx`.
- The hub photo is loaded from `/assets/loki.jpg`; if it's absent the wheel
  shows a placeholder medallion instead.
