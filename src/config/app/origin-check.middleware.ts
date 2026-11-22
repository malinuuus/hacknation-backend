import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const originCheckMiddleware = (allowedOrigins: readonly string[]) => {
  const allowed = new Set(allowedOrigins);

  return (request: Request, response: Response, next: NextFunction) => {
    const origin = request.headers.origin;

    if (
      SAFE_METHODS.has(request.method) ||
      origin === undefined ||
      allowed.has(origin) ||
      isSameOrigin(origin, request)
    ) {
      next();
      return;
    }

    response.status(403).json({ statusCode: 403, message: 'Origin not allowed', error: 'Forbidden' });
  };
};

const isSameOrigin = (origin: string, request: Request): boolean => {
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
};
