import React from "react";
import { PhoneOff, Loader2, Video, Phone } from "lucide-react";
import Avatar from "../Avatar.jsx";

export default function OutgoingCallModal({ activeCall, callee, onCancel, callType }) {
  if (!activeCall) return null;

  const calleeName = callee
    ? `${callee.firstname || ""} ${callee.lastname || ""}`.trim()
    : "Someone";
  const isVideo = callType === "video";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center anim-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="w-full max-w-sm mx-4 flex flex-col items-center anim-scale-in"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh-4)",
          padding: "48px 32px 40px",
        }}
      >
        <div className="relative mb-6">
          <div
            className="absolute -inset-3 rounded-full"
            style={{
              border: "2px solid var(--acid)",
              opacity: 0.3,
            }}
          />
          <Avatar
            src={callee?.profilepic}
            name={calleeName}
            size={100}
          />
        </div>

        <p
          className="font-display text-xl font-black tracking-tight mb-1"
          style={{ color: "var(--ink)" }}
        >
          {calleeName}
        </p>

        <div className="flex items-center gap-2 mb-2">
          {isVideo ? (
            <Video className="w-3.5 h-3.5" style={{ color: "var(--riso-blue)" }} />
          ) : (
            <Phone className="w-3.5 h-3.5" style={{ color: "var(--acid)" }} />
          )}
          <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Calling...
          </p>
        </div>

        <div className="flex items-center gap-1.5 mb-10">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>

        <button
          onClick={onCancel}
          className="flex flex-col items-center gap-2 group"
        >
          <div
            className="w-16 h-16 rounded-full grid place-items-center transition-all group-hover:scale-110"
            style={{
              background: "var(--riso-red)",
              boxShadow: "0 4px 20px rgba(217,122,108,0.35)",
            }}
          >
            <PhoneOff className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Cancel
          </span>
        </button>
      </div>
    </div>
  );
}
