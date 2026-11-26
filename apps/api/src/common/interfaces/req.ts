import type { Request } from 'express';
import type { AuthUser } from '@common/security';

export interface RequestWithUser extends Request {
    user: AuthUser;
}
