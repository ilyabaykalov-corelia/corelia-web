import Keycloak from 'keycloak-js';
import type { AuthSession, AuthUser } from '../types/auth';
import { clearStoredAuthSession, setStoredAuthSession } from './authStorage';

const url = import.meta.env.VITE_KEYCLOAK_URL;
const realm = import.meta.env.VITE_KEYCLOAK_REALM;
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
if (!url || !realm || !clientId) throw new Error('Не заданы параметры Keycloak browser client');
const keycloak = new Keycloak({ url, realm, clientId });
const user = (): AuthUser => {
  const token = keycloak.tokenParsed ?? {};
  const login = String(token.preferred_username ?? token.sub ?? '');
  return { id: String(token.sub ?? login), login, fullName: String(token.name ?? token.given_name ?? login), email: typeof token.email === 'string' ? token.email : undefined };
};
const publish = (): AuthSession => {
  if (!keycloak.token) throw new Error('Keycloak не вернул access token');
  const token = keycloak.tokenParsed;
  const value: AuthSession = { accessToken: keycloak.token, tokenType: 'Bearer', expiresIn: token?.exp && token.iat ? token.exp - token.iat : 0, expiresAt: (token?.exp ?? 0) * 1000, user: user() };
  setStoredAuthSession(value);
  return value;
};
export const initializeKeycloak = async () => (await keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false })) ? publish() : null;
export const loginWithKeycloak = () => keycloak.login({ redirectUri: window.location.href });
export const refreshKeycloakToken = async () => {
  try { return (await keycloak.updateToken(30)) || keycloak.token ? publish() : null; }
  catch { clearStoredAuthSession(); return null; }
};
export const logoutFromKeycloak = async () => { clearStoredAuthSession(); await keycloak.logout({ redirectUri: window.location.origin }); };
