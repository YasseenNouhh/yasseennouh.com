import grass from "../sprites/grass.png";
import dirt from "../sprites/dirt.png";
import sun from "../sprites/sun.png";
import bird from "../sprites/bird.png";
import dog from "../sprites/dog.png";
import { AnimatedSprite, Composite, Sprite, G, T } from "./Sprite";

/**
 * Fixed scenery behind the app.
 *
 * Plants, hedges, clouds and trees come from Kenney's Pixel Platformer set
 * (CC0), assembled as whole objects rather than single tiles. The sun, birds
 * and the dog aren't in that pack -- they're drawn in
 * `scripts/make-sprites.cjs` using the same palette.
 */

const GROUND_H = 150;
const GRASS_H = 72;

const CLOUDS = [
  { grid: G.cloud, scale: 3, top: "7%", dur: 116, delay: 0 },
  { grid: G.cloud, scale: 2, top: "21%", dur: 168, delay: -60 },
];

const SMALL_CLOUDS = [
  { top: "14%", scale: 2, dur: 142, delay: -30 },
  { top: "31%", scale: 2, dur: 190, delay: -105 },
];

const BIRDS = [
  { top: "20%", scale: 3, dur: 68, delay: 0, flap: 0.5 },
  { top: "25%", scale: 2, dur: 68, delay: -3.2, flap: 0.44 },
  { top: "17%", scale: 2, dur: 68, delay: -6.0, flap: 0.56 },
];

/** Deterministic, so the garden doesn't reshuffle on every render. */
const SCENERY: { at: number; kind: "tree" | "bareTree" | "hedge" | "hedgeBlock" | number; scale: number }[] = [
  { at: 1, kind: "tree", scale: 3 },
  { at: 8, kind: T.shrub, scale: 3 },
  { at: 12, kind: "hedge", scale: 2 },
  { at: 17, kind: T.plant, scale: 3 },
  { at: 21, kind: "bareTree", scale: 2 },
  { at: 27, kind: T.mushroom, scale: 2 },
  { at: 31, kind: T.pine, scale: 3 },
  { at: 37, kind: "hedgeBlock", scale: 2 },
  { at: 46, kind: T.shrub, scale: 3 },
  { at: 51, kind: "tree", scale: 3 },
  { at: 58, kind: T.plant, scale: 2 },
  { at: 62, kind: "hedge", scale: 2 },
  { at: 67, kind: T.mushroom, scale: 2 },
  { at: 71, kind: T.pine, scale: 3 },
  { at: 78, kind: "bareTree", scale: 2 },
  { at: 84, kind: "hedgeBlock", scale: 2 },
  { at: 92, kind: T.shrub, scale: 3 },
  { at: 96, kind: "tree", scale: 3 },
];

function Scenery({ kind, scale }: { kind: (typeof SCENERY)[number]["kind"]; scale: number }) {
  if (typeof kind === "number") return <Sprite tile={kind} scale={scale} />;
  const grid =
    kind === "tree" ? G.tree : kind === "bareTree" ? G.bareTree : kind === "hedge" ? G.hedge : G.hedgeBlock;
  return <Composite grid={grid} scale={scale} />;
}

export function Garden() {
  return (
    <div className="garden" aria-hidden="true">
      <img className="sun-sprite" src={sun} alt="" width={24 * 4} height={24 * 4} />

      {CLOUDS.map((c, i) => (
        <Composite
          key={`c${i}`}
          grid={c.grid}
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
        {SCENERY.map((s, i) => (
          <span key={i} className="scenery" style={{ left: `${s.at}%`, bottom: GROUND_H - 12 }}>
            <Scenery kind={s.kind} scale={s.scale} />
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
