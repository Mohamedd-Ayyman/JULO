import React, { useState } from "react";

/**
 * Character counter for text inputs.
 * Shows warning at 80% and error at limit.
 */
export function CharCounter({ text, max }) {
  const len = text?.length || 0;
  const pct = max > 0 ? len / max : 0;
  const cls = pct >= 1 ? "over" : pct >= 0.8 ? "near" : "ok";

  return (
    <span className={`char-counter ${cls}`} aria-live="polite">
      {len}/{max}
    </span>
  );
}

/**
 * Image preview before upload.
 * Shows thumbnail, filename, and remove button.
 */
export function ImagePreview({ file, onRemove }) {
  const [src, setSrc] = useState(null);

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return null;

  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt="Preview"
        className="w-24 h-24 object-cover"
        style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 bg-error rounded-full flex items-center justify-center text-white text-xs"
          aria-label="Remove image"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Typing indicator dots animation.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-3 py-2" aria-label="User is typing">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Relative timestamp formatter.
 */
export function formatTime(date) {
  if (!date) return "";
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(date).toLocaleDateString();
}

/**
 * Online / last seen status label.
 */
export function OnlineStatus({ user }) {
  if (!user) return null;
  if (user.showOnlineStatus === false) return null;
  if (user.isOnline) {
    return <span className="font-mono text-[10px] font-bold" style={{ color: "var(--mood-cozy)" }}>Online</span>;
  }
  if (user.lastSeen) {
    return (
      <span className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
        Last seen {formatTime(user.lastSeen)}
      </span>
    );
  }
  return null;
}

/**
 * Grouped notifications by date.
 */
export function groupNotificationsByDate(notifications) {
  const groups = {};
  notifications.forEach((n) => {
    const date = new Date(n.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(n);
  });
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}