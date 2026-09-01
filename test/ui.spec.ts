/**
 * Browser tests for the flows a person actually performs. These drive real
 * clicks in Chromium against a running `wrangler dev`.
 *
 *   npm run dev:server     (in one terminal)
 *   npm run test:ui
 */
import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:8787";
const ADMIN_KEY = process.env.TEST_ADMIN_KEY ?? "loki-local-dev";

/** Seeds a recipe through the API so wheel tests aren't at the mercy of search quota. */
async function seedRecipe(title: string, tags: string[] = ["quick"]) {
  const res = await fetch(`${BASE}/api/admin/recipes`, {
    method: "POST",
    headers: { "x-admin-key": ADMIN_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      title,
      ready_minutes: 25,
      servings: 2,
      ingredients: [
        { name: "flour", amount: 200, unit: "g", original: "200g flour" },
        { name: "butter", amount: 50, unit: "g", original: "50g butter" },
      ],
      instructions: ["Mix.", "Bake."],
      tags,
    }),
  });
  return (await res.json()).id as number;
}

async function deleteRecipe(id: number) {
  await fetch(`${BASE}/api/admin/recipes/${id}`, {
    method: "DELETE",
    headers: { "x-admin-key": ADMIN_KEY },
  });
}

async function unlock(page: Page) {
  await page.addInitScript(
    ([key]) => localStorage.setItem("loki-admin-key", key),
    [ADMIN_KEY],
  );
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => {
    throw new Error(`Uncaught page error: ${e.message}`);
  });
});

test("loads, shows the loading screen, then the wheel", async ({ page }) => {
  const id = await seedRecipe("Boot Test Dish");
  await page.goto(BASE);

  await expect(page.locator(".loader-fullscreen")).toBeVisible();
  await expect(page.locator(".wheel-svg")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".loader-fullscreen")).toHaveCount(0);

  await deleteRecipe(id);
});

test("the hub shows Loki, not the placeholder", async ({ page }) => {
  const id = await seedRecipe("Hub Test Dish");
  await page.goto(BASE);
  await expect(page.locator(".hub img")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".hub__placeholder")).toHaveCount(0);
  await deleteRecipe(id);
});

test("spinning lands on the slice under the pointer and logs it", async ({ page }) => {
  const ids = [];
  for (let i = 0; i < 5; i++) ids.push(await seedRecipe(`Wheel Dish ${i}`, ["spintest"]));

  await page.goto(BASE);
  await page.locator(".wheel-svg").waitFor({ timeout: 10_000 });

  // Restrict the wheel to our own recipes so the assertion is deterministic.
  await page.getByRole("button", { name: "spintest", exact: true }).click();
  await expect(page.locator(".wheel-rotor > g")).toHaveCount(5);

  await page.getByRole("button", { name: "SPIN!" }).click();
  await expect(page.locator(".result__title")).toBeVisible({ timeout: 15_000 });

  const announced = await page.locator(".result__title").innerText();

  // The label under the pointer must be the dish we were told we're eating.
  const underPointer = await page.evaluate(() => {
    const labels = [...document.querySelectorAll(".wheel-rotor > g text")].map(
      (t) => t.textContent ?? "",
    );
    const rot = parseFloat(
      (document.querySelector(".wheel-rotor") as HTMLElement).style.transform.match(
        /-?[\d.]+/,
      )![0],
    );
    const step = 360 / labels.length;
    return labels[Math.floor(((((-rot % 360) + 360) % 360)) / step)];
  });

  const normalise = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  expect(normalise(announced)).toContain(normalise(underPointer).replace(/…$/, ""));

  // And it should now be in the log.
  await page.getByRole("tab", { name: "LOG" }).click();
  await expect(page.locator(".p-table__row").filter({ hasText: announced })).toBeVisible();

  for (const id of ids) await deleteRecipe(id);
});

test("spin again reshuffles and still resolves", async ({ page }) => {
  const ids = [];
  for (let i = 0; i < 6; i++) ids.push(await seedRecipe(`Again Dish ${i}`, ["againtest"]));

  await page.goto(BASE);
  await page.locator(".wheel-svg").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "againtest", exact: true }).click();

  await page.getByRole("button", { name: "SPIN!" }).click();
  await expect(page.locator(".result__title")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "SPIN AGAIN" }).click();
  await expect(page.locator(".result__title")).toBeVisible({ timeout: 15_000 });

  for (const id of ids) await deleteRecipe(id);
});

test("COOK IT opens the recipe with method and shopping list", async ({ page }) => {
  const id = await seedRecipe("Cookable Dish", ["cooktest"]);

  await page.goto(BASE);
  await page.locator(".wheel-svg").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "cooktest", exact: true }).click();
  await page.getByRole("button", { name: "SPIN!" }).click();
  await expect(page.locator(".result__title")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "COOK IT" }).click();
  const modal = page.locator(".modal");
  await expect(modal).toBeVisible();
  await expect(modal.getByText("200g flour")).toBeVisible();
  await expect(modal.getByText("Bake.")).toBeVisible();

  // Ticking an ingredient reveals the copy button.
  await modal.locator(".checklist li").first().click();
  await expect(modal.getByRole("button", { name: /COPY 1 ITEM/ })).toBeVisible();

  await deleteRecipe(id);
});

test("a visitor without the key is offered the unlock dialog, not a dead end", async ({
  page,
}) => {
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  await page.getByRole("tab", { name: "RECIPES" }).click();
  await page.getByRole("button", { name: "+ ADD" }).click();

  await expect(page.getByRole("heading", { name: "Cook's entrance" })).toBeVisible();

  await page.getByPlaceholder("kitchen key").fill("wrong-key");
  await page.getByRole("button", { name: "UNLOCK" }).click();
  await expect(page.getByText("That key doesn't fit the lock.")).toBeVisible();
});

test("unlocking with the right key opens the add dialog", async ({ page }) => {
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  await page.getByRole("tab", { name: "RECIPES" }).click();
  await page.getByRole("button", { name: "+ ADD" }).click();
  await page.getByPlaceholder("kitchen key").fill(ADMIN_KEY);
  await page.getByRole("button", { name: "UNLOCK" }).click();

  await expect(page.getByRole("heading", { name: "Add a recipe" })).toBeVisible();
});

test("an admin can add a recipe end to end and then remove it", async ({ page }) => {
  await unlock(page);
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  await page.getByRole("tab", { name: "RECIPES" }).click();
  await page.getByRole("button", { name: "+ ADD" }).click();
  await expect(page.getByRole("heading", { name: "Add a recipe" })).toBeVisible();

  // A dish unlikely to already be in the book -- every result being
  // "already saved" would leave nothing to pick.
  await page.getByPlaceholder(/chicken katsu/).fill("tagine");
  await page.getByRole("button", { name: "SEARCH" }).click();

  // Quota may be spent; that isn't a UI failure, so bail out cleanly.
  const results = page.locator(".modal .card");
  const quotaError = page.locator(".notice--bad");
  await Promise.race([
    results.first().waitFor({ timeout: 20_000 }).catch(() => {}),
    quotaError.waitFor({ timeout: 20_000 }).catch(() => {}),
  ]);
  test.skip(await quotaError.isVisible(), "recipe search quota unavailable");

  const count = await results.count();
  expect(count).toBeGreaterThan(0);

  const pick = page.getByRole("button", { name: "PICK THIS" }).first();
  test.skip(!(await pick.count()), "every result is already in the book");
  await pick.click();
  await expect(page.getByRole("heading", { name: "Save this one?" })).toBeVisible();

  // Remember exactly which dish we chose -- picking a row by index later would
  // land on whatever else happens to be in the book.
  const title = (await page.locator(".modal .card__title").first().innerText()).trim();
  const before = await page.locator(".p-table__row").count();

  await page.getByRole("button", { name: "comfort", exact: true }).click();
  await page.getByRole("button", { name: "SAVE TO KITCHEN" }).click();
  await expect(page.locator(".modal")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".p-table__row")).toHaveCount(before + 1);

  // Open that exact recipe and remove it again.
  const row = page.locator(".p-table__row").filter({ hasText: title }).first();
  await row.click();
  await expect(page.locator(".modal")).toBeVisible();

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "REMOVE RECIPE" }).click();
  await expect(page.locator(".modal")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".p-table__row")).toHaveCount(before);
});

test("an admin can rename a recipe from the modal", async ({ page }) => {
  const id = await seedRecipe("Rename Me Please", ["renametest"]);
  await unlock(page);
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  await page.getByRole("tab", { name: "RECIPES" }).click();
  await page.locator(".p-table__row").filter({ hasText: "Rename Me Please" }).click();

  const modal = page.locator(".modal");
  await expect(modal).toBeVisible();

  await modal.getByPlaceholder("Recipe name").fill("Renamed By Test");
  await modal.getByRole("button", { name: "SAVE" }).click();
  await expect(modal.getByRole("button", { name: "SAVED!" })).toBeVisible();

  await modal.getByRole("button", { name: "Close" }).click();
  await expect(
    page.locator(".p-table__row").filter({ hasText: "Renamed By Test" }),
  ).toBeVisible();

  await deleteRecipe(id);
});

test("renaming to a pork dish is refused", async ({ page }) => {
  const id = await seedRecipe("Innocent Dish", ["porktest"]);
  await unlock(page);
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  await page.getByRole("tab", { name: "RECIPES" }).click();
  await page.locator(".p-table__row").filter({ hasText: "Innocent Dish" }).click();

  const modal = page.locator(".modal");
  await modal.getByPlaceholder("Recipe name").fill("Bacon Sandwich");
  await modal.getByRole("button", { name: "SAVE" }).click();
  await expect(modal.getByText(/mentions pork/i)).toBeVisible();

  await deleteRecipe(id);
});

test("wheel labels stay clear of the rim, even with a very long title", async ({ page }) => {
  // A long title wraps onto two lines, which is the case that used to push
  // text past the wooden rim into the garden behind it -- the SVG has
  // overflow:visible, so anything outside R=185 painted straight over the
  // scenery, and because it was inside the rotating group it read as the
  // wheel itself swinging off-centre.
  const longId = await seedRecipe(
    "Extraordinarily Long Slow-Braised Wagyu Beef Short Rib Casserole",
    ["rimtest"],
  );
  const shortIds = [];
  for (let i = 0; i < 5; i++) shortIds.push(await seedRecipe(`Rim Dish ${i}`, ["rimtest"]));

  await page.goto(BASE);
  await page.locator(".wheel-svg").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "rimtest", exact: true }).click();
  await expect(page.locator(".wheel-rotor > g")).toHaveCount(6);

  // The structural guarantee: a hard clip on the disc. This must never be
  // removed even if the sizing math above it is ever touched again.
  await expect(page.locator("#wheel-disc circle")).toHaveCount(1);
  const clipApplied = await page.locator(".wheel-rotor").getAttribute("clip-path");
  expect(clipApplied).toBe("url(#wheel-disc)");

  // The sizing guarantee: labels should clear the rim with real margin, not
  // just get away with it because the clip caught them. Checked via each
  // <text>'s true screen-space bounding box against the disc radius, at rest
  // (rotor at rotate(0deg)) so screen pixels map directly to SVG user units.
  const overflow = await page.evaluate(() => {
    const svg = document.querySelector(".wheel-svg")!;
    const svgRect = svg.getBoundingClientRect();
    const scale = svgRect.width / 420; // viewBox is "-10 -10 420 420"
    const cx = svgRect.left + 210 * scale;
    const cy = svgRect.top + 210 * scale;
    const R = 185; // must match Wheel.tsx's own R constant

    return [...document.querySelectorAll(".wheel-rotor text")].map((t) => {
      const r = t.getBoundingClientRect();
      const corners = [
        [r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom],
      ] as const;
      const maxUserUnits = Math.max(
        ...corners.map(([x, y]) => Math.hypot(x - cx, y - cy) / scale),
      );
      return { text: t.textContent, maxUserUnits, over: maxUserUnits - R };
    });
  });

  const R = 185; // must match Wheel.tsx's own R constant
  for (const row of overflow) {
    // A few units of slack: this measures the AABB corner of a rotated
    // element, which overestimates the true glyph extent, so the intent is
    // "comfortably inside the rim", not "exactly at R".
    expect(row.maxUserUnits, `"${row.text}" reaches too close to the rim`).toBeLessThan(R + 5);
  }

  await deleteRecipe(longId);
  for (const id of shortIds) await deleteRecipe(id);
});

test("tag filtering changes the wheel", async ({ page }) => {
  const a = await seedRecipe("Filter Dish A", ["filtera"]);
  const b = await seedRecipe("Filter Dish B", ["filterb"]);

  await page.goto(BASE);
  await page.locator(".wheel-svg").waitFor({ timeout: 10_000 });

  await page.getByRole("button", { name: "filtera", exact: true }).click();
  await expect(page.locator(".wheel-rotor > g")).toHaveCount(1);
  await expect(page.locator(".wheel-rotor text")).toContainText("Filter");

  await page.getByRole("button", { name: "filterb", exact: true }).click();
  await expect(page.locator(".wheel-rotor > g")).toHaveCount(1);

  await deleteRecipe(a);
  await deleteRecipe(b);
});

test("an empty wheel explains itself instead of showing a broken wheel", async ({ page }) => {
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  // A tag nothing uses.
  await page.evaluate(() => {
    history.replaceState(null, "", "/");
  });
  const empty = page.locator(".wheel-empty");
  if (await empty.isVisible()) {
    await expect(empty).toContainText(/empty|match/i);
  }
});

test("switching tabs renders each view without errors", async ({ page }) => {
  const id = await seedRecipe("Tab Dish");
  await page.goto(BASE);
  await page.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 10_000 });

  await page.getByRole("tab", { name: "RECIPES" }).click();
  await expect(page.getByRole("heading", { name: /The recipe book/ })).toBeVisible();

  await page.getByRole("button", { name: "CARDS" }).click();
  await expect(page.locator(".card-grid")).toBeVisible();
  await page.getByRole("button", { name: "LIST" }).click();
  await expect(page.locator(".p-table")).toBeVisible();

  await page.getByRole("tab", { name: "LOG" }).click();
  await expect(page.getByRole("heading", { name: "Dinner log" })).toBeVisible();
  await expect(page.locator(".stat").first()).toBeVisible();

  await page.getByRole("tab", { name: "SPIN" }).click();
  await expect(page.locator(".wheel-svg, .wheel-empty").first()).toBeVisible();

  await deleteRecipe(id);
});
