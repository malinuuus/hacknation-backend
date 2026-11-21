import type { Request } from 'express';
import type { AuthUser } from './auth-user.interface.js';

/** A request that passed `JwtAuthGuard`. */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
