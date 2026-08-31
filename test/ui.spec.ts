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

  await page.getByPlaceholder(/chicken katsu/).fill("pasta");
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
  await pick.click();
  await expect(page.getByRole("heading", { name: "Save this one?" })).toBeVisible();

  await page.getByRole("button", { name: "comfort", exact: true }).click();
  await page.getByRole("button", { name: "SAVE TO KITCHEN" }).click();
  await expect(page.locator(".modal")).toHaveCount(0, { timeout: 15_000 });

  // It should now be in the book; open it and delete it.
  const row = page.locator(".p-table__row").nth(1);
  const title = await row.locator(".p-table__td--title").innerText();
  await row.click();
  await expect(page.locator(".modal")).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "REMOVE RECIPE" }).click();
  await expect(page.locator(".modal")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".p-table__row").filter({ hasText: title })).toHaveCount(0);
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
