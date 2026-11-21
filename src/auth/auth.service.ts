import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { User } from '../generated/prisma/client.js';
import { UserAlreadyExistsError } from '../users/errors/user-already-exists.error.js';
import { UsersRepository } from '../users/users.repository.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  // Compared against when the email is unknown, so a login attempt takes
  // about the same time whether or not the account exists.
  private readonly dummyHash = bcrypt.hash('dummy-password-for-timing', BCRYPT_SALT_ROUNDS);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await this.usersRepository.create({ email: dto.email, passwordHash });
      return this.buildResponse(user);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email);

    const passwordValid = await bcrypt.compare(dto.password, user?.passwordHash ?? (await this.dummyHash));

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildResponse(user);
  }

  private async buildResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { accessToken };
  }
}
