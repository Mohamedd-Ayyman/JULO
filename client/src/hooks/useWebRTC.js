import { useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext.jsx";
import { getTurnConfig } from "../apiCalls/call.js";
import {
  selectCallId,
  setRemoteStream,
  removeRemoteStream,
  addParticipant,
  removeParticipant,
  updateParticipantMedia,
} from "../redux/callSlice.js";
import { SOCKET_EVENTS } from "../lib/constants.js";

export default function useWebRTC(localStreamRef) {
  const dispatch = useDispatch();
  const socket = useSocket();
  const callId = useSelector(selectCallId);
  const peerConnectionsRef = useRef(new Map());
  const iceServersRef = useRef([]);
  const callIdRef = useRef(callId);
  callIdRef.current = callId;

  const fetchIceConfig = useCallback(async () => {
    try {
      const res = await getTurnConfig();
      if (res.success && res.data) {
        const cfg = res.data;
        iceServersRef.current = [
          ...(cfg.iceServers || []),
        ];
        return iceServersRef.current;
      }
    } catch (err) {
      console.error("[WebRTC] Failed to fetch TURN config:", err);
    }
    iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }];
    return iceServersRef.current;
  }, []);

  const createPeerConnection = useCallback(
    (targetUserId, isInitiator = false) => {
      if (peerConnectionsRef.current.has(targetUserId)) {
        const existing = peerConnectionsRef.current.get(targetUserId);
        if (existing.connectionState === "connected" || existing.connectionState === "connecting") {
          return existing;
        }
        existing.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current.length
          ? iceServersRef.current
          : [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const localStream = localStreamRef?.current;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && callIdRef.current) {
          socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
            callId: callIdRef.current,
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          dispatch(setRemoteStream({ userId: targetUserId, stream }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.warn(`[WebRTC] Connection ${pc.connectionState} with ${targetUserId}`);
        }
        if (pc.connectionState === "closed") {
          dispatch(removeRemoteStream({ userId: targetUserId }));
        }
      };

      peerConnectionsRef.current.set(targetUserId, pc);
      return pc;
    },
    [socket, dispatch, localStreamRef]
  );

  const createOffer = useCallback(
    async (targetUserId) => {
      const pc = createPeerConnection(targetUserId, true);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socket && callIdRef.current) {
          socket.emit(SOCKET_EVENTS.CALL_OFFER, {
            callId: callIdRef.current,
            targetUserId,
            offer: pc.localDescription.toJSON(),
          });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to create offer:", err);
      }
    },
    [socket, createPeerConnection]
  );

  const handleOffer = useCallback(
    async (senderId, offer) => {
      const pc = createPeerConnection(senderId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket && callIdRef.current) {
          socket.emit(SOCKET_EVENTS.CALL_ANSWER, {
            callId: callIdRef.current,
            targetUserId: senderId,
            answer: pc.localDescription.toJSON(),
          });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to handle offer:", err);
      }
    },
    [socket, createPeerConnection]
  );

  const handleAnswer = useCallback(
    async (senderId, answer) => {
      const pc = peerConnectionsRef.current.get(senderId);
      if (!pc) return;
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error("[WebRTC] Failed to handle answer:", err);
      }
    },
    []
  );

  const handleIceCandidate = useCallback(
    async (senderId, candidate) => {
      const pc = peerConnectionsRef.current.get(senderId);
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[WebRTC] Failed to add ICE candidate:", err);
      }
    },
    []
  );

  const replaceTrack = useCallback(
    (targetUserId, newTrack) => {
      const pc = peerConnectionsRef.current.get(targetUserId);
      if (!pc) return;
      const sender = pc.getSenders().find((s) => s.track?.kind === newTrack.kind);
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    },
    []
  );

  const renegotiate = useCallback(
    async (targetUserId) => {
      const pc = peerConnectionsRef.current.get(targetUserId);
      if (!pc) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socket && callIdRef.current) {
          socket.emit(SOCKET_EVENTS.CALL_RENEGOTIATE, {
            callId: callIdRef.current,
            targetUserId,
            offer: pc.localDescription.toJSON(),
          });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to renegotiate:", err);
      }
    },
    [socket]
  );

  const replaceTrackForAll = useCallback(
    (newTrack) => {
      peerConnectionsRef.current.forEach((_pc, targetUserId) => {
        replaceTrack(targetUserId, newTrack);
      });
    },
    [replaceTrack]
  );

  const cleanupPeer = useCallback(
    (targetUserId) => {
      const pc = peerConnectionsRef.current.get(targetUserId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(targetUserId);
      }
      dispatch(removeRemoteStream({ userId: targetUserId }));
    },
    [dispatch]
  );

  const cleanupAll = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOffer = ({ callId: cid, senderId, offer }) => {
      if (cid === callIdRef.current && offer) {
        handleOffer(senderId, offer);
      }
    };

    const onAnswer = ({ callId: cid, senderId, answer }) => {
      if (cid === callIdRef.current && answer) {
        handleAnswer(senderId, answer);
      }
    };

    const onIce = ({ callId: cid, senderId, candidate }) => {
      if (cid === callIdRef.current && candidate) {
        handleIceCandidate(senderId, candidate);
      }
    };

    const onRenegotiate = ({ callId: cid, senderId, offer }) => {
      if (cid === callIdRef.current && offer) {
        handleOffer(senderId, offer);
      }
    };

    const onParticipantJoined = ({ callId: cid, userId, participants: parts }) => {
      if (cid === callIdRef.current) {
        dispatch(addParticipant({ userId }));
        if (parts) {
          parts.forEach((p) => {
            const uid = typeof p.userId === "object" ? p.userId._id || p.userId.toString() : p.userId;
            dispatch(addParticipant({ userId: uid, ...p }));
          });
        }
      }
    };

    const onParticipantLeft = ({ callId: cid, userId }) => {
      if (cid === callIdRef.current) {
        cleanupPeer(userId);
        dispatch(removeParticipant({ userId }));
      }
    };

    const onMuteUpdated = ({ callId: cid, userId, muted }) => {
      if (cid === callIdRef.current) {
        dispatch(updateParticipantMedia({ userId, isMuted: muted }));
      }
    };

    const onVideoToggle = ({ callId: cid, userId, isVideoOff: off }) => {
      if (cid === callIdRef.current) {
        dispatch(updateParticipantMedia({ userId, isVideoOff: off }));
      }
    };

    const onScreenShareToggle = ({ callId: cid, userId, isScreenSharing: sharing }) => {
      if (cid === callIdRef.current) {
        dispatch(updateParticipantMedia({ userId, isScreenSharing: sharing }));
      }
    };

    socket.on(SOCKET_EVENTS.CALL_OFFER, onOffer);
    socket.on(SOCKET_EVENTS.CALL_ANSWER, onAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, onIce);
    socket.on(SOCKET_EVENTS.CALL_RENEGOTIATE, onRenegotiate);
    socket.on(SOCKET_EVENTS.CALL_PARTICIPANT_JOINED, onParticipantJoined);
    socket.on(SOCKET_EVENTS.CALL_PARTICIPANT_LEFT, onParticipantLeft);
    socket.on(SOCKET_EVENTS.CALL_MUTE_UPDATED, onMuteUpdated);
    socket.on(SOCKET_EVENTS.CALL_VIDEO_TOGGLE, onVideoToggle);
    socket.on(SOCKET_EVENTS.CALL_SCREEN_SHARE_TOGGLE, onScreenShareToggle);

    return () => {
      socket.off(SOCKET_EVENTS.CALL_OFFER, onOffer);
      socket.off(SOCKET_EVENTS.CALL_ANSWER, onAnswer);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, onIce);
      socket.off(SOCKET_EVENTS.CALL_RENEGOTIATE, onRenegotiate);
      socket.off(SOCKET_EVENTS.CALL_PARTICIPANT_JOINED, onParticipantJoined);
      socket.off(SOCKET_EVENTS.CALL_PARTICIPANT_LEFT, onParticipantLeft);
      socket.off(SOCKET_EVENTS.CALL_MUTE_UPDATED, onMuteUpdated);
      socket.off(SOCKET_EVENTS.CALL_VIDEO_TOGGLE, onVideoToggle);
      socket.off(SOCKET_EVENTS.CALL_SCREEN_SHARE_TOGGLE, onScreenShareToggle);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, cleanupPeer, dispatch]);

  return {
    fetchIceConfig,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    replaceTrack,
    replaceTrackForAll,
    renegotiate,
    cleanupPeer,
    cleanupAll,
    peerConnectionsRef,
  };
}
