import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('lemon-squeezy/initialize')
  @UseGuards(JwtAuthGuard)
  initializeLemonSqueezy(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { plan: string },
  ) {
    return this.service.initialize(user, body.plan);
  }

  @Get('lemon-squeezy/verify/:reference')
  @UseGuards(JwtAuthGuard)
  verifyLemonSqueezy(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reference') reference: string,
  ) {
    return this.service.verify(user, reference);
  }

  @Post('lemon-squeezy/webhook')
  handleLemonSqueezyWebhook(
    @Req() request: RawBodyRequest,
    @Body() body: unknown,
    @Headers('x-signature') signature: string | undefined,
  ) {
    this.service.verifyLemonSignature(request.rawBody, signature);
    return this.service.handleWebhook(body as any);
  }

  @Post('paddle/initialize')
  @UseGuards(JwtAuthGuard)
  initializePaddle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { plan: string },
  ) {
    return this.service.initialize(user, body.plan);
  }

  @Get('paddle/verify/:reference')
  @UseGuards(JwtAuthGuard)
  verifyPaddle(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reference') reference: string,
  ) {
    return this.service.verify(user, reference);
  }

  @Post('paystack/initialize')
  @UseGuards(JwtAuthGuard)
  initializeLegacy(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { plan: string },
  ) {
    return this.service.initialize(user, body.plan);
  }

  @Get('paystack/verify/:reference')
  @UseGuards(JwtAuthGuard)
  verifyLegacy(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reference') reference: string,
  ) {
    return this.service.verify(user, reference);
  }
}
