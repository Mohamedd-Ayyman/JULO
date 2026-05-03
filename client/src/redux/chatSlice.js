import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: { chats: [], activeChat: null },
  reducers: {
    setChats: (state, action) => { state.chats = action.payload; },
    setActiveChat: (state, action) => { state.activeChat = action.payload; },
    addMessage: (state, action) => {
      if (state.activeChat?._id === action.payload.chatId) {
        state.activeChat.messages = [...(state.activeChat.messages || []), action.payload];
      }
    },
  },
});

export const { setChats, setActiveChat, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
