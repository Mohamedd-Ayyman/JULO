import { useEffect, useRef, memo } from "react";
import { MicOff, Monitor, User } from "lucide-react";
import Avatar from "../../Avatar.jsx";

function ParticipantTile({ stream, userId, name, profilePic, isLocal, isMuted, isVideoOff, isScreenSharing, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream && !isVideoOff) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, isVideoOff]);

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showVideo = stream && !isVideoOff;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex items-center justify-center ${className}`}
      style={{ background: "var(--ink)", minHeight: 120 }}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={isLocal ? { transform: "scaleX(-1)" } : {}}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {profilePic ? (
            <Avatar src={profilePic} alt={name} size={64} />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: "var(--acid)", color: "var(--ink)" }}
            >
              {initials}
            </div>
          )}
          <span className="text-xs font-medium" style={{ color: "var(--paper)" }}>
            {name || "Unknown"}
          </span>
        </div>
      )}

      {isMuted && (
        <div className="absolute bottom-2 left-2 p-1.5 rounded-full bg-red-500/80">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      )}

      {isScreenSharing && (
        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-blue-500/80">
          <Monitor className="w-3 h-3 text-white" />
        </div>
      )}

      <div
        className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-medium max-w-[120px] truncate"
        style={{ background: "rgba(0,0,0,0.6)", color: "var(--paper)" }}
      >
        {isLocal ? "You" : name || "Unknown"}
      </div>
    </div>
  );
}

export default memo(ParticipantTile);
