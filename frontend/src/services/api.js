import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthBootstrap = requestUrl.endsWith('/auth/me');
    const isLogoutRequest = requestUrl.endsWith('/auth/logout');

    if (error.response?.status === 401 && !isAuthBootstrap && !isLogoutRequest) {
      window.dispatchEvent(new CustomEvent('deallens:session-expired'));
    }

    return Promise.reject(error);
  },
);

export function getApiError(error, fallback = 'Something went wrong.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;