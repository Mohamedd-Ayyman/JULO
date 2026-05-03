import { axiosInstance } from "./index";

export const signup = async (user) => {
  try {
    const response = await axiosInstance.post("/api/auth/signup", user);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: "Something went wrong" };
  }
};

export const login = async (credentials) => {
  try {
    const response = await axiosInstance.post("/api/auth/login", credentials);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: "Something went wrong" };
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post("/api/auth/logout");
    return response.data;
  } catch (error) {
    return { success: false };
  }
};

export const changePassword = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/auth/change-password", payload);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: "Something went wrong" };
  }
};
