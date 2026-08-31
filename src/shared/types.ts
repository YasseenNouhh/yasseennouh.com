export interface Ingredient {
  name: string;
  amount: number | null;
  unit: string;
  original: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Recipe {
  id: number;
  title: string;
  image_url: string | null;
  ready_minutes: number | null;
  servings: number | null;
  source_url: string | null;
  source_name: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  summary: string | null;
  notes: string | null;
  spoonacular_id: number | null;
  created_at: string;
  tags: Tag[];
  last_spun_at?: string | null;
  spin_count?: number;
}

/** A search hit from Spoonacular, not yet saved. Carries the full payload so
 *  saving costs no extra API call. */
export interface RecipeCandidate {
  spoonacular_id: number;
  title: string;
  image_url: string | null;
  ready_minutes: number | null;
  servings: number | null;
  source_url: string | null;
  source_name: string | null;
  summary: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  already_saved: boolean;
}

export interface SpinCandidate {
  id: number;
  title: string;
  image_url: string | null;
  ready_minutes: number | null;
}

export interface HistoryEntry {
  spin_id: number;
  recipe_id: number;
  title: string;
  image_url: string | null;
  spun_at: string;
}

export interface Stats {
  total_recipes: number;
  total_spins: number;
  spins_this_month: number;
  top: { title: string; count: number }[];
  by_tag: { name: string; color: string; count: number }[];
}
