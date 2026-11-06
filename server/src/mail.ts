import nodemailer from 'nodemailer';

export function mailReady(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export function createTransporter(): nodemailer.Transporter {
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendApplication(params: {
  to: string;
  subject: string;
  body: string;
  cvPath: string;
  cvFileName: string;
  replyTo: string;
  fullName?: string;
}): Promise<string> {
  if (!mailReady()) {
    throw new Error('Email sending is not configured (missing SMTP settings in server/.env).');
  }

  const transporter = createTransporter();
  const redirectTo = process.env.MAIL_REDIRECT_TO;
  const targetTo = redirectTo || params.to;
  const targetSubject = redirectTo
    ? `[TEST to ${params.to}] ${params.subject}`
    : params.subject;

  const defaultFrom = params.fullName
    ? `"${params.fullName}" <${process.env.SMTP_USER}>`
    : process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || defaultFrom;

  const info = await transporter.sendMail({
    from,
    to: targetTo,
    replyTo: params.replyTo,
    subject: targetSubject,
    text: params.body,
    attachments: [
      {
        filename: params.cvFileName,
        path: params.cvPath
      }
    ]
  });

  return info.messageId;
}

export async function sendTestMail(params: {
  toEmail: string;
  cvPath: string;
  cvFileName: string;
  fullName?: string;
}): Promise<{ ok: boolean }> {
  if (!mailReady()) {
    throw new Error('Email sending is not configured (missing SMTP settings in server/.env).');
  }

  const transporter = createTransporter();
  await transporter.verify();

  const targetTo = process.env.MAIL_REDIRECT_TO || params.toEmail;
  const defaultFrom = params.fullName
    ? `"${params.fullName}" <${process.env.SMTP_USER}>`
    : process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || defaultFrom;

  await transporter.sendMail({
    from,
    to: targetTo,
    subject: '[Test] Job Autopilot SMTP Verification',
    text: 'This is a test email from Job Autopilot. SMTP configuration is working correctly.',
    attachments: [
      {
        filename: params.cvFileName,
        path: params.cvPath
      }
    ]
  });

  return { ok: true };
}
