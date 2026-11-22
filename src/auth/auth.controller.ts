import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ACCESS_TOKEN_COOKIE, AuthCookieService } from './auth-cookie.service.js';
import { AuthService, type IssuedSession } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password (sets the access token cookie)' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Logged in' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AuthResponseDto> {
    return this.startSession(await this.authService.login(dto), response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out (clears the access token cookie)' })
  @ApiNoContentResponse({ description: 'Logged out' })
  logout(@Res({ passthrough: true }) response: Response): void {
    this.authCookieService.clear(response);
  }

  @Get('me')
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'The signed-in user' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or expired session' })
  me(@CurrentUser() user: AuthUser): AuthResponseDto {
    return { id: user.id, email: user.email };
  }

  private startSession({ user, accessToken }: IssuedSession, response: Response): AuthResponseDto {
    this.authCookieService.set(response, accessToken);
    return user;
  }
}
