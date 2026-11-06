export interface AlertPayload {
  title: string;
  reason: string;
  link: string;
}

export function normalizeWhatsAppNumber(raw: string): string {
  let digits = (raw || '').replace(/[^\d]/g, '');
  if (digits.startsWith('2340') && digits.length === 14) {
    digits = '234' + digits.slice(4);
  }
  return digits;
}

export function validateWhatsAppConfig(): string | null {
  const provider = (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
  if (!provider) {
    return 'WHATSAPP_PROVIDER is not set in server/.env (choose textmebot, callmebot, or cloudapi).';
  }
  if (
    provider !== 'textmebot' &&
    provider !== 'callmebot' &&
    provider !== 'cloudapi'
  ) {
    return `Unknown WHATSAPP_PROVIDER "${provider}" (must be textmebot, callmebot, or cloudapi).`;
  }

  const to = normalizeWhatsAppNumber(process.env.WHATSAPP_TO || '');
  if (!to) {
    return 'WHATSAPP_TO is missing in server/.env.';
  }
  if (!/^\d{8,15}$/.test(to)) {
    return 'WHATSAPP_TO must be 8-15 digits only, country code first, with no spaces or symbols (e.g. 2348012345678).';
  }

  if (provider === 'textmebot') {
    if (!process.env.TEXTMEBOT_APIKEY && !process.env.CALLMEBOT_APIKEY) {
      return 'TEXTMEBOT_APIKEY is missing in server/.env.';
    }
  } else if (provider === 'callmebot') {
    if (!process.env.CALLMEBOT_APIKEY && !process.env.TEXTMEBOT_APIKEY) {
      return 'CALLMEBOT_APIKEY is missing in server/.env.';
    }
  } else if (provider === 'cloudapi') {
    if (!process.env.WHATSAPP_TOKEN) {
      return 'WHATSAPP_TOKEN is missing in server/.env.';
    }
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return 'WHATSAPP_PHONE_NUMBER_ID is missing in server/.env.';
    }
    if (!process.env.WHATSAPP_GRAPH_VERSION) {
      return 'WHATSAPP_GRAPH_VERSION is missing in server/.env (e.g. v21.0).';
    }
  }

  return null;
}

export function whatsappReady(): boolean {
  return validateWhatsAppConfig() === null;
}

export function isWebhookEnabled(): boolean {
  return Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
}

function sanitizeValue(val: string): string {
  return val.replace(/\s+/g, ' ').trim();
}

export async function sendWhatsAppReply(text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
  const to = normalizeWhatsAppNumber(process.env.WHATSAPP_TO || '');

  if (!token || !phoneId || !to) {
    console.error(
      '[whatsapp] Cannot send reply: missing token, phone ID, or recipient.'
    );
    return false;
  }

  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(
        `[whatsapp] Failed to send reply: ${res.status} ${errText.slice(0, 200)}`
      );
      return false;
    }

    return true;
  } catch (err: any) {
    console.error(`[whatsapp] Failed to send reply: ${err?.message || err}`);
    return false;
  }
}

export async function sendAlert(payload: AlertPayload): Promise<boolean> {
  const provider = (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
  const to = normalizeWhatsAppNumber(process.env.WHATSAPP_TO || '');

  const title = sanitizeValue(payload.title).slice(0, 80);
  const reason = sanitizeValue(payload.reason).slice(0, 160);
  const link = sanitizeValue(payload.link);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    if (provider === 'textmebot') {
      const apiKey =
        process.env.TEXTMEBOT_APIKEY || process.env.CALLMEBOT_APIKEY || '';
      const text = `Job Autopilot: ${title} needs you. ${reason} ${link}`;
      const url = `https://api.textmebot.com/send.php?recipient=%2B${to}&apikey=${encodeURIComponent(
        apiKey
      )}&text=${encodeURIComponent(text)}`;

      const res = await fetch(url, { signal: controller.signal });
      const body = await res.text().catch(() => '');

      if (!res.ok || /error/i.test(body)) {
        console.error(
          `[whatsapp] textmebot failed: ${res.status} ${body.slice(0, 200)}`
        );
        return false;
      }

      return true;
    }

    if (provider === 'callmebot') {
      const apiKey = process.env.CALLMEBOT_APIKEY || '';
      const text = `Job Autopilot: ${title} needs you. ${reason} ${link}`;
      const url = `https://api.callmebot.com/whatsapp.php?phone=%2B${to}&text=${encodeURIComponent(
        text
      )}&apikey=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, { signal: controller.signal });
      const body = await res.text().catch(() => '');

      if (!res.ok || /error/i.test(body)) {
        console.error(
          `[whatsapp] callmebot failed: ${res.status} ${body.slice(0, 200)}`
        );
        return false;
      }

      return true;
    }

    if (provider === 'cloudapi') {
      const token = process.env.WHATSAPP_TOKEN || '';
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
      const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
      const templateName = process.env.WHATSAPP_TEMPLATE || 'job_needs_you';
      const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

      const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
      const bodyJson = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: title },
                { type: 'text', text: reason },
                { type: 'text', text: link }
              ]
            }
          ]
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyJson),
        signal: controller.signal
      });

      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok || !data?.messages?.[0]?.id) {
        const textSummary =
          JSON.stringify(data) || (await res.text().catch(() => ''));
        console.error(
          `[whatsapp] cloudapi failed: ${res.status} ${textSummary.slice(0, 200)}`
        );
        return false;
      }

      return true;
    }

    return false;
  } catch (err: any) {
    console.error(
      `[whatsapp] ${provider || 'unknown'} failed: ${err?.message || err}`
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
