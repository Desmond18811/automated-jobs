import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

export const llmEnabled = (): boolean => client !== null && process.env.NODE_ENV !== 'test';

export async function complete(opts: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
  if (!client) throw new AppError(503, 'Text generation is not configured (set ANTHROPIC_API_KEY)');
  const msg = await client.messages.create({
    model: env.LLM_MODEL,
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  });
  return msg.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
}

/** Asks for JSON, strips any fences, and validates with zod so bad output fails loudly. */
export async function completeJson<S extends z.ZodTypeAny>(
  schema: S,
  opts: { system: string; prompt: string; maxTokens?: number },
): Promise<z.infer<S>> {
  const text = await complete({
    ...opts,
    system: `${opts.system}\n\nRespond with one JSON object only: no markdown fences, no commentary.`,
  });
  const clean = text.replace(/```(?:json)?/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON');
  return schema.parse(JSON.parse(clean.slice(start, end + 1)));
}

/** zod helper: models often send null for "not present". */
export const optStr = z.string().nullish().transform((v) => (v ? v.trim() : undefined));
