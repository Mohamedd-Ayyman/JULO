import { axiosInstance } from "./index";

export const createPost = async (postData) => {
  try {
    const response = await axiosInstance.post("/api/post/create", postData);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const uploadPostImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosInstance.post("/api/upload/post-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: "Upload failed" };
  }
};

export const getFeed = async (page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/post/feed?page=${page}&limit=20`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getPost = async (postId) => {
  try {
    const response = await axiosInstance.get(`/api/post/${postId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const likePost = async (postId) => {
  try {
    const response = await axiosInstance.put(`/api/post/${postId}/like`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const sharePost = async (postId, text) => {
  try {
    const response = await axiosInstance.put(`/api/post/${postId}/share`, { text });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const unsharePost = async (postId) => {
  try {
    const response = await axiosInstance.delete(`/api/post/${postId}/share`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const deletePost = async (postId) => {
  try {
    const response = await axiosInstance.delete(`/api/post/${postId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getUserPosts = async (userId, page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/post/user/${userId}?page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const addComment = async (postId, text, parentComment = null) => {
  try {
    const response = await axiosInstance.post(`/api/post/${postId}/comment`, { text, parentComment });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const likeComment = async (commentId) => {
  try {
    const response = await axiosInstance.put(`/api/post/comment/${commentId}/like`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getComments = async (postId, page = 1, limit = 5) => {
  try {
    const response = await axiosInstance.get(`/api/post/${postId}/comments?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const searchPosts = async (query, page = 1) => {
  try {
    const response = await axiosInstance.get(`/api/post/search/query?q=${encodeURIComponent(query)}&page=${page}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const bookmarkPost = async (postId) => {
  try {
    const response = await axiosInstance.put(`/api/post/${postId}/bookmark`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getBookmarks = async () => {
  try {
    const response = await axiosInstance.get("/api/post/bookmarks");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};
