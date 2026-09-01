import { useEffect, useRef, useState } from "react";
import type { SpinCandidate } from "../../shared/types";

const SLICE_COLORS = [
  "#c4614f",
  "#e8b04b",
  "#7a9a4e",
  "#9a6b8f",
  "#d98d43",
  "#5f9e7d",
  "#b5527a",
  "#8b5e3c",
];

const CX = 200;
const CY = 200;
const R = 185;
const SPIN_MS = 5200;

interface Props {
  candidates: SpinCandidate[];
  hubImage: string | null;
  onLanded: (candidate: SpinCandidate) => void;
  /** Bumped by the parent to trigger a spin. */
  spinToken: number;
}

/** Polar -> cartesian, with 0deg at 12 o'clock and angles running clockwise. */
function point(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function slicePath(start: number, end: number): string {
  const [x1, y1] = point(start, R);
  const [x2, y2] = point(end, R);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * Press Start 2P is monospaced at 1em per glyph, so "how many characters fit"
 * is just arithmetic. Titles get wrapped onto at most two radial lines and
 * truncated after that -- the full name is on the result card anyway.
 */
function wrapLabel(text: string, maxChars: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (lines.length === maxLines) break;
    // A single word longer than a line gets chopped rather than overflowing.
    current = word.length > maxChars ? word.slice(0, maxChars) : word;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const overflowed = lines.join(" ").length < text.replace(/\s+/g, " ").length;
  if (overflowed && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }
  return lines;
}

export function Wheel({ candidates, hubImage, onLanded, spinToken }: Props) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);
  const firstRender = useRef(true);

  const n = candidates.length;
  const step = n > 0 ? 360 / n : 360;

  useEffect(() => {
    // Don't spin on mount, only when the parent bumps the token.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!n || spinning) return;

    const winner = Math.floor(Math.random() * n);
    const sliceCentre = winner * step + step / 2;
    // Land anywhere in the middle 70% of the slice so it doesn't look rigged.
    const jitter = (Math.random() - 0.5) * step * 0.7;
    const turns = 5 + Math.floor(Math.random() * 3);

    // Normalise so every spin travels forward by at least `turns` rotations.
    const target = rotation + turns * 360 + ((-(sliceCentre + jitter) - rotation) % 360 + 360) % 360;

    setSpinning(true);
    setRotation(target);

    timer.current = window.setTimeout(() => {
      setSpinning(false);
      onLanded(candidates[winner]);
    }, SPIN_MS);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  const labelSize = n <= 6 ? 13 : n <= 9 ? 11 : 9;
  const anchorR = R * 0.58;
  // Budget a line's width so it clears the rim with a real margin, not just
  // scrapes it: half the line extends outward from the anchor (textAnchor is
  // "middle"), so outward reach = anchorR + width/2, capped at R - RIM_MARGIN.
  // A safety clip guards the rest (see wheel-disc below), but this is what
  // keeps it from actually being needed on ordinary titles.
  const RIM_MARGIN = 12;
  const widthBudget = (R - RIM_MARGIN - anchorR) * 2;
  const labelChars = Math.max(6, Math.floor(widthBudget / labelSize));

  return (
    <div className="wheel-wrap">
      <Pointer />

      <svg className="wheel-svg" viewBox="-10 -10 420 420" role="img"
           aria-label={`Wheel of ${n} dinner options`}>
        {/* Hard clip on the disc. Long two-line labels can otherwise push a
            glyph or two past the rim into open canvas -- since the SVG is
            overflow:visible, that text would render over the garden behind
            it, and because it's inside the rotating group it reads as the
            wheel itself swinging off-centre. This makes that structurally
            impossible rather than just numerically unlikely. */}
        <defs>
          <clipPath id="wheel-disc">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
        </defs>

        {/* Slices first. The wooden rim used to be filled circles drawn before
            the rotor; with the rotor on its own compositor layer (will-change)
            those discs painted back over the coloured wedges in some browsers. */}
        <g transform={`translate(${CX} ${CY})`}>
          <g
            className="wheel-rotor"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_MS}ms cubic-bezier(0.16, 0.84, 0.14, 1)`
                : "none",
            }}
          >
            <g
              className="wheel-slices"
              clipPath="url(#wheel-disc)"
              transform={`translate(${-CX} ${-CY})`}
            >
              {candidates.map((c, i) => {
                const start = i * step;
                const end = start + step;
                const mid = start + step / 2;
                const [tx, ty] = point(mid, anchorR);
                const flip = mid > 180;

                return (
                  <g key={c.id}>
                    <path
                      d={slicePath(start, end)}
                      fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                      stroke="#3b2416"
                      strokeWidth={3}
                    />
                    <text
                      x={tx}
                      y={ty}
                      fill="#f7e7c6"
                      fontFamily="'Press Start 2P', monospace"
                      fontSize={labelSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${flip ? mid + 90 : mid - 90} ${tx} ${ty})`}
                      style={{ paintOrder: "stroke", stroke: "#3b2416", strokeWidth: 5 }}
                    >
                      {wrapLabel(c.title, labelChars).map((line, li, arr) => (
                        <tspan
                          key={li}
                          x={tx}
                          dy={li === 0 ? -((arr.length - 1) * labelSize * 0.6) : labelSize * 1.2}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {n === 0 && (
                <circle cx={CX} cy={CY} r={R} fill="#ddc294" stroke="#3b2416" strokeWidth={3} />
              )}
            </g>
          </g>
        </g>

        {/* Rim as strokes so it can sit above the slices without covering them. */}
        <circle cx={CX} cy={CY} r={R + 4.5} fill="none" stroke="#5c3a21" strokeWidth={9} />
        <circle cx={CX} cy={CY} r={R + 4.5} fill="none" stroke="#8b5e3c" strokeWidth={5} />
      </svg>

      <div className="hub">
        {hubImage ? (
          <img src={hubImage} alt="Loki, head chef" />
        ) : (
          <div className="hub__placeholder">LOKI<br />GOES<br />HERE</div>
        )}
      </div>
    </div>
  );
}

function Pointer() {
  return (
    <svg className="pointer" width="46" height="52" viewBox="0 0 23 26" aria-hidden="true">
      {/* chunky wooden arrow, drawn on a 1px pixel grid */}
      <path d="M3 0h17v3H3z" fill="#3b2416" />
      <path d="M4 3h15v10H4z" fill="#8b5e3c" />
      <path d="M4 3h15v3H4z" fill="#b3835a" />
      <path d="M3 13h17v3H3z" fill="#3b2416" />
      <path d="M6 16h11v3H6z" fill="#c4614f" />
      <path d="M8 19h7v3H8z" fill="#c4614f" />
      <path d="M10 22h3v3h-3z" fill="#96422f" />
      <path d="M5 16h1v3H5zm12 0h1v3h-1zM7 19h1v3H7zm8 0h1v3h-1zM9 22h1v3H9zm4 0h1v3h-1z" fill="#3b2416" />
      <path d="M0 0h3v16H0zm20 0h3v16h-3z" fill="#3b2416" />
    </svg>
  );
}
