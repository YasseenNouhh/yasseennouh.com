/**
 * Pork exclusion.
 *
 * Spoonacular's own diet flags don't cover this, so we match on ingredient
 * names and titles ourselves. For a dietary restriction a false positive
 * (hiding a chicken sausage) is a much cheaper mistake than a false negative
 * (serving pork), so the list leans inclusive -- notably `sausage`, which is
 * pork far more often than not.
 *
 * Terms are matched on word boundaries: `ham` must not fire on "graham" or
 * "hamburger", and `lard` must not fire on "larder".
 */
export const PORK_TERMS = [
  "pork",
  "bacon",
  "ham",
  "hams",
  "gammon",
  "prosciutto",
  "pancetta",
  "guanciale",
  "speck",
  "lardon",
  "lardons",
  "lard",
  "chorizo",
  "salami",
  "pepperoni",
  "mortadella",
  "capicola",
  "coppa",
  "jamon",
  "serrano",
  "bratwurst",
  "andouille",
  "kielbasa",
  "sausage",
  "sausages",
  "hock",
  "trotter",
  "trotters",
  "chitterlings",
  "bologna",
  "spam",
] as const;

/* One pass, word-boundaried, case-insensitive. \b doesn't play well with
   hyphens in some sources, so treat any non-letter as a boundary. */
const PORK_RE = new RegExp(`(^|[^a-z])(${PORK_TERMS.join("|")})([^a-z]|$)`, "i");

/** True when the text mentions pork in any of its usual disguises. */
export function textHasPork(text: string | null | undefined): boolean {
  if (!text) return false;
  return PORK_RE.test(text);
}

interface PorkCheckable {
  title?: string | null;
  ingredients?: { name?: string; original?: string }[] | null;
}

/** Checks a recipe's title and every ingredient line. */
export function hasPork(recipe: PorkCheckable): boolean {
  if (textHasPork(recipe.title)) return true;
  for (const ing of recipe.ingredients ?? []) {
    if (textHasPork(ing.name) || textHasPork(ing.original)) return true;
  }
  return false;
}

/** Comma-separated list for Spoonacular's excludeIngredients parameter. */
export const EXCLUDE_PARAM = PORK_TERMS.join(",");
