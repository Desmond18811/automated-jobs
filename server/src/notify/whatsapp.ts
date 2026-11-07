export interface SendResult {
  ok: boolean;
  provider: string;
  status?: number;
  response?: string;
}

export interface AlertPayload {
  title: string;
  reason: string;
  link?: string;
  text?: string;
}

export interface DetailedPayload {
  event: string;
  title: string;
  reason: string;
  link: string;
  text: string;
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

function maskSecrets(text: string): string {
  if (!text) return '';
  let masked = text;
  const secrets = [
    process.env.CALLMEBOT_APIKEY,
    process.env.TEXTMEBOT_APIKEY,
    process.env.WHATSAPP_TOKEN,
    process.env.WHATSAPP_VERIFY_TOKEN
  ].filter((s): s is string => Boolean(s && s.length > 2));

  for (const s of secrets) {
    masked = masked.split(s).join('***');
  }
  return masked.slice(0, 200);
}

export async function sendAlertDetailed(payload: DetailedPayload): Promise<SendResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
  const to = normalizeWhatsAppNumber(process.env.WHATSAPP_TO || '');

  if (!to) {
    return { ok: false, provider: provider || 'none', response: 'Missing recipient phone number' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    if (provider === 'callmebot') {
      const apiKey = process.env.CALLMEBOT_APIKEY || process.env.TEXTMEBOT_APIKEY || '';
      const url = `https://api.callmebot.com/whatsapp.php?phone=%2B${to}&text=${encodeURIComponent(
        payload.text
      )}&apikey=${encodeURIComponent(apiKey)}`;

      let resText = '';
      let status = 0;
      let ok = false;
      try {
        const res = await fetch(url, { signal: controller.signal });
        status = res.status;
        resText = await res.text().catch(() => '');
        ok = res.ok && !/error/i.test(resText);
      } catch (err: any) {
        resText = err?.message || String(err);
      }

      if (ok) {
        return { ok: true, provider: 'callmebot', status, response: maskSecrets(resText || 'OK') };
      }

      // Fallback only if textmebot has its own distinct key configured
      const textmeKey = process.env.TEXTMEBOT_APIKEY;
      if (textmeKey && textmeKey !== apiKey) {
        const fbUrl = `https://api.textmebot.com/send.php?recipient=%2B${to}&apikey=${encodeURIComponent(
          textmeKey
        )}&text=${encodeURIComponent(payload.text)}`;
        const fbRes = await fetch(fbUrl, { signal: controller.signal }).catch(() => null);
        if (fbRes) {
          const fbBody = await fbRes.text().catch(() => '');
          if (fbRes.ok && !/error/i.test(fbBody)) {
            return { ok: true, provider: 'textmebot', status: fbRes.status, response: maskSecrets(fbBody || 'OK') };
          }
        }
      }

      return { ok: false, provider: 'callmebot', status, response: maskSecrets(resText || 'Failed') };
    }

    if (provider === 'textmebot') {
      const apiKey = process.env.TEXTMEBOT_APIKEY || process.env.CALLMEBOT_APIKEY || '';
      const url = `https://api.textmebot.com/send.php?recipient=%2B${to}&apikey=${encodeURIComponent(
        apiKey
      )}&text=${encodeURIComponent(payload.text)}`;

      let resText = '';
      let status = 0;
      let ok = false;
      try {
        const res = await fetch(url, { signal: controller.signal });
        status = res.status;
        resText = await res.text().catch(() => '');
        ok = res.ok && !/error/i.test(resText);
      } catch (err: any) {
        resText = err?.message || String(err);
      }

      if (ok) {
        return { ok: true, provider: 'textmebot', status, response: maskSecrets(resText || 'OK') };
      }

      // Fallback only if callmebot has its own distinct key configured
      const callmeKey = process.env.CALLMEBOT_APIKEY;
      if (callmeKey && callmeKey !== apiKey) {
        const fbUrl = `https://api.callmebot.com/whatsapp.php?phone=%2B${to}&text=${encodeURIComponent(
          payload.text
        )}&apikey=${encodeURIComponent(callmeKey)}`;
        const fbRes = await fetch(fbUrl, { signal: controller.signal }).catch(() => null);
        if (fbRes) {
          const fbBody = await fbRes.text().catch(() => '');
          if (fbRes.ok && !/error/i.test(fbBody)) {
            return { ok: true, provider: 'callmebot', status: fbRes.status, response: maskSecrets(fbBody || 'OK') };
          }
        }
      }

      return { ok: false, provider: 'textmebot', status, response: maskSecrets(resText || 'Failed') };
    }

    if (provider === 'cloudapi') {
      const token = process.env.WHATSAPP_TOKEN || '';
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
      const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
      const templateName = process.env.WHATSAPP_TEMPLATE || 'job_autopilot_update';
      const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
      const paramMode = (process.env.WHATSAPP_TEMPLATE_PARAMS || 'event,title,reason').trim().toLowerCase();

      const params =
        paramMode === 'title,reason,link'
          ? [
              { type: 'text', text: payload.title },
              { type: 'text', text: payload.reason },
              { type: 'text', text: payload.link }
            ]
          : [
              { type: 'text', text: payload.event },
              { type: 'text', text: payload.title },
              { type: 'text', text: payload.reason }
            ];

      const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
      const bodyJson = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [{ type: 'body', parameters: params }]
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
      if (res.ok && data?.messages?.[0]?.id) {
        return { ok: true, provider: 'cloudapi', status: res.status, response: `Sent message ID: ${data.messages[0].id}` };
      }

      const errSummary = JSON.stringify(data) || (await res.text().catch(() => ''));
      return { ok: false, provider: 'cloudapi', status: res.status, response: maskSecrets(errSummary) };
    }

    return { ok: false, provider: provider || 'unknown', response: 'Unknown provider' };
  } catch (err: any) {
    return { ok: false, provider: provider || 'unknown', response: maskSecrets(err?.message || String(err)) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendAlert(payload: AlertPayload): Promise<boolean> {
  const text = payload.text || (payload.link
    ? `Job Autopilot: [${payload.title}] ${payload.reason} ${payload.link}`
    : `Job Autopilot: [${payload.title}] ${payload.reason}`);

  const res = await sendAlertDetailed({
    event: 'Alert',
    title: payload.title,
    reason: payload.reason,
    link: payload.link || '',
    text
  });
  return res.ok;
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
