import Keycloak from 'keycloak-js';
import type { AuthSession, AuthUser } from '../types/auth';
import { clearStoredAuthSession, setStoredAuthSession } from './authStorage';

const url = import.meta.env.VITE_KEYCLOAK_URL;
const realm = import.meta.env.VITE_KEYCLOAK_REALM;
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const fixture = import.meta.env.VITE_AUTH_FIXTURE === 'true';
if (!fixture && (!url || !realm || !clientId)) throw new Error('Не заданы параметры Keycloak browser client');
const keycloak = new Keycloak({ url: url || 'http://fixture.invalid', realm: realm || 'fixture', clientId: clientId || 'fixture' });
const fixtureSession: AuthSession = { accessToken: 'fixture.fake.signature', tokenType: 'Bearer', expiresIn: 3600, expiresAt: Date.now() + 3600000, roles: ['corelia-admin'], user: { id: 'fixture', login: 'fixture', fullName: 'Тестовый пользователь' } };
const user = (): AuthUser => {
  const token = keycloak.tokenParsed ?? {};
  const login = String(token.preferred_username ?? token.sub ?? '');
  return { id: String(token.sub ?? login), login, fullName: String(token.name ?? token.given_name ?? login), email: typeof token.email === 'string' ? token.email : undefined };
};
const roles = () => {
  const realmAccess = keycloak.tokenParsed?.realm_access;
  return Array.isArray(realmAccess?.roles) ? realmAccess.roles.filter((role): role is string => typeof role === 'string') : [];
};
const publish = (): AuthSession => {
  if (!keycloak.token) throw new Error('Keycloak не вернул access token');
  const token = keycloak.tokenParsed;
  const value: AuthSession = { accessToken: keycloak.token, tokenType: 'Bearer', expiresIn: token?.exp && token.iat ? token.exp - token.iat : 0, expiresAt: (token?.exp ?? 0) * 1000, roles: roles(), user: user() };
  setStoredAuthSession(value);
  return value;
};
/** Инициализирует SSO без немедленного redirect; возвращает `null` для гостя. */
export const initializeKeycloak = async () => {
  if (fixture) { setStoredAuthSession(fixtureSession); return fixtureSession; }
  return (await keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false })) ? publish() : null;
};
export const loginWithKeycloak = (redirectUri: string) => fixture ? Promise.resolve() : keycloak.login({ redirectUri });
/** Обновляет token при необходимости и очищает volatile session при неуспехе. */
export const refreshKeycloakToken = async () => {
  if (fixture) return fixtureSession;
  try { return (await keycloak.updateToken(30)) || keycloak.token ? publish() : null; }
  catch { clearStoredAuthSession(); return null; }
};
export const logoutFromKeycloak = async () => { clearStoredAuthSession(); if (!fixture) await keycloak.logout({ redirectUri: window.location.origin }); };
