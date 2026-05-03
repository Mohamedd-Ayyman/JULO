import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chats: [],       // list of all conversations
    activeChat: null, // currently open chat
    messages: [],    // messages for the active chat
  },
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    addChat: (state, action) => {
      const exists = state.chats.find((c) => c._id === action.payload._id);
      if (!exists) state.chats.unshift(action.payload);
    },
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      // Avoid duplicates
      const exists = state.messages.find((m) => m._id === action.payload._id);
      if (!exists) state.messages.push(action.payload);
    },
    prependMessages: (state, action) => {
      // For loading older messages
      state.messages = [...action.payload, ...state.messages];
    },
    clearActiveChat: (state) => {
      state.activeChat = null;
      state.messages = [];
    },
  },
});

export const {
  setChats,
  addChat,
  setActiveChat,
  setMessages,
  addMessage,
  prependMessages,
  clearActiveChat,
} = chatSlice.actions;

export default chatSlice.reducer;
