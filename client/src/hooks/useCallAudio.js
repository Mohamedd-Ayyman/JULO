import { useState, useRef, useCallback, useEffect } from "react";

export default function useCallAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const streamRef = useRef(null);

  const startAudio = useCallback(async () => {
    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("[CallAudio] Failed to get media:", err);
      setAudioError(err.message || "Microphone access denied");
      return null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setLocalStream(null);
    setIsMuted(false);
    setIsSpeakerOn(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    const newMuted = !isMuted;
    audioTracks.forEach((t) => { t.enabled = !newMuted; });
    setIsMuted(newMuted);
    return newMuted;
  }, [isMuted]);

  const toggleSpeaker = useCallback(async () => {
    const next = !isSpeakerOn;
    try {
      if (streamRef.current) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(streamRef.current);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
      }
      if (next && typeof HTMLMediaElement !== "undefined") {
        const audios = document.querySelectorAll("audio");
        audios.forEach((a) => {
          if (typeof a.setSinkId === "function") {
            a.setSinkId("default").catch(() => {});
          }
        });
      }
    } catch {
      // speaker toggle not supported — visual-only fallback
    }
    setIsSpeakerOn(next);
    return next;
  }, [isSpeakerOn]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    localStream,
    isMuted,
    isSpeakerOn,
    audioError,
    startAudio,
    stopAudio,
    toggleMute,
    toggleSpeaker,
  };
}
