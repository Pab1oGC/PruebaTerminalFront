import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL;

// Token en memoria — se pierde al recargar (se recupera vía /refresh en App.tsx)
let _accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { _accessToken = t; };
export const getAccessToken = () => _accessToken;

export function createTenantApi(tenantCode: string) {
  const api = axios.create({ baseURL: `${BASE}/api/t/${tenantCode}`, withCredentials: true });

  api.interceptors.request.use(config => {
    if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
    return config;
  });

  api.interceptors.response.use(
    res => res,
    async err => {
      if (err.response?.status === 401 && err.config && !err.config._retry) {
        err.config._retry = true;
        try {
          const { data } = await axios.post(
            `${BASE}/api/t/${tenantCode}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          setAccessToken(data.accessToken);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(err.config);
        } catch {
          setAccessToken(null);
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      }
      return Promise.reject(err);
    }
  );

  return api;
}
