import { chromium, type Browser } from 'playwright';

let browser: Browser | null = null;

/** One shared Chromium per worker process (used for PDF rendering and the form adapter). */
export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) browser = await chromium.launch({ headless: true });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = null;
}
