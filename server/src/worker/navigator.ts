import type { Page } from 'playwright';
import { aiNextStep, aiStatus, type NextStep } from '../ai.js';
import { settle } from './site.js';

/**
 * When the normal rules can't find the form (unfamiliar portals, multi-step
 * "Apply" flows), let the AI pick ONE click at a time from the page's
 * accessibility tree. Playwright does the clicking; the AI only chooses.
 */

export interface NavigateResult {
  outcome: 'done' | 'human' | 'stuck';
  reason: string;
  steps: number;
  page: Page;
}

const ALLOWED_ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'radio', 'checkbox', 'option']);

// Hard limits, whatever the AI says.
const FORBIDDEN_NAME =
  /submit|send (my )?application|finish application|complete application|withdraw|delete|remove|log ?out|sign ?out|pay\b|purchase|checkout|subscribe|with (linkedin|facebook|apple)|captcha/i;

async function snapshotOf(page: Page): Promise<string> {
  try {
    return await page.locator('body').ariaSnapshot({ timeout: 8000 });
  } catch {
    return '';
  }
}

export async function navigate(
  start: Page,
  goal: string,
  opts: { maxSteps?: number; onStep?: (message: string) => void } = {}
): Promise<NavigateResult> {
  if (!aiStatus().text) return { outcome: 'stuck', reason: 'No AI key set', steps: 0, page: start };

  let page = start;
  const maxSteps = opts.maxSteps ?? 5;
  const tried: string[] = [];
  let noChange = 0;

  for (let step = 1; step <= maxSteps; step++) {
    const before = await snapshotOf(page);
    if (!before) return { outcome: 'stuck', reason: 'Could not read the page', steps: step - 1, page };

    let next: NextStep;
    try {
      next = await aiNextStep({ snapshot: before, url: page.url(), goal, tried });
    } catch (err: any) {
      return { outcome: 'stuck', reason: `AI step failed: ${err?.message || err}`, steps: step - 1, page };
    }

    if (next.action !== 'click') {
      return { outcome: next.action, reason: next.reason, steps: step - 1, page };
    }

    const name = (next.name || '').trim();
    const role = next.role || '';
    if (!name || !ALLOWED_ROLES.has(role) || FORBIDDEN_NAME.test(name)) {
      tried.push(`refused ${role} "${name}"`);
      continue;
    }

    opts.onStep?.(`Trying "${name}"…`);
    const label = `${role} "${name}"`;
    let target = page.getByRole(role as any, { name, exact: true }).first();
    if ((await target.count().catch(() => 0)) === 0) {
      target = page.getByRole(role as any, { name }).first();
    }
    if ((await target.count().catch(() => 0)) === 0) {
      tried.push(`${label} (not found)`);
      continue;
    }

    const urlBefore = page.url();
    const popup = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
      await target.click({ timeout: 5000 });
    } catch {
      tried.push(`${label} (could not click)`);
      continue;
    }
    const opened = await popup;
    if (opened) {
      await opened.waitForLoadState('domcontentloaded').catch(() => undefined);
      page = opened;
    }
    await settle(page);

    const after = await snapshotOf(page);
    if (page.url() === urlBefore && after === before) {
      tried.push(`${label} (no change)`);
      if (++noChange >= 2) return { outcome: 'stuck', reason: 'Clicks are not changing the page', steps: step, page };
    } else {
      tried.push(label);
      noChange = 0;
    }
  }

  return { outcome: 'stuck', reason: `Still no form after ${maxSteps} steps`, steps: maxSteps, page };
}
