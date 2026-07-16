import React from "react";

/**
 * JULO Logo — ink "J" stamp + Fraunces wordmark with an acid square dot.
 * Pure SVG, no external image dependency.
 */
export default function Logo({ size = 32, withText = true, className = "" }) {
  const h = size;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={h}
        height={h}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="JULO"
        style={{ display: "block" }}
      >
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="8"
          fill="var(--ink)"
          stroke="var(--ink)"
          strokeWidth="2"
        />
        {/* J */}
        <path
          d="M24 14 H50 V20 H42 V42 C42 50 36 56 28 56 C20 56 14 50 14 42 H22 C22 46 24 48 28 48 C32 48 34 46 34 42 V20 H24 Z"
          fill="var(--acid)"
        />
        {/* acid square dot */}
        <rect x="44" y="44" width="10" height="10" fill="var(--acid)" />
      </svg>
      {withText && (
        <span
          className="font-display font-black tracking-tight"
          style={{
            fontSize: size * 0.85,
            color: "var(--ink)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          JULO
          <span style={{ color: "var(--acid-deep)" }}>.</span>
        </span>
      )}
    </div>
  );
}
