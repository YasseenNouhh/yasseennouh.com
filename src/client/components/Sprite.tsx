import type { CSSProperties } from "react";
import sheet from "../sprites/tilemap.png";

/**
 * Tiles from the Kenney "Pixel Platformer" sheet (CC0), addressed by index in
 * the 20x9 grid. Drawn with background-position so the whole set costs one
 * 6KB request.
 *
 * Many of Kenney's objects span several tiles -- a cloud is three tiles wide,
 * a tree three tall, a hedge up to 3x3. Use `Composite` for those; rendering a
 * single tile of a multi-tile object is what makes sprites look sliced.
 */

const TILE = 18;
const COLS = 20;
const ROWS = 9;

/** Single-tile objects, verified against the sheet. */
export const T = {
  grass: 1,
  dirt: 120,
  shrub: 124,
  plant: 125,
  pine: 126,
  mushroom: 128,
  smallCloud: 156,
  heart: 44,
  coin: 151,
} as const;

/** Multi-tile objects, as [row][col] grids. */
export const G = {
  /** Full leafy tree: canopy, trunk, base. */
  tree: [[97], [117], [137]],
  /** Bare tree with leaf clumps. */
  bareTree: [[96], [116], [136]],
  /** Three-tile-wide cloud. */
  cloud: [[153, 154, 155]],
  /** Vertical hedge column: cap and base. */
  hedge: [[16], [76]],
  /** Tall hedge column. */
  hedgeTall: [[16], [36], [76]],
  /** Wide hedge block. */
  hedgeBlock: [
    [17, 18, 19],
    [57, 58, 59],
  ],
} as const;

interface SpriteProps {
  tile: number;
  /** Each tile is 18px; scale 4 renders it at 72px. */
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function Sprite({ tile, scale = 4, className, style }: SpriteProps) {
  const col = tile % COLS;
  const row = Math.floor(tile / COLS);

  return (
    <span
      className={className}
      style={{
        display: "block",
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

interface CompositeProps {
  /** Tile indices as [row][col]. */
  grid: readonly (readonly number[])[];
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

/** Assembles a multi-tile object so nothing is rendered mid-object. */
export function Composite({ grid, scale = 4, className, style }: CompositeProps) {
  const cols = grid[0].length;

  return (
    <span
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${TILE * scale}px)`,
        lineHeight: 0,
        ...style,
      }}
    >
      {grid.flatMap((row, r) => row.map((tile, c) => <Sprite key={`${r}-${c}`} tile={tile} scale={scale} />))}
    </span>
  );
}

interface AnimatedProps {
  /** Horizontal frame strip. */
  src: string;
  frames: number;
  /** Native size of a single frame, in pixels. */
  frameWidth: number;
  frameHeight: number;
  scale?: number;
  /** Seconds for one full cycle. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/** Plays a frame strip with steps() so frames snap rather than cross-fade. */
export function AnimatedSprite({
  src,
  frames,
  frameWidth,
  frameHeight,
  scale = 3,
  duration = 0.8,
  className,
  style,
}: AnimatedProps) {
  return (
    <span
      className={className}
      style={{
        display: "block",
        width: frameWidth * scale,
        height: frameHeight * scale,
        backgroundImage: `url(${src})`,
        backgroundSize: `${frameWidth * frames * scale}px ${frameHeight * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        animation: `sprite-frames ${duration}s steps(${frames}) infinite`,
        // The keyframe walks background-position across the strip; the end
        // position is one full strip width so steps() lands on each frame.
        ["--frames-width" as string]: `${frameWidth * frames * scale}px`,
        ...style,
      }}
    />
  );
}
