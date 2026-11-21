import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../auth-user.js';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard.js';

/** The user set by `JwtAuthGuard`; only use on guarded routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
