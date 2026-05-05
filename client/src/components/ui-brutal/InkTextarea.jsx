import React, { forwardRef } from "react";

const InkTextarea = forwardRef(function InkTextarea({ className = "", rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`brutal-input resize-none leading-relaxed ${className}`}
      {...rest}
    />
  );
});

export default InkTextarea;
