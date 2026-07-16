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
            className="font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 border-2 transition-all"
            style={{
              background: active ? m.color : "var(--paper)",
              color: active ? "var(--ink)" : "var(--ink)",
              borderColor: "var(--ink)",
              borderRadius: "var(--r-pill)",
              boxShadow: active ? "3px 3px 0 0 var(--ink)" : "none",
              transform: active ? "translate(-1px,-1px) rotate(-1deg)" : "none",
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
