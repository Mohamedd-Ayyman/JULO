import { memo, useState } from "react";
import { Minimize2 } from "lucide-react";
import { useSelector } from "react-redux";
import { selectParticipants } from "../../../redux/callSlice.js";
import ParticipantGrid from "./ParticipantGrid.jsx";
import CallControls from "./CallControls.jsx";
import CallTimer from "./CallTimer.jsx";

function ActiveCallScreen({
  localStream,
  localUserId,
  localUserName,
  localProfilePic,
  isMuted,
  isVideoOff,
  isScreenSharing,
  callType,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onFlipCamera,
  onEndCall,
  onMinimize,
}) {
  const participants = useSelector(selectParticipants);
  const remoteCount = participants.filter((p) => p.userId !== localUserId && !p.leftAt).length;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "var(--ink)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center gap-3">
          <CallTimer />
          <span className="text-xs" style={{ color: "var(--muted-2)" }}>
            {remoteCount + 1} participant{remoteCount > 0 ? "s" : ""}
          </span>
        </div>

        <button
          onClick={onMinimize}
          className="brutal-btn brutal-btn-ghost brutal-btn-icon w-8 h-8 flex items-center justify-center"
          style={{ color: "var(--paper)" }}
          title="Minimize"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ParticipantGrid
          localStream={localStream}
          localUserId={localUserId}
          localUserName={localUserName}
          localProfilePic={localProfilePic}
          localIsMuted={isMuted}
          localIsVideoOff={isVideoOff}
        />
      </div>

      <div className="shrink-0" style={{ background: "rgba(0,0,0,0.5)" }}>
        <CallControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isVideoCall={callType === "video"}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onFlipCamera={onFlipCamera}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
}

export default memo(ActiveCallScreen);
