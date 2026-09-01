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
- **Remove / rename** — delete or rename from the recipe modal, alongside
  cook's notes and tags.
- **No pork** — enforced in three places: Spoonacular is asked to exclude it,
  every search result is re-checked, and saving or renaming to a pork dish is
  refused. Existing rows are filtered on read too, so widening the term list
  takes effect immediately with no migration.
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

- `npm run test:api` (vitest, 60 tests -- 29 API, 31 pork matcher) -- auth on every admin route, recipe
  CRUD, duplicate rejection, tag creation and replacement, cascade delete,
  cooldown behaviour including the small-pool relaxation, history, stats, and
  JSON 404s for unknown API paths.
- `npm run test:ui` (Playwright/Chromium, 14 tests) -- boot and loading screen,
  the hub photo, spinning (asserting the announced dish **is** the slice under
  the pointer), spin-again, COOK IT with the shopping list, the unlock dialog
  with a wrong and a right key, add-a-recipe end to end through Spoonacular,
  tag filtering, renaming, and every tab rendering. Any uncaught page error
  fails the test.

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
  client/sprites/  tilemap.png + derived seamless ground tiles
art/           the raw Kenney download (not deployed)
scripts/       make-sprites.cjs (hand-drawn sprites), pnglib.cjs,
               screenshot.mjs (for eyeballing the UI)
schema.sql     tables + seed tags
```

## Notes and limits

- **Spoonacular coverage is patchy.** Its index is title-matched and misses
  plenty of dishes — "shakshuka" returns nothing, even via autocomplete. Free
  tier is 150 points/day; a search costs ~1.1, so roughly 130 searches a day.
- **Wheel size is capped at 12 slices** — a wheel with 40 labels is unreadable.
  Candidates are resampled on every spin, so the full book still gets used.
- **Art** is Kenney's *Pixel Platformer* and its *Farm Expansion* (both CC0).
  The full downloads live in `art/pixel-platformer/` and
  `art/pixel-platformer-farm-expansion/` and are **not** served -- only the two
  sprite sheets are imported (`src/client/sprites/tilemap.png` 6KB and
  `farm.png` 5KB). `components/Sprite.tsx` addresses tiles by index within each
  sheet's grid (base is 20x9, farm is 16x7; both 18px tiles).

  **Most of Kenney's scenery is a multi-tile structure**, and drawing a single
  tile of one is what makes sprites look sliced through. A cloud is three tiles
  wide; a tree is a canopy block over a trunk column; the greenhouse is 4x4.
  Anything listed in `G` must go through `Composite`; only things in `T` are
  complete on their own. Some traps found the hard way:

  - `97` looks like a tree canopy but is only the top third of one.
  - `16` is a standalone bush, *not* the cap of a hedge column -- stacking it
    over `76` leaves a visible gap.
  - The farm pack's wide orange canopy bars (`60`-`63`) are standalone strips
    and don't stack onto anything.
  - Even among tiles that visually look interchangeable, they aren't: the farm
    pack's trunk tile `93` looks like a middle segment but its bark border
    doesn't line up against the canopy above it OR against a repeat of
    itself -- only `109` does both. `autumnTree` uses canopy `77` + trunk
    `109`; `93` isn't used anywhere.

  When adding scenery, assemble a candidate grid and render it to a PNG before
  wiring it up -- guessing from the sheet overview gets it wrong.

  The two ground tiles are pre-processed: Kenney's terrain blocks carry a **2px**
  dark outline on all four sides, which tiles into a visible brick grid, so
  `grass.png` and `dirt.png` have that border stripped (the grass keeps its top
  edge, which is the ground surface line).

- **The pack has no dog, birds, sun or greenhouse.** Its character sheet is
  space-themed (astronauts, robots, bat-drones) and its background sheet is four
  parallax panels. So the sun, the birds and Loki's walk cycle are hand-drawn in
  `scripts/make-sprites.cjs` as ASCII pixel art in the pack's palette; run
  `node scripts/make-sprites.cjs` to regenerate them after editing.
  A greenhouse would need a different pack -- Kenney's *Tiny Town* has buildings.

- **Wheel labels are hard-clipped to the disc** (`clipPath="url(#wheel-disc)"`
  on `.wheel-rotor`). A long title wraps onto two lines, and the character
  budget for that line was previously copy-pasted from the anchor-radius
  constant for an unrelated reason -- worst case, a two-line title's width
  pushed a glyph past the wooden rim into open canvas (the SVG is
  `overflow: visible`). Because that text sat inside the rotating group, it
  read as the wheel itself swinging off-centre mid-spin, with garden scenery
  showing through the gap. The clip makes that structurally impossible
  regardless of any future sizing change; `labelChars` is now derived from an
  explicit `RIM_MARGIN` so the clip is a backstop, not something titles
  routinely hit. Covered by a Playwright test that measures every label's true
  screen-space extent against the rim radius, not just eyeballing a
  screenshot -- a downscaled thumbnail of a passing render can still look like
  it's overflowing.
- The wheel's drop-shadow lives on `.wheel-wrap` (a plain, non-rotating div),
  not on the `.wheel-svg` that contains the rotating content. A CSS `filter`
  on the same element being CSS-transform-animated has to keep recomputing its
  filter region against the live (rotating) content; on `.wheel-wrap` the
  shadow still traces the disc's silhouette (drop-shadow follows alpha, not
  the element's box) but the filter region is static.
- The wheel, pointer and sign are still drawn in SVG/CSS so they scale with
  their text.
- The hub photo is loaded from `/assets/loki.png`; if it's absent the wheel
  shows a placeholder medallion instead.
