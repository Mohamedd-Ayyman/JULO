import { useCallback, useRef, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext.jsx";
import { SOCKET_EVENTS } from "../lib/constants.js";
import { initiateCall, acceptCallApi, rejectCallApi, endCallApi } from "../apiCalls/call.js";
import {
  setOutgoingCall,
  setActiveCall,
  clearCall,
  setCallEnded,
  setCallDuration,
  setMuted,
  setVideoOff,
  setScreenSharing,
  selectCallStatus,
  selectCallId,
  selectCallType,
  selectIsMuted,
  selectIsVideoOff,
  selectIsScreenSharing,
} from "../redux/callSlice.js";
import useMediaStream from "./useMediaStream.js";
import useWebRTC from "./useWebRTC.js";

export default function useCall() {
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const callStatus = useSelector(selectCallStatus);
  const callIdRedux = useSelector(selectCallId);
  const callTypeRedux = useSelector(selectCallType);
  const isMutedRedux = useSelector(selectIsMuted);
  const isVideoOffRedux = useSelector(selectIsVideoOff);
  const isScreenSharingRedux = useSelector(selectIsScreenSharing);
  const { incomingCall, activeCall, callDuration } = useSelector((s) => s.callReducer);
  const { user } = useSelector((s) => s.userReducer);

  const [localStream, setLocalStream] = useState(null);

  const media = useMediaStream();
  const localStreamRefForWebRTC = useRef(null);
  const webrtc = useWebRTC(localStreamRefForWebRTC);

  const timerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const durationRef = useRef(0);
  const callIdRef = useRef(null);

  useEffect(() => {
    if (callStatus === "active") {
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        dispatch(setCallDuration(durationRef.current));
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus, dispatch]);

  const startRingtone = useCallback(() => {
    try {
      if (ringtoneRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playRing = () => {
        if (!ringtoneRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
        ringtoneRef.current._timeout = setTimeout(playRing, 1200);
      };
      ringtoneRef.current = { ctx, _timeout: null };
      playRing();
    } catch {
      // silent
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearTimeout(ringtoneRef.current._timeout);
      ringtoneRef.current.ctx?.close?.();
      ringtoneRef.current = null;
    }
  }, []);

  const initiate = useCallback(async (chatId, type = "audio") => {
    await webrtc.fetchIceConfig();

    const stream = await media.getLocalStream(type === "video");
    setLocalStream(stream);
    localStreamRefForWebRTC.current = stream;

    const res = await initiateCall(chatId, type);
    if (res.success && res.data) {
      callIdRef.current = res.data._id || res.data.callId;
      dispatch(setOutgoingCall(res.data));
      socket?.emit(SOCKET_EVENTS.CALL_INITIATE, { chatId, callType: type });
    }
    return res;
  }, [dispatch, socket, media, webrtc]);

  const accept = useCallback(async () => {
    if (!incomingCall) return;

    await webrtc.fetchIceConfig();

    const type = incomingCall.callType || "audio";
    const stream = await media.getLocalStream(type === "video");
    setLocalStream(stream);
    localStreamRefForWebRTC.current = stream;

    const res = await acceptCallApi(incomingCall.callId);
    if (res.success) {
      callIdRef.current = incomingCall.callId;
      socket?.emit(SOCKET_EVENTS.CALL_ACCEPT, { callId: incomingCall.callId });
      dispatch(setActiveCall(res.data || { callId: incomingCall.callId }));

      socket?.emit(SOCKET_EVENTS.CALL_JOIN, { callId: incomingCall.callId });
      socket?.emit(SOCKET_EVENTS.CALL_JOIN_SESSION, { callId: incomingCall.callId });
    }
    return res;
  }, [incomingCall, dispatch, socket, media, webrtc]);

  const reject = useCallback(async () => {
    if (!incomingCall) return;
    const res = await rejectCallApi(incomingCall.callId);
    if (res.success) {
      socket?.emit(SOCKET_EVENTS.CALL_REJECT, { callId: incomingCall.callId });
      dispatch(clearCall());
    }
    return res;
  }, [incomingCall, dispatch, socket]);

  const end = useCallback(async (reason = "normal") => {
    const cid = callIdRef.current || activeCall?._id || activeCall?.callId;
    if (!cid) return;

    webrtc.cleanupAll();
    media.cleanup();
    setLocalStream(null);

    socket?.emit(SOCKET_EVENTS.CALL_LEAVE_SESSION, { callId: cid });
    const res = await endCallApi(cid, reason);
    socket?.emit(SOCKET_EVENTS.CALL_END, { callId: cid, reason });
    dispatch(setCallEnded());
    callIdRef.current = null;
    setTimeout(() => dispatch(clearCall()), 2000);
    return res;
  }, [activeCall, dispatch, socket, media, webrtc]);

  const cancelOutgoing = useCallback(async () => {
    const cid = callIdRef.current || activeCall?._id || activeCall?.callId;
    webrtc.cleanupAll();
    media.cleanup();
    setLocalStream(null);

    if (!cid) {
      dispatch(clearCall());
      callIdRef.current = null;
      return;
    }
    socket?.emit(SOCKET_EVENTS.CALL_LEAVE_SESSION, { callId: cid });
    const res = await endCallApi(cid, "cancelled");
    socket?.emit(SOCKET_EVENTS.CALL_END, { callId: cid, reason: "cancelled" });
    dispatch(clearCall());
    callIdRef.current = null;
  }, [activeCall, dispatch, socket, media, webrtc]);

  const toggleMic = useCallback(() => {
    const newEnabled = media.toggleMicrophone();
    const cid = callIdRef.current;
    if (cid && socket) {
      socket.emit(SOCKET_EVENTS.CALL_MUTE_TOGGLE, {
        callId: cid,
        muted: !newEnabled,
      });
      socket.emit(SOCKET_EVENTS.CALL_MUTE, {
        callId: cid,
        isMuted: !newEnabled,
      });
    }
  }, [media, socket]);

  const toggleCamera = useCallback(async () => {
    const newVideoOff = await media.toggleCamera();
    const cid = callIdRef.current;
    if (cid && socket) {
      socket.emit(SOCKET_EVENTS.CALL_VIDEO_TOGGLE, {
        callId: cid,
        isVideoOff: newVideoOff,
      });
    }
  }, [media, socket]);

  const toggleScreenShare = useCallback(async () => {
    const cid = callIdRef.current;
    if (isScreenSharingRedux) {
      const cameraTrack = media.stopScreenShare();
      if (cameraTrack) webrtc.replaceTrackForAll(cameraTrack);
      if (cid && socket) {
        socket.emit(SOCKET_EVENTS.CALL_SCREEN_SHARE_TOGGLE, {
          callId: cid,
          isScreenSharing: false,
        });
      }
    } else {
      const screenTrack = await media.startScreenShare();
      if (screenTrack) webrtc.replaceTrackForAll(screenTrack);
      if (cid && socket) {
        socket.emit(SOCKET_EVENTS.CALL_SCREEN_SHARE_TOGGLE, {
          callId: cid,
          isScreenSharing: true,
        });
      }
    }
  }, [isScreenSharingRedux, media, webrtc, socket]);

  const flipCamera = useCallback(async () => {
    const newTrack = await media.flipCamera();
    if (newTrack) webrtc.replaceTrackForAll(newTrack);
  }, [media, webrtc]);

  useEffect(() => {
    if (callStatus === "ringing" && incomingCall) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callStatus, incomingCall, startRingtone, stopRingtone]);

  useEffect(() => {
    return () => {
      stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopRingtone]);

  const formatDuration = useCallback((secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    activeCall,
    incomingCall,
    callStatus,
    callType: callTypeRedux,
    isMuted: isMutedRedux,
    isVideoOff: isVideoOffRedux,
    isScreenSharing: isScreenSharingRedux,
    callDuration,
    localStream,
    formatDuration,
    initiate,
    accept,
    reject,
    end,
    cancelOutgoing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    flipCamera,
    media,
    webrtc,
  };
}
