import React, { useState, useEffect, useRef } from "react";
import {
  X, ArrowLeft, Users, Settings, Edit3, Trash2, LogOut, UserPlus,
  Crown, Shield, MoreVertical, Loader2, Check, BellOff, Bell, Search,
  ChevronDown, Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../Avatar.jsx";
import {
  getChatParticipants,
  updateChatInfo,
  removeParticipant,
  leaveChat,
  updateParticipantRole,
  muteChat,
  deleteChat,
} from "../../apiCalls/message.js";
import { searchUsers } from "../../apiCalls/users.js";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../lib/constants.js";

export default function GroupDetailsPanel({ chat, currentUserId, onClose, onChatUpdated }) {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState(chat.name || "");
  const [descValue, setDescValue] = useState(chat.description || "");
  const [saving, setSaving] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addSelected, setAddSelected] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);
  const searchTimerRef = useRef(null);

  const myParticipant = participants.find((p) => (p.userId?._id || p.userId) === currentUserId);
  const isAdmin = myParticipant?.role === "admin" || chat.createdBy === currentUserId;

  useEffect(() => {
    loadParticipants();
  }, [chat._id]);

  useEffect(() => {
    if (!showAddMembers) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showAddMembers]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const res = await getChatParticipants(chat._id);
      if (res.success && res.data) {
        setParticipants(res.data);
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await updateChatInfo(chat._id, { name: nameValue.trim() });
      if (res.success) {
        toast.success("Group name updated");
        setEditingName(false);
        onChatUpdated?.({ name: nameValue.trim() });
      } else {
        toast.error(res.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    }
    setSaving(false);
  };

  const handleSaveDesc = async () => {
    setSaving(true);
    try {
      const res = await updateChatInfo(chat._id, { description: descValue.trim() || null });
      if (res.success) {
        toast.success("Description updated");
        setEditingDesc(false);
        onChatUpdated?.({ description: descValue.trim() || null });
      } else {
        toast.error(res.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    }
    setSaving(false);
  };

  const handleRemoveMember = async (userId) => {
    setActiveMenu(null);
    try {
      const res = await removeParticipant(chat._id, userId);
      if (res.success) {
        toast.success("Member removed");
        setParticipants((prev) => prev.filter((p) => (p.userId?._id || p.userId) !== userId));
        onChatUpdated?.({ memberCount: (chat.memberCount || chat.members?.length || 1) - 1 });
      } else {
        toast.error(res.message || "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    setActiveMenu(null);
    try {
      const res = await updateParticipantRole(chat._id, userId, newRole);
      if (res.success) {
        toast.success(`Role updated to ${newRole}`);
        setParticipants((prev) =>
          prev.map((p) => (p.userId?._id || p.userId) === userId ? { ...p, role: newRole } : p)
        );
      } else {
        toast.error(res.message || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      const res = await leaveChat(chat._id);
      if (res.success) {
        toast.success("Left the group");
        onClose();
        navigate(ROUTES.CHAT);
      } else {
        toast.error(res.message || "Failed to leave");
      }
    } catch {
      toast.error("Failed to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group? This cannot be undone.")) return;
    try {
      const res = await deleteChat(chat._id);
      if (res.success) {
        toast.success("Group deleted");
        onClose();
        navigate(ROUTES.CHAT);
      } else {
        toast.error(res.message || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete group");
    }
  };

  // Add members search
  useEffect(() => {
    if (!addSearchQuery.trim()) {
      setAddSearchResults([]);
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setAddSearching(true);
      try {
        const res = await searchUsers(addSearchQuery);
        if (res.success && res.data) {
          const users = Array.isArray(res.data) ? res.data : res.data.users || [];
          const existingIds = participants.map((p) => p.userId?._id || p.userId);
          setAddSearchResults(users.filter((u) => !existingIds.includes(u._id) && !addSelected.some((s) => s._id === u._id)));
        }
      } catch {
        // silent
      }
      setAddSearching(false);
    }, 300);
  }, [addSearchQuery, participants, addSelected]);

  const handleAddMembers = async () => {
    if (addSelected.length === 0) return;
    setSaving(true);
    try {
      const { addParticipants: addMembersFn } = await import("../../apiCalls/message.js");
      const res = await addMembersFn(chat._id, addSelected.map((u) => u._id));
      if (res.success) {
        toast.success(`${addSelected.length} member${addSelected.length > 1 ? "s" : ""} added`);
        setShowAddMembers(false);
        setAddSelected([]);
        setAddSearchQuery("");
        loadParticipants();
        onChatUpdated?.({ memberCount: (chat.memberCount || chat.members?.length || 0) + addSelected.length });
      } else {
        toast.error(res.message || "Failed to add members");
      }
    } catch {
      toast.error("Failed to add members");
    }
    setSaving(false);
  };

  const roleIcon = (role) => {
    if (role === "admin") return <Crown className="w-3 h-3" style={{ color: "var(--acid)" }} />;
    if (role === "moderator") return <Shield className="w-3 h-3" style={{ color: "var(--riso-blue)" }} />;
    return null;
  };

  const roleLabel = (role) => {
    if (role === "admin") return "Admin";
    if (role === "moderator") return "Moderator";
    return "Member";
  };

  return (
    <div className="fixed inset-0 z-[60] flex anim-fade-in" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-lg mx-auto my-0 md:my-4 max-h-screen md:max-h-[90vh] flex flex-col anim-scale-in overflow-hidden"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh-4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--line-soft)" }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon" style={{ width: 32, height: 32 }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-display text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>
              Group Info
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Group header */}
          <div className="flex flex-col items-center py-6 px-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
            <Avatar src={chat.icon} name={chat.name || "Group"} size={80} />
            {editingName ? (
              <div className="flex items-center gap-2 mt-3">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={100}
                  className="brutal-input text-center text-lg font-bold"
                  style={{ width: 220 }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button onClick={handleSaveName} disabled={saving} className="brutal-btn brutal-btn-primary brutal-btn-icon" style={{ width: 32, height: 32 }}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3">
                <h3 className="font-display text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>
                  {chat.name || "Unnamed Group"}
                </h3>
                {isAdmin && (
                  <button onClick={() => setEditingName(true)} className="brutal-btn brutal-btn-ghost brutal-btn-icon" style={{ width: 28, height: 28 }}>
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {editingDesc ? (
              <div className="mt-2 w-full max-w-xs">
                <textarea
                  autoFocus
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="brutal-input text-sm text-center resize-none w-full"
                />
                <div className="flex justify-center gap-2 mt-1">
                  <button onClick={() => setEditingDesc(false)} className="text-[10px] px-2 py-0.5" style={{ color: "var(--muted)" }}>Cancel</button>
                  <button onClick={handleSaveDesc} disabled={saving} className="text-[10px] px-2 py-0.5 font-bold" style={{ color: "var(--acid)" }}>Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-center" style={{ color: "var(--muted-2)" }}>
                  {chat.description || "No description"}
                </p>
                {isAdmin && (
                  <button onClick={() => setEditingDesc(true)} className="brutal-btn brutal-btn-ghost brutal-btn-icon" style={{ width: 20, height: 20 }}>
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            <p className="font-mono text-[10px] mt-2" style={{ color: "var(--muted)" }}>
              {participants.length} member{participants.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Members section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--muted)" }}>
                Members
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="brutal-btn brutal-btn-ghost brutal-btn-sm flex items-center gap-1.5 text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add
                </button>
              )}
            </div>

            {/* Add members inline */}
            {showAddMembers && (
              <div
                className="mb-4 p-3 anim-fade-in"
                style={{
                  background: "var(--paper-3)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "var(--r-md)",
                }}
              >
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--muted-2)" }} />
                  <input
                    autoFocus
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="brutal-input pl-9 text-xs"
                    style={{ paddingTop: 8, paddingBottom: 8 }}
                  />
                </div>

                {addSelected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {addSelected.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => setAddSelected((prev) => prev.filter((s) => s._id !== u._id))}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: "var(--acid)", color: "var(--ink)", borderRadius: "var(--r-pill)" }}
                      >
                        {u.firstname}
                        <X className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}

                {addSearching ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--muted)" }} /></div>
                ) : addSearchResults.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {addSearchResults.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => setAddSelected((prev) => [...prev, u])}
                        className="w-full flex items-center gap-2 p-2 text-left text-xs transition-all"
                        style={{ borderRadius: "var(--r-sm)" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={28} />
                        <span style={{ color: "var(--ink)" }}>{u.firstname} {u.lastname}</span>
                      </button>
                    ))}
                  </div>
                ) : addSearchQuery.trim() ? (
                  <p className="text-[11px] text-center py-3" style={{ color: "var(--muted-2)" }}>No users found</p>
                ) : null}

                {addSelected.length > 0 && (
                  <button
                    onClick={handleAddMembers}
                    disabled={saving}
                    className="w-full mt-2 brutal-btn brutal-btn-primary text-xs flex items-center justify-center gap-1.5"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    Add {addSelected.length} member{addSelected.length > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            )}

            {/* Members list */}
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
              </div>
            ) : (
              <div className="space-y-1 stagger">
                {participants.map((p) => {
                  const u = p.userId || {};
                  const isSelf = (u._id || u) === currentUserId;
                  return (
                    <div
                      key={p._id}
                      className="flex items-center gap-3 p-2.5 relative"
                      style={{ borderRadius: "var(--r-sm)" }}
                    >
                      <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={40} online={u.isOnline} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                            {u.firstname} {u.lastname}
                          </p>
                          {isSelf && <span className="text-[9px] font-mono" style={{ color: "var(--muted-2)" }}>(you)</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {roleIcon(p.role)}
                          <span className="text-[10px] font-mono" style={{ color: "var(--muted-2)" }}>
                            {roleLabel(p.role)}
                          </span>
                        </div>
                      </div>

                      {/* Role/actions menu for admins */}
                      {isAdmin && !isSelf && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === p._id ? null : p._id)}
                            className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                            style={{ width: 28, height: 28 }}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {activeMenu === p._id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 anim-fade-in"
                                style={{
                                  background: "var(--paper)",
                                  border: "1px solid var(--line-soft)",
                                  borderRadius: "var(--r-md)",
                                  boxShadow: "var(--sh-3)",
                                }}
                              >
                                {p.role !== "admin" && (
                                  <button
                                    onClick={() => handleChangeRole(u._id, "admin")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                                    style={{ color: "var(--ink)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                  >
                                    <Crown className="w-3.5 h-3.5" style={{ color: "var(--acid)" }} />
                                    Make Admin
                                  </button>
                                )}
                                {p.role !== "moderator" && p.role !== "admin" && (
                                  <button
                                    onClick={() => handleChangeRole(u._id, "moderator")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                                    style={{ color: "var(--ink)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                  >
                                    <Shield className="w-3.5 h-3.5" style={{ color: "var(--riso-blue)" }} />
                                    Make Moderator
                                  </button>
                                )}
                                {p.role !== "member" && (
                                  <button
                                    onClick={() => handleChangeRole(u._id, "member")}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                                    style={{ color: "var(--ink)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                  >
                                    Make Member
                                  </button>
                                )}
                                <div style={{ borderTop: "1px solid var(--line-soft)", margin: "2px 0" }} />
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${u.firstname} from this group?`)) handleRemoveMember(u._id);
                                    else setActiveMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                                  style={{ color: "var(--riso-red)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(217,122,108,0.08)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remove from group
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="p-4" style={{ borderTop: "1px solid var(--line-soft)" }}>
            <button
              onClick={handleLeaveGroup}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium transition-all"
              style={{
                color: "var(--riso-red)",
                border: "1px solid rgba(217,122,108,0.3)",
                borderRadius: "var(--r-md)",
                background: "rgba(217,122,108,0.05)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(217,122,108,0.12)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(217,122,108,0.05)"}
            >
              <LogOut className="w-4 h-4" />
              Leave Group
            </button>
            {isAdmin && (
              <button
                onClick={handleDeleteGroup}
                className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium mt-2 transition-all"
                style={{
                  color: "var(--riso-red)",
                  border: "1px dashed rgba(217,122,108,0.4)",
                  borderRadius: "var(--r-md)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(217,122,108,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
