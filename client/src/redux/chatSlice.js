import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: { chats: [], activeChat: null },
  reducers: {
    setChats: (state, action) => { state.chats = action.payload; },
    setActiveChat: (state, action) => { state.activeChat = action.payload; },
    addMessage: (state, action) => {
      const msg = action.payload;
      if (state.activeChat?._id === msg.chatId) {
        state.activeChat.messages = [...(state.activeChat.messages || []), msg];
      }
      const chat = state.chats.find((c) => c._id === msg.chatId);
      if (chat) {
        chat.lastMessage = msg;
        if (msg.sender?._id !== msg.sender && !msg.pending) {
          chat.unreadMessageCount = (chat.unreadMessageCount || 0) + 1;
        }
      }
    },
    updateLastMessage: (state, action) => {
      const { chatId, message } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        chat.lastMessage = message;
      }
    },
  },
});

export const { setChats, setActiveChat, addMessage, updateLastMessage } = chatSlice.actions;
export default chatSlice.reducer;
