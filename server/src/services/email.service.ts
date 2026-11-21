import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

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
   * Sends the passwordless sign-in email: a link to open and a 6-digit code to type on that page.
   * Without SMTP (local dev only) the link and code are printed to the terminal instead.
   * A failed send throws, so the caller knows the email did not go out.
   */
  async sendSignInEmail(to: string, code: string, linkUrl: string, name?: string): Promise<void> {
    const who = name || 'there';
    const subject = `Your J.A.V.I sign-in code: ${code}`;

    if (!this.transporter) {
      if (env.NODE_ENV === 'production') throw new Error('SMTP is not configured; cannot send sign-in email');
      console.log('\n============================================================');
      console.log('[JAVI] Sign-in email (no SMTP configured, dev only)');
      console.log(`   To:   ${to}`);
      console.log(`   Link: ${linkUrl}`);
      console.log(`   Code: ${code}`);
      console.log('============================================================\n');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Sign in to J.A.V.I</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 40px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e8edf2; border-radius: 16px; overflow: hidden;">
    <div style="background-color: #141414; padding: 24px 32px;">
      <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">J.A.V.I</span>
    </div>
    <div style="padding: 32px;">
      <h1 style="font-size: 20px; font-weight: 600; color: #111418; margin: 0 0 12px;">Sign in to J.A.V.I</h1>
      <p style="font-size: 14px; line-height: 22px; color: #4e5862; margin: 0 0 20px;">Hi ${escapeHtml(who)}, open the link below, then enter this code on the page that opens.</p>
      <div style="background-color: #f3f6f9; border: 1px solid #e3e9ee; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111418; font-family: Courier, monospace;">${code}</div>
        <p style="font-size: 11px; color: #5f6a74; margin: 8px 0 0;">Expires in 10 minutes</p>
      </div>
      <a href="${linkUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 22px; border-radius: 999px;">Open sign-in page</a>
      <p style="font-size: 12px; line-height: 18px; color: #5f6a74; margin: 20px 0 0;">If you did not ask to sign in, you can ignore this email. Nobody can sign in without both the link and the code.</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Hi ${who},\n\nOpen this link to sign in to J.A.V.I:\n${linkUrl}\n\nThen enter this code: ${code}\n\nThe code and link expire in 10 minutes. If you did not ask to sign in, ignore this email.`;

    const info = await this.transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
    logger.info(`[EmailService] Sign-in email sent to ${to} (MessageID: ${info.messageId})`);
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export const emailService = new EmailService();
