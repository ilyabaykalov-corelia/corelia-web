import type { AuthSession } from '../types/auth';

const storageKey = 'corelia-web.auth.session';

export const authUnauthorizedEvent = 'corelia-web:auth-unauthorized';
export const authSessionChangedEvent = 'corelia-web:auth-session-changed';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJwt = (value: unknown): value is string =>
  typeof value === 'string' && value.split('.').length === 3;

const isDirectAuthSession = (value: unknown): value is AuthSession => {
  if (!isRecord(value)) return false;

  const { accessToken, refreshToken, tokenType, expiresAt, user } = value;
  return (
    isJwt(accessToken) &&
    (refreshToken === undefined || typeof refreshToken === 'string') &&
    typeof tokenType === 'string' &&
    typeof expiresAt === 'number' &&
    isRecord(user)
  );
};

export const getStoredAuthSession = (): AuthSession | null => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const session = JSON.parse(raw) as unknown;
    if (!isDirectAuthSession(session)) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

export const setStoredAuthSession = (session: AuthSession) => {
  if (!canUseStorage()) return;
  if (!isDirectAuthSession(session)) {
    window.localStorage.removeItem(storageKey);
    throw new Error('Keycloak не вернул корректную direct-сессию');
  }

  window.localStorage.setItem(storageKey, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(authSessionChangedEvent, { detail: session }));
};

export const clearStoredAuthSession = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(authSessionChangedEvent));
};

export const getStoredAccessToken = () => getStoredAuthSession()?.accessToken;
export const getStoredRefreshToken = () => getStoredAuthSession()?.refreshToken;
