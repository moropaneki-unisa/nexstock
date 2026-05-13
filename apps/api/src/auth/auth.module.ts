import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccountRecoveryController } from './account-recovery.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ThrottleGuard } from './throttle.guard';
import { EmailModule } from '../email/email.module';

@Global()
@Module({
  imports: [
    EmailModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController, AccountRecoveryController],
  providers: [AuthService, JwtAuthGuard, ThrottleGuard],
  exports: [AuthService, JwtAuthGuard, ThrottleGuard, JwtModule],
})
export class AuthModule {}
