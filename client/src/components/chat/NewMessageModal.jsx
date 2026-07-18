import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Search, Loader2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../Avatar.jsx";
import { searchUsers } from "../../apiCalls/users.js";
import { createOrFindChat } from "../../apiCalls/message.js";

export default function NewMessageModal({ onClose, onChatCreated }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(null);
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUsers(q);
      if (res.success && res.data) {
        const users = Array.isArray(res.data) ? res.data : res.data.users || [];
        setSearchResults(users);
      }
    } catch {
      // silent
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, doSearch]);

  const handleStartChat = async (user) => {
    setStarting(user._id);
    try {
      const res = await createOrFindChat(user._id);
      if (res.success && res.data) {
        onChatCreated(res.data);
      } else {
        toast.error(res.message || "Couldn't open chat");
      }
    } catch {
      toast.error("Couldn't open chat");
    }
    setStarting(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center anim-fade-in" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-md mx-4 max-h-[80vh] flex flex-col anim-scale-in"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh-4)",
        }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="font-display text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>New Message</h2>
              <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>Search for someone to start chatting</p>
            </div>
          </div>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-2)" }} />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="brutal-input pl-10 text-sm"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {searching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 stagger">
              {searchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleStartChat(u)}
                  disabled={starting === u._id}
                  className="w-full flex items-center gap-3 p-2.5 text-left transition-all"
                  style={{ borderRadius: "var(--r-sm)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                      {u.firstname} {u.lastname}
                    </p>
                    {u.bio && (
                      <p className="text-[11px] truncate" style={{ color: "var(--muted-2)" }}>{u.bio}</p>
                    )}
                  </div>
                  {starting === u._id ? (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "var(--muted)" }} />
                  ) : (
                    <MessageCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-2)" }} />
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-8 h-8 mb-2" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>No users found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="w-8 h-8 mb-2" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>Type a name to find someone</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
