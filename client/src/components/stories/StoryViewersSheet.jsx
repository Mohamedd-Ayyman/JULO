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
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-md max-h-[70vh] flex flex-col rounded-b-none sm:rounded-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-foreground-soft" />
            <h3 className="text-sm font-bold text-foreground">
              Viewers {viewers.length > 0 && `(${viewers.length})`}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : viewers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No views yet
            </p>
          ) : (
            viewers.map((v) => {
              const u = v.user || v;
              const name = `${u.firstname || ""} ${u.lastname || ""}`.trim() || "User";
              return (
                <div
                  key={u._id || v._id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-glass-hover transition-colors"
                >
                  <Avatar src={u.profilepic} name={name} size={40} />
                  <span className="text-sm font-medium text-foreground">{name}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
