import { useRef, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setMuted, setVideoOff, setScreenSharing } from "../redux/callSlice.js";

export default function useMediaStream() {
  const dispatch = useDispatch();
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const audioOnlyStreamRef = useRef(null);

  const getLocalStream = useCallback(async (videoEnabled = true) => {
    try {
      const constraints = {
        audio: true,
        video: videoEnabled
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      dispatch(setVideoOff(!videoEnabled));
      dispatch(setMuted(false));
      return stream;
    } catch (err) {
      console.error("[MediaStream] Failed to get local stream:", err);
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = audioOnly;
      dispatch(setVideoOff(true));
      dispatch(setMuted(false));
      return audioOnly;
    }
  }, [dispatch]);

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    const newEnabled = !videoTrack.enabled;
    videoTrack.enabled = newEnabled;
    dispatch(setVideoOff(!newEnabled));
    return newEnabled;
  }, [dispatch]);

  const toggleMicrophone = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    const newEnabled = !audioTrack.enabled;
    audioTrack.enabled = newEnabled;
    dispatch(setMuted(!newEnabled));
    return newEnabled;
  }, [dispatch]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      screenStreamRef.current = screenStream;

      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrack.onended = () => {
        stopScreenShare();
      };

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        audioOnlyStreamRef.current = localStreamRef.current;
      }

      dispatch(setScreenSharing(true));
      return screenTrack;
    } catch (err) {
      console.error("[MediaStream] Screen share failed:", err);
      dispatch(setScreenSharing(false));
      return null;
    }
  }, [dispatch]);

  const stopScreenShare = useCallback(() => {
    const screenStream = screenStreamRef.current;
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    dispatch(setScreenSharing(false));

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      cameraTrack.enabled = true;
      dispatch(setVideoOff(false));
    }
    return cameraTrack || null;
  }, [dispatch]);

  const flipCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const oldTrack = stream.getVideoTracks()[0];
    if (!oldTrack) return;

    const currentFacing = oldTrack.getSettings().facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: newFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];

      stream.removeTrack(oldTrack);
      oldTrack.stop();
      stream.addTrack(newTrack);

      return newTrack;
    } catch (err) {
      console.error("[MediaStream] Flip camera failed:", err);
      return null;
    }
  }, []);

  const getLocalStreamRef = useCallback(() => localStreamRef.current, []);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    screenStreamRef.current = null;
    audioOnlyStreamRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    getLocalStream,
    toggleCamera,
    toggleMicrophone,
    startScreenShare,
    stopScreenShare,
    flipCamera,
    getLocalStreamRef,
    localStreamRef,
    cleanup,
  };
}
