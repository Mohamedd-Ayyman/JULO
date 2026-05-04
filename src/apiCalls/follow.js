import { axiosInstance } from "./index";

export const followUser = async (userId) => {
  try {
    const response = await axiosInstance.post(`/api/follow/follow/${userId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const unfollowUser = async (userId) => {
  try {
    const response = await axiosInstance.delete(`/api/follow/unfollow/${userId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getFollowStatus = async (userId) => {
  try {
    const response = await axiosInstance.get(`/api/follow/status/${userId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getFollowers = async (userId, page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/follow/followers/${userId}?page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getFollowing = async (userId, page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/follow/following/${userId}?page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getSuggestions = async (limit = 5) => {
  try {
    const response = await axiosInstance.get(`/api/follow/suggestions?limit=${limit}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};