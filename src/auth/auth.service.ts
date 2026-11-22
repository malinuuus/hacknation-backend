import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { User } from '../generated/prisma/client.js';
import { UserAlreadyExistsError } from '../users/errors/user-already-exists.error.js';
import { UsersService } from '../users/users.service.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_SALT_ROUNDS = 12;

export interface IssuedSession {
  user: AuthUser;
  accessToken: string;
}

@Injectable()
export class AuthService {
  // Compared against when the email is unknown, so a login attempt takes
  // about the same time whether or not the account exists.
  private readonly dummyHash = bcrypt.hash('dummy-password-for-timing', BCRYPT_SALT_ROUNDS);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<IssuedSession> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await this.usersService.create({ email: dto.email, passwordHash });
      return this.issueSession(user);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<IssuedSession> {
    const user = await this.usersService.findByEmail(dto.email);

    const passwordValid = await bcrypt.compare(dto.password, user?.passwordHash ?? (await this.dummyHash));

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSession(user);
  }

  private async issueSession(user: User): Promise<IssuedSession> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    return { user: { id: user.id, email: user.email }, accessToken };
  }
}
