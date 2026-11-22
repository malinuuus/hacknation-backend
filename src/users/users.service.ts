import { Injectable } from '@nestjs/common';
import type { User } from '../generated/prisma/client.js';
import { type CreateUserData, UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  /**
   * @throws {UserAlreadyExistsError} when the email is already taken.
   */
  create(data: CreateUserData): Promise<User> {
    return this.usersRepository.create(data);
  }
}
