import type { CSSProperties } from "react";
import sheet from "../sprites/tilemap.png";

/**
 * One tile out of the Kenney "Pixel Platformer" sheet (CC0), addressed by its
 * index in the 20x9 grid. Drawn with background-position so the whole set
 * costs a single 6KB request.
 */

const TILE = 18;
const COLS = 20;
const ROWS = 9;

/** Named indices, verified against the sheet rather than guessed. */
export const T = {
  grass: 1,
  dirt: 120,
  foliage: 16,
  foliageTall: 17,
  fenceLeft: 105,
  fenceRight: 106,
  shrub: 124,
  plant: 125,
  pine: 126,
  mushroom: 128,
  tree: 96,
  cloudSmall: 153,
  cloudWide: 154,
  cloudPuff: 155,
  heart: 44,
  coin: 151,
} as const;

interface Props {
  tile: number;
  /** Each tile is 18px; scale 4 renders it at 72px. */
  scale?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function Sprite({ tile, scale = 4, className, style, title }: Props) {
  const col = tile % COLS;
  const row = Math.floor(tile / COLS);

  return (
    <span
      className={className}
      title={title}
      style={{
        display: "inline-block",
        width: TILE * scale,
        height: TILE * scale,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${COLS * TILE * scale}px ${ROWS * TILE * scale}px`,
        backgroundPosition: `${-col * TILE * scale}px ${-row * TILE * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
