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

const loadPinnedChats = () => {
  try {
    return JSON.parse(localStorage.getItem("pinnedChats") || "[]");
  } catch {
    return [];
  }
};

const persistPinnedChats = (ids) => {
  localStorage.setItem("pinnedChats", JSON.stringify(ids));
};

const chatSlice = createSlice({
  name: "chat",
  initialState: { chats: [], activeChat: null, mutedChats: loadMutedChats(), pinnedChats: loadPinnedChats() },
  reducers: {
    setChats: (state, action) => { state.chats = action.payload; },
    setActiveChat: (state, action) => { state.activeChat = action.payload; },
    setOnlineStatus: (state, action) => {
      const { userId, isOnline, lastSeen } = action.payload;
      state.chats.forEach((c) => {
        if (!c.members) return;
        for (let i = 0; i < c.members.length; i++) {
          const m = c.members[i];
          if (String(m._id || m) === String(userId)) {
            if (typeof m === "string") {
              c.members[i] = { _id: m, isOnline, lastSeen };
            } else {
              m.isOnline = isOnline;
              if (lastSeen !== undefined) m.lastSeen = lastSeen;
            }
          }
        }
        // Direct chats carry presence on `otherUser`, not on `members`.
        if (c.otherUser && String(c.otherUser._id) === String(userId)) {
          c.otherUser.isOnline = isOnline;
          if (lastSeen !== undefined) c.otherUser.lastSeen = lastSeen;
        }
      });
      if (state.activeChat?.members) {
        for (let i = 0; i < state.activeChat.members.length; i++) {
          const m = state.activeChat.members[i];
          if (String(m._id || m) === String(userId)) {
            if (typeof m === "string") {
              state.activeChat.members[i] = { _id: m, isOnline, lastSeen };
            } else {
              m.isOnline = isOnline;
              if (lastSeen !== undefined) m.lastSeen = lastSeen;
            }
          }
        }
      }
      if (state.activeChat?.otherUser && String(state.activeChat.otherUser._id) === String(userId)) {
        state.activeChat.otherUser.isOnline = isOnline;
        if (lastSeen !== undefined) state.activeChat.otherUser.lastSeen = lastSeen;
      }
    },
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
    togglePinChat: (state, action) => {
      const chatId = action.payload;
      const idx = state.pinnedChats.indexOf(chatId);
      if (idx === -1) {
        state.pinnedChats.push(chatId);
      } else {
        state.pinnedChats.splice(idx, 1);
      }
      persistPinnedChats(state.pinnedChats);
    },
    archiveChatInList: (state, action) => {
      const chatId = action.payload;
      state.chats = state.chats.filter((c) => c._id !== chatId);
      if (state.activeChat?._id === chatId) {
        state.activeChat = null;
      }
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
    updateMessageDelivery: (state, action) => {
      const { chatId, messageId, userId, deliveredAt } = action.payload;
      if (state.activeChat?._id !== chatId) return;
      const msg = state.activeChat.messages?.find((m) => m._id === messageId);
      if (!msg) return;
      if (!msg.deliveredTo) msg.deliveredTo = [];
      const already = msg.deliveredTo.some((d) => (d.userId?._id || d.userId) === userId);
      if (!already) {
        msg.deliveredTo.push({ userId, readAt: deliveredAt });
      }
      if (!msg.status || msg.status === "sent") {
        msg.status = "delivered";
      }
    },
    updateMessageReadBy: (state, action) => {
      const { chatId, messages: readMessages } = action.payload;
      if (state.activeChat?._id !== chatId) return;
      for (const { messageId, userId, readAt } of readMessages) {
        const msg = state.activeChat.messages?.find((m) => m._id === messageId);
        if (!msg) continue;
        if (!msg.readBy) msg.readBy = [];
        const already = msg.readBy.some((r) => (r.userId?._id || r.userId) === userId);
        if (!already) {
          msg.readBy.push({ userId, readAt });
        }
        msg.read = true;
        msg.status = "read";
      }
    },
    updateActiveChatInfo: (state, action) => {
      const { chatId, updates } = action.payload;
      if (state.activeChat?._id === chatId) {
        Object.assign(state.activeChat, updates);
      }
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        Object.assign(chat, updates);
      }
    },
    updateChatInList: (state, action) => {
      const { chatId, updates } = action.payload;
      const chat = state.chats.find((c) => c._id === chatId);
      if (chat) {
        Object.assign(chat, updates);
      }
    },
  },
});

export const {
  setChats,
  setActiveChat,
  setOnlineStatus,
  toggleMuteChat,
  togglePinChat,
  archiveChatInList,
  addMessage,
  updateLastMessage,
  markMessageFailed,
  markMessageSuccess,
  removeMessage,
  prependMessages,
  updateMessageDelivery,
  updateMessageReadBy,
  updateActiveChatInfo,
  updateChatInList,
} = chatSlice.actions;

const selectChatState = (s) => s.chatReducer;

export const selectMutedChats = createSelector(
  [selectChatState],
  (chat) => chat.mutedChats
);

export const selectPinnedChats = createSelector(
  [selectChatState],
  (chat) => chat.pinnedChats
);

export const selectTotalUnreadMessages = createSelector(
  [selectChatState],
  (chat) => chat.chats.reduce((sum, c) => sum + (c.unreadMessageCount || 0), 0)
);

export default chatSlice.reducer;
