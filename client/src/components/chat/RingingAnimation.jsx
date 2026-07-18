import React from "react";

export default function RingingAnimation({ color = "var(--acid)", size = 120 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full ring-pulse"
        style={{ border: `2px solid ${color}` }}
      />
      <div
        className="absolute inset-0 rounded-full ring-pulse-delay"
        style={{ border: `2px solid ${color}` }}
      />
      <div
        className="absolute inset-0 rounded-full ring-pulse-delay-2"
        style={{ border: `2px solid ${color}` }}
      />
    </div>
  );
}
