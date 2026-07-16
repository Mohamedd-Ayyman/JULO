import React from "react";
import { MOODS } from "../../lib/moods.js";

export default function MoodPicker({ value, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {MOODS.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(active ? null : m.id)}
            className="font-mono text-[11px] font-medium uppercase tracking-wider px-2.5 py-1.5 transition-all"
            style={{
              background: active ? m.color : "var(--paper)",
              color: active ? "var(--ink)" : "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-pill)",
              boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
              transform: active ? "scale(1.05)" : "scale(1)",
              transition: "all 200ms cubic-bezier(0.22,1,0.36,1)",
            }}
            aria-pressed={active}
          >
            <span aria-hidden>{m.emoji}</span> {m.label}
          </button>
        );
      })}
    </div>
  );
}
