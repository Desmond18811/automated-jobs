import { verticalSpec } from './catalog';

/**
 * What the offer is worth to the owner per month, computed from THEIR numbers. Assumptions
 * (percentages, working days) are always listed back, and the result is phrased as a conditional,
 * never as a promise. No owner numbers → no estimate.
 */
export interface ValueEstimate {
  monthly: number;
  parts: Array<{ label: string; monthly: number; formula: string }>;
  assumptions: string[];
  /** "If about 25 orders a day go through the apps…" */
  sentence: string;
  missing: string[];
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export function estimateValue(vertical: string, inputs: Record<string, number | undefined>): ValueEstimate | null {
  const spec = verticalSpec(vertical);
  if (!spec) return null;
  const v = (id: string) => {
    const given = inputs[id];
    if (given !== undefined && given !== null && !Number.isNaN(Number(given))) return Number(given);
    return spec.valueInputs.find((i) => i.id === id)?.default;
  };
  const assumptions = spec.valueInputs
    .filter((i) => i.default !== undefined && (inputs[i.id] === undefined || inputs[i.id] === null))
    .map((i) => `${i.label}: ${i.default}${i.unit === 'percent' ? '%' : ''} (assumed; change it if you know better)`);

  const parts: ValueEstimate['parts'] = [];
  const sentences: string[] = [];
  const days = v('workingDaysPerMonth') ?? 26;

  // Staff time on WhatsApp/calls (restaurant, salon, clinic, shop)
  const timePart = () => {
    const hours = v('waHoursPerDay');
    const rate = v('staffHourlyCost');
    const saved = v('timeSavedPct');
    if (hours === undefined || rate === undefined || saved === undefined) return;
    const m = hours * days * rate * (saved / 100);
    parts.push({ label: 'Staff time freed', monthly: m, formula: `${hours} h/day × ${days} days × ${naira(rate)} × ${saved}%` });
    sentences.push(`if staff spend about ${hours} hours a day on WhatsApp and automation saves ${saved}% of it, that frees roughly ${naira(m)} of time a month`);
  };

  switch (spec.id) {
    case 'restaurant': {
      const orders = v('appOrdersPerDay');
      const aov = v('avgOrderValue');
      const commission = v('appCommissionPct')!;
      const shift = v('shiftToDirectPct')!;
      if (orders !== undefined && aov !== undefined) {
        const m = orders * days * aov * (shift / 100) * (commission / 100);
        parts.push({ label: 'App commission kept', monthly: m, formula: `${orders} orders/day × ${days} days × ${naira(aov)} × ${shift}% moved × ${commission}% commission` });
        sentences.push(`if about ${orders} orders a day go through the apps at around ${commission}% commission, moving ${shift}% of them to direct orders keeps roughly ${naira(m)} a month with you`);
      }
      timePart();
      break;
    }
    case 'salon':
    case 'clinic': {
      const bookings = v('bookingsPerDay');
      const value = v('avgBookingValue');
      const noShow = v('noShowPct');
      const prevented = v('noShowsPreventedPct')!;
      if (bookings !== undefined && value !== undefined && noShow !== undefined) {
        const m = bookings * days * (noShow / 100) * (prevented / 100) * value;
        parts.push({ label: 'No-shows recovered', monthly: m, formula: `${bookings}/day × ${days} days × ${noShow}% no-show × ${prevented}% prevented × ${naira(value)}` });
        sentences.push(`if ${noShow}% of about ${bookings} daily appointments don't show and reminders prevent ${prevented}% of those, that's roughly ${naira(m)} a month back`);
      }
      timePart();
      break;
    }
    case 'shop': {
      const lost = v('lostOrdersPerWeek');
      const aov = v('avgOrderValue');
      const rec = v('recoveredPct')!;
      if (lost !== undefined && aov !== undefined) {
        const m = lost * (52 / 12) * aov * (rec / 100);
        parts.push({ label: 'Orders recovered', monthly: m, formula: `${lost}/week × 4.33 × ${naira(aov)} × ${rec}% recovered` });
        sentences.push(`if about ${lost} orders a week slip away in slow chats and a store recovers ${rec}% of them, that's roughly ${naira(m)} a month`);
      }
      timePart();
      break;
    }
    case 'school': {
      const hours = v('adminHoursPerWeek');
      const rate = v('adminHourlyCost');
      const saved = v('adminSavedPct')!;
      if (hours !== undefined && rate !== undefined) {
        const m = hours * (52 / 12) * rate * (saved / 100);
        parts.push({ label: 'Admin time freed', monthly: m, formula: `${hours} h/week × 4.33 × ${naira(rate)} × ${saved}%` });
        sentences.push(`if admin spends about ${hours} hours a week on fees and records and automation saves ${saved}%, that frees roughly ${naira(m)} a month`);
      }
      const late = inputs.lateFeesPerTerm;
      if (late) {
        // Fees are collected, not created: count only the cost of chasing them, which the time part covers.
        sentences.push(`and reminders go out automatically for the ${naira(late)} in fees that are chased each term`);
      }
      break;
    }
    case 'real_estate': {
      const missed = v('missedEnquiriesPerMonth');
      const close = v('closeRatePct');
      const commission = v('avgCommission');
      if (missed !== undefined && close !== undefined && commission !== undefined) {
        const m = missed * (close / 100) * commission;
        parts.push({ label: 'Deals from answered enquiries', monthly: m, formula: `${missed} enquiries × ${close}% close × ${naira(commission)}` });
        sentences.push(`if about ${missed} enquiries a month go unanswered and ${close}% of answered ones close at around ${naira(commission)}, that's roughly ${naira(m)} a month`);
      }
      break;
    }
  }

  const missing = spec.valueInputs.filter((i) => i.ownerNumber && (inputs[i.id] === undefined || inputs[i.id] === null)).map((i) => i.label);
  if (!parts.length) return { monthly: 0, parts, assumptions, sentence: '', missing };
  const monthly = Math.round(parts.reduce((a, p) => a + p.monthly, 0));
  const sentence = `${sentences.join('; ')}. Together that's about ${naira(monthly)} a month, based on your numbers.`;
  return { monthly, parts: parts.map((p) => ({ ...p, monthly: Math.round(p.monthly) })), assumptions, sentence: sentence.charAt(0).toUpperCase() + sentence.slice(1), missing };
}
