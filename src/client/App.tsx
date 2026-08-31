import { useCallback, useEffect, useRef, useState } from "react";
import type { Recipe, SpinCandidate, Tag } from "../shared/types";
import { api, ApiError, setAdminKey } from "./api";
import { Garden } from "./components/Garden";
import { Wheel } from "./components/Wheel";
import { RecipeModal } from "./components/RecipeModal";
import { AddRecipeDialog } from "./components/AddRecipeDialog";
import { Pantry } from "./components/Pantry";
import { HistoryView } from "./components/HistoryView";
import { LoadingScreen } from "./components/LoadingScreen";
import { UnlockDialog } from "./components/UnlockDialog";

const HUB_IMAGE = "/assets/loki.png";
const COOLDOWN_DAYS = 14;

type View = "spin" | "pantry" | "log";

export function App() {
  const [view, setView] = useState<View>("spin");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hubImage, setHubImage] = useState<string | null>(null);

  const [tags, setTags] = useState<(Tag & { count: number })[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<SpinCandidate[]>([]);
  const [pool, setPool] = useState({ total: 0, cooled: 0 });
  const [spinToken, setSpinToken] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinCandidate | null>(null);

  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [dataReady, setDataReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const booted = dataReady && minElapsed;

  /* Only show the hub photo once we know it exists. */
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHubImage(HUB_IMAGE);
    img.src = HUB_IMAGE;
  }, []);

  useEffect(() => {
    api
      .checkAdmin()
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, []);

  const loadTags = useCallback(() => {
    void api.tags().then((r) => setTags(r.tags));
  }, []);

  const loadRecipes = useCallback(() => {
    void api
      .recipes(activeTag ?? undefined)
      .then((r) => setRecipes(r.recipes))
      .catch(() => setRecipes([]));
  }, [activeTag]);

  const loadCandidates = useCallback(async () => {
    const r = await api.spinCandidates(activeTag, COOLDOWN_DAYS);
    setCandidates(r.candidates);
    setPool({ total: r.pool, cooled: r.cooled });
    return r.candidates;
  }, [activeTag]);

  useEffect(() => {
    loadTags();
  }, [loadTags, refreshToken]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes, refreshToken]);

  /* The wheel must keep showing the slices it actually span. Recording a spin
     bumps refreshToken, and reloading candidates here would swap the slices out
     from under the pointer -- so hold still while a result is on screen. */
  const busy = useRef(false);
  busy.current = spinning || result !== null;

  useEffect(() => {
    if (busy.current) return;
    void loadCandidates()
      .catch(() => setCandidates([]))
      .finally(() => setDataReady(true));
  }, [loadCandidates, refreshToken]);

  /* Hold the loading screen for a beat so it reads as a scene, not a flash. */
  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  async function spin() {
    setResult(null);
    setError(null);
    setSpinning(true);
    try {
      // Reshuffle first so consecutive spins don't show the same twelve.
      const fresh = await loadCandidates();
      if (!fresh.length) {
        setSpinning(false);
        return;
      }
      setSpinToken((t) => t + 1);
    } catch (err) {
      setSpinning(false);
      setError(err instanceof ApiError ? err.message : "Could not reach the kitchen.");
    }
  }

  async function onLanded(candidate: SpinCandidate) {
    setSpinning(false);
    setResult(candidate);
    try {
      await api.recordSpin(candidate.id);
      setRefreshToken((t) => t + 1);
    } catch {
      /* the wheel still spun; logging is best-effort */
    }
  }

  async function openById(id: number) {
    const { recipe } = await api.recipe(id);
    setOpenRecipe(recipe);
  }

  /** The add button is always visible; unlocking is just a step on the way. */
  function requestAdd() {
    if (isAdmin) setShowAdd(true);
    else setShowUnlock(true);
  }

  if (!booted) {
    return (
      <>
        <Garden />
        <LoadingScreen variant="fullscreen" title="LOKI'S KITCHEN" autoProgress autoProgressDuration={1400} />
      </>
    );
  }

  return (
    <>
      <Garden />

      <div className="shell">
        <header className="masthead">
          <div className="sign">
            <span className="nail" />
            <span className="nail" />
            <span className="nail" />
            <span className="nail" />
            <h1>LOKI'S KITCHEN</h1>
            <div className="tagline">good boy decides dinner</div>
          </div>
        </header>

        <nav className="tabs" role="tablist">
          {(
            [
              ["spin", "SPIN"],
              ["pantry", "RECIPES"],
              ["log", "LOG"],
            ] as [View, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              className="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && <div className="notice notice--bad">{error}</div>}

        {view === "spin" && (
          <section className="stage">
            {tags.filter((t) => t.count > 0).length > 0 && (
              <div className="filters">
                <button
                  className="chip"
                  aria-pressed={activeTag === null}
                  style={{ background: activeTag === null ? "var(--wood)" : undefined }}
                  onClick={() => setActiveTag(null)}
                >
                  anything
                </button>
                {tags
                  .filter((t) => t.count > 0)
                  .map((t) => (
                    <button
                      key={t.id}
                      className="chip"
                      aria-pressed={activeTag === t.name}
                      style={{ background: activeTag === t.name ? t.color : undefined }}
                      onClick={() => setActiveTag(activeTag === t.name ? null : t.name)}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            )}

            {candidates.length === 0 ? (
              <div className="wheel-empty frame">
                <h2 style={{ fontSize: 12, marginBottom: 12 }}>Nothing to spin</h2>
                <p>
                  {pool.total === 0
                    ? "The recipe book is empty. Add a few dishes first."
                    : `No recipes match "${activeTag}" yet.`}
                </p>
                <button
                  className="btn btn--primary"
                  style={{ marginTop: 14 }}
                  onClick={requestAdd}
                >
                  + ADD RECIPE
                </button>
              </div>
            ) : (
              <>
                <Wheel
                  candidates={candidates}
                  hubImage={hubImage}
                  spinToken={spinToken}
                  onLanded={onLanded}
                />

                <button className="btn btn--primary btn--big" onClick={spin} disabled={spinning}>
                  {spinning ? "SPINNING…" : "SPIN!"}
                </button>

                <p className="spin-meta">
                  {candidates.length} of {pool.total} on the wheel
                  {pool.cooled > 0 && ` · ${pool.cooled} resting after a recent dinner`}
                </p>
              </>
            )}

            {result && !spinning && (
              <div className="result frame">
                <h2>TONIGHT YOU'RE HAVING</h2>
                {result.image_url && <img src={result.image_url} alt="" />}
                <p className="result__title">{result.title}</p>
                {result.ready_minutes && <p className="muted">about {result.ready_minutes} minutes</p>}
                <div className="result__actions">
                  <button className="btn btn--leaf" onClick={() => openById(result.id)}>
                    COOK IT
                  </button>
                  <button className="btn" onClick={spin}>
                    SPIN AGAIN
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {view === "pantry" && (
          <Pantry
            recipes={recipes}
            tags={tags}
            activeTag={activeTag}
            onTag={setActiveTag}
            onOpen={setOpenRecipe}
            isAdmin={isAdmin}
            onAdd={requestAdd}
          />
        )}

        {view === "log" && (
          <HistoryView isAdmin={isAdmin} refreshToken={refreshToken} onOpenRecipe={openById} />
        )}
      </div>

      <footer className="footer">
        {isAdmin ? (
          <button
            className="btn btn--ghost"
            onClick={() => {
              setAdminKey("");
              setIsAdmin(false);
            }}
          >
            kitchen unlocked — lock it
          </button>
        ) : (
          <button className="btn btn--ghost" onClick={() => setShowUnlock(true)}>
            cook's entrance
          </button>
        )}
        <div className="footer__credit">
          art by{" "}
          <a href="https://kenney.nl" target="_blank" rel="noreferrer noopener">
            Kenney
          </a>{" "}
          (CC0)
        </div>
      </footer>

      {openRecipe && (
        <RecipeModal
          recipe={openRecipe}
          isAdmin={isAdmin}
          onClose={() => setOpenRecipe(null)}
          onChanged={() => setRefreshToken((t) => t + 1)}
        />
      )}

      {showUnlock && (
        <UnlockDialog
          onClose={() => setShowUnlock(false)}
          onUnlocked={() => {
            setIsAdmin(true);
            setShowAdd(true);
          }}
        />
      )}

      {showAdd && (
        <AddRecipeDialog
          onClose={() => setShowAdd(false)}
          onSaved={() => setRefreshToken((t) => t + 1)}
        />
      )}
    </>
  );
}
