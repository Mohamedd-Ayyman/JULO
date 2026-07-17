import { useState, useRef, useCallback } from "react";
import { Check, CheckCheck, Loader2, MessageSquare, Pencil, X } from "lucide-react";
import Avatar from "../Avatar.jsx";
import AudioMessage from "./AudioMessage.jsx";
import ImageMessage from "./ImageMessage.jsx";
import FileMessage from "./FileMessage.jsx";
import LinkPreview from "./LinkPreview.jsx";
import MessageError from "./MessageError.jsx";
import MessageContextMenu from "./MessageContextMenu.jsx";
import { cn } from "@/lib/utils";

function formatBubbleTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatFullTimestamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getMessageStatus(message) {
  if (message.pending && !message.failed) return "pending";
  if (message.failed) return "failed";
  if (message.read || (message.readBy && message.readBy.length > 0)) return "read";
  if (message.status === "read") return "read";
  if (message.deliveredTo && message.deliveredTo.length > 0) return "delivered";
  if (message.status === "delivered") return "delivered";
  return "sent";
}

function ReadReceipt({ message }) {
  const status = getMessageStatus(message);

  if (status === "pending") {
    return <Loader2 className="w-3 h-3 inline-block animate-spin" style={{ color: "var(--muted-2)" }} />;
  }
  if (status === "failed") return null;
  if (status === "sent") {
    return <Check className="w-3 h-3 inline-block" style={{ color: "var(--muted-2)" }} />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3 h-3 inline-block" style={{ color: "var(--muted-2)" }} />;
  }
  return <CheckCheck className="w-3 h-3 inline-block" style={{ color: "var(--acid)" }} />;
}

function ReactionsRow({ reactions, currentUserId, onReact }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;

  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const isOwn = users.some((u) => (u?._id || u) === currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded-full transition-all hover:scale-110"
            style={{
              background: isOwn ? "rgba(243,195,66,0.15)" : "var(--paper-3)",
              border: `1px solid ${isOwn ? "var(--acid)" : "var(--line-soft)"}`,
              color: "var(--ink)",
            }}
          >
            <span className="text-xs">{emoji}</span>
            <span className="font-mono font-medium" style={{ fontSize: 10 }}>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReplyQuote({ replyTo }) {
  if (!replyTo) return null;
  const sender = replyTo.sender?.firstname || "Someone";
  const preview = replyTo.text
    ? replyTo.text.length > 50
      ? replyTo.text.slice(0, 50) + "…"
      : replyTo.text
    : replyTo.audioUrl
      ? "🎵 Voice message"
      : replyTo.imageUrl
        ? "📷 Photo"
        : replyTo.fileUrl
          ? "📎 File"
          : "Message";

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 mb-1.5 rounded text-[11px]"
      style={{
        background: "rgba(0,0,0,0.06)",
        borderLeft: "2px solid var(--acid)",
      }}
    >
      <div className="min-w-0 flex-1">
        <span className="font-bold" style={{ color: "var(--acid)", fontSize: 10 }}>{sender}</span>
        <p className="truncate mt-0.5" style={{ color: "var(--muted)" }}>{preview}</p>
      </div>
    </div>
  );
}

function InlineEditInput({ initialText, onSave, onCancel }) {
  const [value, setValue] = useState(initialText);
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSave(value.trim());
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="py-1">
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent border-b-2 outline-none text-sm py-1"
        style={{ borderColor: "var(--acid)", color: "inherit" }}
      />
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] italic" style={{ color: "var(--muted)" }}>Enter to save · Esc to cancel</span>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="text-[10px] px-2 py-0.5 rounded"
          style={{ color: "var(--muted)", background: "var(--paper-3)" }}
        >
          Cancel
        </button>
        <button
          onClick={() => { if (value.trim()) onSave(value.trim()); }}
          className="text-[10px] px-2 py-0.5 rounded font-bold"
          style={{ color: "var(--ink)", background: "var(--acid)" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function ThreadIndicator({ count, onClick }) {
  if (!count || count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all hover:scale-105"
      style={{
        color: "var(--acid)",
        background: "rgba(243,195,66,0.08)",
        border: "1px solid rgba(243,195,66,0.2)",
      }}
    >
      <MessageSquare className="w-3 h-3" />
      {count} {count === 1 ? "reply" : "replies"}
    </button>
  );
}

export default function MessageBubble({
  message,
  isMine,
  isGroupStart,
  isGroupEnd,
  isGroupChat,
  otherMember,
  members,
  currentUserId,
  onRetry,
  onDelete,
  onReact,
  onReply,
  onEdit,
  onOpenThread,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isSwipingRef = useRef(false);

  const sender = isGroupChat && !isMine
    ? members?.find((m) => (m._id || m) === (message.sender?._id || message.sender))
    : null;
  const senderName = sender ? `${sender.firstname || ""} ${sender.lastname || ""}`.trim() : "";

  const deleted = message.deleted;
  const pending = message.pending && !message.failed;
  const failed = message.failed;

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 15) return;
    if (dx > 0 && isMine) return;
    if (dx < 0 && !isMine) return;
    isSwipingRef.current = true;
    setSwipeX(Math.min(Math.max(dx, -120), 120));
  }, [isMine]);

  const handleTouchEnd = useCallback(() => {
    if (isSwipingRef.current && swipeX > 80 && onReply) {
      onReply(message);
    }
    setSwipeX(0);
    isSwipingRef.current = false;
  }, [swipeX, onReply, message]);

  if (deleted) {
    return (
      <div className={cn("flex flex-col", isMine ? "items-end" : "items-start", isGroupStart ? "mt-3" : "mt-0.5")}>
        {isGroupChat && !isMine && isGroupStart && senderName && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <Avatar src={sender?.profilepic} name={senderName} size={20} />
            <span className="text-[11px] font-medium" style={{ color: "var(--muted-2)" }}>{senderName}</span>
          </div>
        )}
        <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
          {!isMine && isGroupStart && (
            <Avatar src={sender?.profilepic} name={senderName} size={28} className="mr-2 self-end" />
          )}
          {!isMine && !isGroupStart && <span className="w-7 mr-2 flex-shrink-0" />}
          <div
            className="max-w-[75%] sm:max-w-[60%] px-4 py-2 text-sm italic"
            style={{
              background: "var(--paper-3)",
              color: "var(--muted)",
              borderRadius: "var(--r-lg)",
              border: "1px dashed var(--line-soft)",
            }}
          >
            *Message deleted*
          </div>
        </div>
        {isGroupEnd && (
          <div
            className={cn("font-mono text-[10px] mt-0.5", isMine ? "mr-1" : "ml-9")}
            style={{ color: "var(--muted-2)" }}
          >
            {formatBubbleTime(message.createdAt)}
          </div>
        )}
      </div>
    );
  }

  const hasImage = !!message.imageUrl;
  const hasFile = !!message.fileUrl;
  const hasText = !!message.text?.trim();

  let bubbleContent;
  if (isEditing) {
    bubbleContent = (
      <InlineEditInput
        initialText={message.text || ""}
        onSave={(text) => { setIsEditing(false); onEdit?.(message, text); }}
        onCancel={() => setIsEditing(false)}
      />
    );
  } else if (hasImage) {
    bubbleContent = <ImageMessage imageUrl={message.imageUrl} text={hasText ? message.text : ""} />;
  } else if (hasFile) {
    bubbleContent = <FileMessage fileUrl={message.fileUrl} fileName={message.fileName} fileSize={message.fileSize} mimeType={message.mimeType} isMine={isMine} />;
  } else if (message.audioUrl) {
    bubbleContent = <AudioMessage audioUrl={message.audioUrl} duration={message.audioDuration} isMine={isMine} />;
  } else {
    bubbleContent = <span className="whitespace-pre-wrap break-words">{message.text}</span>;
  }

  const isImageOnly = hasImage && !hasText;
  const isFileOnly = hasFile && !hasText;

  return (
    <div
      className={cn("flex flex-col", isMine ? "items-end" : "items-start", isGroupStart ? "mt-3" : "mt-0.5")}
      style={{ transform: swipeX ? `translateX(${swipeX}px)` : undefined, transition: swipeX ? "none" : "transform 0.2s ease" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isGroupChat && !isMine && isGroupStart && senderName && (
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <Avatar src={sender?.profilepic} name={senderName} size={20} />
          <span className="text-[11px] font-medium" style={{ color: "var(--muted-2)" }}>{senderName}</span>
        </div>
      )}

      {swipeX > 40 && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-60">
          <Pencil className="w-4 h-4" style={{ color: "var(--acid)" }} />
        </div>
      )}

      {message.replyTo && (
        <div className={cn("max-w-[75%] sm:max-w-[60%]", isMine ? "mr-0" : "ml-0")}>
          <ReplyQuote replyTo={message.replyTo} />
        </div>
      )}

      <MessageContextMenu
        message={message}
        isMine={isMine}
        onCopy={() => {
          const text = message.text || message.imageUrl || message.fileUrl || "";
          navigator.clipboard?.writeText(text);
        }}
        onReact={(emoji) => onReact(message._id, emoji)}
        onDelete={() => onDelete(message._id)}
        onReply={() => onReply?.(message)}
        onEdit={() => setIsEditing(true)}
      >
        <div
          className={cn(
            "max-w-[75%] sm:max-w-[60%] text-sm leading-relaxed relative",
            isImageOnly ? "px-1 py-1" : "px-4 py-2",
            isGroupStart && isMine && "msg-tail-sent",
            isGroupStart && !isMine && "msg-tail-received",
            pending && "opacity-60",
          )}
          style={{
            background: isImageOnly || isFileOnly ? "transparent" : (isMine ? "var(--ink)" : "var(--paper-2)"),
            color: isMine ? "var(--paper)" : "var(--ink)",
            borderRadius: "var(--r-lg)",
          }}
        >
          {bubbleContent}
          {message.linkPreview && !isImageOnly && (
            <LinkPreview preview={message.linkPreview} />
          )}
          {message.edited && !deleted && (
            <span
              className="ml-1 text-[10px] italic font-mono"
              style={{ color: isMine ? "rgba(236,230,216,0.5)" : "var(--muted)" }}
            >
              (edited)
            </span>
          )}
        </div>
      </MessageContextMenu>

      {isMine && failed && (
        <div className="mt-1 mr-9">
          <MessageError onRetry={() => onRetry(message._id)} onDelete={() => onDelete(message._id)} />
        </div>
      )}

      {isGroupEnd && (
        <div className={cn("flex items-center gap-1.5 mt-0.5 px-1", isMine ? "mr-1" : "ml-9")}>
          <ThreadIndicator count={message.threadReplyCount} onClick={() => onOpenThread?.(message)} />
        </div>
      )}

      {(isGroupEnd || (!isMine && isGroupEnd)) && (
        <div
          className={cn(
            "flex items-center gap-1.5 mt-0.5 px-1 group/timestamp relative",
            isMine ? "mr-1" : "ml-9",
          )}
        >
          <span
            className="font-mono text-[10px] tabular-nums cursor-default"
            style={{ color: "var(--muted-2)" }}
          >
            {formatBubbleTime(message.createdAt)}
          </span>
          {isMine && <ReadReceipt message={message} />}
          <div
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover/timestamp:opacity-100 transition-opacity z-50"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              boxShadow: "var(--sh-3)",
            }}
          >
            {formatFullTimestamp(message.createdAt)}
          </div>
        </div>
      )}

      {isGroupEnd && (
        <div className={cn(isMine ? "mr-1" : "ml-9")}>
          <ReactionsRow reactions={message.reactions} currentUserId={currentUserId} onReact={(emoji) => onReact(message._id, emoji)} />
        </div>
      )}
    </div>
  );
}
