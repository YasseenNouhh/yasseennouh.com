import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:8787";
const KEY = "loki-local-dev";
const out = process.argv[2];

// make sure there are recipes to show
for (let i = 0; i < 6; i++) {
  await fetch(`${BASE}/api/admin/recipes`, {
    method: "POST",
    headers: { "x-admin-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({
      title: ["Mushroom Risotto","Chicken Katsu Curry","Shakshuka","Lemon Pasta","Beef Rendang","Miso Aubergine"][i],
      ready_minutes: 25 + i * 5, servings: 2,
      ingredients: [{ name: "thing", amount: 1, unit: "", original: "1 thing" }],
      instructions: ["Cook it."], tags: [["comfort"],["quick"],["veggie"],["quick"],["fancy"],["healthy"]][i],
    }),
  }).catch(() => {});
}

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
await p.goto(BASE);
await p.locator(".wheel-svg, .wheel-empty").first().waitFor({ timeout: 15000 });
await p.waitForTimeout(1200);
await p.screenshot({ path: out });
await b.close();
console.log("shot ->", out);
