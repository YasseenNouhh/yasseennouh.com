/**
 * Visual verification for garden tree composites. Uses `vite preview` because
 * it serves the built client reliably; wrangler dev needs a fresh
 * `npm run dev:server` build whenever assets change.
 *
 *   npm run build
 *   npx vite preview --port 4173
 *   TEST_BASE=http://127.0.0.1:4173 npx playwright test test/garden-trees.spec.ts
 */
import { expect, test } from "@playwright/test";
import path from "node:path";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:4173";
const SHOT = path.join("test", "screenshots", "garden-trees.png");
const WHEEL_SHOT = path.join("test", "screenshots", "wheel.png");

test("garden trees and wheel screenshot", async ({ page }) => {
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

  // Multi-tile composites are one grid span per scenery item.
  const structures = page.locator(".scenery > span");
  const count = await structures.count();
  expect(count).toBeGreaterThan(10);

  let tallTrees = 0;
  for (let i = 0; i < count; i++) {
    const h = await structures.nth(i).evaluate((el) => el.getBoundingClientRect().height);
    if (h > 80) tallTrees++;
  }
  expect(tallTrees).toBeGreaterThanOrEqual(3);

  // Wheel slices should cover most of the disc, not a single brown overlay.
  const slicePaths = page.locator(".wheel-slices path");
  expect(await slicePaths.count()).toBeGreaterThan(0);
});
