import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

const THROTTLE_KEY = 'throttle:config';

export type ThrottleOptions = { windowMs: number; max: number };

export const Throttle = (max: number, windowMs: number) =>
  SetMetadata(THROTTLE_KEY, { max, windowMs });

type Bucket = { count: number; resetAt: number };

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly defaults: ThrottleOptions = { windowMs: 60_000, max: 30 };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<ThrottleOptions>(THROTTLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? this.defaults;

    const req = context.switchToHttp().getRequest<Request>();
    const handler = context.getClass().name + '.' + context.getHandler().name;
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${handler}:${ip}`;

    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      this.cleanup(now);
      return true;
    }

    if (bucket.count >= options.max) {
      throw new HttpException(
        'Too many requests. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private cleanup(now: number) {
    if (this.buckets.size < 5000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt < now) this.buckets.delete(key);
    }
  }
}
