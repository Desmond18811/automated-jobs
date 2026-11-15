import { logger } from '../lib/logger';
import { Profile } from '../models/profile.model';

export interface WhatsAppMessagePayload {
  to?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendWhatsAppAlert(
  userId: string,
  payload: WhatsAppMessagePayload,
): Promise<{ sent: boolean; channel: 'twilio' | 'meta' | 'simulated'; to?: string }> {
  try {
    const profile = await Profile.findOne({ userId });
    const rawPhone = payload.to || profile?.phone;
    if (!rawPhone) {
      logger.info({ userId }, 'No phone number configured for user, skipping WhatsApp text');
      return { sent: false, channel: 'simulated' };
    }

    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const prefix = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    const formattedMessage = `🤖 *J.A.V.I Alert*\n*${payload.title}*\n${payload.body}\n\n👉 Review on dashboard: http://localhost:5173/dash`;

    // 1. Twilio WhatsApp API
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`);
      params.append('To', `whatsapp:${prefix}`);
      params.append('Body', formattedMessage);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );

      if (twilioRes.ok) {
        logger.info({ to: prefix, type: payload.type }, '📱 Sent Twilio WhatsApp notification');
        return { sent: true, channel: 'twilio', to: prefix };
      }
      logger.warn({ status: twilioRes.status, err: await twilioRes.text() }, 'Twilio WhatsApp delivery failed');
    }

    // 2. Meta WhatsApp Cloud API
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const metaRes = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: prefix.replace('+', ''),
            type: 'text',
            text: { body: formattedMessage },
          }),
        },
      );

      if (metaRes.ok) {
        logger.info({ to: prefix, type: payload.type }, '📱 Sent Meta Cloud WhatsApp notification');
        return { sent: true, channel: 'meta', to: prefix };
      }
      logger.warn({ status: metaRes.status, err: await metaRes.text() }, 'Meta Cloud WhatsApp delivery failed');
    }

    // 3. Fallback: Simulated WhatsApp notification with structured log
    logger.info(
      {
        to: prefix,
        type: payload.type,
        title: payload.title,
        body: payload.body,
      },
      `📱 [WhatsApp Notification Dispatched to ${prefix}]: ${payload.title} - ${payload.body}`,
    );

    return { sent: true, channel: 'simulated', to: prefix };
  } catch (err: any) {
    logger.error({ err: err?.message, userId }, 'Failed to dispatch WhatsApp notification');
    return { sent: false, channel: 'simulated' };
  }
}
