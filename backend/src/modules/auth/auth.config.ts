import { ConfigService } from '@nestjs/config';

export function getJwtSecret(configService: ConfigService) {
  const secret = configService.get<string>('JWT_SECRET')?.trim();

  if (secret) {
    return secret;
  }

  if (configService.get<string>('NODE_ENV') === 'production') {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  return 'poskios-local-dev-secret-change-before-production';
}

export function getJwtExpiresIn(configService: ConfigService) {
  return configService.get<string>('JWT_EXPIRES_IN')?.trim() || '8h';
}
