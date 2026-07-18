import { useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Phone,
  X,
} from "lucide-react";
import Avatar from "../Avatar.jsx";
import useCall from "../../hooks/useCall.js";
import useCallAudio from "../../hooks/useCallAudio.js";

export default function ActiveCallOverlay() {
  const {
    activeCall,
    callStatus,
    callType,
    callDuration,
    formatDuration,
    end,
    cancelOutgoing,
  } = useCall();

  const {
    isMuted,
    isSpeakerOn,
    audioError,
    startAudio,
    stopAudio,
    toggleMute,
    toggleSpeaker,
  } = useCallAudio();

  const isVisible = callStatus === "outgoing" || callStatus === "active";
  const isOutgoing = callStatus === "outgoing";

  const callerName = activeCall
    ? `${activeCall.calleeName || activeCall.callee?.firstname || activeCall.callerName || ""} ${activeCall.calleeLastname || activeCall.callee?.lastname || activeCall.callerLastname || ""}`.trim() || "Unknown"
    : "";
  const callerAvatar = activeCall?.calleeAvatar || activeCall?.callee?.profilepic || activeCall?.callerAvatar || "";

  useEffect(() => {
    if (isVisible && callStatus === "active") {
      startAudio();
    }
    return () => {
      if (!isVisible) stopAudio();
    };
  }, [isVisible, callStatus, startAudio, stopAudio]);

  const handleEnd = useCallback(async () => {
    stopAudio();
    if (isOutgoing) {
      await cancelOutgoing();
    } else {
      await end();
    }
  }, [stopAudio, isOutgoing, cancelOutgoing, end]);

  useEffect(() => {
    if (!isVisible) return;
    const handler = (e) => {
      if (e.key === "Escape") handleEnd();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, handleEnd]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center call-overlay anim-fade-in">
      <div className="call-overlay-bg" />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm px-6">
        {isOutgoing && (
          <button
            onClick={handleEnd}
            className="absolute top-0 right-0 call-control-btn-sm call-control-btn-ghost"
            aria-label="Cancel call"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="call-avatar-ring-active">
          <Avatar src={callerAvatar} name={callerName} size={100} />
        </div>

        <div className="text-center">
          <p className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>
            {callerName}
          </p>
          <p className="font-mono text-sm mt-1" style={{ color: "var(--muted-2)" }}>
            {isOutgoing
              ? "Calling..."
              : callStatus === "active"
                ? formatDuration(callDuration)
                : "Connecting..."}
          </p>
          {isOutgoing && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
          {callStatus === "active" && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                Active
              </span>
            </div>
          )}
        </div>

        {audioError && (
          <p className="font-mono text-[10px] text-center px-4 py-1.5" style={{ color: "var(--riso-red)", background: "rgba(217,122,108,0.1)", borderRadius: "var(--r-pill)" }}>
            {audioError}
          </p>
        )}

        {callStatus === "active" && (
          <div className="flex items-center gap-5 mt-6">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMute}
                className={`call-control-btn ${isMuted ? "call-control-btn-muted" : "call-control-btn-toggle"}`}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleSpeaker}
                className={`call-control-btn ${isSpeakerOn ? "call-control-btn-speaker-on" : "call-control-btn-toggle"}`}
                aria-label={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
              >
                {isSpeakerOn ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {isSpeakerOn ? "Earpiece" : "Speaker"}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleEnd}
                className="call-control-btn call-control-btn-end"
                aria-label="End call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                End
              </span>
            </div>
          </div>
        )}

        {isOutgoing && (
          <div className="flex flex-col items-center gap-2 mt-8">
            <button
              onClick={handleEnd}
              className="call-control-btn call-control-btn-end"
              aria-label="Cancel call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Cancel
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
