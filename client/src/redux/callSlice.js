import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  callStatus: "idle",
  callId: null,
  chatId: null,
  callType: "audio",
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  isMinimized: false,
  participants: [],
  remoteStreams: {},
  incomingCall: null,
  activeCall: null,
  error: null,
  callStartTime: null,
  callDuration: 0,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    initiateCall(state, action) {
      const { callId, chatId, callType } = action.payload;
      state.callStatus = "outgoing";
      state.callId = callId;
      state.chatId = chatId;
      state.callType = callType || "audio";
      state.isMuted = false;
      state.isVideoOff = false;
      state.isScreenSharing = false;
      state.isMinimized = false;
      state.participants = [];
      state.remoteStreams = {};
      state.error = null;
      state.callStartTime = null;
      state.callDuration = 0;
      state.activeCall = action.payload;
    },

    setIncomingCall(state, action) {
      state.incomingCall = action.payload;
      state.callStatus = "ringing";
      state.callId = action.payload?.callId || state.callId;
      state.chatId = action.payload?.chatId || state.chatId;
      state.callType = action.payload?.callType || state.callType;
    },

    clearIncomingCall(state) {
      state.incomingCall = null;
    },

    acceptIncomingCall(state) {
      const inc = state.incomingCall;
      if (!inc) return;
      state.callStatus = "ringing";
      state.callId = inc.callId;
      state.chatId = inc.chatId;
      state.callType = inc.callType || "audio";
      state.isMuted = false;
      state.isVideoOff = false;
      state.isScreenSharing = false;
      state.isMinimized = false;
      state.participants = [];
      state.remoteStreams = {};
      state.incomingCall = null;
      state.error = null;
      state.callStartTime = null;
      state.callDuration = 0;
    },

    setActiveCall(state, action) {
      const payload = action.payload || {};
      state.callStatus = "active";
      state.callId = payload.callId || payload._id || state.callId;
      state.chatId = payload.chatId || state.chatId;
      state.callType = payload.callType || state.callType;
      state.callStartTime = payload.startedAt || payload.callStartTime || Date.now();
      state.callDuration = 0;
      state.activeCall = payload;
      if (payload.participants) state.participants = payload.participants;
    },

    rejectIncomingCall(state) {
      state.incomingCall = null;
    },

    endCall(state, action) {
      state.callStatus = "ended";
      state.callStartTime = null;
      if (action?.payload) {
        state.callId = action.payload.callId || state.callId;
      }
    },

    reset(state) {
      Object.assign(state, initialState);
    },

    setOutgoingCall(state, action) {
      const data = action.payload;
      state.callStatus = "outgoing";
      state.callId = data?._id || data?.callId || null;
      state.chatId = data?.chatId || null;
      state.callType = data?.callType || "audio";
      state.activeCall = data;
      state.isMuted = false;
      state.isVideoOff = false;
      state.isScreenSharing = false;
      state.isMinimized = false;
      state.participants = data?.participants || [];
      state.remoteStreams = {};
      state.error = null;
      state.callStartTime = null;
      state.callDuration = 0;
    },

    setCallEnded(state) {
      state.callStatus = "ended";
      state.callStartTime = null;
    },

    clearCall(state) {
      Object.assign(state, initialState);
    },

    setCallDuration(state, action) {
      state.callDuration = action.payload;
    },

    setCallStatus(state, action) {
      state.callStatus = action.payload;
    },

    addParticipant(state, action) {
      const participant = action.payload;
      const exists = state.participants.find((p) => p.userId === participant.userId);
      if (!exists) {
        state.participants.push(participant);
      }
    },

    removeParticipant(state, action) {
      const { userId } = action.payload;
      state.participants = state.participants.filter((p) => p.userId !== userId);
      delete state.remoteStreams[userId];
    },

    updateParticipantMedia(state, action) {
      const { userId, isMuted, isVideoOff, isScreenSharing } = action.payload;
      const p = state.participants.find((pt) => pt.userId === userId);
      if (p) {
        if (isMuted !== undefined) p.isMuted = isMuted;
        if (isVideoOff !== undefined) p.isVideoOff = isVideoOff;
        if (isScreenSharing !== undefined) p.isScreenSharing = isScreenSharing;
      }
    },

    setRemoteStream(state, action) {
      const { userId, stream } = action.payload;
      state.remoteStreams[userId] = stream;
    },

    removeRemoteStream(state, action) {
      const { userId } = action.payload;
      delete state.remoteStreams[userId];
    },

    setMuted(state, action) {
      state.isMuted = action.payload;
    },

    setVideoOff(state, action) {
      state.isVideoOff = action.payload;
    },

    setScreenSharing(state, action) {
      state.isScreenSharing = action.payload;
    },

    setMinimized(state, action) {
      state.isMinimized = action.payload;
    },

    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const {
  initiateCall,
  setIncomingCall,
  clearIncomingCall,
  acceptIncomingCall,
  setActiveCall,
  rejectIncomingCall,
  endCall,
  reset,
  setOutgoingCall,
  setCallEnded,
  clearCall,
  setCallDuration,
  setCallStatus,
  addParticipant,
  removeParticipant,
  updateParticipantMedia,
  setRemoteStream,
  removeRemoteStream,
  setMuted,
  setVideoOff,
  setScreenSharing,
  setMinimized,
  setError,
} = callSlice.actions;

export const selectCallStatus = (state) => state.callReducer.callStatus;
export const selectCallId = (state) => state.callReducer.callId;
export const selectChatId = (state) => state.callReducer.chatId;
export const selectCallType = (state) => state.callReducer.callType;
export const selectIsMuted = (state) => state.callReducer.isMuted;
export const selectIsVideoOff = (state) => state.callReducer.isVideoOff;
export const selectIsScreenSharing = (state) => state.callReducer.isScreenSharing;
export const selectIsMinimized = (state) => state.callReducer.isMinimized;
export const selectParticipants = (state) => state.callReducer.participants;
export const selectRemoteStreams = (state) => state.callReducer.remoteStreams;
export const selectIncomingCall = (state) => state.callReducer.incomingCall;
export const selectCallError = (state) => state.callReducer.error;
export const selectCallStartTime = (state) => state.callReducer.callStartTime;
export const selectCallDuration = (state) => state.callReducer.callDuration;
export const selectActiveCall = (state) => state.callReducer.activeCall;

export default callSlice.reducer;
