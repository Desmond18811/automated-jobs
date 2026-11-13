import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { decrypt, encrypt, randomToken } from '../lib/crypto';
import { AppError } from '../lib/http';
import { audit } from '../models/audit.model';
import { User } from '../models/user.model';

/**
 * Phase 1 asks only for gmail.send (a "sensitive" scope). Reading replies for the classifier
 * needs gmail.readonly or gmail.metadata, which Google classes as "restricted" and which needs a
 * security assessment before public launch. Keep them separate so sending can ship first.
 */
export const GMAIL_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/gmail.send'];

export function oauthClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new AppError(503, 'Gmail is not configured on this server');
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export function gmailAuthUrl(userId: string): string {
  const state = jwt.sign({ purpose: 'gmail' }, env.JWT_ACCESS_SECRET, { subject: userId, audience: 'javi-oauth', expiresIn: 600 });
  return oauthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: GMAIL_SCOPES, state, include_granted_scopes: true });
}

export async function handleGmailCallback(code: string, state: string): Promise<void> {
  let userId: string;
  try {
    const payload = jwt.verify(state, env.JWT_ACCESS_SECRET, { audience: 'javi-oauth' }) as jwt.JwtPayload;
    if (payload.purpose !== 'gmail' || !payload.sub) throw new Error('bad state');
    userId = payload.sub;
  } catch {
    throw new AppError(400, 'This Gmail connection link has expired. Please try again.');
  }
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new AppError(400, 'Google did not return a refresh token. Remove JAVI under your Google account permissions, then connect again.');
  }
  client.setCredentials(tokens);
  const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
  await User.updateOne(
    { _id: userId },
    { gmail: { address: data.email ?? undefined, refreshTokenEnc: encrypt(tokens.refresh_token), connectedAt: new Date(), scopes: (tokens.scope ?? '').split(' ') } },
  );
  await audit({ userId, action: 'gmail_connect', result: 'ok', detail: data.email ?? undefined });
}

export async function disconnectGmail(userId: string): Promise<void> {
  const user = await User.findById(userId);
  const enc = user?.gmail?.refreshTokenEnc;
  if (enc) await oauthClient().revokeToken(decrypt(enc)).catch(() => undefined);
  await User.updateOne({ _id: userId }, { $unset: { gmail: 1 } });
  await audit({ userId, action: 'gmail_disconnect', result: 'ok' });
}

// ---------- MIME ----------
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim(); // blocks header injection
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);
const wrap76 = (b64: string) => b64.replace(/.{76}/g, '$&\r\n');

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; mime: string; content: Buffer }[];
  threadId?: string;
  inReplyTo?: string;
  listUnsubscribeUrl?: string;
}

export function buildMime(from: string, m: OutgoingEmail): string {
  const boundary = `javi_${randomToken(12)}`;
  const headers = [
    `From: ${oneLine(from)}`,
    `To: ${oneLine(m.to)}`,
    `Subject: ${encodeHeader(oneLine(m.subject))}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  if (m.inReplyTo) headers.push(`In-Reply-To: ${oneLine(m.inReplyTo)}`, `References: ${oneLine(m.inReplyTo)}`);
  if (m.listUnsubscribeUrl) {
    headers.push(`List-Unsubscribe: <${oneLine(m.listUnsubscribeUrl)}>`, 'List-Unsubscribe-Post: List-Unsubscribe=One-Click');
  }
  const parts = [
    [`--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap76(Buffer.from(m.text).toString('base64'))].join('\r\n'),
  ];
  for (const a of m.attachments ?? []) {
    const name = oneLine(a.filename).replace(/"/g, '');
    parts.push(
      [`--${boundary}`, `Content-Type: ${a.mime}; name="${name}"`, `Content-Disposition: attachment; filename="${name}"`, 'Content-Transfer-Encoding: base64', '', wrap76(a.content.toString('base64'))].join('\r\n'),
    );
  }
  return Buffer.from([...headers, '', ...parts, `--${boundary}--`, ''].join('\r\n')).toString('base64url');
}

/** Sends from the user's own Gmail address. Returns ids for threading follow-ups later. */
export async function sendEmail(userId: string, msg: OutgoingEmail): Promise<{ messageId: string; threadId: string }> {
  const user = await User.findById(userId);
  if (!user?.gmail?.refreshTokenEnc || !user.gmail.address) throw new AppError(400, 'Connect Gmail first');
  const client = oauthClient();
  client.setCredentials({ refresh_token: decrypt(user.gmail.refreshTokenEnc) });
  const from = user.name ? `${encodeHeader(user.name)} <${user.gmail.address}>` : user.gmail.address;
  const res = await google.gmail({ version: 'v1', auth: client }).users.messages.send({
    userId: 'me',
    requestBody: { raw: buildMime(from, msg), threadId: msg.threadId },
  });
  return { messageId: res.data.id ?? '', threadId: res.data.threadId ?? '' };
}
