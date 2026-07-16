import React, { forwardRef } from "react";

const InkInput = forwardRef(function InkInput(
  { icon: Icon, rightSlot, className = "", wrapperClassName = "", ...rest },
  ref,
) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--ink)" }} />
      )}
      <input
        ref={ref}
        className={`brutal-input ${Icon ? "pl-11" : ""} ${rightSlot ? "pr-11" : ""} ${className}`}
        {...rest}
      />
      {rightSlot && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          {rightSlot}
        </div>
      )}
    </div>
  );
});

export default InkInput;
