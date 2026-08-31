import type { Ingredient, RecipeCandidate } from "../shared/types";

const BASE = "https://api.spoonacular.com";

interface SpoonIngredient {
  name?: string;
  nameClean?: string;
  amount?: number;
  unit?: string;
  original?: string;
}

interface SpoonResult {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  sourceName?: string;
  summary?: string;
  extendedIngredients?: SpoonIngredient[];
  analyzedInstructions?: { name: string; steps: { number: number; step: string }[] }[];
}

/** Spoonacular summaries are HTML with promo links baked in. */
function stripHtml(html: string | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length ? text : null;
}

function toIngredients(raw: SpoonIngredient[] | undefined): Ingredient[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const i of raw) {
    const name = (i.nameClean || i.name || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      name,
      amount: typeof i.amount === "number" ? Math.round(i.amount * 100) / 100 : null,
      unit: (i.unit || "").trim(),
      original: (i.original || name).trim(),
    });
  }
  return out;
}

function toInstructions(raw: SpoonResult["analyzedInstructions"]): string[] {
  if (!raw?.length) return [];
  return raw.flatMap((block) => block.steps.map((s) => s.step.trim())).filter(Boolean);
}

export class SpoonacularError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * One call returns previews AND full recipe data, so saving a chosen recipe
 * later costs no extra quota.
 */
export async function searchRecipes(
  query: string,
  apiKey: string,
  count = 10,
): Promise<Omit<RecipeCandidate, "already_saved">[]> {
  const url = new URL(`${BASE}/recipes/complexSearch`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("number", String(count));
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("fillIngredients", "true");
  url.searchParams.set("instructionsRequired", "true");
  url.searchParams.set("sort", "popularity");

  const res = await fetch(url.toString());

  if (res.status === 401 || res.status === 403) {
    throw new SpoonacularError("Recipe service rejected the API key.", 502);
  }
  if (res.status === 402) {
    throw new SpoonacularError("Daily recipe search quota is used up. Try again tomorrow.", 429);
  }
  if (!res.ok) {
    throw new SpoonacularError(`Recipe service error (${res.status}).`, 502);
  }

  const body = (await res.json()) as { results?: SpoonResult[] };
  const mapped = (body.results ?? []).map((r) => ({
    spoonacular_id: r.id,
    title: r.title,
    image_url: r.image ?? null,
    ready_minutes: r.readyInMinutes ?? null,
    servings: r.servings ?? null,
    source_url: r.sourceUrl ?? null,
    source_name: r.sourceName ?? null,
    summary: stripHtml(r.summary),
    ingredients: toIngredients(r.extendedIngredients),
    instructions: toInstructions(r.analyzedInstructions),
  }));

  // instructionsRequired isn't airtight -- a few results still come back with
  // no method. Keep them, but show the complete ones first.
  return mapped.sort(
    (a, b) => Number(b.instructions.length > 0) - Number(a.instructions.length > 0),
  );
}
