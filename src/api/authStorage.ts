import type { AuthSession } from '../types/auth';

/** Событие браузера: обновление токена не восстановило авторизацию. */
export const authUnauthorizedEvent = 'corelia-web:auth-unauthorized';
export const authSessionChangedEvent = 'corelia-web:auth-session-changed';
let session: AuthSession | null = null;
/** Возвращает volatile сессию текущей вкладки; после перезагрузки она отсутствует. */
export const getStoredAuthSession = () => session;
/** Заменяет volatile сессию и уведомляет подписчиков, не записывая токен на диск. */
export const setStoredAuthSession = (value: AuthSession) => {
  session = value;
  window.dispatchEvent(new CustomEvent(authSessionChangedEvent, { detail: value }));
};
export const clearStoredAuthSession = () => {
  session = null;
  window.dispatchEvent(new Event(authSessionChangedEvent));
};
export const getStoredAccessToken = () => session?.accessToken;
