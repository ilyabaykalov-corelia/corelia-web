/** Представление пользователя, возвращаемое OIDC-клиентом и gateway без секретов токена. */
export interface AuthUser {
  id: string;
  login: string;
  fullName: string;
  email?: string;
}

/** Сессия только в памяти вкладки; её нельзя сериализовать в persistent browser storage. */
export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
  roles: string[];
  user: AuthUser;
}
