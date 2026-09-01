import type { CSSProperties } from "react";
import birchTree from "../sprites/birch-tree.png";
import oakTree from "../sprites/oak-tree.png";
import mapleTree from "../sprites/maple-tree.png";
import appleTree from "../sprites/apple-tree.png";

/**
 * Simple sprite sheet trees with growth stages.
 * Each tree sprite is a horizontal strip showing growth from sapling to full size.
 */

const TREES = {
  birch: { src: birchTree, frames: 6, width: 64, height: 96 },
  oak: { src: oakTree, frames: 7, width: 64, height: 96 },
  maple: { src: mapleTree, frames: 5, width: 64, height: 96 },
  apple: { src: appleTree, frames: 6, width: 64, height: 96 },
} as const;

export type TreeType = keyof typeof TREES;

interface SimpleTreeProps {
  type: TreeType;
  stage: number; // 0 = sapling, max = full grown
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function SimpleTree({ type, stage, scale = 3, className, style }: SimpleTreeProps) {
  const tree = TREES[type];
  const frameIndex = Math.min(stage, tree.frames - 1);
  
  return (
    <span
      className={className}
      style={{
        display: "block",
        width: tree.width * scale,
        height: tree.height * scale,
        backgroundImage: `url(${tree.src})`,
        backgroundSize: `${tree.width * tree.frames * scale}px ${tree.height * scale}px`,
        backgroundPosition: `${-frameIndex * tree.width * scale}px 0`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
