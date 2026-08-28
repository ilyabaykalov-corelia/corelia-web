export interface AuthUser {
  id: string;
  login: string;
  fullName: string;
  email?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  scope?: string;
  expiresIn: number;
  refreshExpiresIn?: number;
  expiresAt: number;
  refreshExpiresAt?: number;
  user: AuthUser;
}

export interface LoginRequest {
  username: string;
  password: string;
}
