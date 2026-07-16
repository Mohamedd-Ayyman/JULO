import React from "react";

const VARIANTS = {
  default: "",
  primary: "brutal-btn-primary",
  ink: "brutal-btn-ink",
  danger: "brutal-btn-danger",
  ghost: "brutal-btn-ghost",
  outline: "brutal-btn-outline",
};

const SIZES = {
  default: "",
  sm: "brutal-btn-sm",
  icon: "brutal-btn-icon",
};

export default function BrutalButton({
  variant = "default",
  size = "default",
  className = "",
  as,
  children,
  ...rest
}) {
  const Comp = as || "button";
  return (
    <Comp
      className={`brutal-btn ${VARIANTS[variant] || ""} ${SIZES[size] || ""} ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}
