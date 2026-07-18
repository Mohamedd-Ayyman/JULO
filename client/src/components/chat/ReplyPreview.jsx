import { X } from "lucide-react";

export default function ReplyPreview({ message, onCancel }) {
  if (!message) return null;

  const senderName = message.sender?.firstname || "Someone";
  const preview = message.text
    ? message.text.length > 80
      ? message.text.slice(0, 80) + "…"
      : message.text
    : message.audioUrl
      ? "🎵 Voice message"
      : message.imageUrl
        ? "📷 Photo"
        : message.fileUrl
          ? "📎 File"
          : "Message";

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 mx-3 mt-2 rounded-lg"
      style={{
        background: "var(--paper-3)",
        borderLeft: "3px solid var(--acid)",
        borderRadius: "var(--r-sm)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: "var(--acid)" }}>
          Replying to {senderName}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
          {preview}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="flex-shrink-0 p-1 rounded-full transition-colors hover:bg-black/5"
        style={{ color: "var(--muted)" }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
