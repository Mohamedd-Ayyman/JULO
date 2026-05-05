import React from "react";

export default function BrutalCard({ as: As = "div", className = "", hover = false, children, ...rest }) {
  return (
    <As
      className={`brutal-card ${hover ? "brutal-card-hover" : ""} ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}
