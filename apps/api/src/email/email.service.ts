import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend = new Resend(process.env.RESEND_API_KEY);

  private fromAddress() {
    return process.env.EMAIL_FROM || 'onboarding@nexstock.co.za';
  }

  private async sendEmail(payload: { to: string; subject: string; html: string }) {
    if (!process.env.RESEND_API_KEY) {
      const isProd = process.env.NODE_ENV === 'production';
      const message = `RESEND_API_KEY missing. Cannot send email to ${payload.to}. Subject: ${payload.subject}`;
      if (isProd) this.logger.error(message);
      else this.logger.warn(message);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromAddress(),
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      this.logger.log(`Email sent to ${payload.to}: ${payload.subject}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${payload.to}: ${payload.subject}`);
      this.logger.error(error?.message || error);
      throw error;
    }
  }

  async sendOtpEmail(email: string, otp: string, expiryMinutes = 5) {
    if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
      this.logger.warn(`RESEND_API_KEY missing (dev fallback). OTP for ${email}: ${otp}`);
    }

    return this.sendEmail({
      to: email,
      subject: 'Verify your NexStock account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f172a;color:#fff;border-radius:16px">
          <h1 style="margin:0 0 16px;font-size:28px">Verify your email</h1>
          <p style="color:#cbd5e1;font-size:16px;margin-bottom:24px">
            Use the OTP below to verify your NexStock account.
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
  }

  async sendOrganizationInviteEmail(params: {
    email: string;
    organizationName: string;
    inviterEmail: string;
    role: string;
    inviteUrl: string;
    expiresInDays: number;
  }) {
    return this.sendEmail({
      to: params.email,
      subject: `You're invited to join ${params.organizationName} on NexStock`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px;background:#071326;color:#fff;border-radius:18px">
          <div style="margin-bottom:24px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#67e8f9">NexStock invitation</div>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.2">Join ${params.organizationName}</h1>
          <p style="color:#cbd5e1;font-size:16px;line-height:1.7;margin:0 0 24px">
            ${params.inviterEmail} invited you to join <strong>${params.organizationName}</strong> as a <strong>${params.role}</strong>.
          </p>
          <p style="color:#cbd5e1;font-size:16px;line-height:1.7;margin:0 0 24px">
            Accept the invite, create your password, and you will be added to the organization workspace.
          </p>
          <div style="margin:32px 0">
            <a href="${params.inviteUrl}" style="display:inline-block;background:linear-gradient(90deg,#6d5dfc,#2f7cff,#25e0be);color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px">
              Accept invite
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6">
            This invitation expires in ${params.expiresInDays} days. If the button does not work, copy and paste this link into your browser:<br />
            <span style="word-break:break-all;color:#cbd5e1">${params.inviteUrl}</span>
          </p>
        </div>
      `,
    });
  }

  async sendOrganizationAddedEmail(params: {
    email: string;
    organizationName: string;
    inviterEmail: string;
    loginUrl: string;
  }) {
    return this.sendEmail({
      to: params.email,
      subject: `You've been added to ${params.organizationName} on NexStock`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px;background:#071326;color:#fff;border-radius:18px">
          <div style="margin-bottom:24px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#67e8f9">NexStock access</div>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.2">You now have access to ${params.organizationName}</h1>
          <p style="color:#cbd5e1;font-size:16px;line-height:1.7;margin:0 0 24px">
            ${params.inviterEmail} added you to <strong>${params.organizationName}</strong>. Sign in with your existing NexStock account to access the workspace.
          </p>
          <div style="margin:32px 0">
            <a href="${params.loginUrl}" style="display:inline-block;background:linear-gradient(90deg,#6d5dfc,#2f7cff,#25e0be);color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px">
              Sign in
            </a>
          </div>
        </div>
      `,
    });
  }
}
