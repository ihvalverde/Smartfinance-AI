import axios from 'axios';

const TOKEN_KEY = 'sf_access_token';
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken = localStorage.getItem(TOKEN_KEY) || null;

export function getStoredToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  else localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRoute = /\/auth\/(login|register|refresh|logout)/.test(original?.url || '');
    const hadToken = Boolean(accessToken);

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
            .then((response) => {
              const token = response.data?.data?.accessToken;
              setAccessToken(token);
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        if (hadToken) window.dispatchEvent(new Event('sf:logout'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
