import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private resendClient() {
    return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  private fromAddress() {
    return process.env.EMAIL_FROM || 'NexStock <info@nexstock.co.za>';
  }

  private async sendEmail(payload: { to: string; subject: string; html: string }) {
    const resend = this.resendClient();

    if (!resend) {
      this.logger.error(`RESEND_API_KEY missing. Cannot send email to ${payload.to}.`);
      throw new Error('Email service is not configured');
    }

    const response = await resend.emails.send({
      from: this.fromAddress(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (response.error) {
      this.logger.error(`Email provider rejected message to ${payload.to}: ${payload.subject}`);
      this.logger.error(JSON.stringify(response.error));
      throw new Error(response.error.message || 'Email provider rejected the message');
    }

    this.logger.log(`Email sent to ${payload.to}: ${payload.subject} (${response.data?.id ?? 'no-id'})`);
    return response.data;
  }

  async sendOtpEmail(email: string, otp: string, expiryMinutes = 5) {
    return this.sendEmail({
      to: email,
      subject: 'Verify your NexStock account',
      html: `<h1>Verify your email</h1><p>Use this OTP to verify your NexStock account:</p><h2>${otp}</h2><p>This code expires in ${expiryMinutes} minutes.</p>`,
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
      html: `<h1>Join ${params.organizationName}</h1><p>${params.inviterEmail} invited you as a ${params.role}.</p><p><a href="${params.inviteUrl}">Accept invite</a></p><p>This invitation expires in ${params.expiresInDays} days.</p><p>${params.inviteUrl}</p>`,
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
      html: `<h1>You now have access to ${params.organizationName}</h1><p>${params.inviterEmail} added you to the workspace.</p><p><a href="${params.loginUrl}">Sign in</a></p>`,
    });
  }
}
