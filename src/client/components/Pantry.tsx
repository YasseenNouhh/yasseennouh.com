import { useState } from "react";
import type { Recipe, Tag } from "../../shared/types";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./PixelTable";

interface Props {
  recipes: Recipe[];
  tags: (Tag & { count: number })[];
  activeTag: string | null;
  onTag: (tag: string | null) => void;
  onOpen: (recipe: Recipe) => void;
  isAdmin: boolean;
  onAdd: () => void;
}

function lastEaten(iso: string | null | undefined): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - Date.parse(`${iso.replace(" ", "T")}Z`)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

export function Pantry({ recipes, tags, activeTag, onTag, onOpen, isAdmin, onAdd }: Props) {
  const [mode, setMode] = useState<"table" | "cards">("table");

  return (
    <>
      <div className="section-head">
        <h2>The recipe book ({recipes.length})</h2>
        <div className="row">
          <div className="view-toggle">
            <button
              className="btn"
              aria-pressed={mode === "table"}
              onClick={() => setMode("table")}
            >
              LIST
            </button>
            <button
              className="btn"
              aria-pressed={mode === "cards"}
              onClick={() => setMode("cards")}
            >
              CARDS
            </button>
          </div>
          <button className="btn btn--primary" onClick={onAdd}>
            + ADD
          </button>
        </div>
      </div>

      <div className="filters" style={{ justifyContent: "flex-start", marginTop: 14 }}>
        <button
          className="chip"
          aria-pressed={activeTag === null}
          onClick={() => onTag(null)}
          style={{ background: activeTag === null ? "var(--wood)" : undefined }}
        >
          everything
        </button>
        {tags
          .filter((t) => t.count > 0)
          .map((t) => (
            <button
              key={t.id}
              className="chip"
              aria-pressed={activeTag === t.name}
              onClick={() => onTag(activeTag === t.name ? null : t.name)}
              style={{ background: activeTag === t.name ? t.color : undefined }}
            >
              {t.name} ({t.count})
            </button>
          ))}
      </div>

      {recipes.length === 0 ? (
        <div className="empty frame" style={{ marginTop: 18 }}>
          <p>
            {activeTag
              ? `Nothing tagged "${activeTag}" yet.`
              : "The recipe book is empty. Add a few dishes and the wheel comes alive."}
          </p>
        </div>
      ) : mode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Dish</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Last eaten</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.map((r) => (
              <TableRow key={r.id} onClick={() => onOpen(r)}>
                <TableCell>
                  {r.image_url ? (
                    <img className="p-table__thumb" src={r.image_url} alt="" loading="lazy" />
                  ) : null}
                </TableCell>
                <TableCell className="p-table__td--title">{r.title}</TableCell>
                <TableCell>{r.ready_minutes ? `${r.ready_minutes}m` : "—"}</TableCell>
                <TableCell>
                  {r.tags.length ? (
                    r.tags.map((t) => (
                      <Badge key={t.id} color={t.color}>
                        {t.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </TableCell>
                <TableCell>{lastEaten(r.last_spun_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="card-grid">
          {recipes.map((r) => (
            <article key={r.id} className="card frame">
              {r.image_url && <img className="card__img" src={r.image_url} alt="" loading="lazy" />}
              <div className="card__body">
                <h3 className="card__title">{r.title}</h3>
                <p className="card__meta">
                  {[
                    r.ready_minutes ? `${r.ready_minutes} min` : null,
                    `eaten ${lastEaten(r.last_spun_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {r.tags.length > 0 && (
                  <div className="tag-row">
                    {r.tags.map((t) => (
                      <span key={t.id} className="tag" style={{ background: t.color }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="card__actions">
                  <button className="btn" onClick={() => onOpen(r)}>
                    OPEN
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
