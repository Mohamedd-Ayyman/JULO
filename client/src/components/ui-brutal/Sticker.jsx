import React from "react";

const TONES = {
  acid: "",
  red: "sticker-red",
  blue: "sticker-blue",
  yellow: "sticker-yellow",
  pink: "sticker-pink",
  paper: "sticker-paper",
};

export default function Sticker({
  tone = "acid",
  rotate = -2,
  className = "",
  style = {},
  children,
  ...rest
}) {
  return (
    <span
      className={`sticker ${TONES[tone] || ""} ${className}`}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
