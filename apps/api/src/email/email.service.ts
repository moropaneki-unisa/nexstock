import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private resendClient() {
    return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  private fromAddress() {
    const configured = process.env.EMAIL_FROM?.trim();
    if (!configured) return 'NexStock <info@nexstock.co.za>';
    return configured.includes('<') ? configured : `NexStock <${configured}>`;
  }

  private appUrl(path = '') {
    const base = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.nexstock.co.za';
    return `${base.replace(/\/$/, '')}${path}`;
  }

  private async sendEmail(payload: { to: string; subject: string; html: string; text: string }) {
    const resend = this.resendClient();

    if (!resend) {
      this.logger.error(`RESEND_API_KEY missing. Skipping email to ${payload.to}.`);
      return null;
    }

    try {
      const response = await resend.emails.send({
        from: this.fromAddress(),
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: process.env.EMAIL_REPLY_TO || 'support@nexstock.co.za',
      });

      if (response.error) {
        this.logger.error(`Email provider rejected message to ${payload.to}: ${payload.subject}`);
        this.logger.error(JSON.stringify(response.error));
        return null;
      }

      this.logger.log(`Email sent to ${payload.to}: ${payload.subject} (${response.data?.id ?? 'no-id'})`);
      return response.data;
    } catch (error) {
      this.logger.error(`Email send failed for ${payload.to}: ${payload.subject}`);
      this.logger.error(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async sendOtpEmail(email: string, otp: string, expiryMinutes = 5) {
    return this.sendEmail({
      to: email,
      subject: 'Your NexStock verification code',
      text: `Your NexStock verification code is ${otp}. It expires in ${expiryMinutes} minutes. If you did not request this, you can ignore this email.`,
      html: `<div><h1>Verify your NexStock account</h1><p>Use this code: <strong>${otp}</strong></p><p>This code expires in ${expiryMinutes} minutes.</p></div>`,
    });
  }

  async sendPasswordResetEmail(params: { email: string; resetUrl: string; expiresInMinutes: number }) {
    const resetUrl = params.resetUrl || this.appUrl('/forgot-password');
    return this.sendEmail({
      to: params.email,
      subject: 'Reset your NexStock password',
      text: `Reset your NexStock password here: ${resetUrl}. This link expires in ${params.expiresInMinutes} minutes. Ignore this email if you did not request it.`,
      html: `<div><h1>Reset your password</h1><p>Use this secure link to reset your NexStock password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in ${params.expiresInMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p><p>${resetUrl}</p></div>`,
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
    const fallbackUrl = this.appUrl('/login');
    const inviteUrl = params.inviteUrl || fallbackUrl;

    return this.sendEmail({
      to: params.email,
      subject: `Invitation to join ${params.organizationName} on NexStock`,
      text: `${params.inviterEmail} invited you to join ${params.organizationName} on NexStock as a ${params.role}. Accept your invitation here: ${inviteUrl}. This invitation expires in ${params.expiresInDays} days.`,
      html: `<div><h1>Join ${params.organizationName}</h1><p>${params.inviterEmail} invited you as a <strong>${params.role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires in ${params.expiresInDays} days.</p><p>${inviteUrl}</p></div>`,
    });
  }

  async sendOrganizationAddedEmail(params: {
    email: string;
    organizationName: string;
    inviterEmail: string;
    loginUrl: string;
  }) {
    const loginUrl = params.loginUrl || this.appUrl('/login');

    return this.sendEmail({
      to: params.email,
      subject: `Access granted to ${params.organizationName} on NexStock`,
      text: `${params.inviterEmail} added you to ${params.organizationName} on NexStock. Sign in here: ${loginUrl}`,
      html: `<div><h1>You now have access to ${params.organizationName}</h1><p>${params.inviterEmail} added you to the workspace.</p><p><a href="${loginUrl}">Sign in</a></p></div>`,
    });
  }
}
