import type { CSSProperties } from "react";
import baseSheet from "../sprites/tilemap.png";
import farmSheet from "../sprites/farm.png";

/**
 * Tiles from Kenney's Pixel Platformer (CC0) and its Farm Expansion, addressed
 * by index in each sheet's grid. Two images total, ~11KB.
 *
 * Most of Kenney's scenery is a MULTI-TILE STRUCTURE -- a tree is a canopy
 * block over a trunk column, a greenhouse is 4x4, a cloud is three tiles wide.
 * Rendering one tile of those is what makes sprites look sliced through, so
 * anything in `G` must go through `Composite`, never `Sprite`.
 */

const TILE = 18;

export const SHEETS = {
  base: { url: baseSheet, cols: 20, rows: 9 },
  farm: { url: farmSheet, cols: 16, rows: 7 },
} as const;

export type SheetName = keyof typeof SHEETS;

/** Single-tile objects. Everything here is a complete thing on its own. */
export const T = {
  // base pack
  grass: 1,
  dirt: 120,
  bush: 16,
  shrub: 124,
  plant: 125,
  pine: 126,
  mushroom: 128,
  smallCloud: 156,
  heart: 44,
  coin: 151,
  // farm expansion
  pumpkin: 4,
  jackOLantern: 5,
  hayRoll: 10,
  hayBale: 11,
  hayRound: 12,
  carrot: 56,
  tomatoes: 57,
  wheat: 58,
  corn: 59,
  sprout: 104,
  leafyPlant: 73,
} as const;

/**
 * Multi-tile structures as [row][col] grids. `null` leaves a gap, which is how
 * the greenhouse gable and the tree trunks are centred.
 */
export const G = {
  /** Canopy block over a centred trunk -- the canopy rows tile seamlessly. */
  tree: [
    [17, 18, 19],
    [57, 58, 59],
    [null, 97, null],
    [null, 117, null],
    [null, 137, null],
  ],
  bigTree: [
    [17, 18, 19],
    [37, 38, 39],
    [57, 58, 59],
    [null, 97, null],
    [null, 117, null],
    [null, 137, null],
  ],
  /** Farm: autumn birch, two tiles wide. 74/78 are branch caps, 76/79 the
   *  canopy-to-trunk transition row, 93/109 the trunk column. */
  autumnBigTree: [
    [74, 78],
    [76, 79],
    [null, 93],
    [null, 109],
  ],
  /** Farm: shorter autumn birch -- same width, one fewer trunk segment. */
  autumnTree: [
    [74, 78],
    [76, 79],
    [null, 109],
  ],
  /** Low wide hedge. */
  lowHedge: [[77, 78, 79]],
  /** Three-tile-wide cloud. */
  cloud: [[153, 154, 155]],
  /** Farm: gabled greenhouse with a door, 4x4. */
  greenhouse: [
    [null, 52, 53, null],
    [68, 69, 70, 71],
    [84, 85, 86, 87],
    [100, 101, 102, 103],
  ],
  /** Farm: four-tile run of planted fence. */
  fence: [[38, 39, 40, 41]],
  /** Farm: sunflower on its stem. */
  sunflower: [[20], [36]],
} as const;

type Grid = readonly (readonly (number | null)[])[];

interface SpriteProps {
  tile: number;
  sheet?: SheetName;
  /** Each tile is 18px; scale 4 renders it at 72px. */
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function Sprite({ tile, sheet = "base", scale = 4, className, style }: SpriteProps) {
  const { url, cols, rows } = SHEETS[sheet];
  const col = tile % cols;
  const row = Math.floor(tile / cols);

  return (
    <span
      className={className}
      style={{
        display: "block",
        width: TILE * scale,
        height: TILE * scale,
        backgroundImage: `url(${url})`,
        backgroundSize: `${cols * TILE * scale}px ${rows * TILE * scale}px`,
        backgroundPosition: `${-col * TILE * scale}px ${-row * TILE * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}

interface CompositeProps {
  grid: Grid;
  sheet?: SheetName;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

/** Assembles a multi-tile structure so nothing is drawn mid-object. */
export function Composite({ grid, sheet = "base", scale = 4, className, style }: CompositeProps) {
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
      {grid.flatMap((row, r) =>
        row.map((tile, c) =>
          tile === null ? (
            <span key={`${r}-${c}`} style={{ width: TILE * scale, height: TILE * scale }} />
          ) : (
            <Sprite key={`${r}-${c}`} tile={tile} sheet={sheet} scale={scale} />
          ),
        ),
      )}
    </span>
  );
}

interface AnimatedProps {
  /** Horizontal frame strip. */
  src: string;
  frames: number;
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
        ["--frames-width" as string]: `${frameWidth * frames * scale}px`,
        ...style,
      }}
    />
  );
}
