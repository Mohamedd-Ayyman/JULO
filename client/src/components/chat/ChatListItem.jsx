import React, { useState, useRef, useEffect } from "react";
import Avatar from "../Avatar.jsx";
import { formatTime } from "../CommonUI.jsx";
import { BellOff, Bell } from "lucide-react";

function getPreviewText(message, currentUserId) {
  if (!message) return "Say hi";
  if (message.deleted) return "Message deleted";
  if (message.audioUrl) {
    const prefix = message.sender?._id === currentUserId || message.sender === currentUserId ? "You: " : "";
    return `${prefix}🎤 Voice message`;
  }
  if (message.image) {
    const prefix = message.sender?._id === currentUserId || message.sender === currentUserId ? "You: " : "";
    return `${prefix}📷 Photo`;
  }
  if (message.video) {
    const prefix = message.sender?._id === currentUserId || message.sender === currentUserId ? "You: " : "";
    return `${prefix}🎬 Video`;
  }
  const isMine = message.sender?._id === currentUserId || message.sender === currentUserId;
  if (isMine && message.text) return `You: ${message.text}`;
  return message.text || "Say hi";
}

export default function ChatListItem({ chat, currentUserId, isActive, isTyping, isMuted, onClick, onToggleMute }) {
  const other = chat.members?.find((m) => m._id !== currentUserId);
  const name = `${other?.firstname || ""} ${other?.lastname || ""}`.trim();
  const unread = chat.unreadMessageCount || 0;
  const hasUnread = unread > 0;
  const [showCtx, setShowCtx] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!showCtx) return;
    const close = (e) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target)) setShowCtx(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showCtx]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setCtxPos({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 100) });
    setShowCtx(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className="w-full flex items-center gap-3 p-2.5 text-left transition-all relative"
        style={{
          background: isActive ? "var(--paper-3)" : "transparent",
          borderRadius: "var(--r-sm)",
        }}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full"
            style={{ background: "var(--acid)" }}
          />
        )}

        <Avatar src={other?.profilepic} name={name} size={44} online={other?.isOnline} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p
              className="text-sm truncate"
              style={{
                color: "var(--ink)",
                fontWeight: hasUnread ? 700 : 500,
              }}
            >
              {name || "Unknown"}
            </p>
            {chat.lastMessage?.createdAt && (
              <span
                className="font-mono text-[10px] flex-shrink-0 ml-2"
                style={{ color: hasUnread ? "var(--acid)" : "var(--muted-2)" }}
              >
                {formatTime(chat.lastMessage.createdAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            {isTyping ? (
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--acid)" }}>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                <span className="ml-0.5">typing</span>
              </span>
            ) : (
              <p
                className="text-xs truncate flex items-center gap-1"
                style={{
                  color: hasUnread ? "var(--ink-soft)" : "var(--muted-2)",
                  fontWeight: hasUnread ? 500 : 400,
                }}
              >
                {isMuted && <BellOff className="w-3 h-3 flex-shrink-0" style={{ color: "var(--muted)" }} />}
                {getPreviewText(chat.lastMessage, currentUserId)}
              </p>
            )}
            {unread > 0 && (
              <span
                className="font-mono text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0 ml-2"
                style={{
                  background: "var(--riso-red)",
                  color: "var(--paper)",
                  borderRadius: "var(--r-pill)",
                  minWidth: 18,
                  textAlign: "center",
                }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </button>

      {showCtx && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCtx(false)} />
          <div
            ref={ctxRef}
            className="fixed z-50 min-w-[180px] py-1 anim-fade-in"
            style={{
              left: ctxPos.x,
              top: ctxPos.y,
              background: "var(--paper)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--sh-3)",
            }}
          >
            <button
              onClick={() => { onToggleMute?.(chat._id); setShowCtx(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--ink)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
