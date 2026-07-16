import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft, Send, Loader2 } from "lucide-react";
import Avatar from "../Avatar.jsx";
import MessageBubble from "./MessageBubble.jsx";
import DateSeparator from "./DateSeparator.jsx";
import { getThreadReplies, sendReply } from "../../apiCalls/message.js";
import { useSocket } from "../../context/SocketContext.jsx";
import { SOCKET_EVENTS } from "../../lib/constants.js";

function groupByDate(messages) {
  const groups = [];
  let currentDate = null;
  messages.forEach((m) => {
    const d = new Date(m.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== currentDate) {
      currentDate = key;
      groups.push({ date: m.createdAt, messages: [] });
    }
    groups[groups.length - 1].messages.push(m);
  });
  return groups;
}

export default function ThreadPanel({ rootMessage, currentUserId, onClose, otherMember }) {
  const { socket } = useSocket();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!rootMessage?._id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getThreadReplies(rootMessage._id, 1, 50);
        if (cancelled) return;
        if (res.success && res.data) {
          setReplies(res.data.replies || []);
          setTotal(res.data.total || 0);
        }
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [rootMessage?._id]);

  useEffect(() => {
    if (!socket || !rootMessage?._id) return;
    const onReceive = (m) => {
      if (m.threadRootId === rootMessage._id || m.replyTo === rootMessage._id) {
        setReplies((prev) => [...prev, m]);
        setTotal((t) => t + 1);
      }
    };
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceive);
    return () => socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceive);
  }, [socket, rootMessage?._id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [replies.length]);

  const handleSend = async () => {
    if (!draft.trim() || sending || !rootMessage?._id) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    const res = await sendReply(rootMessage.chatId, rootMessage._id, text);
    if (res.success && res.data) {
      setReplies((prev) => [...prev, res.data]);
      setTotal((t) => t + 1);
      if (socket) socket.emit(SOCKET_EVENTS.SEND_MESSAGE, res.data);
    }
    setSending(false);
  };

  const handleDelete = async (messageId) => {
    setReplies((prev) => prev.map((r) => r._id === messageId ? { ...r, deleted: true } : r));
  };

  const handleReact = async (messageId, emoji) => {
    const { addReaction } = await import("../../apiCalls/message.js");
    const res = await addReaction(messageId, emoji);
    if (res.success && res.data) {
      setReplies((prev) => prev.map((r) => r._id === messageId ? res.data : r));
    }
  };

  const preview = rootMessage.text
    ? rootMessage.text.length > 60
      ? rootMessage.text.slice(0, 60) + "…"
      : rootMessage.text
    : rootMessage.audioUrl
      ? "🎵 Voice message"
      : rootMessage.imageUrl
        ? "📷 Photo"
        : "Message";

  return (
    <div
      className="flex flex-col h-full border-l animate-slide-in-right"
      style={{ borderColor: "var(--line-soft)", background: "var(--paper)", width: 380, maxWidth: "100%" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--paper-2)" }}
      >
        <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>Thread</p>
          <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
            {total} {total === 1 ? "reply" : "replies"}
          </p>
        </div>
      </div>

      {/* Root message */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--paper-3)" }}>
        <div className="flex items-start gap-2.5">
          <Avatar src={rootMessage.sender?.profilepic} name={rootMessage.sender?.firstname || ""} size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold" style={{ color: "var(--ink)" }}>
              {rootMessage.sender?.firstname} {rootMessage.sender?.lastname}
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>
              {preview}
            </p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs" style={{ color: "var(--muted-2)" }}>No replies yet</p>
          </div>
        ) : (
          groupByDate(replies).map((group) => (
            <div key={group.date}>
              <DateSeparator date={group.date} />
              {group.messages.map((m, i) => {
                const mine = m.sender?._id === currentUserId || m.sender === currentUserId;
                const msgs = group.messages;
                const prevMsg = i > 0 ? msgs[i - 1] : null;
                const nextMsg = i < msgs.length - 1 ? msgs[i + 1] : null;
                const prevSameSender = prevMsg && (prevMsg.sender?._id === m.sender?._id || prevMsg.sender === m.sender);
                const nextSameSender = nextMsg && (nextMsg.sender?._id === m.sender?._id || nextMsg.sender === m.sender);
                return (
                  <MessageBubble
                    key={m._id}
                    message={m}
                    isMine={mine}
                    isGroupStart={!prevSameSender}
                    isGroupEnd={!nextSameSender}
                    otherMember={otherMember}
                    currentUserId={currentUserId}
                    onRetry={() => {}}
                    onDelete={handleDelete}
                    onReact={handleReact}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Reply in thread…"
            className="brutal-input rounded-full text-sm flex-1"
            style={{ paddingTop: 8, paddingBottom: 8 }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="brutal-btn brutal-btn-primary brutal-btn-icon"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
