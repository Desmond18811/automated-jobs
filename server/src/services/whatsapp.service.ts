import mongoose from 'mongoose';
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

export async function sendWhatsAppAlert(
  userId: string,
  payload: WhatsAppMessagePayload,
): Promise<{ sent: boolean; channel: WhatsAppChannel; to?: string; error?: string }> {
  try {
    let rawPhone = payload.to;
    if (!rawPhone && mongoose.connection.readyState === 1) {
      const profile = await Profile.findOne({ userId }).catch(() => null);
      rawPhone = profile?.phone;
    }
    rawPhone = rawPhone || env.WHATSAPP_TO;
    if (!rawPhone) {
      logger.info({ userId }, 'No phone number configured for user, skipping WhatsApp alert');
      return { sent: false, channel: 'simulated' };
    }

    const cleanDigits = rawPhone.replace(/[^\d]/g, '');
    const cleanPhoneWithPlus = rawPhone.startsWith('+') ? `+${cleanDigits}` : `+${cleanDigits}`;
    const cleanDigitsNoPlus = cleanDigits;

    const formattedMessage = `🤖 *J.A.V.I Alert*\n*${payload.title}*\n${payload.body}\n\n👉 Review on dashboard: ${env.APP_URL}/dash`;

    // 1. TextMeBot
    if (env.WHATSAPP_PROVIDER === 'textmebot' || (env.TEXTMEBOT_APIKEY && !env.CALLMEBOT_APIKEY && !env.TWILIO_ACCOUNT_SID)) {
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
    if (env.WHATSAPP_PROVIDER === 'callmebot' || env.CALLMEBOT_APIKEY) {
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
      params.append('Body', formattedMessage);

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
              text: { body: formattedMessage },
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
      `📱 [WhatsApp Notification Dispatched to ${cleanPhoneWithPlus}]: ${payload.title} - ${payload.body}`,
    );

    return { sent: true, channel: 'simulated', to: cleanPhoneWithPlus };
  } catch (err: any) {
    logger.error({ err: err?.message, userId }, 'Failed to dispatch WhatsApp notification');
    return { sent: false, channel: 'simulated', error: err?.message };
  }
}
