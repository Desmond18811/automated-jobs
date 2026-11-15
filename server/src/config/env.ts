import 'dotenv/config';
import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

const bool = z
  .string()
  .default('true')
  .transform((v) => v.toLowerCase() === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  MONGO_URI: z
    .string()
    .default(() => process.env.MONGO_URI || process.env.MONGODB_URI || '')
    .refine((v) => v.length > 0, 'MONGO_URI or MONGODB_URI is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  STORAGE_DIR: z.string().default('./storage'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),
  TOKEN_ENC_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'TOKEN_ENC_KEY must be 32 random bytes, base64-encoded'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:4000/api/gmail/callback'),

  ANTHROPIC_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('claude-sonnet-5-5'),

  RSS_FEEDS: csv,
  REMOTEOK_ENABLED: bool,
  ADZUNA_APP_ID: z.string().default(''),
  ADZUNA_APP_KEY: z.string().default(''),
  ADZUNA_COUNTRY: z.string().default('gb'),
  INGEST_EVERY_MINUTES: z.coerce.number().min(30).default(180),
  MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
