import grass from "../sprites/grass.png";
import dirt from "../sprites/dirt.png";
import { Sprite, T } from "./Sprite";

/**
 * Fixed scenery behind the app, built from the Kenney "Pixel Platformer" set
 * (CC0). The ground tiles repeat via CSS -- their block outlines were stripped
 * so they meet seamlessly instead of reading as a brick grid.
 */

const GROUND_H = 196;
const GRASS_H = 72;

const CLOUDS = [
  { tile: T.cloudWide, top: "8%", scale: 5, dur: 104, delay: 0 },
  { tile: T.cloudPuff, top: "19%", scale: 4, dur: 141, delay: -45 },
  { tile: T.cloudSmall, top: "30%", scale: 3, dur: 118, delay: -82 },
];

/** Deterministic so the garden doesn't reshuffle on every render. */
const PLANTS: { at: number; tile: number; scale: number }[] = [
  { at: 2, tile: T.pine, scale: 4 },
  { at: 9, tile: T.shrub, scale: 3 },
  { at: 15, tile: T.tree, scale: 4 },
  { at: 22, tile: T.plant, scale: 3 },
  { at: 28, tile: T.mushroom, scale: 2 },
  { at: 34, tile: T.foliage, scale: 3 },
  { at: 42, tile: T.pine, scale: 3 },
  { at: 50, tile: T.shrub, scale: 4 },
  { at: 57, tile: T.plant, scale: 3 },
  { at: 63, tile: T.foliageTall, scale: 3 },
  { at: 70, tile: T.tree, scale: 4 },
  { at: 77, tile: T.mushroom, scale: 2 },
  { at: 84, tile: T.shrub, scale: 3 },
  { at: 91, tile: T.pine, scale: 4 },
  { at: 97, tile: T.plant, scale: 3 },
];

export function Garden() {
  return (
    <div className="garden" aria-hidden="true">
      <div className="sun" />

      {CLOUDS.map((c, i) => (
        <Sprite
          key={i}
          tile={c.tile}
          scale={c.scale}
          className="cloud-sprite"
          style={{
            top: c.top,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      <div className="ground" style={{ height: GROUND_H }}>
        {PLANTS.map((p, i) => (
          <Sprite
            key={i}
            tile={p.tile}
            scale={p.scale}
            style={{ position: "absolute", left: `${p.at}%`, bottom: GROUND_H - 10 }}
          />
        ))}

        <div
          className="ground__grass"
          style={{ backgroundImage: `url(${grass})`, height: GRASS_H }}
        />
        <div
          className="ground__dirt"
          style={{ backgroundImage: `url(${dirt})`, top: GRASS_H }}
        />
      </div>
    </div>
  );
}
