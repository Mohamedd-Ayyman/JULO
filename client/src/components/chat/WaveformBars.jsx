import { useMemo } from "react";

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function WaveformBars({ barCount = 28, progress = 0, playedColor, unplayedColor, onClick }) {
  const heights = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: barCount }, () => 8 + Math.floor(rng() * 18));
  }, [barCount]);

  const played = playedColor || "var(--acid)";
  const unplayed = unplayedColor || "var(--ink-soft)";

  const handleClick = (e) => {
    if (!onClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onClick(ratio);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-[1.5px] h-6 ${onClick ? "cursor-pointer" : ""}`}
      role="slider"
      aria-label="Audio progress"
    >
      {heights.map((h, i) => {
        const filled = i / barCount <= progress;
        return (
          <div
            key={i}
            className="w-[2px] rounded-full transition-colors duration-150"
            style={{
              height: `${h}px`,
              background: filled ? played : unplayed,
              opacity: filled ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
