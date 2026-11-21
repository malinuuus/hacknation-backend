import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string };
}

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so a login attempt takes
  // about the same time whether or not the account exists.
  private readonly dummyHash = argon2.hash('dummy-password-for-timing');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
        select: { id: true, email: true },
      });
      return this.buildResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordValid = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildResponse({ id: user.id, email: user.email });
  }

  private async buildResponse(user: {
    id: string;
    email: string;
  }): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, user };
  }
}
