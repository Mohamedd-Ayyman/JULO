import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Search, ArrowRight, ArrowLeft, Loader2, Check, Users } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../Avatar.jsx";
import { searchUsers } from "../../apiCalls/users.js";
import { createGroupChat } from "../../apiCalls/message.js";

export default function CreateGroupModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [step]);

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
        setSearchResults(users.filter((u) => !selectedUsers.some((s) => s._id === u._id)));
      }
    } catch {
      // silent
    }
    setSearching(false);
  }, [selectedUsers]);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, doSearch]);

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u._id === user._id);
      if (exists) return prev.filter((u) => u._id !== user._id);
      return [...prev, user];
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("Add at least one member");
      return;
    }
    setCreating(true);
    try {
      const res = await createGroupChat({
        members: selectedUsers.map((u) => u._id),
        name: groupName.trim(),
        description: groupDescription.trim() || null,
      });
      if (res.success && res.data) {
        toast.success("Group created!");
        onCreated(res.data._id);
      } else {
        toast.error(res.message || "Failed to create group");
      }
    } catch {
      toast.error("Failed to create group");
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center anim-fade-in" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-lg mx-4 max-h-[85vh] flex flex-col anim-scale-in"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh-4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="brutal-btn brutal-btn-ghost brutal-btn-icon" style={{ width: 32, height: 32 }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-display text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>
                {step === 1 ? "New Group" : "Group Info"}
              </h2>
              <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                {step === 1 ? `${selectedUsers.length} member${selectedUsers.length !== 1 ? "s" : ""} selected` : "Set the group name and details"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-2)" }} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people to add..."
                  className="brutal-input pl-10 text-sm"
                  style={{ paddingTop: 10, paddingBottom: 10 }}
                />
              </div>

              {/* Selected chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => toggleUser(u)}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-1 text-xs font-medium transition-all hover:scale-105"
                      style={{
                        background: "var(--acid)",
                        color: "var(--ink)",
                        borderRadius: "var(--r-pill)",
                      }}
                    >
                      <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={20} />
                      <span>{u.firstname} {u.lastname}</span>
                      <X className="w-3 h-3 ml-0.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* Search results */}
              {searching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 stagger">
                  {searchResults.map((u) => {
                    const isSelected = selectedUsers.some((s) => s._id === u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => toggleUser(u)}
                        className="w-full flex items-center gap-3 p-2.5 text-left transition-all"
                        style={{
                          borderRadius: "var(--r-sm)",
                          background: isSelected ? "rgba(243,195,66,0.1)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--paper-3)"; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                      >
                        <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                            {u.firstname} {u.lastname}
                          </p>
                          {u.email && (
                            <p className="text-[11px] truncate" style={{ color: "var(--muted-2)" }}>{u.email}</p>
                          )}
                        </div>
                        <div
                          className="w-5 h-5 rounded-full grid place-items-center flex-shrink-0"
                          style={{
                            border: `2px solid ${isSelected ? "var(--acid)" : "var(--line)"}`,
                            background: isSelected ? "var(--acid)" : "transparent",
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3" style={{ color: "var(--ink)" }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="w-8 h-8 mb-2" style={{ color: "var(--muted)" }} />
                  <p className="text-sm" style={{ color: "var(--muted-2)" }}>No users found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="w-8 h-8 mb-2" style={{ color: "var(--muted)" }} />
                  <p className="text-sm" style={{ color: "var(--muted-2)" }}>Search for people to add to the group</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Step 2: Group info */}
              <div className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: "var(--muted)" }}>
                    Group Name *
                  </label>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    maxLength={100}
                    className="brutal-input text-sm w-full"
                    style={{ paddingTop: 10, paddingBottom: 10 }}
                  />
                  <p className="font-mono text-[10px] mt-1" style={{ color: "var(--muted-2)" }}>
                    {groupName.length}/100
                  </p>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: "var(--muted)" }}>
                    Description
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Optional group description"
                    maxLength={500}
                    rows={3}
                    className="brutal-input text-sm w-full resize-none"
                  />
                  <p className="font-mono text-[10px] mt-1" style={{ color: "var(--muted-2)" }}>
                    {groupDescription.length}/500
                  </p>
                </div>

                {/* Selected members preview */}
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest font-bold mb-2 block" style={{ color: "var(--muted)" }}>
                    Members ({selectedUsers.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs"
                        style={{
                          background: "var(--paper-3)",
                          border: "1px solid var(--line-soft)",
                          borderRadius: "var(--r-pill)",
                          color: "var(--ink)",
                        }}
                      >
                        <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={18} />
                        <span>{u.firstname}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost text-sm">
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={() => {
                if (selectedUsers.length === 0) {
                  toast.error("Select at least one person");
                  return;
                }
                setStep(2);
              }}
              disabled={selectedUsers.length === 0}
              className="brutal-btn brutal-btn-primary text-sm flex items-center gap-2"
              style={{ opacity: selectedUsers.length === 0 ? 0.5 : 1 }}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || !groupName.trim()}
              className="brutal-btn brutal-btn-primary text-sm flex items-center gap-2"
              style={{ opacity: creating || !groupName.trim() ? 0.5 : 1 }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
