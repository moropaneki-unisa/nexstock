import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './common/config/env';

const cookieParser = require('cookie-parser');
const express = require('express');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  validateEnv(logger);

  const app = await NestFactory.create(AppModule, { bufferLogs: false, bodyParser: false });

  app.use(cookieParser());
  app.use(express.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      if (req.originalUrl?.includes('/api/billing/paddle/webhook')) {
        req.rawBody = Buffer.from(buf);
      }
    },
  }));
  app.use(express.urlencoded({ extended: true }));

  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    'https://nexstock.co.za,https://www.nexstock.co.za,https://product-hub-web.vercel.app,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Paddle-Signature'],
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
}

bootstrap();
