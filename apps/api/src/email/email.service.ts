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
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
          <h1 style="font-size:22px;margin:0 0 12px">Verify your NexStock account</h1>
          <p>Use this verification code to continue:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:24px 0">${otp}</p>
          <p>This code expires in ${expiryMinutes} minutes.</p>
          <p style="color:#6b7280;font-size:13px">If you did not request this, you can ignore this email.</p>
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
    const fallbackUrl = this.appUrl('/login');
    const inviteUrl = params.inviteUrl || fallbackUrl;

    return this.sendEmail({
      to: params.email,
      subject: `Invitation to join ${params.organizationName} on NexStock`,
      text: `${params.inviterEmail} invited you to join ${params.organizationName} on NexStock as a ${params.role}. Accept your invitation here: ${inviteUrl}. This invitation expires in ${params.expiresInDays} days.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
          <p style="font-size:13px;color:#2563eb;font-weight:700;margin:0 0 12px">NexStock</p>
          <h1 style="font-size:22px;margin:0 0 12px">You're invited to join ${params.organizationName}</h1>
          <p>${params.inviterEmail} invited you as a <strong>${params.role}</strong>.</p>
          <p style="margin:28px 0">
            <a href="${inviteUrl}" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block">Accept invitation</a>
          </p>
          <p>This invitation expires in ${params.expiresInDays} days.</p>
          <p style="color:#6b7280;font-size:13px">If the button does not work, copy and paste this link into your browser:<br>${inviteUrl}</p>
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
    const loginUrl = params.loginUrl || this.appUrl('/login');

    return this.sendEmail({
      to: params.email,
      subject: `Access granted to ${params.organizationName} on NexStock`,
      text: `${params.inviterEmail} added you to ${params.organizationName} on NexStock. Sign in here: ${loginUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
          <p style="font-size:13px;color:#2563eb;font-weight:700;margin:0 0 12px">NexStock</p>
          <h1 style="font-size:22px;margin:0 0 12px">You now have access to ${params.organizationName}</h1>
          <p>${params.inviterEmail} added you to the workspace.</p>
          <p style="margin:28px 0">
            <a href="${loginUrl}" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block">Sign in</a>
          </p>
        </div>
      `,
    });
  }
}
