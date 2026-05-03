import React from "react";
import logoSrc from "../assets/julo-logo.png";

export default function Logo({ size = 28, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoSrc}
        alt="JULO"
        width={size}
        height={size}
        className="rounded-xl object-contain glow-primary-soft"
        style={{ width: size, height: size }}
      />
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
