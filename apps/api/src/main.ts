import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './common/config/env';

const cookieParser = require('cookie-parser');

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
    .map((origin) => origin.trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, ''))
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...configured]));
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  validateEnv(logger);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(cookieParser());

  const allowedOrigins = parseAllowedOrigins();

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
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
