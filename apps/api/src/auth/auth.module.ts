import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EmailModule } from '../email/email.module';
import { ThrottleGuard } from '../common/guards/throttle.guard';

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
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, ThrottleGuard],
  exports: [AuthService, JwtAuthGuard, ThrottleGuard, JwtModule],
})
export class AuthModule {}
