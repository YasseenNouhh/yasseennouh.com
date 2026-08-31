import type { Recipe, Tag } from "../shared/types";

export interface RecipeRow {
  id: number;
  title: string;
  image_url: string | null;
  ready_minutes: number | null;
  servings: number | null;
  source_url: string | null;
  source_name: string | null;
  ingredients: string;
  instructions: string;
  summary: string | null;
  notes: string | null;
  spoonacular_id: number | null;
  created_at: string;
  last_spun_at?: string | null;
  spin_count?: number;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function rowToRecipe(row: RecipeRow, tags: Tag[] = []): Recipe {
  return {
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    ready_minutes: row.ready_minutes,
    servings: row.servings,
    source_url: row.source_url,
    source_name: row.source_name,
    ingredients: parseJson(row.ingredients, []),
    instructions: parseJson(row.instructions, []),
    summary: row.summary,
    notes: row.notes,
    spoonacular_id: row.spoonacular_id,
    created_at: row.created_at,
    tags,
    last_spun_at: row.last_spun_at ?? null,
    spin_count: row.spin_count ?? 0,
  };
}

/** One extra query beats N+1: fetch every tag for a set of recipes at once. */
export async function tagsForRecipes(
  db: D1Database,
  recipeIds: number[],
): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  if (!recipeIds.length) return map;

  const placeholders = recipeIds.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT rt.recipe_id, t.id, t.name, t.color
         FROM recipe_tags rt
         JOIN tags t ON t.id = rt.tag_id
        WHERE rt.recipe_id IN (${placeholders})
        ORDER BY t.name`,
    )
    .bind(...recipeIds)
    .all<{ recipe_id: number; id: number; name: string; color: string }>();

  for (const r of results ?? []) {
    const list = map.get(r.recipe_id) ?? [];
    list.push({ id: r.id, name: r.name, color: r.color });
    map.set(r.recipe_id, list);
  }
  return map;
}
