import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './common/config/env';

const cookieParser = require('cookie-parser');

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, '');
}

function parseAllowedOrigins() {
  const defaults = [
    'https://nexstock.co.za',
    'https://www.nexstock.co.za',
    'https://product-hub-web.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  const configured = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...configured]));
}

function isAllowedVercelPreview(origin: string) {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'https:') return false;

    const allowedProjects = ['product-hub-web', 'nexstock'];
    return allowedProjects.some(
      (project) =>
        hostname === `${project}.vercel.app` ||
        (hostname.startsWith(`${project}-`) && hostname.endsWith('.vercel.app')),
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  validateEnv(logger);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(cookieParser());

  const allowedOrigins = parseAllowedOrigins();

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.includes(normalizedOrigin) || isAllowedVercelPreview(normalizedOrigin);

      if (!isAllowed) {
        logger.warn(`Blocked CORS origin: ${normalizedOrigin}`);
      }

      callback(null, isAllowed);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  logger.log(`NexStock API listening on port ${port}`);
  logger.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
}

bootstrap();
