import { axiosInstance } from "./index";

// Create or find an existing 1-on-1 chat with another user
export const createOrFindChat = async (otherUserId) => {
  try {
    const response = await axiosInstance.post("/api/chat/create-new-chat", {
      members: [otherUserId],
    });
    return response.data;
  } catch (error) {
    // If chat already exists, the backend may throw — try finding it instead
    return error.response?.data || { success: false, message: error.message };
  }
};

// Get all chats for the current user
export const getAllChats = async () => {
  try {
    const response = await axiosInstance.get("/api/chat/get-all-user-chats");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: error.message };
  }
};