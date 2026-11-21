import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

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
   * Dispatches a verification OTP code to the candidate's email.
   * If SMTP is active, sends via Nodemailer.
   * Always logs to terminal for local developer verification.
   */
  async sendOtpEmail(to: string, otp: string, name?: string): Promise<{ ok: boolean; messageId?: string }> {
    const candidateName = name || 'there';
    const subject = `Your JAVI Verification Code: ${otp}`;

    // Highlighted console print for seamless local developer testing
    console.log('\n============================================================');
    console.log('📧 [JAVI NODEMAILER] Verification Code Dispatch');
    console.log(`   To:       ${to}`);
    console.log(`   Candidate:${candidateName}`);
    console.log(`   OTP Code: ${otp} (Valid for 10 minutes)`);
    console.log('============================================================\n');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your JAVI Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
    
    <!-- Brand Header -->
    <div style="background-color: #0b0b0c; padding: 28px 32px; text-align: left;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">JAVI</span>
      </div>
      <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0;">Autonomous Career Agent & Application Engine</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 36px 32px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Verify your email address</h1>
      <p style="font-size: 14px; line-height: 22px; color: #475467; margin: 0 0 24px;">
        Hi ${candidateName},<br>
        Welcome to JAVI! Please enter the 6-digit verification code below to verify your email and begin setting up your autonomous job search profile:
      </p>

      <!-- OTP Box -->
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: Courier, monospace;">
          ${otp}
        </div>
        <p style="font-size: 11px; color: #64748b; margin: 8px 0 0; text-transform: uppercase; font-weight: 600;">Code expires in 10 minutes</p>
      </div>

      <p style="font-size: 12.5px; line-height: 19px; color: #64748b; margin: 0 0 16px;">
        If you did not request this verification code, please ignore this email or reach out to our team if you have questions.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
      <p style="font-size: 11.5px; color: #94a3b8; margin: 0;">
        &copy; ${new Date().getFullYear()} JAVI AI Inc. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `Hi ${candidateName},\n\nYour JAVI verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\n© ${new Date().getFullYear()} JAVI AI Inc.`;

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: env.SMTP_FROM,
          to,
          subject,
          text,
          html,
        });
        logger.info(`[EmailService] OTP email sent successfully to ${to} (MessageID: ${info.messageId})`);
        return { ok: true, messageId: info.messageId };
      } catch (err: any) {
        logger.error(`[EmailService] Failed sending OTP via Nodemailer: ${err.message}. Code remains valid for login.`);
        return { ok: true };
      }
    }

    return { ok: true };
  }
}

export const emailService = new EmailService();
