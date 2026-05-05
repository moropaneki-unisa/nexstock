import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendOtpEmail(email: string, otp: string) {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn(`OTP for ${email}: ${otp}`);
      return;
    }

    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@inventoryhub.app',
      to: email,
      subject: 'Verify your email',
      html: `<h2>Your OTP: ${otp}</h2><p>Expires in 10 minutes</p>`,
    });
  }
}
