import type { Page, Frame } from 'playwright';
import { normalizeUrl } from '../store.js';
import { classifyUrl } from '../intake/leads.js';
import type { Profile, Settings } from '../types.js';

export function hostOf(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return '';
  }
}

export async function settle(page: Page, ms = 6000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: ms }).catch(() => {});
}

export function detectSite(url: string): string {
  const h = hostOf(url);

  if (h === 'greenhouse.io' || h.endsWith('.greenhouse.io')) return 'greenhouse';
  if (h === 'lever.co' || h.endsWith('.lever.co')) return 'lever';
  if (h === 'ashbyhq.com' || h.endsWith('.ashbyhq.com')) return 'ashby';
  if (h === 'workable.com' || h.endsWith('.workable.com')) return 'workable';
  if (
    h === 'myworkdayjobs.com' ||
    h.endsWith('.myworkdayjobs.com') ||
    h === 'workday.com' ||
    h.endsWith('.workday.com')
  ) {
    return 'workday';
  }
  if (h === 'smartrecruiters.com' || h.endsWith('.smartrecruiters.com')) {
    return 'smartrecruiters';
  }
  if (h === 'linkedin.com' || h.endsWith('.linkedin.com')) return 'linkedin';

  const jobBoards = [
    'jobberman',
    'myjobmag',
    'indeed.',
    'glassdoor.',
    'hotnigerianjobs',
    'ngcareers',
    'jobgurus',
    'careers24',
    'fuzu',
    'brightermonday'
  ];
  for (const jb of jobBoards) {
    if (h.includes(jb)) return 'job board';
  }

  return 'company site';
}

export async function openForm(page: Page, site: string): Promise<void> {
  try {
    const u = new URL(page.url());
    const pathname = u.pathname.replace(/\/$/, '');
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 2) {
      if (site === 'lever' && segments[1] !== 'apply') {
        await page.goto(
          `${u.origin}/${segments[0]}/${segments[1]}/apply${u.search}`
        );
        await settle(page);
      } else if (site === 'ashby' && segments[1] !== 'application') {
        await page.goto(
          `${u.origin}/${segments[0]}/${segments[1]}/application${u.search}`
        );
        await settle(page);
      }
    }
  } catch {}
}

const COUNT_FIELDS_SCRIPT = String.raw`(() => {
  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
    const parent = el.parentElement;
    if (parent) {
      const pStyle = window.getComputedStyle(parent);
      if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return false;
      const pRect = parent.getBoundingClientRect();
      if (pRect.width > 0 && pRect.height > 0) return true;
    }
    return false;
  }

  const els = Array.from(document.querySelectorAll('input, textarea, select'));
  let count = 0;
  let hasFile = false;

  for (const el of els) {
    if (el.disabled) continue;
    const tag = el.tagName.toUpperCase();
    const inputType = tag === 'INPUT' ? (el.getAttribute('type') || el.type || 'text').toLowerCase() : '';

    if (tag === 'INPUT') {
      if (['hidden', 'submit', 'button', 'reset', 'image', 'search', 'password'].includes(inputType)) {
        continue;
      }
    }

    const isFile = tag === 'INPUT' && inputType === 'file';
    if (isFile) {
      hasFile = true;
      count++;
      continue;
    }

    if (el.readOnly) continue;
    if (!isVisible(el)) continue;

    count++;
  }

  return { count, hasFile };
})()`;

export async function findFormFrame(
  page: Page
): Promise<{ frame: Frame; count: number; hasFile: boolean } | null> {
  let best: { frame: Frame; count: number; hasFile: boolean } | null = null;

  for (const frame of page.frames()) {
    try {
      const res = (await frame.evaluate(COUNT_FIELDS_SCRIPT)) as {
        count: number;
        hasFile: boolean;
      };
      if (res && (res.count >= 3 || res.hasFile)) {
        if (!best || res.count > best.count) {
          best = { frame, count: res.count, hasFile: res.hasFile };
        }
      }
    } catch {}
  }

  return best;
}

const FIND_APPLY_BUTTON_SCRIPT = String.raw`(() => {
  const regex = /^\s*(click here to )?(apply|apply now|apply here|apply online|apply manually|autofill with resume|apply with resume|use my last application|apply for (this |the )?(job|position|role|vacancy)|apply on (the )?company('?s)? (site|website)|easy apply|quick apply|start (your )?(application|applying)|submit application)\s*[!.]?\s*$/i;

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // 1. High priority: Workday / ATS specific sub-actions (e.g. inside an open apply menu)
  const prioritySelectors = [
    '[data-automation-id="applyManually"]',
    '[data-automation-id="autofillWithResume"]',
    '[data-automation-id="useMyLastApplication"]',
    'a[data-automation-id*="apply"]',
    'button[data-automation-id*="apply"]'
  ];

  for (const sel of prioritySelectors) {
    const el = document.querySelector(sel);
    if (el && isVisible(el) && !el.hasAttribute('data-ja-apply-clicked')) {
      let href = null;
      if (el.tagName === 'A' && el.href) {
        href = el.href;
      }
      el.setAttribute('data-ja-apply', '1');
      return { found: true, href: href };
    }
  }

  // 2. Standard apply candidates
  const candidates = Array.from(
    document.querySelectorAll('a, button, input[type="button"], input[type="submit"], [role="button"]')
  );

  for (const el of candidates) {
    if (el.disabled) continue;
    if (el.hasAttribute('data-ja-apply-clicked')) continue;
    if (!isVisible(el)) continue;

    const name = (
      el.getAttribute('aria-label') ||
      el.innerText ||
      el.textContent ||
      el.getAttribute('value') ||
      ''
    ).trim();

    if (regex.test(name)) {
      let href = null;
      if (el.tagName === 'A' && el.href) {
        href = el.href;
      }
      el.setAttribute('data-ja-apply', '1');
      return { found: true, href: href };
    }
  }

  return { found: false, href: null };
})()`;

export async function clickApply(page: Page): Promise<Page | null> {
  for (const frame of page.frames()) {
    let res: { found: boolean; href: string | null };
    try {
      res = (await frame.evaluate(FIND_APPLY_BUTTON_SCRIPT)) as {
        found: boolean;
        href: string | null;
      };
    } catch {
      continue;
    }

    if (res && res.found) {
      if (
        res.href &&
        !res.href.startsWith('javascript:') &&
        !res.href.endsWith('#') &&
        normalizeUrl(res.href) !== normalizeUrl(page.url())
      ) {
        await page.goto(res.href);
        await settle(page);
        await page.bringToFront().catch(() => {});
        return page;
      }

      const popupPromise = page
        .context()
        .waitForEvent('page', { timeout: 6000 })
        .catch(() => null);

      const locator = frame.locator('[data-ja-apply="1"]').first();
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click().catch(() => {});
      await locator
        .evaluate((el) => {
          el.removeAttribute('data-ja-apply');
          el.setAttribute('data-ja-apply-clicked', '1');
        })
        .catch(() => {});

      const popup = await popupPromise;
      if (popup) {
        await settle(popup);
        await popup.bringToFront().catch(() => {});
        return popup;
      }

      await settle(page);
      await page.bringToFront().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return page;
    }
  }

  return null;
}

export async function hasLoginWall(page: Page): Promise<boolean> {
  for (const frame of page.frames()) {
    try {
      const hasPw = (await frame.evaluate(`
        (() => {
          const pwInputs = document.querySelectorAll('input[type="password"]');
          for (const el of pwInputs) {
            if (el.disabled) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return true;
          }
          return false;
        })()
      `)) as boolean;
      if (hasPw) return true;
    } catch {}
  }
  return false;
}

export async function hasVisibleCaptcha(page: Page): Promise<boolean> {
  const mainFrame = page.mainFrame();

  for (const frame of page.frames()) {
    const frameUrl = frame.url().toLowerCase();
    const isHcaptcha = frameUrl.includes('hcaptcha.com');
    const isCloudflare = frameUrl.includes('challenges.cloudflare.com');
    const isArkose = frameUrl.includes('arkoselabs.com') || frameUrl.includes('funcaptcha');
    const isGeetest = frameUrl.includes('geetest.com');
    const isRecaptcha =
      frameUrl.includes('/recaptcha/api2/anchor') ||
      frameUrl.includes('/recaptcha/enterprise/anchor') ||
      frameUrl.includes('/recaptcha/api2/bframe') ||
      frameUrl.includes('/recaptcha/enterprise/bframe');
    const isNotInvisible = !frameUrl.includes('size=invisible');

    if (isHcaptcha || isCloudflare || isArkose || isGeetest || (isRecaptcha && isNotInvisible)) {
      if (frame === mainFrame) return true;
      try {
        const frameEl = await frame.frameElement();
        const isVisible = (await frameEl.evaluate((el: any) => {
          const s = window.getComputedStyle(el);
          if (
            s.display === 'none' ||
            s.visibility === 'hidden' ||
            s.opacity === '0'
          ) {
            return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })) as boolean;

        if (isVisible) return true;
      } catch {}
    }
  }

  // Also check main document for visible captcha elements
  try {
    const hasDomCaptcha = (await page.evaluate(`(() => {
      function isVisible(el) {
        if (!el || el.nodeType !== 1) return false;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }

      const sel = '.g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey], #captcha, [id*="captcha" i]';
      const els = Array.from(document.querySelectorAll(sel));
      return els.some(isVisible);
    })()`)) as boolean;
    if (hasDomCaptcha) return true;
  } catch {}

  return false;
}

export async function tryBypassAuth(
  page: Page,
  profile: Profile,
  _settings?: Settings
): Promise<boolean> {
  if (!(await hasLoginWall(page))) {
    return true;
  }

  // Until step 17's vault exists, tryBypassAuth may only click "Continue with Google"
  // and pick the account in Google's chooser when the bot's Chrome profile is already signed in.
  // Otherwise return false. Never type a Google password.
  for (const frame of page.frames()) {
    try {
      const googleFound = (await frame.evaluate(`(() => {
        function isVisible(el) {
          if (!el || el.nodeType !== 1) return false;
          const s = window.getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }

        const candidates = Array.from(
          document.querySelectorAll('button, a, [role="button"], div[role="button"], [data-provider="google"], [data-automation-id*="google" i]')
        );

        for (const el of candidates) {
          if (el.disabled) continue;
          if (!isVisible(el)) continue;
          const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
          if (
            /sign in with google|continue with google|log in with google|google/i.test(text) ||
            el.getAttribute('data-provider') === 'google' ||
            (el.getAttribute('data-automation-id') || '').toLowerCase().includes('google')
          ) {
            el.setAttribute('data-ja-google', '1');
            return true;
          }
        }
        return false;
      })()`)) as boolean;

      if (googleFound) {
        const popupPromise = page
          .context()
          .waitForEvent('page', { timeout: 6000 })
          .catch(() => null);

        const locator = frame.locator('[data-ja-google="1"]').first();
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click().catch(() => {});

        const popup = await popupPromise;
        if (popup) {
          await settle(popup);
          // If Google account chooser is displayed, select user's account if matching profile.email
          await popup
            .evaluate((userEmail) => {
              const items = Array.from(
                document.querySelectorAll(
                  'li, div[role="link"], [data-email], [data-identifier]'
                )
              );
              for (const item of items) {
                const text = (item.textContent || '').toLowerCase();
                if (text.includes(userEmail.toLowerCase())) {
                  (item as HTMLElement).click();
                  return;
                }
              }
              const firstAcc = document.querySelector(
                '[data-authuser="0"], li[data-account-identifier], div[data-identifier]'
              );
              if (firstAcc) (firstAcc as HTMLElement).click();
            }, profile.email)
            .catch(() => {});

          await popup.waitForEvent('close', { timeout: 12000 }).catch(() => {});
        }

        await settle(page);
        if (!(await hasLoginWall(page))) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

export async function findApplyEmail(page: Page): Promise<string | null> {
  let bodyText = '';
  try {
    bodyText = (await page.evaluate(
      '(() => (document.body ? document.body.innerText || document.body.textContent || "" : ""))()'
    )) as string;
  } catch {
    return null;
  }

  const emailRegex = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
  let m: RegExpExecArray | null;

  while ((m = emailRegex.exec(bodyText)) !== null) {
    const email = m[0];
    const idx = m.index;
    const before = bodyText.slice(Math.max(0, idx - 250), idx);
    const after = bodyText.slice(
      idx + email.length,
      idx + email.length + 60
    );

    const hasApplyContext =
      /\b(cv|cvs|resume|apply|application|applications|send)\b/i.test(before) ||
      /\b(cv|cvs|resume|apply|application|applications|send)\b/i.test(after);

    if (hasApplyContext) {
      return email;
    }
  }

  return null;
}

export async function looksLikeListing(page: Page): Promise<boolean> {
  const form = await findFormFrame(page);
  if (form !== null) return false;

  let links: string[] = [];
  try {
    links = (await page.evaluate(`
      (() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors
          .map(function(a) { return a.href; })
          .filter(function(h) {
            return h && (h.startsWith('http://') || h.startsWith('https://') || h.startsWith('file://'));
          });
      })()
    `)) as string[];
  } catch {
    return false;
  }

  const distinctJobUrls = new Set<string>();
  for (const l of links) {
    if (classifyUrl(l) === 'job') {
      distinctJobUrls.add(normalizeUrl(l));
    }
  }

  return distinctJobUrls.size >= 5;
}

const SUCCESS_REGEX =
  /thank(?:s| you)[^.!\n]{0,40}(?:appl|interest|submission)|application (?:was |has been )?(?:successfully )?(?:submitted|received|sent|complete)|we(?:'ve| have) received your application|you(?:'ve| have) (?:successfully )?applied|successfully applied/gi;

async function collectSuccessMatches(page: Page): Promise<Set<string>> {
  const matches = new Set<string>();
  for (const frame of page.frames()) {
    try {
      const text = (await frame.evaluate(
        '(() => (document.body ? document.body.innerText || document.body.textContent || "" : ""))()'
      )) as string;
      const found = text.match(SUCCESS_REGEX) || [];
      for (const f of found) {
        matches.add(f.toLowerCase().trim());
      }
    } catch {}
  }
  return matches;
}

export async function submitAndConfirm(
  page: Page
): Promise<'confirmed' | 'unconfirmed' | 'no-button'> {
  // 1. Snapshot success matches
  const initialMatches = await collectSuccessMatches(page);
  const initialUrl = page.url();

  // 2. In form frame, find submit button
  const formInfo = await findFormFrame(page);
  const targetFrame = formInfo ? formInfo.frame : page.mainFrame();

  const buttonFound = (await targetFrame.evaluate(`
    (() => {
      function isVisible(el) {
        if (!el || el.nodeType !== 1) return false;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }

      const namedRegex = /submit|send application|complete application|^\s*apply\s*$/i;
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));

      let lastNamed = null;
      let lastSubmitType = null;

      for (const btn of buttons) {
        if (btn.disabled) continue;
        if (!isVisible(btn)) continue;

        const name = (
          btn.getAttribute('aria-label') ||
          btn.innerText ||
          btn.textContent ||
          btn.getAttribute('value') ||
          ''
        ).trim();

        if (namedRegex.test(name)) {
          lastNamed = btn;
        }

        const type = (btn.getAttribute('type') || '').toLowerCase();
        if (type === 'submit') {
          lastSubmitType = btn;
        }
      }

      const target = lastNamed || lastSubmitType;
      if (target) {
        target.setAttribute('data-ja-submit', '1');
        return true;
      }
      return false;
    })()
  `)) as boolean;

  if (!buttonFound) {
    return 'no-button';
  }

  // 3. Scroll to it and click it
  const submitBtn = targetFrame.locator('[data-ja-submit="1"]').last();
  await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
  await submitBtn.click().catch(() => {});

  // Wait every 1.5s for up to 20s
  const start = Date.now();
  const maxWaitMs = 20_000;

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 1500));

    if (page.isClosed()) {
      return 'unconfirmed';
    }

    try {
      const currentUrl = page.url();
      if (
        currentUrl !== initialUrl &&
        /thank|confirm|success|submitted|applied/i.test(currentUrl)
      ) {
        return 'confirmed';
      }

      const currentMatches = await collectSuccessMatches(page);
      for (const m of currentMatches) {
        if (!initialMatches.has(m)) {
          return 'confirmed';
        }
      }
    } catch {
      return 'unconfirmed';
    }
  }

  return 'unconfirmed';
}
