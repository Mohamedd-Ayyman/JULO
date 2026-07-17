import React from "react";
import { X } from "lucide-react";

export default function GroupDetailsPanel({ chat, onClose }) {
  if (!chat) return null;

  return (
    <div
      className="w-72 flex-shrink-0 border-l flex flex-col anim-fade-in"
      style={{ borderColor: "var(--line-soft)", background: "var(--paper-2)" }}
    >
      <div className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid var(--line-soft)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>Group Details</p>
        <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chat.members?.map((m) => (
          <div key={m._id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--paper)" }}>
            <div className="w-8 h-8 rounded-full" style={{ background: "var(--paper-3)" }} />
            <p className="text-sm truncate" style={{ color: "var(--ink)" }}>{m.firstname} {m.lastname}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
