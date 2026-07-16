import React from "react";

/**
 * Avatar — square, ink-bordered. Used everywhere in JULO.
 * `shape="square"` (default) | `"circle"` | `"squircle"` (slight radius).
 */
export default function Avatar({
  src,
  name = "",
  size = 40,
  shape = "squircle",
  online = false,
  className = "",
  style = {},
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const radius =
    shape === "circle" ? "50%" : shape === "square" ? "0" : "6px";

  return (
    <span
      className={`brutal-avatar ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.36),
        borderRadius: radius,
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name || "avatar"} loading="lazy" />
      ) : (
        <span>{initials || "·"}</span>
      )}
      {online && <span className="brutal-avatar-online" />}
    </span>
  );
}
