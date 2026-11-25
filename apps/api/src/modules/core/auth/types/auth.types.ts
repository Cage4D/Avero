import type { UserRole } from '../../../../generated/prisma/enums.js';

export interface JwtPayload {
  email: string;
  sub: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
