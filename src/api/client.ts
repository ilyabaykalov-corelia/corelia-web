import {
  authSessionChangedEvent,
  authUnauthorizedEvent,
  clearStoredAuthSession,
  getStoredAccessToken,
} from './authStorage';
import { refreshKeycloakToken } from './keycloak';

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

const buildHeaders = (initHeaders?: HeadersInit, body?: BodyInit | null) => {
  const headers = new Headers(initHeaders);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!(body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const accessToken = getStoredAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
};

const refreshSession = async () => {
  return Boolean(await refreshKeycloakToken());
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: buildHeaders(init?.headers, init?.body),
  };

  let response = await fetch(buildApiUrl(path), requestInit);

  if (response.status === 401 && await refreshSession()) {
    response = await fetch(buildApiUrl(path), {
      ...requestInit,
      headers: buildHeaders(init?.headers, init?.body),
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
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, {
      method: 'POST',
      body,
    }),
  putForm: <T>(path: string, body: FormData) =>
    request<T>(path, {
      method: 'PUT',
      body,
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};
