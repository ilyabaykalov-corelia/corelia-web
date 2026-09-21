export interface AuthUser {
  id: string;
  login: string;
  fullName: string;
  email?: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
  user: AuthUser;
}
