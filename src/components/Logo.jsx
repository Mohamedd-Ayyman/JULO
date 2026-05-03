import React from "react";

export default function Logo({ size = 28, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative grid place-items-center rounded-xl bg-gradient-primary glow-primary-soft animate-gradient"
        style={{ width: size, height: size }}
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
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {withText && (
        <span
          className="font-extrabold tracking-tight text-gradient-primary"
          style={{ fontSize: size * 0.7 }}
        >
          JULO
        </span>
      )}
    </div>
  );
}
