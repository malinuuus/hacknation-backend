import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';
import { NodeEnv } from './environment.enum.js';

export class EnvironmentVariables {
  @IsString()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must be a PostgreSQL connection string' })
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  @Matches(/^\d+(ms|s|m|h|d|w|y)?$/, {
    message: 'JWT_EXPIRES_IN must be a number of seconds or a duration such as "15m", "12h" or "7d"',
  })
  JWT_EXPIRES_IN: string;

  /** Prefix of generated case numbers, e.g. BKS.IV.1431 → BKS.IV.1431.590.2026. */
  @IsString()
  @Matches(/^[A-Za-z0-9.\-/]+$/, { message: 'CASE_NUMBER_PREFIX may only contain letters, digits, ".", "-" and "/"' })
  CASE_NUMBER_PREFIX: string = 'BKS.IV.1431';
}

export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};
