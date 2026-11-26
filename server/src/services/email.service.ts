import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

// Pre-rendered 128x128 PNG raster of J.A.V.I favicon (web/public/favicon.svg)
const FAVICON_BASE64 =
  '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';

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
        logger.info(`[EmailService] Nodemailer transporter configured for host: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
      } catch (err: any) {
        logger.warn(`[EmailService] Could not initialize SMTP transporter: ${err.message}. Using simulated console delivery.`);
        this.transporter = null;
      }
    } else {
      logger.info('[EmailService] No external SMTP host provided. Active in-memory/console dispatch mode.');
    }
  }

  /**
   * Sends the passwordless verification email matching GitHub's identity verification layout:
   * centered favicon at top, heading, clean white card with code, security note, and 1-click verify.
   */
  async sendSignInEmail(to: string, code: string, linkUrl: string, name?: string): Promise<void> {
    const displayName = name || to.split('@')[0] || 'there';
    const subject = `Your J.A.V.I verification code: ${code}`;

    if (!this.transporter) {
      if (env.NODE_ENV === 'production') throw new Error('SMTP is not configured; cannot send sign-in email');
      console.log('\n============================================================');
      console.log('[JAVI] Verification email (no SMTP configured, dev only)');
      console.log(`   To:      ${to}`);
      console.log(`   User:    ${displayName}`);
      console.log(`   Code:    ${code}`);
      console.log(`   Link:    ${linkUrl}`);
      console.log('============================================================\n');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Please verify your identity</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #1f2328; margin: 0; padding: 48px 16px; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 500px; margin: 0 auto;">
    <!-- Centered J.A.V.I Favicon Logo -->
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="cid:javi-favicon" width="34" height="34" alt="J.A.V.I" style="display: inline-block; width: 34px; height: 34px; border: 0; outline: none; text-decoration: none; vertical-align: middle;" />
    </div>

    <!-- Heading: Please verify your identity, User -->
    <h1 style="font-size: 24px; font-weight: 400; text-align: center; color: #1f2328; margin: 0 0 24px 0; letter-spacing: -0.01em; line-height: 32px;">
      Please verify your identity, <strong>${escapeHtml(displayName)}</strong>
    </h1>

    <!-- Clean Card Container -->
    <div style="background-color: #ffffff; border: 1px solid #d0d7de; border-radius: 12px; padding: 28px 32px; box-sizing: border-box; text-align: left;">
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 20px; color: #1f2328;">
        Here is your J.A.V.I authentication code:
      </p>

      <!-- Large Bold Verification Code -->
      <div style="text-align: center; margin: 24px 0 28px 0;">
        <span style="font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace, sans-serif; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1f2328; display: inline-block;">
          ${code}
        </span>
      </div>

      <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #1f2328;">
        This code is valid for <strong>15 minutes</strong> and can only be used once.
      </p>

      <p style="margin: 0 0 22px 0; font-size: 13px; line-height: 20px; color: #1f2328;">
        <strong>Please don't share this code with anyone</strong>; we'll never ask for it on the phone or via email.
      </p>

      <!-- 1-Click Verification Link / Button -->
      <div style="margin: 0 0 24px 0; padding-top: 18px; border-top: 1px solid #f0f2f5;">
        <a href="${linkUrl}" style="display: inline-block; background-color: #0969da; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 6px;">
          Verify automatically &rarr;
        </a>
      </div>

      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #57606a;">
        Thanks,<br>
        <span style="color: #1f2328; font-weight: 500;">The J.A.V.I Team</span>
      </p>
    </div>

    <!-- Subtle Footer Text -->
    <div style="margin-top: 24px; text-align: center; padding: 0 12px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 18px; color: #6e7781;">
        You're receiving this email because a verification code was requested for your J.A.V.I account. If this wasn't you, please ignore this email.
      </p>
      <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6e7781;">
        J.A.V.I, Inc. &middot; Autonomous Job Application Intelligence
      </p>
    </div>
  </div>
</body>
</html>`;

    const text = `Please verify your identity, ${displayName}\n\nHere is your J.A.V.I authentication code:\n\n${code}\n\nThis code is valid for 15 minutes and can only be used once.\nPlease don't share this code with anyone; we'll never ask for it on the phone or via email.\n\nOr open this link to verify automatically:\n${linkUrl}\n\nThanks,\nThe J.A.V.I Team`;

    const attachments = [
      {
        filename: 'favicon.png',
        content: Buffer.from(FAVICON_BASE64, 'base64'),
        cid: 'javi-favicon',
        contentType: 'image/png',
      },
    ];

    const info = await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html,
      attachments,
    });
    logger.info(`[EmailService] Sign-in email sent to ${to} (MessageID: ${info.messageId})`);
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export const emailService = new EmailService();
