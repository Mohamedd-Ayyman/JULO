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

/**
 * UploadAvatar — returns standardised { success, url, message }.
 * Fast path: direct return of URL after Cloudinary upload.
 * The API already returns { success, url } — normalise here.
 */
export const uploadAvatar = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosInstance.post("/api/upload/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // Normalise: API may return { success, url } or { success, data: { url } }
    const raw = response.data;
    return {
      success: raw.success !== false,
      url: raw.url || raw.data?.url || raw.data,
      message: raw.message,
    };
  } catch (error) {
    return error.response?.data || { success: false, message: "Upload failed" };
  }
};

/**
 * UploadCover — returns standardised { success, url, message }.
 */
export const uploadCover = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosInstance.post("/api/upload/cover", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const raw = response.data;
    return {
      success: raw.success !== false,
      url: raw.url || raw.data?.url || raw.data,
      message: raw.message,
    };
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

// ── Settings / Account ────────────────────────────────────────────────

export const deactivateAccount = async () => {
  try {
    const response = await axiosInstance.post("/api/user/deactivate");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const deleteAccount = async (password) => {
  try {
    const response = await axiosInstance.delete("/api/user/account", {
      data: { password },
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getActiveSessions = async () => {
  try {
    const response = await axiosInstance.get("/api/auth/sessions");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const revokeSession = async (sessionId) => {
  try {
    const response = await axiosInstance.delete(`/api/auth/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const revokeOtherSessions = async () => {
  try {
    const response = await axiosInstance.post("/api/auth/sessions/revoke-others");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const updateNotificationPrefs = async (prefs) => {
  try {
    const response = await axiosInstance.put("/api/user/notifications", prefs);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const updatePrivacySettings = async (settings) => {
  try {
    const response = await axiosInstance.put("/api/user/privacy", settings);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

// ── Stories ────────────────────────────────────────────────────────────

export const uploadStoryMedia = async (file, onProgress) => {
  try {
    const formData = new FormData();
    formData.append("media", file);
    const response = await axiosInstance.post("/api/upload/story", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    const raw = response.data;
    return {
      success: raw.success !== false,
      url: raw.url || raw.data?.url || raw.data,
      mediaType: raw.mediaType || (file.type?.startsWith("video/") ? "video" : "image"),
      message: raw.message,
    };
  } catch (error) {
    return error.response?.data || { success: false, message: "Upload failed" };
  }
};

export const createStory = async (mediaUrl, mediaType = "image", caption = "") => {
  try {
    const response = await axiosInstance.post("/api/stories/create", { mediaUrl, mediaType, caption });
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getStories = async () => {
  try {
    const response = await axiosInstance.get("/api/stories");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getMyStories = async () => {
  try {
    const response = await axiosInstance.get("/api/stories/mine");
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const markStoryViewed = async (storyId) => {
  try {
    const response = await axiosInstance.post(`/api/stories/${storyId}/view`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const getStoryViewers = async (storyId) => {
  try {
    const response = await axiosInstance.get(`/api/stories/${storyId}/viewers`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};

export const deleteStory = async (storyId) => {
  try {
    const response = await axiosInstance.delete(`/api/stories/${storyId}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false };
  }
};
