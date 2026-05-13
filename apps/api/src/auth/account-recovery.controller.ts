import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Throttle, ThrottleGuard } from './throttle.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto';

@Controller('auth')
@UseGuards(ThrottleGuard)
export class AccountRecoveryController {
  constructor(private readonly auth: AuthService) {}

  @Post('account-recovery')
  @Throttle(5, 60_000)
  async request(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('account-recovery/complete')
  @Throttle(10, 60_000)
  async complete(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
