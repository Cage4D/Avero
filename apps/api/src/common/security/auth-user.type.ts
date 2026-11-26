import { UserRole } from 'generated/prisma/enums';

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
