import { useEffect, useState } from "react";

const DEFAULT_TIPS = [
  "Warming up the stove…",
  "Tip: tag a recipe 'quick' and spin only those on a Tuesday.",
  "Recently eaten dishes rest for two weeks before returning.",
  "Loki has never once suggested a salad.",
  "Tip: tick ingredients in a recipe to build a shopping list.",
  "Consulting the good boy…",
];

export interface LoadingScreenProps {
  title?: string;
  tips?: string[];
  /** 0-100. Ignored when autoProgress is on. */
  progress?: number;
  showPercentage?: boolean;
  tipInterval?: number;
  variant?: "default" | "fullscreen";
  autoProgress?: boolean;
  autoProgressDuration?: number;
  className?: string;
}

const SEGMENTS = 20;

export function LoadingScreen({
  title = "LOADING",
  tips = DEFAULT_TIPS,
  progress = 0,
  showPercentage = true,
  tipInterval = 3000,
  variant = "default",
  autoProgress = false,
  autoProgressDuration = 5000,
  className,
}: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [cursor, setCursor] = useState(true);
  const [internal, setInternal] = useState(autoProgress ? 0 : progress);

  useEffect(() => {
    if (!autoProgress) {
      setInternal(progress);
      return;
    }

    setInternal(0);
    const step = 100 / SEGMENTS;
    const tick = autoProgressDuration / SEGMENTS;

    // Ease off near the end so a slow request doesn't sit at a full bar.
    const timer = window.setInterval(() => {
      setInternal((prev) => (prev >= 92 ? prev + (100 - prev) * 0.15 : prev + step));
    }, tick);

    return () => window.clearInterval(timer);
  }, [autoProgress, autoProgressDuration, progress]);

  useEffect(() => {
    if (tips.length <= 1) return;
    const timer = window.setInterval(
      () => setTipIndex((i) => (i + 1) % tips.length),
      tipInterval,
    );
    return () => window.clearInterval(timer);
  }, [tips, tipInterval]);

  useEffect(() => {
    const timer = window.setInterval(() => setCursor((c) => !c), 530);
    return () => window.clearInterval(timer);
  }, []);

  const value = Math.min(100, Math.max(0, autoProgress ? internal : progress));
  const filled = Math.round((value / 100) * SEGMENTS);

  const body = (
    <div className={`loader ${className ?? ""}`.trim()}>
      <h2 className="loader__title">
        {title}
        <span style={{ opacity: cursor ? 1 : 0 }}>_</span>
      </h2>

      <div className="loader__bar-wrap">
        {showPercentage && <div className="loader__pct">{Math.round(value)}%</div>}
        <div
          className="loader__bar"
          role="progressbar"
          aria-valuenow={Math.round(value)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} data-on={i < filled} />
          ))}
        </div>
      </div>

      {tips.length > 0 && <p className="loader__tip">{tips[tipIndex]}</p>}
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div className="loader-fullscreen" role="status" aria-live="polite">
        <div className="loader-fullscreen__inner frame">{body}</div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite">
      {body}
    </div>
  );
}
