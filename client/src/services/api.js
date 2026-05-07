import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// ── Request — attach token ────────────────────────────────
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response — handle 401 + auto-refresh ─────────────────
let refreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const { refreshToken, setAuth, logout } = useAuthStore.getState();

    // Retry once on any 401 (expired or otherwise), skip refresh/logout routes
    const isAuthRoute =
      original.url?.includes("/auth/refresh") ||
      original.url?.includes("/auth/logout");

    if (status === 401 && !original._retry && !isAuthRoute && refreshToken) {
      if (refreshing) {
        // Queue while refresh is in progress
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, config: original });
        });
      }

      original._retry = true;
      refreshing = true;

      try {
        const { data } = await axios.post("/api/auth/refresh", {
          refreshToken,
        });
        const newToken = data.token;

        // Update store
        setAuth({ ...useAuthStore.getState(), token: newToken });

        // Retry queued requests
        refreshQueue.forEach(({ resolve, config }) => {
          config.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(config));
        });
        refreshQueue = [];

        // Retry original
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed — log out
        logout();
        refreshQueue.forEach(({ reject }) => reject(error));
        refreshQueue = [];
        window.location.href = "/login";
      } finally {
        refreshing = false;
      }
    }

    // Show toast for server errors only (not auth)
    if (status >= 500) {
      toast.error("Server error — please try again");
    }

    return Promise.reject(error);
  },
);

// ── Typed API helpers ─────────────────────────────────────

export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  refresh: (refreshToken) => api.post("/auth/refresh", { refreshToken }),
  logout: (refreshToken) => api.post("/auth/logout", { refreshToken }),
  me: () => api.get("/auth/me"),
};

export const boardsAPI = {
  list: (teamId) => api.get("/boards", { params: { teamId } }),
  get: (id) => api.get(`/boards/${id}`),
  create: (data) => api.post("/boards", data),
  update: (id, data) => api.patch(`/boards/${id}`, data),
  stats: (id) => api.get(`/boards/${id}/stats`),
  activity: (id) => api.get(`/boards/${id}/activity`),
};

export const tasksAPI = {
  list: (params) => api.get("/tasks", { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  reorder: (updates) => api.patch("/tasks/reorder/bulk", { updates }),
  addComment: (id, content) => api.post(`/tasks/${id}/comments`, { content }),
};

export const aiAPI = {
  command: (command, boardId) => api.post("/ai/command", { command, boardId }),
  enrich: (taskId) => api.post(`/ai/enrich/${taskId}`),
  standup: (boardId, memberName, period) =>
    api.post("/ai/standup", { boardId, memberName, period }),
};

export const teamsAPI = {
  list: () => api.get("/teams"),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post("/teams", data),
  update: (id, data) => api.patch(`/teams/${id}`, data),
  invite: (id, data) => api.post(`/teams/${id}/invite`, data),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  removeMember: (teamId, userId) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
};

export const filesAPI = {
  upload: (taskId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.post(`/files/upload/${taskId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (taskId, filename) => api.delete(`/files/${taskId}/${filename}`),
};

export const usersAPI = {
  search: (q, teamId) => api.get("/users/search", { params: { q, teamId } }),
  updateMe: (data) => api.patch("/users/me", data),
};

export const activityAPI = {
  list: (params) => api.get("/activity", { params }),
};

export default api;
