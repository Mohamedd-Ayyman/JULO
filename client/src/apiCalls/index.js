import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 15000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/**
 * requestWithRetry — retries failed requests up to `retries` times with
 * exponential backoff (300ms, 600ms...). Use for critical operations like
 * post creation or message sending.
 */
export const requestWithRetry = async (fn, retries = 2) => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fn();
      if (res.data?.success !== undefined) return res.data;
      return res.data;
    } catch (error) {
      attempt++;
      if (attempt > retries) throw error;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
};