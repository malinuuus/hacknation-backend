import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';
import type { EnvironmentVariables } from '../config/environment/environment-variables.validation.js';
import { CookieSameSite, NodeEnv } from '../config/environment/environment.enum.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';

@Injectable()
export class AuthCookieService {
  private readonly baseOptions: CookieOptions;

  constructor(
    config: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const sameSite = config.getOrThrow<EnvironmentVariables['AUTH_COOKIE_SAME_SITE']>('AUTH_COOKIE_SAME_SITE');
    const nodeEnv = config.getOrThrow<EnvironmentVariables['NODE_ENV']>('NODE_ENV');

    this.baseOptions = {
      httpOnly: true,
      secure: nodeEnv === NodeEnv.Production || sameSite === CookieSameSite.None,
      sameSite,
      path: '/api',
    };
  }

  /** Stores the token in the cookie; the cookie expires together with the token. */
  set(response: Response, accessToken: string): void {
    const { exp } = this.jwtService.decode<JwtPayload & { exp: number }>(accessToken);
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...this.baseOptions, expires: new Date(exp * 1000) });
  }

  clear(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, this.baseOptions);
  }
}
