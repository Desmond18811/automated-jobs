import type { IBusinessServices } from '../../models/businessServices.model';
import type { LeadQuote, OfferId, QuoteTier, Tier } from '../../models/businessLead.model';
import { OFFERS, verticalSpec, type TierSpec } from './catalog';

/**
 * Good / Better / Best from three layers (docs/BUSINESS_MODE.md §3):
 *  cost      setup = build hours × rate; monthly = running costs + maintenance hours × rate
 *  floor     setup cost + 20% contingency; monthly cost + 10% buffer (walk-away: never quote below)
 *  price     floor × (1 + margin). Better is also lifted to the market minimum and to 15% of the
 *            owner's monthly value. Best is at least 1.7× Better; Good at most 60% of Better.
 * Prices round to ₦10,000 (setup) and ₦5,000 (monthly); floors round up.
 */

type Settings = Pick<IBusinessServices, 'hourlyRate' | 'fxRate' | 'marginPct'>;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const ceilTo = (n: number, step: number) => Math.ceil(n / step) * step;

export function tierCost(t: TierSpec, s: Settings) {
  const running = t.running.reduce((sum, c) => sum + (c.usdMonthly ?? 0) * s.fxRate + (c.ngnMonthly ?? 0) + (c.ngnYearly ?? 0) / 12, 0);
  return { setup: t.buildHours * s.hourlyRate, monthly: running + t.maintenanceHours * s.hourlyRate, running };
}

function priceTier(t: TierSpec, s: Settings) {
  const cost = tierCost(t, s);
  const floorExact = { setup: cost.setup * 1.2, monthly: cost.monthly * 1.1 };
  const m = 1 + s.marginPct / 100;
  return {
    cost,
    floorExact,
    floor: { setup: ceilTo(floorExact.setup, 10_000), monthly: ceilTo(floorExact.monthly, 5_000) },
    price: { setup: roundTo(floorExact.setup * m, 10_000), monthly: roundTo(floorExact.monthly * m, 5_000) },
  };
}

export function quote(vertical: string, s: Settings, monthlyValue?: number, offer?: OfferId): LeadQuote {
  const spec = verticalSpec(vertical);
  if (!spec) throw new Error(`No pricing for vertical "${vertical}"`);
  const offerId = offer ?? spec.primaryOffer;
  const market = OFFERS[offerId].market;
  const warnings: string[] = [];

  const g = priceTier(spec.tiers.good, s);
  const b = priceTier(spec.tiers.better, s);
  const x = priceTier(spec.tiers.best, s);

  // Better: the highest of margin price, market minimum, and 15% of the owner's monthly value.
  const better = { ...b.price };
  if (better.setup < market.setup[0]) better.setup = market.setup[0];
  if (better.monthly < market.monthly[0]) better.monthly = market.monthly[0];
  if (monthlyValue && better.monthly < roundTo(monthlyValue * 0.15, 5_000)) better.monthly = roundTo(monthlyValue * 0.15, 5_000);

  const best = {
    setup: Math.max(x.price.setup, roundTo(better.setup * 1.7, 10_000)),
    monthly: Math.max(x.price.monthly, roundTo(better.monthly * 1.7, 5_000)),
  };
  const good = {
    setup: Math.max(g.floor.setup, Math.min(g.price.setup, roundTo(better.setup * 0.6, 10_000))),
    monthly: Math.max(g.floor.monthly, Math.min(g.price.monthly, roundTo(better.monthly * 0.6, 5_000))),
  };

  if (monthlyValue && better.monthly > monthlyValue / 3) {
    warnings.push(`Thin value case: the Better monthly fee is more than a third of the estimated monthly gain (₦${Math.round(monthlyValue).toLocaleString('en-NG')}). Lead with Good, or get better numbers from the owner.`);
  }
  if (market.estimate) warnings.push(`Market range for ${OFFERS[offerId].label} is an estimate; replace it with your own win/loss data.`);

  const tier = (t: Tier, p: { setup: number; monthly: number }, includes: string[], recommended = false): QuoteTier => ({ tier: t, setup: p.setup, monthly: p.monthly, includes, recommended });
  const yearly = Math.round((better.monthly * 10) / 1000) * 1000;
  return {
    offer: offerId,
    createdAt: new Date(),
    // Shown in this order: Best first (the anchor), Better in the middle and recommended.
    tiers: [tier('best', best, spec.tiers.best.includes), tier('better', better, spec.tiers.better.includes, true), tier('good', good, spec.tiers.good.includes)],
    floor: b.floor,
    cost: { setup: Math.round(b.cost.setup), monthly: Math.round(b.cost.monthly) },
    monthlyValue,
    warnings,
    paymentOptions: [
      { id: 'standard', label: 'Standard', detail: `50% (₦${(better.setup / 2).toLocaleString('en-NG')}) to start, 50% at launch; 6-month minimum` },
      {
        id: 'low_upfront',
        label: 'Low upfront',
        detail: `25% (₦${(better.setup / 4).toLocaleString('en-NG')}) to start, the rest spread over 12 months (₦${Math.round((better.setup * 0.75) / 12).toLocaleString('en-NG')}/month on top of the monthly fee); leaving early pays the balance`,
      },
      { id: 'yearly', label: 'Pay yearly', detail: `₦${yearly.toLocaleString('en-NG')} for 12 months of the monthly fee (2 months free)` },
    ],
  };
}
