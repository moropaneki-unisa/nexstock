import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { requireSecret } from '../common/config/env';
import { PlanLimitsService } from './plan-limits.service';

@Injectable()
export class ApiKeyPlanLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    const auth = request.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) throw new UnauthorizedException('Authentication required');

    const payload = await this.jwt.verifyAsync(token, {
      secret: requireSecret('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    });

    if (!payload?.organizationId) throw new UnauthorizedException('Organization context required');

    await this.planLimits.assertCanCreateApiKey(payload.organizationId);
    next();
  }
}
