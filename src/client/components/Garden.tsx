import grass from "../sprites/grass.png";
import dirt from "../sprites/dirt.png";
import sun from "../sprites/sun.png";
import bird from "../sprites/bird.png";
import dog from "../sprites/dog.png";
import { AnimatedSprite, Composite, Sprite, G, T, type SheetName } from "./Sprite";

/**
 * Fixed scenery behind the app: a smallholding with a greenhouse, a fenced
 * vegetable patch, trees and Loki doing laps.
 *
 * Scenery comes from Kenney's Pixel Platformer and its Farm Expansion (both
 * CC0). Everything multi-tile is assembled with `Composite` -- see Sprite.tsx.
 * The sun, birds and dog aren't in either pack; they're drawn in
 * `scripts/make-sprites.cjs`.
 */

const GROUND_H = 150;
const GRASS_H = 72;

const CLOUDS = [
  { scale: 3, top: "7%", dur: 116, delay: 0 },
  { scale: 2, top: "21%", dur: 168, delay: -60 },
];

const SMALL_CLOUDS = [
  { top: "14%", scale: 2, dur: 142, delay: -30 },
  { top: "31%", scale: 2, dur: 190, delay: -105 },
];

const BIRDS = [
  { top: "20%", scale: 3, dur: 68, delay: -8, flap: 0.5 },
  { top: "25%", scale: 2, dur: 68, delay: -26, flap: 0.44 },
  { top: "17%", scale: 2, dur: 68, delay: -47, flap: 0.56 },
];

type Item =
  | { at: number; structure: keyof typeof G; sheet?: SheetName; scale: number }
  | { at: number; tile: number; sheet?: SheetName; scale: number };

/** Deterministic, so the garden doesn't reshuffle on every render. Positions
 *  keep the bigger structures clear of the wheel, which covers the middle. */
const SCENERY: Item[] = [
  { at: 1, structure: "bigTree", scale: 2 },
  { at: 6, tile: T.bush, scale: 2 },
  { at: 8, structure: "sunflower", sheet: "farm", scale: 2 },

  // the greenhouse, well clear of the wheel
  { at: 11, structure: "greenhouse", sheet: "farm", scale: 2 },

  { at: 20, structure: "autumnTree", sheet: "farm", scale: 2 },

  // fenced vegetable patch
  { at: 24, structure: "fence", sheet: "farm", scale: 2 },
  { at: 25, tile: T.carrot, sheet: "farm", scale: 2 },
  { at: 27, tile: T.tomatoes, sheet: "farm", scale: 2 },
  { at: 29, tile: T.wheat, sheet: "farm", scale: 2 },

  { at: 33, tile: T.hayBale, sheet: "farm", scale: 2 },
  { at: 36, tile: T.pumpkin, sheet: "farm", scale: 2 },

  // middle is mostly behind the wheel, so keep it low and sparse
  { at: 41, tile: T.shrub, scale: 2 },
  { at: 47, structure: "lowHedge", scale: 2 },
  { at: 54, tile: T.sprout, sheet: "farm", scale: 2 },
  { at: 58, tile: T.mushroom, scale: 2 },

  { at: 62, tile: T.pine, scale: 3 },
  { at: 66, structure: "autumnTree", sheet: "farm", scale: 2 },
  { at: 70, tile: T.corn, sheet: "farm", scale: 2 },

  { at: 74, structure: "fence", sheet: "farm", scale: 2 },
  { at: 75, tile: T.leafyPlant, sheet: "farm", scale: 2 },
  { at: 77, tile: T.carrot, sheet: "farm", scale: 2 },

  { at: 82, structure: "tree", scale: 2 },
  { at: 88, tile: T.hayRoll, sheet: "farm", scale: 2 },
  { at: 91, tile: T.jackOLantern, sheet: "farm", scale: 2 },
  { at: 94, structure: "lowHedge", scale: 2 },
  { at: 98, structure: "bigTree", scale: 2 },
];

function Piece({ item }: { item: Item }) {
  if ("structure" in item) {
    return <Composite grid={G[item.structure]} sheet={item.sheet} scale={item.scale} />;
  }
  return <Sprite tile={item.tile} sheet={item.sheet} scale={item.scale} />;
}

export function Garden() {
  return (
    <div className="garden" aria-hidden="true">
      <img className="sun-sprite" src={sun} alt="" width={24 * 4} height={24 * 4} />

      {CLOUDS.map((c, i) => (
        <Composite
          key={`c${i}`}
          grid={G.cloud}
          scale={c.scale}
          className="cloud-sprite"
          style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        />
      ))}

      {SMALL_CLOUDS.map((c, i) => (
        <Sprite
          key={`s${i}`}
          tile={T.smallCloud}
          scale={c.scale}
          className="cloud-sprite"
          style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        />
      ))}

      {BIRDS.map((b, i) => (
        <span
          key={`b${i}`}
          className="bird-flight"
          style={{ top: b.top, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
        >
          <AnimatedSprite
            src={bird}
            frames={2}
            frameWidth={9}
            frameHeight={7}
            scale={b.scale}
            duration={b.flap}
          />
        </span>
      ))}

      <div className="ground" style={{ height: GROUND_H }}>
        {SCENERY.map((item, i) => (
          <span key={i} className="scenery" style={{ left: `${item.at}%`, bottom: GROUND_H - 12 }}>
            <Piece item={item} />
          </span>
        ))}

        {/* Loki doing laps of the garden. */}
        <div className="dog-walk" style={{ bottom: GROUND_H - 30 }}>
          <AnimatedSprite
            src={dog}
            frames={4}
            frameWidth={22}
            frameHeight={16}
            scale={4}
            duration={0.62}
          />
        </div>

        <div className="ground__grass" style={{ backgroundImage: `url(${grass})`, height: GRASS_H }} />
        <div className="ground__dirt" style={{ backgroundImage: `url(${dirt})`, top: GRASS_H }} />
      </div>
    </div>
  );
}
