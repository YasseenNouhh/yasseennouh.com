import type {
  HistoryEntry,
  Recipe,
  RecipeCandidate,
  SpinCandidate,
  Stats,
  Tag,
} from "../shared/types";

const ADMIN_KEY_STORAGE = "loki-admin-key";

export function getAdminKey(): string {
  return localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
}

export function setAdminKey(key: string): void {
  if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  else localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");

  const key = getAdminKey();
  if (key) headers.set("x-admin-key", key);

  const res = await fetch(path, { ...init, headers, credentials: "same-origin" });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};

  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export const api = {
  tags: () => request<{ tags: (Tag & { count: number })[] }>("/api/tags"),

  recipes: (tag?: string) =>
    request<{ recipes: Recipe[] }>(`/api/recipes${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`),

  recipe: (id: number) => request<{ recipe: Recipe }>(`/api/recipes/${id}`),

  spinCandidates: (tag: string | null, cooldown: number) => {
    const q = new URLSearchParams({ cooldown: String(cooldown) });
    if (tag) q.set("tag", tag);
    return request<{ candidates: SpinCandidate[]; pool: number; cooled: number }>(
      `/api/spin/candidates?${q}`,
    );
  },

  recordSpin: (recipeId: number) =>
    request<{ ok: true }>("/api/spin", {
      method: "POST",
      body: JSON.stringify({ recipe_id: recipeId }),
    }),

  history: (limit = 50) => request<{ history: HistoryEntry[] }>(`/api/history?limit=${limit}`),

  stats: () => request<{ stats: Stats }>("/api/stats"),

  checkAdmin: () => request<{ ok: true }>("/api/admin/check"),

  search: (q: string) =>
    request<{ candidates: RecipeCandidate[] }>(`/api/admin/search?q=${encodeURIComponent(q)}`),

  saveRecipe: (candidate: RecipeCandidate, tags: string[]) =>
    request<{ id: number }>("/api/admin/recipes", {
      method: "POST",
      body: JSON.stringify({ ...candidate, tags }),
    }),

  updateRecipe: (id: number, patch: { notes?: string | null; tags?: string[] }) =>
    request<{ ok: true }>(`/api/admin/recipes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteRecipe: (id: number) =>
    request<{ ok: true }>(`/api/admin/recipes/${id}`, { method: "DELETE" }),

  deleteSpin: (id: number) => request<{ ok: true }>(`/api/admin/spins/${id}`, { method: "DELETE" }),
};
