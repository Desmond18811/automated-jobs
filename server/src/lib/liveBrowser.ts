import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { env } from '../config/env';
import { logger } from './logger';
import { storageRoot } from './storage';

/**
 * The visible browser JAVI applies with. We start Brave (or Chrome) ourselves as a normal app with
 * a remote-debugging port and attach over CDP, instead of letting Playwright launch it:
 *  - a normally started browser isn't flagged as automated, so Google lets you sign in, and
 *    "Continue with Google" then works on every site;
 *  - it uses a dedicated profile (storage/browser-profile). Chrome/Brave refuse remote debugging
 *    on your everyday profile, and this keeps JAVI's tabs out of your personal browsing.
 * Sign in to Google once in that window; the session persists across restarts.
 */

const CANDIDATES = [
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/brave-browser',
  '/usr/bin/google-chrome',
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

export const liveProfileDir = env.LIVE_BROWSER_PROFILE || path.join(storageRoot, 'browser-profile');

let browser: Browser | null = null;
let connecting: Promise<Browser> | null = null;

function browserPath(): string {
  if (env.LIVE_BROWSER_PATH) return env.LIVE_BROWSER_PATH;
  const found = CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Brave or Chrome found. Install one, or set LIVE_BROWSER_PATH, or set APPLY_BROWSER=headless.');
  return found;
}

const endpoint = () => `http://127.0.0.1:${env.LIVE_BROWSER_PORT}`;

async function devtoolsUp(): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint()}/json/version`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function launchAndConnect(): Promise<Browser> {
  if (!(await devtoolsUp())) {
    fs.mkdirSync(liveProfileDir, { recursive: true });
    const exe = browserPath();
    logger.info({ exe, profile: liveProfileDir }, 'Opening the JAVI browser window');
    const child = spawn(
      exe,
      [
        `--remote-debugging-port=${env.LIVE_BROWSER_PORT}`,
        `--user-data-dir=${liveProfileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        ...(env.LIVE_BROWSER_HEADLESS ? ['--headless=new'] : []),
        'about:blank',
      ],
      { detached: true, stdio: 'ignore' },
    );
    child.unref();
    // First launch of a fresh profile can take a while (and longer under Rosetta).
    for (let i = 0; i < 120 && !(await devtoolsUp()); i++) await new Promise((r) => setTimeout(r, 250));
    if (!(await devtoolsUp())) throw new Error(`The browser started but its debugging port ${env.LIVE_BROWSER_PORT} never opened`);
  }
  const b = await chromium.connectOverCDP(endpoint());
  b.on('disconnected', () => {
    browser = null;
  });
  return b;
}

/** Connect to the JAVI browser window, opening it if needed. Safe to call concurrently. */
export async function getLiveBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  connecting ??= launchAndConnect().finally(() => {
    connecting = null;
  });
  browser = await connecting;
  return browser;
}

/** The window's real profile context (cookies, Google session). New tabs open here. */
export async function getLiveContext(): Promise<BrowserContext> {
  const b = await getLiveBrowser();
  return b.contexts()[0] ?? (await b.newContext());
}

/** Detach without closing the user's window. */
export async function disconnectLiveBrowser(): Promise<void> {
  // For a CDP connection, close() just disconnects; the browser and its tabs stay open.
  await browser?.close().catch(() => undefined);
  browser = null;
}
