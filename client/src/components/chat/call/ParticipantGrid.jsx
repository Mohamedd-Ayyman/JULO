import { memo } from "react";
import { useSelector } from "react-redux";
import { selectParticipants, selectRemoteStreams, selectCallType } from "../../../redux/callSlice.js";
import ParticipantTile from "./ParticipantTile.jsx";

function ParticipantGrid({ localStream, localUserId, localUserName, localProfilePic, localIsMuted, localIsVideoOff }) {
  const participants = useSelector(selectParticipants);
  const remoteStreams = useSelector(selectRemoteStreams);
  const callType = useSelector(selectCallType);

  const activeParticipants = participants.filter(
    (p) => p.userId !== localUserId && !p.leftAt
  );

  const count = activeParticipants.length + 1;

  const gridCols =
    count === 1 ? "grid-cols-1" :
    count === 2 ? "grid-cols-2" :
    count <= 4 ? "grid-cols-2 grid-rows-2" :
    count <= 6 ? "grid-cols-3 grid-rows-2" :
    "grid-cols-3 grid-rows-3";

  return (
    <div className={`grid ${gridCols} gap-2 w-full h-full p-4`}>
      <ParticipantTile
        stream={localStream}
        userId={localUserId}
        name={`${localUserName} (You)`}
        profilePic={localProfilePic}
        isLocal={true}
        isMuted={localIsMuted}
        isVideoOff={callType === "audio" ? true : localIsVideoOff}
        isScreenSharing={false}
        className={count === 1 ? "col-span-full row-span-full" : ""}
      />

      {activeParticipants.map((p) => (
        <ParticipantTile
          key={p.userId}
          stream={remoteStreams[p.userId] || null}
          userId={p.userId}
          name={p.firstname ? `${p.firstname} ${p.lastname || ""}` : p.name || "Participant"}
          profilePic={p.profilepic || p.profilePic}
          isLocal={false}
          isMuted={p.isMuted}
          isVideoOff={p.isVideoOff}
          isScreenSharing={p.isScreenSharing}
          className={count <= 2 ? "" : ""}
        />
      ))}
    </div>
  );
}

export default memo(ParticipantGrid);
