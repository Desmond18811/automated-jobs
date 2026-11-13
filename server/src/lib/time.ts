export interface SendingWindow {
  sendingHours: { start: number; end: number; timezone: string };
  weekdaysOnly: boolean;
}

export function localParts(timeZone: string, d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: get('weekday'),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function inWindow(rules: SendingWindow, at: Date): boolean {
  const p = localParts(rules.sendingHours.timezone, at);
  if (rules.weekdaysOnly && (p.weekday === 'Sat' || p.weekday === 'Sun')) return false;
  return p.hour >= rules.sendingHours.start && p.hour < rules.sendingHours.end;
}

/** Minutes until sending is allowed (0 = now). Walks in 15-minute steps, so DST and odd zones just work. */
export function minutesUntilWindow(rules: SendingWindow, now = new Date()): number {
  for (let m = 0; m <= 8 * 24 * 60; m += 15) {
    if (inWindow(rules, new Date(now.getTime() + m * 60_000))) return m;
  }
  return 60;
}

/** Minutes until the first sending window of the next local day (used when the daily cap is used up). */
export function minutesUntilNextDayWindow(rules: SendingWindow, now = new Date()): number {
  const p = localParts(rules.sendingHours.timezone, now);
  const toMidnight = (24 - p.hour) * 60 - p.minute;
  const midnight = new Date(now.getTime() + toMidnight * 60_000);
  return toMidnight + minutesUntilWindow(rules, midnight);
}
