import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '@common/interfaces/req';
import type { AuthUser } from './auth-user.type';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
        const request: RequestWithUser = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
