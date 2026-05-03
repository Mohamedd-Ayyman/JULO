import { axiosInstance } from "./index";

export const getNotifications = async (page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/notification/all?page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const markAllRead = async () => {
  try {
    const response = await axiosInstance.put("/api/notification/read-all");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const markOneRead = async (notificationId) => {
  try {
    const response = await axiosInstance.put(`/api/notification/${notificationId}/read`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    const response = await axiosInstance.delete(`/api/notification/${notificationId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};