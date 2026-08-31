/**
 * API integration tests. These run against a real `wrangler dev` with the
 * local D1, so they exercise the actual SQL -- not a mock.
 *
 *   npm run dev:server     (in one terminal)
 *   npm run test:api
 *
 * Every test cleans up the recipes it creates.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:8787";
const ADMIN_KEY = process.env.TEST_ADMIN_KEY ?? "loki-local-dev";

const admin = { "x-admin-key": ADMIN_KEY, "content-type": "application/json" };
const created: number[] = [];

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

async function makeRecipe(overrides: Record<string, unknown> = {}) {
  const { status, body } = await api("/api/admin/recipes", {
    method: "POST",
    headers: admin,
    body: JSON.stringify({
      title: `Test Dish ${Math.random().toString(36).slice(2, 8)}`,
      ready_minutes: 30,
      servings: 2,
      ingredients: [{ name: "egg", amount: 2, unit: "", original: "2 eggs" }],
      instructions: ["Crack eggs.", "Cook them."],
      tags: ["quick"],
      ...overrides,
    }),
  });
  expect(status).toBe(201);
  created.push(body.id);
  return body.id as number;
}

beforeAll(async () => {
  const res = await fetch(`${BASE}/api/tags`).catch(() => null);
  if (!res?.ok) {
    throw new Error(
      `No server at ${BASE}. Start it with: npm run dev:server`,
    );
  }
});

afterAll(async () => {
  for (const id of created) {
    await api(`/api/admin/recipes/${id}`, { method: "DELETE", headers: admin });
  }
});

describe("auth", () => {
  it("rejects admin routes with no key", async () => {
    const { status } = await api("/api/admin/check");
    expect(status).toBe(401);
  });

  it("rejects admin routes with a wrong key", async () => {
    const { status } = await api("/api/admin/check", {
      headers: { "x-admin-key": "not-the-key" },
    });
    expect(status).toBe(401);
  });

  it("accepts the right key", async () => {
    const { status, body } = await api("/api/admin/check", { headers: admin });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("refuses writes without a key", async () => {
    const { status } = await api("/api/admin/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Sneaky" }),
    });
    expect(status).toBe(401);
  });
});

describe("recipes", () => {
  it("creates, reads back, and deletes", async () => {
    const id = await makeRecipe({ title: "Roundtrip Dish" });

    const { status, body } = await api(`/api/recipes/${id}`);
    expect(status).toBe(200);
    expect(body.recipe.title).toBe("Roundtrip Dish");
    expect(body.recipe.ingredients).toHaveLength(1);
    expect(body.recipe.instructions).toEqual(["Crack eggs.", "Cook them."]);
    expect(body.recipe.tags.map((t: { name: string }) => t.name)).toContain("quick");

    const del = await api(`/api/admin/recipes/${id}`, { method: "DELETE", headers: admin });
    expect(del.status).toBe(200);

    const gone = await api(`/api/recipes/${id}`);
    expect(gone.status).toBe(404);
  });

  it("rejects a recipe with no title", async () => {
    const { status } = await api("/api/admin/recipes", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ ready_minutes: 10 }),
    });
    expect(status).toBe(400);
  });

  it("refuses to save the same spoonacular recipe twice", async () => {
    const spoonId = 900000 + Math.floor(Math.random() * 90000);
    await makeRecipe({ title: "Dupe One", spoonacular_id: spoonId });

    const second = await api("/api/admin/recipes", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ title: "Dupe Two", spoonacular_id: spoonId }),
    });
    expect(second.status).toBe(409);
  });

  it("404s deleting something that isn't there", async () => {
    const { status } = await api("/api/admin/recipes/99999999", {
      method: "DELETE",
      headers: admin,
    });
    expect(status).toBe(404);
  });

  it("updates notes and replaces tags", async () => {
    const id = await makeRecipe();

    const patch = await api(`/api/admin/recipes/${id}`, {
      method: "PATCH",
      headers: admin,
      body: JSON.stringify({ notes: "Less salt.", tags: ["comfort", "fancy"] }),
    });
    expect(patch.status).toBe(200);

    const { body } = await api(`/api/recipes/${id}`);
    expect(body.recipe.notes).toBe("Less salt.");
    const names = body.recipe.tags.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(["comfort", "fancy"]);
  });

  it("creates unknown tags on demand", async () => {
    const tag = `t${Math.random().toString(36).slice(2, 7)}`;
    const id = await makeRecipe({ tags: [tag] });

    const { body } = await api(`/api/recipes/${id}`);
    expect(body.recipe.tags.map((t: { name: string }) => t.name)).toContain(tag);
  });

  it("filters the list by tag", async () => {
    const tag = `f${Math.random().toString(36).slice(2, 7)}`;
    const id = await makeRecipe({ tags: [tag] });

    const { body } = await api(`/api/recipes?tag=${tag}`);
    expect(body.recipes.map((r: { id: number }) => r.id)).toEqual([id]);
  });
});

describe("spinning", () => {
  it("returns candidates and never more than 12", async () => {
    const { status, body } = await api("/api/spin/candidates");
    expect(status).toBe(200);
    expect(Array.isArray(body.candidates)).toBe(true);
    expect(body.candidates.length).toBeLessThanOrEqual(12);
    expect(body.candidates.length).toBeLessThanOrEqual(body.pool);
  });

  it("records a spin and it shows up in history and stats", async () => {
    const id = await makeRecipe({ title: "Spun Dish" });

    const before = await api("/api/stats");
    const spin = await api("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe_id: id }),
    });
    expect(spin.status).toBe(200);

    const after = await api("/api/stats");
    expect(after.body.stats.total_spins).toBe(before.body.stats.total_spins + 1);

    const hist = await api("/api/history?limit=5");
    expect(hist.body.history[0].recipe_id).toBe(id);
    expect(hist.body.history[0].title).toBe("Spun Dish");
  });

  it("rejects a spin for a recipe that doesn't exist", async () => {
    const { status } = await api("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe_id: 99999999 }),
    });
    expect(status).toBe(404);
  });

  it("rejects a spin with a junk body", async () => {
    const { status } = await api("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe_id: "banana" }),
    });
    expect(status).toBe(400);
  });

  it("holds a just-eaten recipe back from the wheel", async () => {
    const tag = `c${Math.random().toString(36).slice(2, 7)}`;
    // Five in the tag so the cooldown isn't relaxed by the small-pool guard.
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) ids.push(await makeRecipe({ tags: [tag] }));

    await api("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe_id: ids[0] }),
    });

    const { body } = await api(`/api/spin/candidates?tag=${tag}&cooldown=14`);
    expect(body.cooled).toBe(1);
    expect(body.candidates.map((c: { id: number }) => c.id)).not.toContain(ids[0]);
  });

  it("ignores the cooldown when it would empty the wheel", async () => {
    const tag = `s${Math.random().toString(36).slice(2, 7)}`;
    const id = await makeRecipe({ tags: [tag] });

    await api("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe_id: id }),
    });

    const { body } = await api(`/api/spin/candidates?tag=${tag}&cooldown=14`);
    expect(body.candidates).toHaveLength(1);
  });

  it("deleting a recipe removes its spins from history", async () => {
    const id = await makeRecipe({ title: "Doomed Dish" });
    await api("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe_id: id }),
    });

    await api(`/api/admin/recipes/${id}`, { method: "DELETE", headers: admin });

    const hist = await api("/api/history?limit=200");
    const titles = hist.body.history.map((h: { title: string }) => h.title);
    expect(titles).not.toContain("Doomed Dish");
  });
});

describe("search", () => {
  it("needs a query", async () => {
    const { status } = await api("/api/admin/search", { headers: admin });
    expect(status).toBe(400);
  });

  it("returns ten usable candidates for a common dish", async () => {
    const { status, body } = await api("/api/admin/search?q=pasta", { headers: admin });
    if (status === 429) return; // daily quota exhausted; not a code failure
    expect(status).toBe(200);
    expect(body.candidates.length).toBeGreaterThan(0);

    const first = body.candidates[0];
    expect(first).toHaveProperty("spoonacular_id");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("ingredients");
    expect(typeof first.already_saved).toBe("boolean");

    // Results with a method are sorted ahead of those without.
    const withSteps = body.candidates.map((c: { instructions: string[] }) => c.instructions.length > 0);
    expect(withSteps).toEqual([...withSteps].sort((a, b) => Number(b) - Number(a)));
  });
});

describe("routing", () => {
  it("serves the app shell at /", async () => {
    const res = await fetch(BASE);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<div id="root">');
  });

  it("404s unknown API routes as JSON, not the app shell", async () => {
    const { status, body } = await api("/api/nope");
    expect(status).toBe(404);
    expect(body.error).toBeDefined();
  });
});
