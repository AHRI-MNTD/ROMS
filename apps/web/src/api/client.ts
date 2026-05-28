import axios, { type AxiosError } from "axios";

const API_URL = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth interceptor — inject bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("roms-access-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Try refresh
      const refreshToken = localStorage.getItem("roms-refresh-token");
      if (refreshToken) {
        try {
          const resp = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = resp.data as { accessToken: string };
          localStorage.setItem("roms-access-token", accessToken);
          // Retry original
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            return axios.request(error.config);
          }
        } catch {
          localStorage.removeItem("roms-access-token");
          localStorage.removeItem("roms-refresh-token");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
