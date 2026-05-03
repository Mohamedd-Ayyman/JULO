import React from "react";

/**
 * Avatar — gradient avatar with initial fallback, optional online dot, optional ring.
 */
export default function Avatar({
  src,
  name = "",
  size = 36,
  ring = false,
  online = false,
  className = "",
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const dim = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };

  const inner = (
    <span className="avatar" style={dim}>
      {src ? <img src={src} alt={name || "avatar"} /> : <span>{initials || "·"}</span>}
      {online && <span className="online-dot" />}
    </span>
  );

  if (ring) {
    return <span className={`avatar-ring ${className}`}>{inner}</span>;
  }
  return <span className={`relative inline-block ${className}`}>{inner}</span>;
}
