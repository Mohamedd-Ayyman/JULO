import { useEffect, useCallback } from "react";
import { Phone, PhoneOff } from "lucide-react";
import Avatar from "../Avatar.jsx";
import useCall from "../../hooks/useCall.js";

export default function IncomingCallModal() {
  const { incomingCall, callStatus, accept, reject } = useCall();
  const isVisible = callStatus === "ringing" && incomingCall;

  const callerName = incomingCall
    ? `${incomingCall.callerName || incomingCall.caller?.firstname || ""} ${incomingCall.callerName || incomingCall.caller?.lastname || ""}`.trim() || "Someone"
    : "";
  const callerAvatar = incomingCall?.callerAvatar || incomingCall?.caller?.profilepic || "";

  const handleAccept = useCallback(async () => {
    await accept();
  }, [accept]);

  const handleReject = useCallback(async () => {
    await reject();
  }, [reject]);

  useEffect(() => {
    if (!isVisible) return;
    const handler = (e) => {
      if (e.key === "Escape") handleReject();
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAccept();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, handleAccept, handleReject]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center call-overlay anim-fade-in">
      <div className="call-overlay-bg" />

      <div className="relative z-10 flex flex-col items-center gap-6 anim-scale-in">
        <div className="call-avatar-ring">
          <Avatar src={callerAvatar} name={callerName} size={120} />
        </div>

        <div className="text-center">
          <p className="font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>
            {callerName}
          </p>
          <p className="font-mono text-sm mt-1" style={{ color: "var(--muted-2)" }}>
            Incoming Voice Call
          </p>
        </div>

        <div className="call-ring-indicator">
          <span className="call-ring-wave call-ring-wave-1" />
          <span className="call-ring-wave call-ring-wave-2" />
          <span className="call-ring-wave call-ring-wave-3" />
        </div>

        <div className="flex items-center gap-12 mt-8">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleReject}
              className="call-control-btn call-control-btn-reject"
              aria-label="Reject call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Decline
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAccept}
              className="call-control-btn call-control-btn-accept"
              aria-label="Accept call"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Accept
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
