import { axiosInstance } from "./index";

export const getLoggedUser = async () => {
  try {
    const response = await axiosInstance.get("/api/user/get-logged-in");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getAllUsers = async (page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/user/get-all-users?page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getUserById = async (userId) => {
  try {
    const response = await axiosInstance.get(`/api/user/${userId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const updateProfile = async (data) => {
  try {
    const response = await axiosInstance.put("/api/user/update-profile", data);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const uploadAvatar = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosInstance.post("/api/upload/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: "Upload failed" };
  }
};

export const searchUsers = async (q, page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/user/search?q=${encodeURIComponent(q)}&page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};
