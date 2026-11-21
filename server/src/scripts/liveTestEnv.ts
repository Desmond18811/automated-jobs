import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

/** Env for testLiveApply.ts. Imported first so config/env.ts sees these values. */
export const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'javi-live-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  APPLY_BROWSER: 'live',
  LIVE_BROWSER_HEADLESS: 'true',
  LIVE_BROWSER_PROFILE: path.join(tmp, 'profile'),
  LIVE_BROWSER_PORT: '9447',
  LIVE_BROWSER_PATH: chromium.executablePath(),
  LIVE_WAIT_MINUTES: '2',
  ALLOW_PRIVATE_URLS: 'true',
  STORAGE_DIR: path.join(tmp, 'storage'),
});
