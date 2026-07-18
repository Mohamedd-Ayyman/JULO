import { memo } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  SwitchCamera,
  Settings,
} from "lucide-react";

function CallControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isVideoCall,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onFlipCamera,
  onEndCall,
  onSettings,
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4">
      <button
        onClick={onToggleMic}
        className="brutal-btn brutal-btn-icon w-12 h-12 rounded-full flex items-center justify-center transition-all"
        style={{
          background: isMuted ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.15)",
          color: "var(--paper)",
        }}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {isVideoCall && (
        <button
          onClick={onToggleCamera}
          className="brutal-btn brutal-btn-icon w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isVideoOff ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.15)",
            color: "var(--paper)",
          }}
          title={isVideoOff ? "Turn camera on" : "Turn camera off"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
      )}

      {isVideoCall && (
        <button
          onClick={onToggleScreenShare}
          className="brutal-btn brutal-btn-icon w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isScreenSharing ? "rgba(59,130,246,0.9)" : "rgba(255,255,255,0.15)",
            color: "var(--paper)",
          }}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>
      )}

      {isVideoCall && (
        <button
          onClick={onFlipCamera}
          className="brutal-btn brutal-btn-icon w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.15)", color: "var(--paper)" }}
          title="Flip camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      )}

      {onSettings && (
        <button
          onClick={onSettings}
          className="brutal-btn brutal-btn-icon w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.15)", color: "var(--paper)" }}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={onEndCall}
        className="brutal-btn brutal-btn-icon w-14 h-14 rounded-full flex items-center justify-center transition-all"
        style={{ background: "rgba(239,68,68,1)", color: "white" }}
        title="End call"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}

export default memo(CallControls);
