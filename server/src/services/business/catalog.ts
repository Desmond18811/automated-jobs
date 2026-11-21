import type { OfferId, Tier, Vertical } from '../../models/businessLead.model';

/**
 * What Business Mode sells and to whom. Hours and running costs drive pricing (pricing.ts); they are
 * calibrated so the default settings (₦7,500/h, 30% margin, ₦1,550/$) reproduce the price table in
 * docs/BUSINESS_MODE.md. Replace them with your own numbers as you learn your real build times.
 */

export interface CostItem {
  label: string;
  usdMonthly?: number;
  ngnMonthly?: number;
  ngnYearly?: number;
}

export interface TierSpec {
  buildHours: number;
  maintenanceHours: number;
  running: CostItem[];
  includes: string[];
}

export interface OfferSpec {
  id: OfferId;
  label: string;
  /** The visible problem this fixes, in plain words. */
  fixes: string;
  /** 2026 NGN market range for comparable work; `estimate` when not from a published source. */
  market: { setup: [number, number]; monthly: [number, number]; estimate: boolean; source?: string };
}

export interface ValueInput {
  id: string;
  label: string;
  unit: 'count' | 'naira' | 'hours' | 'percent';
  /** Present only for assumptions (rates, percentages); owner numbers have no default. */
  default?: number;
  /** The owner must give this for a value estimate. */
  ownerNumber: boolean;
}

export interface VerticalSpec {
  id: Vertical;
  label: string;
  /** OpenStreetMap tag filters for lead search (key=value, value "*" = any). */
  osmTags: Array<[string, string]>;
  primaryOffer: OfferId;
  primaryLabel: string;
  tiers: Record<Tier, TierSpec>;
  valueInputs: ValueInput[];
}

const DOMAIN: CostItem = { label: '.com domain (renewal ~₦20,000/yr)', ngnYearly: 20_000 };
const HOSTING_SHARED: CostItem = { label: 'Shared hosting (~₦25,000/yr)', ngnYearly: 25_000 };
const HOSTING_PLUS: CostItem = { label: 'Business hosting (~₦50,000/yr)', ngnYearly: 50_000 };

export const OFFERS: Record<OfferId, OfferSpec> = {
  website: {
    id: 'website',
    label: 'Business website',
    fixes: 'Customers searching for you find nothing, or an outdated page that does not work on a phone.',
    market: { setup: [150_000, 600_000], monthly: [20_000, 50_000], estimate: false, source: 'ConnectNigeria, Sonibaze, eBrand Promotion (2026)' },
  },
  ordering: {
    id: 'ordering',
    label: 'Direct online ordering / online store',
    fixes: 'Orders come through delivery apps that take a commission, or through WhatsApp chats someone has to answer by hand.',
    market: { setup: [350_000, 900_000], monthly: [30_000, 100_000], estimate: false, source: 'ConnectNigeria, Sonibaze, eBrand Promotion (2026)' },
  },
  booking: {
    id: 'booking',
    label: 'Online booking with reminders',
    fixes: 'Appointments are booked by phone or chat, and no-shows are not reminded.',
    market: { setup: [250_000, 700_000], monthly: [25_000, 90_000], estimate: true },
  },
  whatsapp_automation: {
    id: 'whatsapp_automation',
    label: 'WhatsApp automation',
    fixes: 'The same questions (price, location, opening hours) are answered by hand all day.',
    market: { setup: [150_000, 500_000], monthly: [25_000, 80_000], estimate: true },
  },
  workflow_automation: {
    id: 'workflow_automation',
    label: 'Workflow automation',
    fixes: 'Admin work (fees, records, reminders, reports) is done by hand in notebooks and spreadsheets.',
    market: { setup: [300_000, 1_200_000], monthly: [40_000, 150_000], estimate: true },
  },
  mobile_app: {
    id: 'mobile_app',
    label: 'Mobile app',
    fixes: 'Repeat customers have no simple way to reorder or rebook.',
    market: { setup: [800_000, 3_000_000], monthly: [60_000, 200_000], estimate: true },
  },
};

const timeInputs: ValueInput[] = [
  { id: 'waHoursPerDay', label: 'Hours a day staff spend answering WhatsApp/calls', unit: 'hours', ownerNumber: true },
  { id: 'staffHourlyCost', label: 'What an hour of that staff time costs (₦)', unit: 'naira', ownerNumber: true },
  { id: 'workingDaysPerMonth', label: 'Working days a month', unit: 'count', default: 26, ownerNumber: false },
  { id: 'timeSavedPct', label: 'Share of that time automation saves', unit: 'percent', default: 40, ownerNumber: false },
];

export const VERTICALS: Record<Exclude<Vertical, 'other'>, VerticalSpec> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant / food',
    osmTags: [['amenity', 'restaurant'], ['amenity', 'fast_food'], ['amenity', 'cafe']],
    primaryOffer: 'ordering',
    primaryLabel: 'Direct online ordering',
    tiers: {
      good: {
        buildHours: 16,
        maintenanceHours: 1.5,
        running: [DOMAIN, HOSTING_SHARED],
        includes: ['Menu page with WhatsApp order button', 'Google Maps listing tidy-up', 'Domain and hosting in your name'],
      },
      better: {
        buildHours: 40,
        maintenanceHours: 3,
        running: [DOMAIN, HOSTING_SHARED, { label: 'Ordering platform', usdMonthly: 8 }],
        includes: ['Direct ordering site with Paystack checkout', 'Order alerts to your WhatsApp', 'Menu you can edit yourself', 'Domain, hosting and code in your name'],
      },
      best: {
        buildHours: 70,
        maintenanceHours: 7,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Ordering platform', usdMonthly: 8 }, { label: 'WhatsApp Business Platform messages', usdMonthly: 4 }],
        includes: ['Everything in Better', 'Automated WhatsApp order confirmations and status updates', 'Repeat-customer reorder link', 'Monthly sales report'],
      },
    },
    valueInputs: [
      { id: 'appOrdersPerDay', label: 'Orders a day through delivery apps', unit: 'count', ownerNumber: true },
      { id: 'avgOrderValue', label: 'Average order value (₦)', unit: 'naira', ownerNumber: true },
      { id: 'appCommissionPct', label: 'App commission per order', unit: 'percent', default: 20, ownerNumber: false },
      { id: 'shiftToDirectPct', label: 'Share of app orders moved to direct ordering', unit: 'percent', default: 15, ownerNumber: false },
      ...timeInputs,
    ],
  },
  salon: {
    id: 'salon',
    label: 'Salon / spa / barber',
    osmTags: [['shop', 'hairdresser'], ['shop', 'beauty'], ['shop', 'barber']],
    primaryOffer: 'booking',
    primaryLabel: 'Online booking',
    tiers: {
      good: { buildHours: 15, maintenanceHours: 1.5, running: [DOMAIN, HOSTING_SHARED], includes: ['Services and price page', 'WhatsApp booking button', 'Domain and hosting in your name'] },
      better: {
        buildHours: 38.5,
        maintenanceHours: 3,
        running: [DOMAIN, HOSTING_SHARED, { label: 'Booking tool', usdMonthly: 10 }],
        includes: ['Online booking with deposits', 'Automatic reminders before appointments', 'Staff calendar', 'Domain, hosting and code in your name'],
      },
      best: {
        buildHours: 68,
        maintenanceHours: 7,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Booking tool', usdMonthly: 10 }, { label: 'WhatsApp Business Platform messages', usdMonthly: 4 }],
        includes: ['Everything in Better', 'WhatsApp reminders and rebooking', 'Loyalty / repeat-visit offers', 'Monthly report'],
      },
    },
    valueInputs: [
      { id: 'bookingsPerDay', label: 'Appointments a day', unit: 'count', ownerNumber: true },
      { id: 'avgBookingValue', label: 'Average appointment value (₦)', unit: 'naira', ownerNumber: true },
      { id: 'noShowPct', label: 'Share of appointments that are no-shows', unit: 'percent', ownerNumber: true },
      { id: 'noShowsPreventedPct', label: 'Share of no-shows reminders prevent', unit: 'percent', default: 30, ownerNumber: false },
      ...timeInputs,
    ],
  },
  clinic: {
    id: 'clinic',
    label: 'Clinic / dental / pharmacy',
    osmTags: [['amenity', 'clinic'], ['amenity', 'doctors'], ['amenity', 'dentist']],
    primaryOffer: 'booking',
    primaryLabel: 'Online booking',
    tiers: {
      good: { buildHours: 15, maintenanceHours: 1.5, running: [DOMAIN, HOSTING_SHARED], includes: ['Clinic page with services and hours', 'WhatsApp booking button', 'Domain and hosting in your name'] },
      better: {
        buildHours: 38.5,
        maintenanceHours: 3,
        running: [DOMAIN, HOSTING_SHARED, { label: 'Booking tool', usdMonthly: 10 }],
        includes: ['Online appointment booking', 'Automatic reminders', 'Patient intake form', 'Domain, hosting and code in your name'],
      },
      best: {
        buildHours: 68,
        maintenanceHours: 7,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Booking tool', usdMonthly: 10 }, { label: 'WhatsApp Business Platform messages', usdMonthly: 4 }],
        includes: ['Everything in Better', 'WhatsApp reminders and follow-ups', 'Simple records dashboard', 'Monthly report'],
      },
    },
    valueInputs: [
      { id: 'bookingsPerDay', label: 'Appointments a day', unit: 'count', ownerNumber: true },
      { id: 'avgBookingValue', label: 'Average appointment value (₦)', unit: 'naira', ownerNumber: true },
      { id: 'noShowPct', label: 'Share of appointments that are no-shows', unit: 'percent', ownerNumber: true },
      { id: 'noShowsPreventedPct', label: 'Share of no-shows reminders prevent', unit: 'percent', default: 30, ownerNumber: false },
      ...timeInputs,
    ],
  },
  shop: {
    id: 'shop',
    label: 'Shop / boutique',
    osmTags: [['shop', 'clothes'], ['shop', 'boutique'], ['shop', 'shoes'], ['shop', 'cosmetics'], ['shop', 'electronics'], ['shop', 'mobile_phone']],
    primaryOffer: 'ordering',
    primaryLabel: 'Online store',
    tiers: {
      good: { buildHours: 20, maintenanceHours: 2, running: [DOMAIN, HOSTING_SHARED], includes: ['Product catalogue page', 'WhatsApp order button', 'Domain and hosting in your name'] },
      better: {
        buildHours: 50.5,
        maintenanceHours: 4,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Store platform', usdMonthly: 12 }],
        includes: ['Online store with Paystack checkout', 'Stock you can update yourself', 'Order alerts to WhatsApp', 'Domain, hosting and code in your name'],
      },
      best: {
        buildHours: 88,
        maintenanceHours: 8,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Store platform', usdMonthly: 12 }, { label: 'WhatsApp Business Platform messages', usdMonthly: 5 }],
        includes: ['Everything in Better', 'Abandoned-order reminders', 'Delivery tracking messages', 'Monthly sales report'],
      },
    },
    valueInputs: [
      { id: 'lostOrdersPerWeek', label: 'Orders a week lost to slow or missed chats', unit: 'count', ownerNumber: true },
      { id: 'avgOrderValue', label: 'Average order value (₦)', unit: 'naira', ownerNumber: true },
      { id: 'recoveredPct', label: 'Share of those an online store recovers', unit: 'percent', default: 30, ownerNumber: false },
      ...timeInputs,
    ],
  },
  school: {
    id: 'school',
    label: 'School / training centre',
    osmTags: [['amenity', 'school'], ['amenity', 'college'], ['amenity', 'kindergarten']],
    primaryOffer: 'workflow_automation',
    primaryLabel: 'Workflow automation',
    tiers: {
      good: { buildHours: 24, maintenanceHours: 2, running: [DOMAIN, HOSTING_SHARED], includes: ['School website with admissions form', 'Domain and hosting in your name'] },
      better: {
        buildHours: 60.5,
        maintenanceHours: 6,
        running: [DOMAIN, HOSTING_SHARED, { label: 'Automation tools', usdMonthly: 15 }],
        includes: ['Fee tracking with automatic reminders to parents', 'Online admissions', 'Results and records in one place', 'Domain, hosting and code in your name'],
      },
      best: {
        buildHours: 105,
        maintenanceHours: 11,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Automation tools', usdMonthly: 15 }, { label: 'WhatsApp Business Platform messages', usdMonthly: 6 }],
        includes: ['Everything in Better', 'Parent WhatsApp updates', 'Staff attendance and payroll sheet', 'Termly report'],
      },
    },
    valueInputs: [
      { id: 'adminHoursPerWeek', label: 'Admin hours a week on fees, records and reminders', unit: 'hours', ownerNumber: true },
      { id: 'adminHourlyCost', label: 'What an hour of admin time costs (₦)', unit: 'naira', ownerNumber: true },
      { id: 'adminSavedPct', label: 'Share of that time automation saves', unit: 'percent', default: 50, ownerNumber: false },
      { id: 'lateFeesPerTerm', label: 'Fees paid late or chased each term (₦)', unit: 'naira', ownerNumber: false },
    ],
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real estate',
    osmTags: [['office', 'estate_agent']],
    primaryOffer: 'website',
    primaryLabel: 'Business website',
    tiers: {
      good: { buildHours: 12, maintenanceHours: 1, running: [DOMAIN, HOSTING_SHARED], includes: ['One-page site with listings and contact', 'Domain and hosting in your name'] },
      better: {
        buildHours: 28,
        maintenanceHours: 2,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Forms', usdMonthly: 2 }],
        includes: ['Listings you can update yourself', 'Enquiry form to WhatsApp and email', 'Google-friendly pages', 'Domain, hosting and code in your name'],
      },
      best: {
        buildHours: 50,
        maintenanceHours: 4,
        running: [DOMAIN, HOSTING_PLUS, { label: 'Forms', usdMonthly: 2 }, { label: 'WhatsApp Business Platform messages', usdMonthly: 3 }],
        includes: ['Everything in Better', 'Viewing booking', 'Automatic enquiry follow-up', 'Monthly enquiries report'],
      },
    },
    valueInputs: [
      { id: 'missedEnquiriesPerMonth', label: 'Enquiries a month that go unanswered or are missed', unit: 'count', ownerNumber: true },
      { id: 'closeRatePct', label: 'Share of enquiries that become deals', unit: 'percent', ownerNumber: true },
      { id: 'avgCommission', label: 'Average commission per deal (₦)', unit: 'naira', ownerNumber: true },
    ],
  },
};

export const verticalSpec = (v: string): VerticalSpec | undefined => (VERTICALS as Record<string, VerticalSpec>)[v];

/** For the UI. */
export function catalogForClient() {
  return {
    verticals: Object.values(VERTICALS).map((v) => ({ id: v.id, label: v.label, primaryOffer: v.primaryOffer, primaryLabel: v.primaryLabel, valueInputs: v.valueInputs })),
    offers: Object.values(OFFERS),
  };
}
