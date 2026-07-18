import { axiosInstance } from "./index";

export const initiateCall = async (chatId, callType = "audio") => {
  try {
    const response = await axiosInstance.post("/api/calls", { chatId, callType });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const acceptCallApi = async (callId) => {
  try {
    const response = await axiosInstance.post(`/api/calls/${callId}/accept`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const rejectCallApi = async (callId) => {
  try {
    const response = await axiosInstance.post(`/api/calls/${callId}/reject`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const endCallApi = async (callId, reason = "normal") => {
  try {
    const response = await axiosInstance.post(`/api/calls/${callId}/end`, { reason });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getTurnConfig = async () => {
  try {
    const response = await axiosInstance.get("/api/calls/turn-config");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getActiveCall = async (chatId) => {
  try {
    const response = await axiosInstance.get(`/api/calls/active/${chatId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};
