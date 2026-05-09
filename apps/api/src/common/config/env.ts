import { Logger } from '@nestjs/common';

const REQUIRED_PROD_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const RECOMMENDED_PROD_VARS = [
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'FRONTEND_URL',
  'CLOUDINARY_URL',
  'PAYSTACK_SECRET_KEY',
] as const;

export function validateEnv(logger = new Logger('EnvValidation')) {
  const isProd = process.env.NODE_ENV === 'production';

  const missingRequired = REQUIRED_PROD_VARS.filter((key) => !process.env[key]);

  if (missingRequired.length) {
    const message = `Missing required environment variables: ${missingRequired.join(', ')}`;
    if (isProd) {
      throw new Error(message);
    }
    logger.warn(`${message} (allowed in non-production)`);
  }

  const missingRecommended = RECOMMENDED_PROD_VARS.filter(
    (key) => !process.env[key],
  );
  if (missingRecommended.length) {
    logger.warn(
      `Missing recommended environment variables: ${missingRecommended.join(', ')}`,
    );
  }
}

export function requireSecret(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Environment variable ${name} is required in production`);
  }
  if (!fallback) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return fallback;
}
