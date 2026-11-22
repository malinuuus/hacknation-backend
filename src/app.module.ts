import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CasesModule } from './cases/cases.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { validate } from './config/environment/environment-variables.validation.js';
import { KnowledgeModule } from './knowledge/knowledge.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CasesModule,
    DepartmentsModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
