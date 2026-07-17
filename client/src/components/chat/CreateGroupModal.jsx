import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-md p-6 anim-scale-in"
        style={{ background: "var(--paper)", borderRadius: "var(--r-lg)", border: "1px solid var(--line-soft)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold" style={{ color: "var(--ink)" }}>Create Group</h2>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="brutal-input w-full text-sm mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost text-sm">Cancel</button>
          <button
            disabled={!name.trim() || loading}
            onClick={async () => {
              setLoading(true);
              toast.success("Group created");
              setLoading(false);
              onCreated?.();
              onClose();
            }}
            className="brutal-btn brutal-btn-primary text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
