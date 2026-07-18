import { useSelector, useDispatch } from "react-redux";
import useCall from "../../../hooks/useCall.js";
import { selectCallStatus, selectIsMinimized, setMinimized } from "../../../redux/callSlice.js";
import ActiveCallScreen from "./ActiveCallScreen.jsx";
import PictureInPicture from "./PictureInPicture.jsx";

export default function CallOverlay() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.userReducer);
  const callStatus = useSelector(selectCallStatus);
  const isMinimized = useSelector(selectIsMinimized);

  const {
    callType,
    isMuted,
    isVideoOff,
    isScreenSharing,
    localStream,
    end,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    flipCamera,
  } = useCall();

  const handleMinimize = () => dispatch(setMinimized(true));
  const handleExpand = () => dispatch(setMinimized(false));

  if (callStatus !== "active") return null;

  return (
    <>
      {!isMinimized && (
        <ActiveCallScreen
          localStream={localStream}
          localUserId={user?._id}
          localUserName={user?.firstname ? `${user.firstname} ${user.lastname || ""}` : user?.username || "You"}
          localProfilePic={user?.profilepic}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          callType={callType}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreenShare}
          onFlipCamera={flipCamera}
          onEndCall={end}
          onMinimize={handleMinimize}
        />
      )}

      {isMinimized && (
        <PictureInPicture
          localUserId={user?._id}
          onExpand={handleExpand}
          onEndCall={end}
        />
      )}
    </>
  );
}
