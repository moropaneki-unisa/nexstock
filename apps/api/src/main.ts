import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
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
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  const configured = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...configured]));
}

function isOriginAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.includes(normalizeOrigin(origin));
}

function applyCorsHeaders(response: Response, origin: string) {
  response.header('Access-Control-Allow-Origin', origin);
  response.header('Vary', 'Origin');
  response.header('Access-Control-Allow-Credentials', 'true');
  response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  response.header('Access-Control-Expose-Headers', 'Content-Disposition');
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  validateEnv(logger);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(cookieParser());

  const allowedOrigins = parseAllowedOrigins();

  app.use((request: Request, response: Response, next: NextFunction) => {
    const origin = request.headers.origin;

    if (origin && isOriginAllowed(origin, allowedOrigins)) {
      applyCorsHeaders(response, origin);
    } else if (origin) {
      logger.warn(`Blocked CORS origin: ${normalizeOrigin(origin)}`);
    }

    if (request.method === 'OPTIONS') {
      response.sendStatus(origin && isOriginAllowed(origin, allowedOrigins) ? 204 : 403);
      return;
    }

    next();
  });

  app.enableCors({
    origin(origin, callback) {
      if (!origin || isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
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
