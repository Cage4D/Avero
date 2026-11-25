import type { Request } from 'express';
import type { AuthUser } from '../../modules/core/auth/types/auth.types.js';

export interface RequestWithUser extends Request {
  user: AuthUser;
}
