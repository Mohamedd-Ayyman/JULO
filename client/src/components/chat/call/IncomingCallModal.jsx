import { memo } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import Avatar from "../../Avatar.jsx";

function IncomingCallModal({ caller, callType, onAccept, onReject }) {
  const name = caller?.firstname
    ? `${caller.firstname} ${caller.lastname || ""}`
    : caller?.name || "Unknown";

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
    >
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200">
        <div className="relative">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold animate-pulse"
            style={{ background: "var(--acid)", color: "var(--ink)" }}
          >
            {caller?.profilepic ? (
              <img
                src={caller.profilepic}
                alt={name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: callType === "video" ? "var(--ink)" : "var(--line-soft)" }}
          >
            {callType === "video" ? (
              <Video className="w-4 h-4" style={{ color: "var(--paper)" }} />
            ) : (
              <Phone className="w-4 h-4" style={{ color: "var(--paper)" }} />
            )}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold" style={{ color: "var(--paper)" }}>
            {name}
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--muted-2)" }}>
            Incoming {callType === "video" ? "video" : "audio"} call...
          </p>
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: "rgba(239,68,68,1)" }}
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 animate-pulse"
            style={{ background: "rgba(34,197,94,1)" }}
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(IncomingCallModal);
