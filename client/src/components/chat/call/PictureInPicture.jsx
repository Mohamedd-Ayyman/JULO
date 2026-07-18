import { memo } from "react";
import { PhoneOff, Maximize2 } from "lucide-react";
import { useSelector } from "react-redux";
import { selectParticipants } from "../../../redux/callSlice.js";
import CallTimer from "./CallTimer.jsx";

function PictureInPicture({ localUserId, onExpand, onEndCall }) {
  const participants = useSelector(selectParticipants);
  const remoteCount = participants.filter((p) => p.userId !== localUserId && !p.leftAt).length;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9998] w-56 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: "var(--ink)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <CallTimer />
        <span className="text-[10px]" style={{ color: "var(--muted-2)" }}>
          {remoteCount + 1}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 py-2">
        <button
          onClick={onExpand}
          className="brutal-btn brutal-btn-icon w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.15)", color: "var(--paper)" }}
          title="Expand"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onEndCall}
          className="brutal-btn brutal-btn-icon w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(239,68,68,1)", color: "white" }}
          title="End call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default memo(PictureInPicture);
