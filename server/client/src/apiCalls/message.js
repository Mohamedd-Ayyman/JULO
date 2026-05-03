import { axiosInstance } from "./index";

// Send a new message in a chat
export const sendMessage = async (chatId, text) => {
  try {
    const response = await axiosInstance.post("/api/message/new-message", {
      chatId,
      text,
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: error.message };
  }
};

// Fetch all messages for a given chat, sorted chronologically
export const getMessages = async (chatId) => {
  try {
    const response = await axiosInstance.get(`/api/message/retrieve-chat/${chatId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: error.message };
  }
};

// Mark all messages in a chat as read
export const markMessagesRead = async (chatId) => {
  try {
    const response = await axiosInstance.put("/api/message/mark-read", { chatId });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: error.message };
  }
};