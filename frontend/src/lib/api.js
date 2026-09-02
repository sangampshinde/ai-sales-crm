import axios from "axios";

export const TOKEN_KEY = "sales_crm_token";

let rawBase = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").trim().replace(/\/+$/, "");
if (!rawBase.endsWith("/api")) {
  rawBase = `${rawBase}/api`;
}
const baseURL = rawBase;

const api = axios.create({ baseURL });

// Attach the JWT to every request if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise responses & errors so callers get clean data / messages.
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message || error.message || "Something went wrong";

    // Auto-logout on an expired/invalid token (but not on the login screen).
    if (status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem(TOKEN_KEY);
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
