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
  // A session ends after this many days without use, or this many days after sign-in, whichever is first.
  SESSION_IDLE_DAYS: z.coerce.number().default(30),
  SESSION_ABSOLUTE_DAYS: z.coerce.number().default(90),
  TOKEN_ENC_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'TOKEN_ENC_KEY must be 32 random bytes, base64-encoded'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:4000/api/gmail/callback'),

  OPENROUTER_API_KEY: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('anthropic/claude-opus-5'),

  // SMTP / Nodemailer Configuration
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('JAVI <no-reply@javi.ai>'),
  SMTP_SECURE: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),

  // WhatsApp Alerts & Contact Updates
  WHATSAPP_PROVIDER: z.enum(['textmebot', 'callmebot', 'twilio', 'cloudapi', 'simulated']).default('textmebot'),
  // Only for test scripts and admin alerts. User alerts always go to the user's own profile phone.
  WHATSAPP_TO: z.string().default(''),
  TEXTMEBOT_APIKEY: z.string().default(''),
  CALLMEBOT_APIKEY: z.string().default(''),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_WHATSAPP_FROM: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),

  RSS_FEEDS: csv,
  REMOTEOK_ENABLED: bool,
  ADZUNA_APP_ID: z.string().default(''),
  ADZUNA_APP_KEY: z.string().default(''),
  ADZUNA_COUNTRY: z.string().default('gb'),
  INGEST_EVERY_MINUTES: z.coerce.number().min(30).default(180),
  MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),

  // Applying: 'live' drives a visible Brave/Chrome window on this machine (sign-ins persist, a human
  // can step in for CAPTCHAs); 'headless' is the old server-side Chromium.
  APPLY_BROWSER: z.enum(['live', 'headless']).default(process.env.NODE_ENV === 'production' ? 'headless' : 'live'),
  /** Path to a Chromium-based browser. Empty = auto-detect Brave, then Chrome. */
  LIVE_BROWSER_PATH: z.string().default(''),
  LIVE_BROWSER_PORT: z.coerce.number().default(9333),
  /** How long a live session keeps the page open waiting for a WhatsApp/dashboard reply. */
  LIVE_WAIT_MINUTES: z.coerce.number().min(1).max(240).default(30),
  /** Tests/CI only: run the live browser headless with a throwaway profile. */
  LIVE_BROWSER_HEADLESS: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),
  LIVE_BROWSER_PROFILE: z.string().default(''),
  /** Dev/test only (ignored in production): let the URL guard accept localhost, e.g. a mock job site. */
  ALLOW_PRIVATE_URLS: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),
  /** Mount /api/test/* (demo pipelines that skip safety checks). Never in production. */
  ENABLE_TEST_ROUTES: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),
  /** A user's first N form applications are filled and screenshotted but not submitted, so they can check JAVI's work. */
  FORM_DRY_RUN_FIRST: z.coerce.number().min(0).max(50).default(3),
  /** OpenStreetMap endpoints for business lead search (overridable for tests or a self-hosted instance). */
  OSM_NOMINATIM_URL: z.string().default('https://nominatim.openstreetmap.org'),
  /** Comma-separated; tried in order when one is busy. */
  OSM_OVERPASS_URL: z.string().default('https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter'),
  /** Limit area lookups to these countries (ISO codes, comma-separated); empty = worldwide. */
  OSM_COUNTRY_CODES: z.string().default('ng'),
  /** Contact for the OSM usage policy (sent in the User-Agent). */
  OSM_CONTACT: z.string().default(''),
  /** Optional: Google PageSpeed Insights key for the business website audit (works without, at a low quota). */
  PAGESPEED_API_KEY: z.string().default(''),
  /** Ask Gmail for read-only access so sign-up verification codes are read automatically. */
  GMAIL_READ_CODES: z.string().default('false').transform((v) => v.toLowerCase() === 'true'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
