import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendOtpEmail(email: string, otp: string, expiryMinutes = 5) {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn(`RESEND_API_KEY missing. OTP for ${email}: ${otp}`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@nexstock.co.za',
        to: email,
        subject: 'Verify your Nexstock account',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f172a;color:#fff;border-radius:16px">
            <h1 style="margin:0 0 16px;font-size:28px">Verify your email</h1>
            <p style="color:#cbd5e1;font-size:16px;margin-bottom:24px">
              Use the OTP below to verify your Nexstock account.
            </p>
            <div style="background:#111827;border:1px solid #334155;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
              <div style="font-size:36px;font-weight:700;letter-spacing:8px">${otp}</div>
            </div>
            <p style="color:#94a3b8;font-size:14px">
              This code expires in ${expiryMinutes} minutes.
            </p>
          </div>
        `,
      });

      this.logger.log(`OTP email sent to ${email}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Failed to send OTP email to ${email}`);
      this.logger.error(error?.message || error);
      throw error;
    }
  }
}
