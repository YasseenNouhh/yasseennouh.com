/**
 * Visual verification for garden tree composites.
 *
 *   npm run dev:server     (terminal 1)
 *   npx playwright test test/garden-trees.spec.ts
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:8787";
const ADMIN_KEY = process.env.TEST_ADMIN_KEY ?? "loki-local-dev";
const SHOT = path.join("test", "screenshots", "garden-trees.png");
const WHEEL_SHOT = path.join("test", "screenshots", "wheel.png");

async function seedRecipe(title: string) {
  const res = await fetch(`${BASE}/api/admin/recipes`, {
    method: "POST",
    headers: { "x-admin-key": ADMIN_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      title,
      ready_minutes: 25,
      servings: 2,
      ingredients: [{ name: "flour", amount: 200, unit: "g", original: "200g flour" }],
      instructions: ["Mix."],
      tags: ["gardentest"],
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

test("garden trees screenshot", async ({ page }) => {
  const id = await seedRecipe("Garden Verify Dish");
  await page.goto(BASE);

  await expect(page.locator(".garden")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".wheel-svg")).toBeVisible({ timeout: 15_000 });

  const ground = page.locator(".ground");
  await expect(ground).toBeVisible();

  const box = await ground.boundingBox();
  expect(box).not.toBeNull();
  await page.screenshot({ path: SHOT, clip: box! });

  const wheelBox = await page.locator(".wheel-wrap").boundingBox();
  expect(wheelBox).not.toBeNull();
  await page.screenshot({ path: WHEEL_SHOT, clip: wheelBox! });

  // Multi-tile trees should be taller than a single 18px tile at scale 2 (36px).
  const structures = page.locator(".scenery > span > span");
  const count = await structures.count();
  expect(count).toBeGreaterThan(10);

  let tallTrees = 0;
  for (let i = 0; i < count; i++) {
    const h = await structures.nth(i).evaluate((el) => el.getBoundingClientRect().height);
    if (h > 80) tallTrees++;
  }
  expect(tallTrees).toBeGreaterThanOrEqual(3);

  await deleteRecipe(id);
});
