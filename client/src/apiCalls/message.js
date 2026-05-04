import { axiosInstance } from "./index";

export const createOrFindChat = async (otherUserId) => {
  try {
    const response = await axiosInstance.post("/api/chat/create-new-chat", { members: [otherUserId] });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getAllChats = async () => {
  try {
    const response = await axiosInstance.get("/api/chat/get-all-user-chats");
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

export const getMessages = async (chatId, page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/message/retrieve-chat/${chatId}?page=${page}`);
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
