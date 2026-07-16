import React from "react";

export default function SectionHeader({ eyebrow, title, action, className = "" }) {
  return (
    <header className={`mb-4 ${className}`}>
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <div className="flex items-end justify-between gap-3 pb-2 border-b border-[var(--line-soft)]">
        <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight leading-none text-ink">
          {title}
        </h2>
        {action}
      </div>
    </header>
  );
}
