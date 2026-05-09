import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('billing/paystack')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('initialize')
  initialize(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { plan: string },
  ) {
    return this.service.initialize(user, body.plan);
  }

  @Get('verify/:reference')
  verify(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reference') reference: string,
  ) {
    return this.service.verify(user, reference);
  }
}
