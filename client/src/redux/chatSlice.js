import { createSlice, createSelector } from "@reduxjs/toolkit";

const loadMutedChats = () => {
  try {
    return JSON.parse(localStorage.getItem("mutedChats") || "[]");
  } catch {
    return [];
  }
};

const persistMutedChats = (ids) => {
  localStorage.setItem("mutedChats", JSON.stringify(ids));
};

const chatSlice = createSlice({
  name: "chat",
  initialState: { chats: [], activeChat: null, mutedChats: loadMutedChats() },
  reducers: {
    setChats: (state, action) => { state.chats = action.payload; },
    setActiveChat: (state, action) => { state.activeChat = action.payload; },
    toggleMuteChat: (state, action) => {
      const chatId = action.payload;
      const idx = state.mutedChats.indexOf(chatId);
      if (idx === -1) {
        state.mutedChats.push(chatId);
      } else {
        state.mutedChats.splice(idx, 1);
      }
      persistMutedChats(state.mutedChats);
    },
    addMessage: (state, action) => {
      const msg = action.payload;
      if (msg._replace && state.activeChat?._id === msg.chatId) {
        const idx = state.activeChat.messages.findIndex((m) => m._id === msg._replace);
        if (idx !== -1) {
          state.activeChat.messages[idx] = { ...state.activeChat.messages[idx], ...msg, _replace: undefined };
          return;
        }
      }
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
    markMessageFailed: (state, action) => {
      const messageId = action.payload;
      if (!state.activeChat?.messages) return;
      const msg = state.activeChat.messages.find((m) => m._id === messageId);
      if (msg) msg.failed = true;
    },
    markMessageSuccess: (state, action) => {
      const { tempId, realMessage } = action.payload;
      if (!state.activeChat?.messages) return;
      const idx = state.activeChat.messages.findIndex((m) => m._id === tempId);
      if (idx !== -1) {
        state.activeChat.messages[idx] = { ...realMessage, failed: false };
      }
    },
    removeMessage: (state, action) => {
      const messageId = action.payload;
      if (!state.activeChat?.messages) return;
      state.activeChat.messages = state.activeChat.messages.filter((m) => m._id !== messageId);
    },
    prependMessages: (state, action) => {
      const { chatId, messages } = action.payload;
      if (state.activeChat?._id === chatId) {
        state.activeChat.messages = [...messages, ...(state.activeChat.messages || [])];
      }
    },
  },
});

export const {
  setChats,
  setActiveChat,
  toggleMuteChat,
  addMessage,
  updateLastMessage,
  markMessageFailed,
  markMessageSuccess,
  removeMessage,
  prependMessages,
} = chatSlice.actions;

const selectChatState = (s) => s.chatReducer;

export const selectMutedChats = createSelector(
  [selectChatState],
  (chat) => chat.mutedChats
);

export const selectTotalUnreadMessages = createSelector(
  [selectChatState],
  (chat) => chat.chats.reduce((sum, c) => sum + (c.unreadMessageCount || 0), 0)
);

export default chatSlice.reducer;
