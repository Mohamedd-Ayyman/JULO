import React, { useEffect, useState } from "react";
import { X, Eye, Loader2 } from "lucide-react";
import Avatar from "../Avatar.jsx";
import { getStoryViewers } from "../../apiCalls/users.js";

export default function StoryViewersSheet({ storyId, onClose }) {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getStoryViewers(storyId);
      if (cancelled) return;
      if (res.success) setViewers(res.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storyId]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center animate-fade-in"
      style={{ background: "rgba(20,17,15,0.6)" }}
      onClick={onClose}
    >
      <div className="brutal-card w-full sm:max-w-md max-h-[70vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: "var(--r-lg) var(--r-lg) 0 0", borderTop: "none" }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "2px solid var(--line-soft)" }}>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" style={{ color: "var(--ink)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
              Viewers {viewers.length > 0 && `(${viewers.length})`}
            </h3>
          </div>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="grid place-items-center py-10">
              <div className="spinner" />
            </div>
          ) : viewers.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--muted-2)" }}>No views yet</p>
          ) : (
            viewers.map((v) => {
              const u = v.user || v;
              const name = `${u.firstname || ""} ${u.lastname || ""}`.trim() || "User";
              return (
                <div key={u._id || v._id} className="flex items-center gap-3 p-2.5">
                  <Avatar src={u.profilepic} name={name} size={40} />
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{name}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}