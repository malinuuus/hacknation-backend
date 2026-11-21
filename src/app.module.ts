import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validate } from './config/environment/environment-variables.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate }), PrismaModule, UsersModule, AuthModule],
})
export class AppModule {}
