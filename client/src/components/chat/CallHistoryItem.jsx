import React from "react";
import Avatar from "../Avatar.jsx";
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Mic,
} from "lucide-react";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatCallTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

const TYPE_CONFIG = {
  incoming: { icon: PhoneIncoming, color: "var(--acid)", label: "Incoming" },
  outgoing: { icon: PhoneOutgoing, color: "var(--riso-blue)", label: "Outgoing" },
  missed: { icon: PhoneMissed, color: "var(--riso-red)", label: "Missed" },
};

export default function CallHistoryItem({ call, currentUserId }) {
  const isCaller = call.caller?._id === currentUserId || call.caller === currentUserId;
  const other = isCaller ? call.callee : call.caller;
  const otherName = `${other?.firstname || ""} ${other?.lastname || ""}`.trim() || "Unknown";

  const type = call.status === "missed" || call.type === "missed" ? "missed" : (isCaller ? "outgoing" : "incoming");
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.incoming;
  const Icon = config.icon;
  const duration = formatDuration(call.duration);

  return (
    <div
      className="flex items-center gap-3 p-3 transition-all"
      style={{ borderRadius: "var(--r-sm)" }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <Avatar src={other?.profilepic} name={otherName} size={44} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className="text-sm font-medium truncate"
            style={{ color: type === "missed" ? "var(--riso-red)" : "var(--ink)" }}
          >
            {otherName}
          </p>
          {duration && (
            <span className="font-mono text-[10px] flex-shrink-0 ml-2" style={{ color: "var(--muted-2)" }}>
              {duration}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: config.color }} />
            <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
              {config.label}
            </span>
            {call.hasRecording && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5" style={{ color: "var(--acid)", background: "rgba(186,225,80,0.1)", borderRadius: "var(--r-pill)" }}>
                <Mic className="w-2.5 h-2.5" />
                Recorded
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] flex-shrink-0" style={{ color: "var(--muted)" }}>
            {formatCallTime(call.startedAt || call.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
