/**
 * Generates the sprites that Kenney's Pixel Platformer pack doesn't contain:
 * a golden retriever with a walk cycle, birds, and a sun.
 *
 * Drawn as ASCII so they stay editable in source rather than being opaque
 * binaries. Palette is taken from the pack so they sit with the tiles.
 *
 *   node scripts/make-sprites.cjs
 */
const path = require("path");
const { writePng } = require("./pnglib.cjs");

const OUT = path.join(__dirname, "..", "src", "client", "sprites");

// Pack palette, sampled from tilemap_packed.png.
const PALETTE = {
  ".": null, // transparent
  O: "#434a5f", // the pack's universal outline navy
  G: "#e0a44e", // golden retriever coat
  L: "#f4c67e", // coat highlight
  D: "#b3783a", // coat shadow
  W: "#f7e7c6", // cream chest / muzzle
  N: "#2b2233", // nose + eye
  R: "#c4614f", // tongue / collar
  Y: "#f2b23e", // sun body
  A: "#f7d774", // sun highlight
  B: "#6b4a2c", // bird body
};

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Turns rows of single-character pixels into an RGBA buffer. */
function draw(rows) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const buf = Buffer.alloc(w * h * 4);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ".";
      const hex = PALETTE[ch];
      const o = (y * w + x) * 4;
      if (!hex) continue;
      const [r, g, b] = hexToRgb(hex);
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = 255;
    }
  });
  return { w, h, buf };
}

/** Lays frames out left to right in one strip, for CSS step() animation. */
function strip(frames, file) {
  const drawn = frames.map(draw);
  const fw = Math.max(...drawn.map((d) => d.w));
  const fh = Math.max(...drawn.map((d) => d.h));
  const W = fw * drawn.length;
  const out = Buffer.alloc(W * fh * 4);
  drawn.forEach((d, i) => {
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        const src = (y * d.w + x) * 4;
        const dst = (y * W + i * fw + x) * 4;
        for (let k = 0; k < 4; k++) out[dst + k] = d.buf[src + k];
      }
    }
  });
  writePng(path.join(OUT, file), W, fh, out);
  console.log(`${file}  ${W}x${fh}  (${drawn.length} frame${drawn.length > 1 ? "s" : ""} of ${fw}x${fh})`);
}

/* ------------------------------------------------------- golden retriever */

/* 22x16 side view facing right. The silhouette cues that read as "golden
   retriever" at this size: a long snout, a floppy ear hanging past the jaw,
   a feathered chest, and a plumed tail carried high. */
const dogBody = [
  ".....OOO..............",
  "....OGGGO...OOOOO.....",
  "....OGGGO..OGGGGGO....",
  ".....OGGO.OGLLLLLGO...",
  ".....OGGO.ODDLLLGGGO..",
  "......OGGOODDLGNGGGGO.",
  "...OOOOGGGODDGGGGGGGO.",
  "..OGGGGGGGODDGGGGGWWNO",
  "..OGGGGGGGGODDGGGWWWNO",
  "..OGGGGGGGGGODOGGGWWOO",
  "..OGGWWWWWGGGOOOGGWOO.",
  "..OGWWWWWWWGGGGGGOOO..",
  "...OGWWWWWGGGGGGGO....",
];

/* Front and back legs swing in opposite phase. */
const dogLegsA = [
  "....OGGO.OGGO.OGGO....",
  "....OGO...OGO..OGO....",
  "....OOO...OOO..OOO....",
];

const dogLegsB = [
  "...OGGO...OGGO.OGGO...",
  "...OGGO....OGO..OGGO..",
  "...OOO.....OOO..OOO...",
];

const dogLegsC = [
  ".....OGGO.OGGO..OGGO..",
  "......OGO..OGO...OGO..",
  "......OOO..OOO...OOO..",
];

/** The tail lifts on alternate frames so the trot has some bounce. */
function dogFrame(legs, tailUp) {
  const body = dogBody.slice();
  if (tailUp) {
    body[0] = "....OOO...............";
    body[1] = "...OGGGO....OOOOO.....";
    body[2] = "...OGGGO...OGGGGGO....";
    body[3] = "....OGGO..OGLLLLLGO...";
  }
  return [...body, ...legs];
}

strip(
  [
    dogFrame(dogLegsA, false),
    dogFrame(dogLegsB, true),
    dogFrame(dogLegsC, false),
    dogFrame(dogLegsB, true),
  ],
  "dog.png",
);

/* ------------------------------------------------------------------ birds */

/* 9x7, two frames: wings up and wings down. */
strip(
  [
    ["..O...O..", ".OBO.OBO.", "OBBOOOBBO", "..OBBBO..", "...OBO...", "....O....", "........."],
    [".........", "....O....", "...OBO...", "OOOBBBOOO", ".OBBBBBO.", "..OO.OO..", "........."],
  ],
  "bird.png",
);

/* -------------------------------------------------------------------- sun */

/* 24x24 with chunky rays; the glow is done in CSS so it can pulse. */
strip(
  [
    [
      "...........OO...........",
      "...........OO...........",
      "....O......OO......O....",
      ".....OO..OOOOOO..OO.....",
      "......O.OOYYYYOO.O......",
      "........OYAAAAYO........",
      ".......OYAAAAAAYO.......",
      "......OYAAAAAAAAYO......",
      "..OO.OYAAAAAAAAAAYO.OO..",
      "OOOOOOYAAAAAAAAAAYOOOOOO",
      "..OO.OYAAAAAAAAAAYO.OO..",
      "......OYAAAAAAAAYO......",
      ".......OYAAAAAAYO.......",
      "........OYAAAAYO........",
      "......O.OOYYYYOO.O......",
      ".....OO..OOOOOO..OO.....",
      "....O......OO......O....",
      "...........OO...........",
      "...........OO...........",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
    ],
  ],
  "sun.png",
);
