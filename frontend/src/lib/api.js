import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
  timeout: 150000, // 150 s – generous for long LLM calls
});

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Surface a human-readable message from the backend when available.
    if (response?.data?.detail) {
      error.message =
        typeof response.data.detail === "string"
          ? response.data.detail
          : JSON.stringify(response.data.detail);
    }

    // Automatic retry with exponential backoff for transient server/network errors.
    // Retry on 5xx responses and network failures (no response), but NOT on:
    //  – 4xx client errors (bad request, auth, not found, etc.)
    //  – already-retried requests
    const isRetryable =
      config &&
      !config._retried &&
      (!response || response.status >= 500);

    if (isRetryable) {
      config._retried = true;
      const delay = 1500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
