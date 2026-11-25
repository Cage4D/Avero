import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '../../../../common/interfaces/req.js';
import type { AuthUser } from '../types/auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
