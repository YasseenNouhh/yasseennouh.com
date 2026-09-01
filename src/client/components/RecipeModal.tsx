import { useEffect, useMemo, useState } from "react";
import type { Recipe } from "../../shared/types";
import { api, ApiError } from "../api";

interface Props {
  recipe: Recipe;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function shoppingKey(id: number) {
  return `loki-shopping-${id}`;
}

export function RecipeModal({ recipe, isAdmin, onClose, onChanged }: Props) {
  const [needed, setNeeded] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState(recipe.title);
  const [notes, setNotes] = useState(recipe.notes ?? "");
  const [tagText, setTagText] = useState(recipe.tags.map((t) => t.name).join(", "));
  const [savedFlash, setSavedFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Shopping ticks are a per-person, per-device thing — localStorage, not the DB.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(shoppingKey(recipe.id));
      if (raw) setNeeded(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* fresh list is fine */
    }
  }, [recipe.id]);

  function toggle(name: string) {
    const next = new Set(needed);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setNeeded(next);
    try {
      localStorage.setItem(shoppingKey(recipe.id), JSON.stringify([...next]));
    } catch {
      /* private mode, no big deal */
    }
  }

  const shoppingText = useMemo(
    () =>
      recipe.ingredients
        .filter((i) => needed.has(i.name))
        .map((i) => `- ${i.original}`)
        .join("\n"),
    [recipe.ingredients, needed],
  );

  async function copyList() {
    await navigator.clipboard.writeText(`${recipe.title} — shopping list\n\n${shoppingText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function saveEdits() {
    setSaveError(null);
    try {
      await api.updateRecipe(recipe.id, {
        title: title.trim(),
        notes: notes.trim() || null,
        tags: tagText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save.");
    }
  }

  async function remove() {
    if (!confirm(`Remove "${recipe.title}" from the kitchen for good?`)) return;
    await api.deleteRecipe(recipe.id);
    onChanged();
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal frame" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{recipe.title}</h2>
          <button className="btn" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>

        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt=""
            style={{
              width: "100%",
              maxHeight: 260,
              objectFit: "cover",
              border: "4px solid var(--ink)",
              imageRendering: "auto",
            }}
          />
        )}

        <p className="muted" style={{ marginTop: 12 }}>
          {[
            recipe.ready_minutes ? `${recipe.ready_minutes} min` : null,
            recipe.servings ? `serves ${recipe.servings}` : null,
            recipe.source_name,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>

        {recipe.tags.length > 0 && (
          <div className="tag-row" style={{ marginTop: 8 }}>
            {recipe.tags.map((t) => (
              <span key={t.id} className="tag" style={{ background: t.color }}>
                {t.name}
              </span>
            ))}
          </div>
        )}

        {recipe.summary && <p style={{ marginTop: 14 }}>{recipe.summary}</p>}

        {recipe.notes && !isAdmin && (
          <div className="notice" style={{ marginTop: 14 }}>
            <strong>Note:</strong> {recipe.notes}
          </div>
        )}

        <h3>Shopping list</h3>
        <p className="muted" style={{ marginTop: -4 }}>
          Tick what you still need to buy.
        </p>
        <ul className="checklist">
          {recipe.ingredients.map((ing) => (
            <li key={ing.name} data-checked={needed.has(ing.name)} onClick={() => toggle(ing.name)}>
              <input type="checkbox" checked={needed.has(ing.name)} readOnly tabIndex={-1} />
              <span>{ing.original}</span>
            </li>
          ))}
          {recipe.ingredients.length === 0 && <li className="muted">No ingredients recorded.</li>}
        </ul>

        {needed.size > 0 && (
          <button className="btn btn--leaf" onClick={copyList} style={{ marginTop: 10 }}>
            {copied ? "COPIED!" : `COPY ${needed.size} ITEM${needed.size > 1 ? "S" : ""}`}
          </button>
        )}

        <h3>Method</h3>
        {recipe.instructions.length > 0 ? (
          <ol>
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            No steps saved for this one
            {recipe.source_url ? " — follow the source link below." : "."}
          </p>
        )}

        {recipe.source_url && (
          <p style={{ marginTop: 16 }}>
            <a href={recipe.source_url} target="_blank" rel="noreferrer noopener">
              Open the original recipe →
            </a>
          </p>
        )}

        {isAdmin && (
          <>
            <h3>Name</h3>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe name"
              style={{ width: "100%" }}
            />

            <h3>Cook's notes</h3>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Use half the chili. Takes 50 min, not 30."
              style={{ width: "100%" }}
            />
            <h3>Tags</h3>
            <input
              className="input"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="quick, comfort, veggie"
              style={{ width: "100%" }}
            />
            {saveError && <div className="notice notice--bad">{saveError}</div>}

            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn--leaf" onClick={saveEdits} disabled={!title.trim()}>
                {savedFlash ? "SAVED!" : "SAVE"}
              </button>
              <button className="btn btn--danger" onClick={remove}>
                REMOVE RECIPE
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
