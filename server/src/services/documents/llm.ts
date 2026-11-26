import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';

const anthropicClient = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

export const llmEnabled = (force = false): boolean =>
  (Boolean(env.OPENROUTER_API_KEY) || Boolean(env.ANTHROPIC_API_KEY)) &&
  (force || process.env.ALLOW_TEST_LLM === 'true' || process.env.NODE_ENV !== 'test');

export async function complete(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  // 1. Prefer OpenRouter if configured
  if (env.OPENROUTER_API_KEY) {
    const primaryModel = env.LLM_MODEL || 'openai/gpt-4o-mini';
    const modelsList = [
      primaryModel,
      'openai/gpt-4o-mini',
      'google/gemini-2.5-flash',
      'openai/gpt-4o',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.APP_URL || 'http://localhost:5173',
        'X-Title': 'J.A.V.I Candidate & Business Suite',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: primaryModel,
        models: modelsList,
        messages: [
          ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
          { role: 'user', content: opts.prompt },
        ],
        max_tokens: opts.maxTokens ?? 2500,
        temperature: opts.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const errBody: any = await res.json().catch(() => null);
      const msg = errBody?.error?.message || errBody?.message || `OpenRouter returned HTTP ${res.status}`;
      throw new AppError(res.status === 401 ? 401 : 503, `OpenRouter LLM error: ${msg}`);
    }

    const data: any = await res.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content || choice?.message?.reasoning;
    if (typeof text !== 'string') {
      throw new AppError(502, 'OpenRouter did not return text content');
    }
    return text.trim();
  }

  // 2. Direct Anthropic SDK fallback
  if (anthropicClient) {
    const msg = await anthropicClient.messages.create({
      model: env.LLM_MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    });
    return msg.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
  }

  throw new AppError(503, 'Text generation is not configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)');
}

/** Asks for JSON, strips any fences, and validates with zod. One retry feeds the error back to the model. */
export async function completeJson<S extends z.ZodTypeAny>(
  schema: S,
  opts: { system: string; prompt: string; maxTokens?: number; temperature?: number; retries?: number },
): Promise<z.infer<S>> {
  const system = `${opts.system}\n\nIMPORTANT: Return ONLY valid, raw JSON (no conversational preamble, no markdown formatting fences, no explanations).`;
  let prompt = opts.prompt;
  let lastErr = '';
  for (let attempt = 0; attempt <= (opts.retries ?? 0); attempt++) {
    const text = await complete({ system, prompt, maxTokens: opts.maxTokens, temperature: opts.temperature });
    const clean = text.replace(/```(?:json)?/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    try {
      if (start === -1 || end === -1) throw new Error(`no JSON object in response: ${text.slice(0, 100)}`);
      return schema.parse(JSON.parse(clean.slice(start, end + 1)));
    } catch (err: any) {
      lastErr = err?.message ?? String(err);
      prompt = `${opts.prompt}\n\nYour previous answer was rejected: ${lastErr.slice(0, 400)}\nReturn corrected JSON only.`;
    }
  }
  throw new Error(`JSON Schema Parse Failed: ${lastErr}`);
}

/** zod helper: models often send null for "not present". */
export const optStr = z.string().nullish().transform((v) => (v ? v.trim() : undefined));
