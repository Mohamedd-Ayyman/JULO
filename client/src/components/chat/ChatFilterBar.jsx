import React from "react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "direct", label: "Direct" },
  { id: "groups", label: "Groups" },
  { id: "archived", label: "Archived" },
];

export default function ChatFilterBar({ activeFilter, onFilterChange, unreadCount }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className="flex-shrink-0 font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 transition-all flex items-center gap-1.5"
            style={{
              background: isActive ? "var(--ink)" : "transparent",
              color: isActive ? "var(--paper)" : "var(--muted)",
              border: "1px solid " + (isActive ? "var(--ink)" : "var(--line)"),
              borderRadius: "var(--r-pill)",
            }}
          >
            {f.label}
            {f.id === "unread" && unreadCount > 0 && (
              <span
                className="font-mono text-[9px] font-bold px-1 min-w-[16px] text-center"
                style={{
                  background: isActive ? "var(--paper)" : "var(--riso-red)",
                  color: isActive ? "var(--ink)" : "var(--paper)",
                  borderRadius: "var(--r-pill)",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
