import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('billing/paystack')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  initialize(@Req() req: any, @Body() body: { plan: string }) {
    return this.service.initialize(req.user, body.plan);
  }

  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.service.verify(reference);
  }
}
