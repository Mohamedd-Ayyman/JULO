import React from "react";

/**
 * Avatar — brutal ink-bordered avatar with initial fallback.
 */
export default function Avatar({
  src,
  name = "",
  size = 40,
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

  return (
    <div
      className={`brutal-avatar flex-shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size, fontSize: Math.max(11, size * 0.3) }}
    >
      {src ? (
        <img src={src} alt={name || "avatar"} />
      ) : (
        <span>{initials || "·"}</span>
      )}
      {online && <span className="brutal-avatar-online" />}
    </div>
  );
}
