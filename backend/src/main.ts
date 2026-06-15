import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const cwd = process.cwd();
  const port = process.env.PORT ?? 3000;
  const dbHost = process.env.DB_HOST ?? 'not set';

  logger.log(`CWD (process.cwd): ${cwd}`);
  logger.log(`Script: ${__filename}`);
  logger.log(`PORT: ${port}`);
  logger.log(`DB_HOST: ${dbHost}`);

  const app = await NestFactory.create(AppModule);
  const configuredOrigins = (process.env.CORS_ORIGIN?.split(',') ?? [])
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (localhostPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: false,
  });

  app.use((req, _res, next) => {
    Logger.debug(`${req.method} ${req.originalUrl}`, 'HTTP');
    next();
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(port);
  logger.log(`Backend listening on port ${port}`);
}
bootstrap();
