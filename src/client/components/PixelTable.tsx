import type { ReactNode } from "react";

/**
 * A chunky 8-bit table. Same shape as the shadcn table primitives so callers
 * read the same way, but styled from the garden palette in plain CSS.
 *
 * The wrapper scrolls horizontally on its own so a wide table never forces the
 * page to scroll sideways.
 */

interface Props {
  children?: ReactNode;
  className?: string;
}

export function Table({ children, className }: Props) {
  return (
    <div className="p-table-wrap">
      <table className={`p-table ${className ?? ""}`.trim()}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: Props) {
  return <thead className="p-table__head">{children}</thead>;
}

export function TableBody({ children }: Props) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
}: Props & { onClick?: () => void }) {
  return (
    <tr
      className="p-table__row"
      onClick={onClick}
      data-clickable={onClick ? "true" : undefined}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: Props) {
  return <th className={`p-table__th ${className ?? ""}`.trim()}>{children}</th>;
}

export function TableCell({ children, className }: Props) {
  return <td className={`p-table__td ${className ?? ""}`.trim()}>{children}</td>;
}

export function TableCaption({ children }: Props) {
  return <caption className="p-table__caption">{children}</caption>;
}

/** Pixel badge with the little side-bars that give it a sprite silhouette. */
export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="p-badge" style={{ background: color }}>
      <i className="p-badge__ear" style={{ background: color }} />
      {children}
      <i className="p-badge__ear p-badge__ear--right" style={{ background: color }} />
    </span>
  );
}
