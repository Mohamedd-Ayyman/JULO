import React from "react";

export default function SectionHeader({ eyebrow, title, action, className = "" }) {
  return (
    <header className={`mb-4 ${className}`}>
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <div className="flex items-end justify-between gap-3 pb-2 ink-rule-thin">
        <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight leading-none">
          {title}
        </h2>
        {action}
      </div>
    </header>
  );
}
