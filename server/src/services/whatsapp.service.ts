import { logger } from '../lib/logger';
import { env } from '../config/env';
import { Profile } from '../models/profile.model';

export interface WhatsAppMessagePayload {
  to?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type WhatsAppChannel = 'textmebot' | 'callmebot' | 'twilio' | 'cloudapi' | 'simulated';

/**
 * The text the user sees. For "needs you" tasks it lists the questions (with options and any
 * suggested answer), the one-tap answer link, and, when the provider can receive replies, how to
 * answer by text: "<code> <answer>", several answers separated by " | ", or "<code> done".
 */
export function formatMessage(payload: WhatsAppMessagePayload, canReplyByText: boolean): string {
  const d = (payload.data ?? {}) as Record<string, any>;
  const lines = [`🤖 *J.A.V.I*  ${payload.title}`];
  if (d.jobTitle || d.company) lines.push(`_${[d.jobTitle, d.company].filter(Boolean).join(' · ')}_`);
  lines.push('', payload.body);
  const qs: Array<{ label: string; options?: string[]; suggested?: string }> = d.questions ?? [];
  if (qs.length) {
    lines.push('');
    qs.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.label}`);
      if (q.options?.length) lines.push(`   Options: ${q.options.slice(0, 8).join(' / ')}`);
      if (q.suggested) lines.push(`   Suggested: "${q.suggested.slice(0, 300)}"`);
    });
  }
  if (d.live) lines.push('', `⏳ The page is open in the JAVI browser window; JAVI continues as soon as you answer.`);
  if (d.replyUrl) lines.push('', `👉 Answer here: ${d.replyUrl}`);
  if (canReplyByText && d.replyCode) {
    if (qs.length) lines.push(`Or reply: *${d.replyCode} your answer*${qs.length > 1 ? ' (separate answers with | )' : ''}`);
    lines.push(`Reply *${d.replyCode} done* once you've handled it in the browser.`);
  }
  if (!d.replyUrl) lines.push('', `👉 Dashboard: ${env.APP_URL}/dash`);
  return lines.join('\n');
}

export async function sendWhatsAppAlert(
  userId: string,
  payload: WhatsAppMessagePayload,
): Promise<{ sent: boolean; channel: WhatsAppChannel; to?: string; error?: string }> {
  try {
    // A user's alert goes to that user's own phone, never to a shared fallback number.
    let rawPhone = payload.to;
    if (!rawPhone) {
      const profile = await Profile.findOne({ userId }).catch(() => null);
      rawPhone = profile?.phone || undefined;
    }
    if (!rawPhone) {
      logger.info({ userId }, 'No phone number on the profile; skipping WhatsApp alert');
      return { sent: false, channel: 'simulated', error: 'no phone number on profile' };
    }

    const cleanDigits = rawPhone.replace(/[^\d]/g, '');
    const cleanPhoneWithPlus = `+${cleanDigits}`;
    const cleanDigitsNoPlus = cleanDigits;

    // Replies by text only reach JAVI through providers with an inbound webhook (Twilio, Cloud API).
    const canReply = (ch: WhatsAppChannel) => ch === 'twilio' || ch === 'cloudapi';
    const formatted = (ch: WhatsAppChannel) => formatMessage(payload, canReply(ch));
    const formattedMessage = formatted('textmebot');

    // 1. TextMeBot
    // The configured provider wins. Send-only providers are skipped when a reply-capable one
    // (Twilio / Cloud API) is configured, because replies only come back to the number that sent.
    const prefer = env.WHATSAPP_PROVIDER;
    const replyCapablePreferred = prefer === 'twilio' || prefer === 'cloudapi';
    if (prefer === 'textmebot' || (!replyCapablePreferred && prefer !== 'callmebot' && env.TEXTMEBOT_APIKEY)) {
      const apiKey = env.TEXTMEBOT_APIKEY || process.env.TEXTMEBOT_APIKEY;
      if (apiKey) {
        try {
          const url = `http://api.textmebot.com/send.php?recipient=${cleanDigitsNoPlus}&apikey=${apiKey}&text=${encodeURIComponent(formattedMessage)}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          const bodyText = await res.text();
          if (res.ok && !bodyText.toLowerCase().includes('trial period is over') && !bodyText.toLowerCase().includes('error')) {
            logger.info({ to: cleanPhoneWithPlus, type: payload.type }, '📱 Sent TextMeBot WhatsApp notification');
            return { sent: true, channel: 'textmebot', to: cleanPhoneWithPlus };
          }
          logger.warn({ status: res.status, body: bodyText }, 'TextMeBot reported issue; falling back gracefully');
        } catch (err: any) {
          logger.warn({ err: err?.message }, 'TextMeBot request failed');
        }
      }
    }

    // 2. CallMeBot
    if (prefer === 'callmebot' || (!replyCapablePreferred && env.CALLMEBOT_APIKEY)) {
      const apiKey = env.CALLMEBOT_APIKEY || process.env.CALLMEBOT_APIKEY;
      if (apiKey) {
        try {
          const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanDigitsNoPlus}&text=${encodeURIComponent(formattedMessage)}&apikey=${apiKey}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          const bodyText = await res.text();
          if (res.ok && !bodyText.toLowerCase().includes('error')) {
            logger.info({ to: cleanPhoneWithPlus, type: payload.type }, '📱 Sent CallMeBot WhatsApp notification');
            return { sent: true, channel: 'callmebot', to: cleanPhoneWithPlus };
          }
          logger.warn({ status: res.status, body: bodyText }, 'CallMeBot reported issue; falling back gracefully');
        } catch (err: any) {
          logger.warn({ err: err?.message }, 'CallMeBot request failed');
        }
      }
    }

    // 3. Twilio WhatsApp
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', `whatsapp:${env.TWILIO_WHATSAPP_FROM}`);
      params.append('To', `whatsapp:${cleanPhoneWithPlus}`);
      params.append('Body', formatted('twilio'));

      try {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            signal: AbortSignal.timeout(4000),
          },
        );

        if (twilioRes.ok) {
          logger.info({ to: cleanPhoneWithPlus, type: payload.type }, '📱 Sent Twilio WhatsApp notification');
          return { sent: true, channel: 'twilio', to: cleanPhoneWithPlus };
        }
        logger.warn({ status: twilioRes.status, err: await twilioRes.text() }, 'Twilio WhatsApp delivery failed');
      } catch (err: any) {
        logger.warn({ err: err?.message }, 'Twilio WhatsApp request failed');
      }
    }

    // 4. Meta WhatsApp Cloud API
    if (env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanDigitsNoPlus,
              type: 'text',
              text: { body: formatted('cloudapi') },
            }),
            signal: AbortSignal.timeout(4000),
          },
        );

        if (metaRes.ok) {
          logger.info({ to: cleanPhoneWithPlus, type: payload.type }, '📱 Sent Meta Cloud WhatsApp notification');
          return { sent: true, channel: 'cloudapi', to: cleanPhoneWithPlus };
        }
        logger.warn({ status: metaRes.status, err: await metaRes.text() }, 'Meta Cloud WhatsApp delivery failed');
      } catch (err: any) {
        logger.warn({ err: err?.message }, 'Meta Cloud WhatsApp request failed');
      }
    }

    // 5. Simulated WhatsApp notification with structured log
    logger.info(
      {
        to: cleanPhoneWithPlus,
        type: payload.type,
        title: payload.title,
        body: payload.body,
      },
      `📱 [WhatsApp NOT delivered (no provider succeeded) to ${cleanPhoneWithPlus}]:\n${formattedMessage}`,
    );

    return { sent: false, channel: 'simulated', to: cleanPhoneWithPlus, error: 'no WhatsApp provider succeeded' };
  } catch (err: any) {
    logger.error({ err: err?.message, userId }, 'Failed to dispatch WhatsApp notification');
    return { sent: false, channel: 'simulated', error: err?.message };
  }
}
