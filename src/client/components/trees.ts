import type { SheetName } from "./Sprite";

/** One tile placed on an absolute grid. Origin is the bottom-left of the tree. */
export type TreeTile = { x: number; y: number; tile: number; layer?: number };

export type TreeRecipe = {
  sheet: SheetName;
  w: number;
  h: number;
  tiles: TreeTile[];
};

function trunkColumn(
  x: number,
  y0: number,
  segments: number[],
  layer = 0,
): TreeTile[] {
  return segments.map((tile, i) => ({ x, y: y0 + i, tile, layer }));
}

function branchRow(y: number, x0 = 0, layer = 1): TreeTile[] {
  return [
    { x: x0, y, tile: 96, layer },
    { x: x0 + 1, y, tile: 97, layer },
    { x: x0 + 2, y, tile: 98, layer },
  ];
}

/** 3-wide green canopy rows above the fork row. */
function greenCanopy(y: number, rows: "short" | "tall", layer = 1): TreeTile[] {
  const top: TreeTile[] = [
    { x: 0, y: y + 1, tile: 17, layer },
    { x: 1, y: y + 1, tile: 18, layer },
    { x: 2, y: y + 1, tile: 19, layer },
    { x: 0, y, tile: 57, layer },
    { x: 1, y, tile: 58, layer },
    { x: 2, y, tile: 59, layer },
  ];
  if (rows === "short") return top;

  return [
    { x: 0, y: y + 2, tile: 17, layer },
    { x: 1, y: y + 2, tile: 18, layer },
    { x: 2, y: y + 2, tile: 19, layer },
    { x: 0, y: y + 1, tile: 37, layer },
    { x: 1, y: y + 1, tile: 38, layer },
    { x: 2, y: y + 1, tile: 39, layer },
    { x: 0, y, tile: 57, layer },
    { x: 1, y, tile: 58, layer },
    { x: 2, y, tile: 59, layer },
  ];
}

/**
 * Wide green tree from tilemap-example-a layer A: two canopy blocks flanking a
 * trunk column at x=3, with the fork row (96/97/98) between trunk and foliage.
 */
function greenBigCanopy(y0: number, layer = 1): TreeTile[] {
  return [
    { x: 0, y: y0, tile: 57, layer },
    { x: 1, y: y0, tile: 58, layer },
    { x: 2, y: y0, tile: 59, layer },
    { x: 4, y: y0, tile: 57, layer },
    { x: 5, y: y0, tile: 58, layer },
    { x: 6, y: y0, tile: 59, layer },
    { x: 0, y: y0 + 1, tile: 17, layer },
    { x: 1, y: y0 + 1, tile: 18, layer },
    { x: 2, y: y0 + 1, tile: 19, layer },
    { x: 4, y: y0 + 1, tile: 37, layer },
    { x: 5, y: y0 + 1, tile: 38, layer },
    { x: 6, y: y0 + 1, tile: 39, layer },
    { x: 4, y: y0 + 2, tile: 17, layer },
    { x: 5, y: y0 + 2, tile: 18, layer },
    { x: 6, y: y0 + 2, tile: 19, layer },
  ];
}

export const GREEN_BIG: TreeRecipe = {
  sheet: "base",
  w: 7,
  h: 7,
  tiles: [
    ...trunkColumn(3, 0, [109, 89, 89]),
    ...branchRow(3, 2),
    ...greenBigCanopy(4),
  ],
};

export const GREEN: TreeRecipe = {
  sheet: "base",
  w: 3,
  h: 6,
  tiles: [
    ...trunkColumn(1, 0, [109, 89, 89]),
    ...branchRow(3),
    ...greenCanopy(4, "short"),
  ],
};

/**
 * Farm birch canopy: 3x3 tile block from the farm sheet.
 */
const BIRCH_CANOPY = [
  [13, 14, 15],
  [29, 30, 31],
  [45, 46, 47],
] as const;

function birchCanopySlice(
  col0: number,
  row0: number,
  w: number,
  h: number,
  x0: number,
  y0: number,
  layer = 1,
): TreeTile[] {
  const tiles: TreeTile[] = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      tiles.push({
        x: x0 + col,
        y: y0 + row,
        tile: BIRCH_CANOPY[row0 + row][col0 + col],
        layer,
      });
    }
  }
  return tiles;
}

/** Short birch from the farm sample -- 2x2 canopy, two trunk segments. */
export const BIRCH: TreeRecipe = {
  sheet: "farm",
  w: 2,
  h: 4,
  tiles: [
    ...trunkColumn(1, 0, [109, 110]),
    ...birchCanopySlice(1, 1, 2, 2, 0, 2),
  ],
};

/** Wide birch beside the greenhouse -- 3x2 canopy, taller trunk. */
export const BIRCH_WIDE: TreeRecipe = {
  sheet: "farm",
  w: 3,
  h: 5,
  tiles: [
    ...trunkColumn(1, 0, [109, 110, 110]),
    ...birchCanopySlice(0, 1, 3, 2, 0, 3),
  ],
};

/** Tall thin birch from the right side of the farm sample. */
export const BIRCH_TALL: TreeRecipe = {
  sheet: "farm",
  w: 2,
  h: 6,
  tiles: [
    ...trunkColumn(1, 0, [109, 110, 110, 110]),
    ...birchCanopySlice(1, 0, 2, 3, 0, 4),
  ],
};

export const TREES = {
  tree: GREEN,
  bigTree: GREEN_BIG,
  autumnTree: BIRCH,
  autumnBigTree: BIRCH_WIDE,
  autumnTallTree: BIRCH_TALL,
} as const;

export type TreeKind = keyof typeof TREES;

/**
 * Pale background trees from tilemap-example-a col 13 rows 7-10 (116/117/118/137)
 * with canopy 153-155 from example-a row 6 and example-b row 1.
 */
export const WHITE_TREE: TreeRecipe = {
  sheet: "base",
  w: 3,
  h: 6,
  tiles: [
    { x: 1, y: 0, tile: 137 },
    { x: 1, y: 1, tile: 116 },
    { x: 1, y: 2, tile: 117 },
    { x: 0, y: 2, tile: 118, layer: 1 },
    { x: 1, y: 3, tile: 116 },
    { x: 0, y: 4, tile: 153, layer: 1 },
    { x: 1, y: 4, tile: 154, layer: 1 },
    { x: 2, y: 4, tile: 155, layer: 1 },
    { x: 0, y: 5, tile: 153, layer: 1 },
    { x: 1, y: 5, tile: 154, layer: 1 },
    { x: 2, y: 5, tile: 155, layer: 1 },
  ],
};

export const WHITE_TREES = {
  whiteTree: WHITE_TREE,
} as const;

export type WhiteTreeKind = keyof typeof WHITE_TREES;
