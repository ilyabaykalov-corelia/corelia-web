import { apiClient } from './client';
import type { AuthSession, LoginRequest } from '../types/auth';

const apiRoot = '/api/core/v1';

export const authApi = {
  login: (payload: LoginRequest) => apiClient.post<AuthSession>(`${apiRoot}/auth/login`, payload),
  refresh: (refreshToken: string) => apiClient.post<AuthSession>(`${apiRoot}/auth/refresh`, { refreshToken }),
  logout: (refreshToken?: string) => apiClient.post<void>(`${apiRoot}/auth/logout`, { refreshToken }),
  me: () => apiClient.get<AuthSession['user']>(`${apiRoot}/auth/me`),
};
