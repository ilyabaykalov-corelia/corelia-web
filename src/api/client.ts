import type { AuthSession } from '../types/auth';
import {
  authSessionChangedEvent,
  authUnauthorizedEvent,
  clearStoredAuthSession,
  getStoredAccessToken,
  getStoredAuthSession,
  getStoredRefreshToken,
  setStoredAuthSession,
} from './authStorage';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const defaultBaseUrl = 'http://localhost:7170';
const apiBaseUrl = (configuredBaseUrl === undefined ? defaultBaseUrl : configuredBaseUrl).replace(/\/$/, '');

export const buildApiUrl = (path: string) => `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const authEndpoint = (path: string) => path.includes('/auth/login') || path.includes('/auth/refresh') || path.includes('/auth/logout');

const buildHeaders = (initHeaders?: HeadersInit) => {
  const headers = new Headers(initHeaders);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const accessToken = getStoredAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
};

const refreshSession = async () => {
  const currentSession = getStoredAuthSession();
  const refreshToken = getStoredRefreshToken();
  if (!currentSession || !refreshToken) return false;

  const response = await fetch(buildApiUrl('/api/v1/auth/refresh'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearStoredAuthSession();
    window.dispatchEvent(new Event(authUnauthorizedEvent));
    return false;
  }

  const refreshedSession = (await response.json()) as AuthSession;
  setStoredAuthSession({
    ...refreshedSession,
    user: refreshedSession.user ?? currentSession.user,
  });
  return true;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: buildHeaders(init?.headers),
  };

  let response = await fetch(buildApiUrl(path), requestInit);

  if (response.status === 401 && !authEndpoint(path) && await refreshSession()) {
    response = await fetch(buildApiUrl(path), {
      ...requestInit,
      headers: buildHeaders(init?.headers),
    });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Не удалось выполнить запрос' }));
    if (response.status === 401) {
      clearStoredAuthSession();
      window.dispatchEvent(new Event(authUnauthorizedEvent));
    }
    throw new ApiError(response.status, body.message ?? `Ошибка запроса: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};
