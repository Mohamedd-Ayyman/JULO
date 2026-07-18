import { useState, useRef, useCallback, useEffect } from "react";

export default function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeTypeRef = useRef("audio/webm");
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const blobRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [stopTimer]);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    blobRef.current = null;
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        blobRef.current = blob;
        setAudioBlob(blob);
        cleanup();
      };

      recorder.onerror = () => {
        setError("Recording failed");
        cleanup();
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Microphone permission denied");
      } else {
        setError("Could not access microphone");
      }
    }
  }, [cleanup]);

  // Stop recording and (optionally) hand the finalized blob back via onComplete.
  // The blob is only available after MediaRecorder's `onstop` fires, so we
  // finalize here and invoke onComplete with it instead of relying on async state.
  const stopRecording = useCallback((onComplete) => {
    setIsRecording(false);
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // triggers recorder.onstop → sets blobRef + audioBlob
    }
    if (onComplete) {
      // Defer so the synchronous onstop handler can run first.
      setTimeout(() => onComplete(blobRef.current), 0);
    }
  }, [stopTimer]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    blobRef.current = null;
    cleanup();
    setIsRecording(false);
    setAudioBlob(null);
    setDuration(0);
  }, [cleanup]);

  const resetBlob = useCallback(() => {
    blobRef.current = null;
    setAudioBlob(null);
    setDuration(0);
  }, []);

  return {
    isRecording,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    resetBlob,
  };
}
