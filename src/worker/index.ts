import { Hono } from "hono";
import { isAdmin } from "./auth";
import { searchRecipes, SpoonacularError } from "./spoonacular";
import { rowToRecipe, tagsForRecipes, type RecipeRow } from "./db";
import type { RecipeCandidate, SpinCandidate, Stats } from "../shared/types";

const app = new Hono<{ Bindings: Env }>();

const MAX_WHEEL_SLICES = 12;
const MIN_WHEEL_SLICES = 4;
const DEFAULT_COOLDOWN_DAYS = 14;

/* ------------------------------------------------------------------ admin */

app.use("/api/admin/*", async (c, next) => {
  if (!(await isAdmin(c.req.raw, c.env))) {
    return c.json({ error: "Not authorised. The pantry is locked." }, 401);
  }
  await next();
});

app.get("/api/admin/check", (c) => c.json({ ok: true }));

/* ------------------------------------------------------------------- tags */

app.get("/api/tags", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.color, COUNT(rt.recipe_id) AS count
       FROM tags t
       LEFT JOIN recipe_tags rt ON rt.tag_id = t.id
      GROUP BY t.id
      ORDER BY t.name`,
  ).all();
  return c.json({ tags: results ?? [] });
});

/* ---------------------------------------------------------------- recipes */

app.get("/api/recipes", async (c) => {
  const tag = c.req.query("tag");
  const sql = tag
    ? `SELECT r.*, MAX(s.spun_at) AS last_spun_at, COUNT(s.id) AS spin_count
         FROM recipes r
         JOIN recipe_tags rt ON rt.recipe_id = r.id
         JOIN tags t ON t.id = rt.tag_id AND t.name = ?
         LEFT JOIN spins s ON s.recipe_id = r.id
        GROUP BY r.id
        ORDER BY r.title COLLATE NOCASE`
    : `SELECT r.*, MAX(s.spun_at) AS last_spun_at, COUNT(s.id) AS spin_count
         FROM recipes r
         LEFT JOIN spins s ON s.recipe_id = r.id
        GROUP BY r.id
        ORDER BY r.title COLLATE NOCASE`;

  const stmt = tag ? c.env.DB.prepare(sql).bind(tag) : c.env.DB.prepare(sql);
  const { results } = await stmt.all<RecipeRow>();
  const rows = results ?? [];
  const tagMap = await tagsForRecipes(
    c.env.DB,
    rows.map((r) => r.id),
  );
  return c.json({ recipes: rows.map((r) => rowToRecipe(r, tagMap.get(r.id) ?? [])) });
});

app.get("/api/recipes/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);

  const row = await c.env.DB.prepare(
    `SELECT r.*, MAX(s.spun_at) AS last_spun_at, COUNT(s.id) AS spin_count
       FROM recipes r LEFT JOIN spins s ON s.recipe_id = r.id
      WHERE r.id = ? GROUP BY r.id`,
  )
    .bind(id)
    .first<RecipeRow>();
  if (!row) return c.json({ error: "No such recipe" }, 404);

  const tagMap = await tagsForRecipes(c.env.DB, [id]);
  return c.json({ recipe: rowToRecipe(row, tagMap.get(id) ?? []) });
});

/* ------------------------------------------------------------------- spin */

/**
 * A wheel with 40 slices is unreadable, so we sample a handful of candidates.
 * Recipes eaten recently are held back (cooldown); among the rest, the
 * longest-unspun are likelier to appear.
 */
app.get("/api/spin/candidates", async (c) => {
  const tag = c.req.query("tag");
  const cooldownDays = Math.max(0, Number(c.req.query("cooldown") ?? DEFAULT_COOLDOWN_DAYS) || 0);

  const sql = tag
    ? `SELECT r.id, r.title, r.image_url, r.ready_minutes, MAX(s.spun_at) AS last_spun_at
         FROM recipes r
         JOIN recipe_tags rt ON rt.recipe_id = r.id
         JOIN tags t ON t.id = rt.tag_id AND t.name = ?
         LEFT JOIN spins s ON s.recipe_id = r.id
        GROUP BY r.id`
    : `SELECT r.id, r.title, r.image_url, r.ready_minutes, MAX(s.spun_at) AS last_spun_at
         FROM recipes r
         LEFT JOIN spins s ON s.recipe_id = r.id
        GROUP BY r.id`;

  const stmt = tag ? c.env.DB.prepare(sql).bind(tag) : c.env.DB.prepare(sql);
  const { results } = await stmt.all<SpinCandidate & { last_spun_at: string | null }>();
  const all = results ?? [];

  if (!all.length) return c.json({ candidates: [], pool: 0, cooled: 0 });

  const now = Date.now();
  const daysSince = (iso: string | null) =>
    iso === null ? Infinity : (now - Date.parse(`${iso.replace(" ", "T")}Z`)) / 86_400_000;

  let eligible = all.filter((r) => daysSince(r.last_spun_at) >= cooldownDays);
  const cooled = all.length - eligible.length;

  // Don't let the cooldown starve a small collection.
  if (eligible.length < Math.min(MIN_WHEEL_SLICES, all.length)) {
    eligible = [...all].sort((a, b) => daysSince(b.last_spun_at) - daysSince(a.last_spun_at));
  }

  // Weighted pick without replacement: staler recipes get a bigger ticket.
  const pool = eligible.map((r) => ({ r, w: Math.min(daysSince(r.last_spun_at), 60) + 1 }));
  const picked: SpinCandidate[] = [];
  const take = Math.min(MAX_WHEEL_SLICES, pool.length);
  for (let n = 0; n < take; n++) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let t = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      t -= pool[i].w;
      if (t <= 0) {
        idx = i;
        break;
      }
    }
    const { r } = pool.splice(idx, 1)[0];
    picked.push({
      id: r.id,
      title: r.title,
      image_url: r.image_url,
      ready_minutes: r.ready_minutes,
    });
  }

  return c.json({ candidates: picked, pool: all.length, cooled });
});

app.post("/api/spin", async (c) => {
  const body = await c.req
    .json<{ recipe_id?: number }>()
    .catch(() => ({}) as { recipe_id?: number });
  const id = Number(body.recipe_id);
  if (!Number.isInteger(id)) return c.json({ error: "Bad recipe_id" }, 400);

  const exists = await c.env.DB.prepare(`SELECT id FROM recipes WHERE id = ?`).bind(id).first();
  if (!exists) return c.json({ error: "No such recipe" }, 404);

  await c.env.DB.prepare(`INSERT INTO spins (recipe_id) VALUES (?)`).bind(id).run();
  return c.json({ ok: true });
});

/* ---------------------------------------------------------------- history */

app.get("/api/history", async (c) => {
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 50) || 50));
  const { results } = await c.env.DB.prepare(
    `SELECT s.id AS spin_id, s.recipe_id, s.spun_at, r.title, r.image_url
       FROM spins s JOIN recipes r ON r.id = s.recipe_id
      ORDER BY s.spun_at DESC, s.id DESC
      LIMIT ?`,
  )
    .bind(limit)
    .all();
  return c.json({ history: results ?? [] });
});

app.get("/api/stats", async (c) => {
  const db = c.env.DB;
  const [totals, month, top, byTag] = await db.batch([
    db.prepare(
      `SELECT (SELECT COUNT(*) FROM recipes) AS total_recipes,
              (SELECT COUNT(*) FROM spins)   AS total_spins`,
    ),
    db.prepare(
      `SELECT COUNT(*) AS n FROM spins WHERE spun_at >= datetime('now','start of month')`,
    ),
    db.prepare(
      `SELECT r.title, COUNT(*) AS count
         FROM spins s JOIN recipes r ON r.id = s.recipe_id
        GROUP BY r.id ORDER BY count DESC, r.title LIMIT 5`,
    ),
    db.prepare(
      `SELECT t.name, t.color, COUNT(*) AS count
         FROM spins s
         JOIN recipe_tags rt ON rt.recipe_id = s.recipe_id
         JOIN tags t ON t.id = rt.tag_id
        GROUP BY t.id ORDER BY count DESC`,
    ),
  ]);

  const t = (totals.results?.[0] ?? {}) as { total_recipes?: number; total_spins?: number };
  const stats: Stats = {
    total_recipes: t.total_recipes ?? 0,
    total_spins: t.total_spins ?? 0,
    spins_this_month: (month.results?.[0] as { n?: number })?.n ?? 0,
    top: (top.results ?? []) as Stats["top"],
    by_tag: (byTag.results ?? []) as Stats["by_tag"],
  };
  return c.json({ stats });
});

/* ---------------------------------------------------------- admin: search */

app.get("/api/admin/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ error: "What are we cooking?" }, 400);
  if (!c.env.SPOONACULAR_KEY) return c.json({ error: "Recipe search isn't configured." }, 503);

  let found;
  try {
    found = await searchRecipes(q, c.env.SPOONACULAR_KEY, 10);
  } catch (err) {
    if (err instanceof SpoonacularError) {
      return c.json({ error: err.message }, err.status as 429);
    }
    throw err;
  }

  // Mark the ones already in the book so you don't save a duplicate.
  const ids = found.map((f) => f.spoonacular_id);
  const saved = new Set<number>();
  if (ids.length) {
    const { results } = await c.env.DB.prepare(
      `SELECT spoonacular_id FROM recipes WHERE spoonacular_id IN (${ids.map(() => "?").join(",")})`,
    )
      .bind(...ids)
      .all<{ spoonacular_id: number }>();
    for (const r of results ?? []) saved.add(r.spoonacular_id);
  }

  const candidates: RecipeCandidate[] = found.map((f) => ({
    ...f,
    already_saved: saved.has(f.spoonacular_id),
  }));
  return c.json({ candidates });
});

/* --------------------------------------------------- admin: write recipes */

app.post("/api/admin/recipes", async (c) => {
  const body = await c.req
    .json<Partial<RecipeCandidate> & { tags?: string[] }>()
    .catch(() => null);
  if (!body?.title) return c.json({ error: "A recipe needs a name." }, 400);

  const res = await c.env.DB.prepare(
    `INSERT INTO recipes
       (title, image_url, ready_minutes, servings, source_url, source_name,
        ingredients, instructions, summary, spoonacular_id)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(spoonacular_id) DO NOTHING
     RETURNING id`,
  )
    .bind(
      body.title,
      body.image_url ?? null,
      body.ready_minutes ?? null,
      body.servings ?? null,
      body.source_url ?? null,
      body.source_name ?? null,
      JSON.stringify(body.ingredients ?? []),
      JSON.stringify(body.instructions ?? []),
      body.summary ?? null,
      body.spoonacular_id ?? null,
    )
    .first<{ id: number }>();

  if (!res) return c.json({ error: "That one's already in the book." }, 409);

  await setTags(c.env.DB, res.id, body.tags ?? []);
  return c.json({ id: res.id }, 201);
});

app.patch("/api/admin/recipes/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);

  const body = await c.req.json<{ notes?: string | null; tags?: string[] }>().catch(() => null);
  if (!body) return c.json({ error: "Bad body" }, 400);

  if (body.notes !== undefined) {
    await c.env.DB.prepare(`UPDATE recipes SET notes = ? WHERE id = ?`).bind(body.notes, id).run();
  }
  if (body.tags !== undefined) await setTags(c.env.DB, id, body.tags);

  return c.json({ ok: true });
});

app.delete("/api/admin/recipes/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);
  // recipe_tags / spins clean themselves up via ON DELETE CASCADE.
  const res = await c.env.DB.prepare(`DELETE FROM recipes WHERE id = ?`).bind(id).run();
  if (!res.meta.changes) return c.json({ error: "No such recipe" }, 404);
  return c.json({ ok: true });
});

app.delete("/api/admin/spins/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);
  await c.env.DB.prepare(`DELETE FROM spins WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

/** Replaces a recipe's tags, creating any tag names that don't exist yet. */
async function setTags(db: D1Database, recipeId: number, names: string[]): Promise<void> {
  const clean = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  const stmts: D1PreparedStatement[] = [
    db.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ?`).bind(recipeId),
  ];
  for (const name of clean) {
    stmts.push(db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(name));
    stmts.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id)
           VALUES (?, (SELECT id FROM tags WHERE name = ?))`,
        )
        .bind(recipeId, name),
    );
  }
  await db.batch(stmts);
}

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error("kitchen error:", err);
  return c.json({ error: "Something burned in the kitchen." }, 500);
});

export default app;
