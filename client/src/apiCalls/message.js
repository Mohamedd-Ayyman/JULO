import { axiosInstance } from "./index";

export const createOrFindChat = async (otherUserId) => {
  try {
    const response = await axiosInstance.post("/api/chat/create-new-chat", { members: [otherUserId] });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getAllChats = async ({ search, type, archived, page, limit } = {}) => {
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (archived !== undefined) params.set("archived", String(archived));
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    const url = `/api/chat/get-all-user-chats${qs ? `?${qs}` : ""}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const sendMessage = async (chatId, text, receiverId = null) => {
  try {
    const response = await axiosInstance.post("/api/message/new-message", { chatId, text, receiverId });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getMessages = async (chatId, page = 1, limit = 30) => {
  try {
    const response = await axiosInstance.get(`/api/message/retrieve-chat/${chatId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const markMessagesRead = async (chatId) => {
  try {
    const response = await axiosInstance.put("/api/message/mark-read", { chatId });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const editMessage = async (messageId, text) => {
  try {
    const response = await axiosInstance.put(`/api/message/${messageId}`, { text });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const deleteMessage = async (messageId) => {
  try {
    const response = await axiosInstance.delete(`/api/message/${messageId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const addReaction = async (messageId, emoji) => {
  try {
    const response = await axiosInstance.put(`/api/message/${messageId}/react`, { emoji });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const uploadAudio = async (blob) => {
  try {
    const formData = new FormData();
    formData.append("audio", blob, `voice-${Date.now()}.webm`);
    const response = await axiosInstance.post("/api/upload/audio", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const raw = response.data;
    return {
      success: raw.success !== false,
      url: raw.url || raw.data?.url,
      duration: raw.duration || 0,
    };
  } catch (error) {
    return error.response?.data || { success: false, message: "Audio upload failed" };
  }
};

export const sendAudioMessage = async (chatId, audioUrl, audioDuration, receiverId = null) => {
  try {
    const response = await axiosInstance.post("/api/message/new-message", {
      chatId,
      text: "",
      audioUrl,
      audioDuration,
      receiverId,
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const uploadChatFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name || `chat-file-${Date.now()}`);
    const response = await axiosInstance.post("/api/upload/chat-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: "File upload failed" };
  }
};

export const sendImageMessage = async (chatId, imageUrl, text = "", receiverId = null, linkPreview = null) => {
  try {
    const response = await axiosInstance.post("/api/message/new-message", {
      chatId, text, imageUrl, receiverId, linkPreview,
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const sendFileMessage = async (chatId, fileUrl, fileName, fileSize, mimeType, text = "", receiverId = null) => {
  try {
    const response = await axiosInstance.post("/api/message/new-message", {
      chatId, text, fileUrl, fileName, fileSize, mimeType, receiverId,
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const fetchLinkPreview = async (url) => {
  try {
    const response = await axiosInstance.post("/api/link-preview", { url });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const sendReply = async (chatId, replyTo, text, receiverId = null) => {
  try {
    const response = await axiosInstance.post("/api/message/reply", {
      chatId, replyTo, text, receiverId,
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getThreadReplies = async (messageId, page = 1, limit = 50) => {
  try {
    const response = await axiosInstance.get(`/api/message/thread/${messageId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const muteChat = async (chatId) => {
  try {
    const response = await axiosInstance.put(`/api/chat/${chatId}/mute`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const unmuteChat = async (chatId) => {
  try {
    const response = await axiosInstance.put(`/api/chat/${chatId}/unmute`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};
