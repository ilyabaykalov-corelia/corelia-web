import type { AuthSession } from '../types/auth';

export const authUnauthorizedEvent = 'corelia-web:auth-unauthorized';
export const authSessionChangedEvent = 'corelia-web:auth-session-changed';
let session: AuthSession | null = null;
export const getStoredAuthSession = () => session;
export const setStoredAuthSession = (value: AuthSession) => {
  session = value;
  window.dispatchEvent(new CustomEvent(authSessionChangedEvent, { detail: value }));
};
export const clearStoredAuthSession = () => {
  session = null;
  window.dispatchEvent(new Event(authSessionChangedEvent));
};
export const getStoredAccessToken = () => session?.accessToken;
