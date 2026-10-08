import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  // A free backend can take a minute to wake after inactivity.
  timeout: import.meta.env.PROD ? 90000 : 15000,
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !['/auth/login', '/auth/signup'].includes(error.config?.url)
    ) {
      window.dispatchEvent(new Event('lockin:session-expired'));
    }
    return Promise.reject(error);
  },
);
