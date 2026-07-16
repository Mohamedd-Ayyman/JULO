import { Check, CheckCheck } from "lucide-react";
import Avatar from "../Avatar.jsx";
import AudioMessage from "./AudioMessage.jsx";
import MessageError from "./MessageError.jsx";
import MessageContextMenu from "./MessageContextMenu.jsx";
import { cn } from "@/lib/utils";

function formatBubbleTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function ReadReceipt({ read, pending, failed }) {
  if (failed || pending) return null;
  if (!read) {
    return <Check className="w-3 h-3 inline-block" style={{ color: "var(--muted-2)" }} />;
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

export default function MessageBubble({
  message,
  isMine,
  isGroupStart,
  isGroupEnd,
  otherMember,
  currentUserId,
  onRetry,
  onDelete,
  onReact,
}) {
  const deleted = message.deleted;
  const pending = message.pending && !message.failed;
  const failed = message.failed;

  if (deleted) {
    return (
      <div className={cn("flex flex-col", isMine ? "items-end" : "items-start", isGroupStart ? "mt-3" : "mt-0.5")}>
        <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
          {!isMine && isGroupStart && (
            <Avatar src={otherMember?.profilepic} name={otherMember?.firstname || ""} size={28} className="mr-2 self-end" />
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

  const bubbleContent = message.audioUrl ? (
    <AudioMessage audioUrl={message.audioUrl} duration={message.audioDuration} isMine={isMine} />
  ) : (
    <span className="whitespace-pre-wrap break-words">{message.text}</span>
  );

  return (
    <div className={cn("flex flex-col", isMine ? "items-end" : "items-start", isGroupStart ? "mt-3" : "mt-0.5")}>
      <MessageContextMenu
        message={message}
        isMine={isMine}
        onCopy={() => navigator.clipboard?.writeText(message.text || "")}
        onReact={(emoji) => onReact(message._id, emoji)}
        onDelete={() => onDelete(message._id)}
      >
        <div
          className={cn(
            "max-w-[75%] sm:max-w-[60%] px-4 py-2 text-sm leading-relaxed",
            isGroupStart && isMine && "msg-tail-sent",
            isGroupStart && !isMine && "msg-tail-received",
            pending && "opacity-60",
          )}
          style={{
            background: isMine ? "var(--ink)" : "var(--paper-2)",
            color: isMine ? "var(--paper)" : "var(--ink)",
            borderRadius: "var(--r-lg)",
          }}
        >
          {bubbleContent}
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

      {(isGroupEnd || (!isMine && isGroupEnd)) && (
        <div
          className={cn(
            "flex items-center gap-1.5 mt-0.5 px-1",
            isMine ? "mr-1" : "ml-9",
          )}
        >
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: "var(--muted-2)" }}
          >
            {formatBubbleTime(message.createdAt)}
          </span>
          {isMine && <ReadReceipt read={message.read} pending={pending} failed={failed} />}
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
