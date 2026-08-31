import { useEffect, useState } from "react";
import type { HistoryEntry, Stats } from "../../shared/types";
import { api } from "../api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./PixelTable";

function when(iso: string): string {
  const d = new Date(`${iso.replace(" ", "T")}Z`);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface Props {
  isAdmin: boolean;
  refreshToken: number;
  onOpenRecipe: (id: number) => void;
}

export function HistoryView({ isAdmin, refreshToken, onOpenRecipe }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void Promise.all([api.history(60), api.stats()]).then(([h, s]) => {
      setHistory(h.history);
      setStats(s.stats);
    });
  }, [refreshToken]);

  const topMax = Math.max(1, ...(stats?.top.map((t) => t.count) ?? [1]));

  async function forget(id: number) {
    await api.deleteSpin(id);
    setHistory((prev) => prev.filter((h) => h.spin_id !== id));
  }

  return (
    <>
      <div className="section-head">
        <h2>Dinner log</h2>
      </div>

      {stats && (
        <>
          <div className="stat-grid">
            <div className="stat frame">
              <span className="stat__n">{stats.total_recipes}</span>
              <span className="stat__label">recipes in the book</span>
            </div>
            <div className="stat frame">
              <span className="stat__n">{stats.total_spins}</span>
              <span className="stat__label">dinners decided</span>
            </div>
            <div className="stat frame">
              <span className="stat__n">{stats.spins_this_month}</span>
              <span className="stat__label">this month</span>
            </div>
          </div>

          {stats.top.length > 0 && (
            <div className="frame" style={{ padding: 16, marginTop: 16 }}>
              <h3 style={{ fontSize: 11, marginBottom: 12 }}>Most spun</h3>
              {stats.top.map((t) => (
                <div className="bar-row" key={t.title}>
                  <span className="bar-row__label">{t.title.slice(0, 16)}</span>
                  <div className="bar">
                    <span style={{ width: `${(t.count / topMax) * 100}%` }} />
                  </div>
                  <span className="muted">{t.count}</span>
                </div>
              ))}
            </div>
          )}

          {stats.by_tag.length > 0 && (
            <div className="frame" style={{ padding: 16, marginTop: 16 }}>
              <h3 style={{ fontSize: 11, marginBottom: 12 }}>What you actually eat</h3>
              <div className="tag-row">
                {stats.by_tag.map((t) => (
                  <span key={t.name} className="tag" style={{ background: t.color }}>
                    {t.name} × {t.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {history.length === 0 ? (
        <div className="empty frame" style={{ marginTop: 18 }}>
          <p>No dinners logged yet. Go spin the wheel.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Dish</TableHead>
              <TableHead>When</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.spin_id}>
                <TableCell>
                  {h.image_url ? (
                    <img className="p-table__thumb" src={h.image_url} alt="" loading="lazy" />
                  ) : null}
                </TableCell>
                <TableCell className="p-table__td--title">
                  <button className="btn btn--ghost" onClick={() => onOpenRecipe(h.recipe_id)}>
                    {h.title}
                  </button>
                </TableCell>
                <TableCell>{when(h.spun_at)}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <button className="btn btn--ghost" onClick={() => forget(h.spin_id)}>
                      forget
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
