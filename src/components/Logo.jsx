import React from "react";

export default function Logo({ size = 28, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative grid place-items-center"
        style={{
          width: size,
          height: size,
          background: "var(--acid)",
          border: "2px solid var(--ink)",
          borderRadius: "4px",
          boxShadow: "3px 3px 0 0 var(--ink)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width={size * 0.6}
          height={size * 0.6}
        >
          <path
            d="M4 18V6L20 18V6"
            stroke="var(--ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {withText && (
        <span
          className="font-display font-black tracking-tight"
          style={{ fontSize: size * 0.7 }}
        >
          ju<span style={{ color: "var(--acid)" }}>l</span>o
        </span>
      )}
    </div>
  );
}
