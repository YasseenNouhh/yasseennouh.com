import { useState } from "react";
import type { RecipeCandidate } from "../../shared/types";
import { api, ApiError } from "../api";
import { LoadingScreen } from "./LoadingScreen";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const SUGGESTED_TAGS = ["quick", "veggie", "comfort", "healthy", "cheat", "fancy"];

const SEARCH_TIPS = [
  "Rifling through the cookbooks…",
  "Simple names work best: \"katsu\" beats \"crispy chicken katsu curry\".",
  "Each search costs a little of the daily recipe quota.",
  "Ten results come back — the ones with full method are listed first.",
];

export function AddRecipeDialog({ onClose, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<RecipeCandidate[] | null>(null);
  const [porkHidden, setPorkHidden] = useState(0);
  const [chosen, setChosen] = useState<RecipeCandidate | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setCandidates(null);
    try {
      const { candidates, pork_hidden } = await api.search(query.trim());
      setCandidates(candidates);
      setPorkHidden(pork_hidden ?? 0);
      if (!candidates.length) {
        setError(
          pork_hidden
            ? `Every result for "${query.trim()}" contained pork, so none are shown.`
            : `Nothing found for "${query.trim()}". Try a simpler name.`,
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function save() {
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveRecipe(chosen, tags);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
      setSaving(false);
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal frame" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{chosen ? "Save this one?" : "Add a recipe"}</h2>
          <button className="btn" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>

        {!chosen && (
          <>
            <p className="muted">Type a dish. I'll bring back ten and you pick your favourite.</p>
            <form className="field" onSubmit={search}>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="chicken katsu, mushroom risotto, shakshuka…"
                autoFocus
              />
              <button className="btn btn--primary" disabled={searching || !query.trim()}>
                {searching ? "LOOKING…" : "SEARCH"}
              </button>
            </form>
          </>
        )}

        {error && <div className="notice notice--bad">{error}</div>}

        {searching && (
          <LoadingScreen
            title="SEARCHING"
            autoProgress
            autoProgressDuration={2600}
            tips={SEARCH_TIPS}
          />
        )}

        {!chosen && !searching && porkHidden > 0 && candidates && candidates.length > 0 && (
          <div className="notice">
            {porkHidden} pork {porkHidden === 1 ? "recipe" : "recipes"} hidden.
          </div>
        )}

        {!chosen && !searching && candidates && candidates.length > 0 && (
          <div className="card-grid">
            {candidates.map((c) => (
              <article key={c.spoonacular_id} className="card frame">
                {c.image_url && <img className="card__img" src={c.image_url} alt="" loading="lazy" />}
                <div className="card__body">
                  <h3 className="card__title">{c.title}</h3>
                  <p className="card__meta">
                    {[
                      c.ready_minutes ? `${c.ready_minutes} min` : null,
                      c.servings ? `serves ${c.servings}` : null,
                      `${c.ingredients.length} ingredients`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {c.summary && (
                    <p className="card__meta" style={{ opacity: 0.85 }}>
                      {c.summary.slice(0, 120)}…
                    </p>
                  )}
                  <div className="card__actions">
                    {c.already_saved ? (
                      <span className="tag" style={{ background: "var(--wood)" }}>
                        already saved
                      </span>
                    ) : (
                      <button className="btn btn--leaf" onClick={() => setChosen(c)}>
                        PICK THIS
                      </button>
                    )}
                    {c.source_url && (
                      <a
                        className="btn btn--ghost"
                        href={c.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        preview
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {chosen && (
          <>
            <article className="card frame" style={{ marginBottom: 16 }}>
              {chosen.image_url && <img className="card__img" src={chosen.image_url} alt="" />}
              <div className="card__body">
                <h3 className="card__title">{chosen.title}</h3>
                <p className="card__meta">
                  {[
                    chosen.ready_minutes ? `${chosen.ready_minutes} min` : null,
                    chosen.servings ? `serves ${chosen.servings}` : null,
                    chosen.source_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </article>

            <h3>Tag it</h3>
            <p className="muted" style={{ marginTop: -4 }}>
              Tags let you spin within a mood — "quick" on a Tuesday, "fancy" on a Saturday.
            </p>
            <div className="filters" style={{ justifyContent: "flex-start" }}>
              {SUGGESTED_TAGS.map((t) => (
                <button
                  key={t}
                  className="chip"
                  aria-pressed={tags.includes(t)}
                  style={{ background: tags.includes(t) ? "var(--leaf)" : undefined }}
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn btn--primary" onClick={save} disabled={saving}>
                {saving ? "SAVING…" : "SAVE TO KITCHEN"}
              </button>
              <button className="btn" onClick={() => setChosen(null)}>
                BACK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
