import * as XLSX from 'xlsx';
import { AppError, isDupKey } from '../../lib/http';
import { logger } from '../../lib/logger';
import { shortId } from '../../lib/crypto';
import { BusinessLead, type BusinessLeadDoc, type IBusinessLead, type LeadContact, type LeadStatus, type OfferId, type Tier, type Vertical } from '../../models/businessLead.model';
import { BusinessServices, type BusinessServicesDoc } from '../../models/businessServices.model';
import { Profile } from '../../models/profile.model';
import { auditLead } from './audit';
import { verticalSpec, VERTICALS } from './catalog';
import { searchBusinesses } from './leadFinder';
import { composeFirstTouch, polishPitch, type Channel, type Variant } from './pitch';
import { quote } from './pricing';
import { leadScripts } from './scripts';
import { estimateValue } from './value';

/** Business Mode operations: services profile, leads (OSM / CSV / manual), audit, quote, pitch, status. */

export async function getServices(userId: string): Promise<BusinessServicesDoc> {
  return (await BusinessServices.findOne({ userId })) ?? (await BusinessServices.create({ userId, caseStudies: [] }));
}

export async function updateServices(userId: string, patch: Record<string, unknown>) {
  const s = await getServices(userId);
  s.set(patch);
  await s.save();
  return s;
}

async function sender(userId: string) {
  const [services, profile] = await Promise.all([getServices(userId), Profile.findOne({ userId })]);
  return { services, firstName: profile?.firstName || profile?.fullName?.split(' ')[0] || undefined };
}

async function getOwned(userId: string, id: string): Promise<BusinessLeadDoc> {
  const lead = await BusinessLead.findOne({ _id: id, userId });
  if (!lead) throw new AppError(404, 'Lead not found');
  return lead;
}

/** Audit in the background; one at a time so we don't hammer anyone's site. */
let auditChain: Promise<unknown> = Promise.resolve();
function queueAudit(leadId: string) {
  auditChain = auditChain
    .then(async () => {
      const lead = await BusinessLead.findById(leadId);
      if (!lead) return;
      lead.audit = await auditLead(lead);
      lead.markModified?.('audit');
      await lead.save();
    })
    .catch((err) => logger.warn({ err: (err as Error).message, leadId }, 'lead audit failed'));
}

export async function searchLeads(userId: string, vertical: string, area: string, radiusM?: number) {
  const { results, center, cached } = await searchBusinesses(vertical, area, radiusM);
  let added = 0;
  const leads: BusinessLeadDoc[] = [];
  for (const r of results) {
    const existing = await BusinessLead.findOne({ userId, osmId: r.osmId });
    if (existing) {
      // Refresh listing facts only; never touch status, notes, consent or the owner's numbers.
      existing.set({ name: r.name, website: r.website, contacts: r.contacts, address: r.address, location: r.location, openingHours: r.openingHours });
      await existing.save();
      leads.push(existing);
      continue;
    }
    try {
      const lead = await BusinessLead.create({ userId, source: 'osm', status: 'new', ...r, history: [{ from: null, to: 'new', at: new Date(), note: `found on OpenStreetMap (${area})` }] });
      leads.push(lead);
      added++;
      queueAudit(lead.id);
    } catch (err) {
      if (!isDupKey(err)) throw err;
    }
  }
  return { center, cached, added, leads, attribution: '© OpenStreetMap contributors' };
}

const CSV_ALIASES: Record<string, string[]> = {
  name: ['name', 'business', 'business name', 'company'],
  phone: ['phone', 'tel', 'telephone', 'mobile', 'whatsapp'],
  email: ['email', 'e-mail'],
  website: ['website', 'site', 'url', 'web'],
  area: ['area', 'location', 'city', 'address'],
  category: ['category', 'type', 'vertical', 'industry'],
  consent: ['consent', 'opted in', 'permission'],
  referred_by: ['referred_by', 'referred by', 'referral', 'referrer'],
};

function guessVertical(category = ''): Vertical {
  const c = category.toLowerCase();
  for (const v of Object.values(VERTICALS)) {
    if (c.includes(v.id.replace('_', ' ')) || c.includes(v.label.toLowerCase().split(' ')[0]) || v.osmTags.some(([, val]) => c.includes(val))) return v.id;
  }
  if (/food|eat|kitchen|grill|bakery|cafe/.test(c)) return 'restaurant';
  if (/hair|beauty|spa|nail|barb/.test(c)) return 'salon';
  if (/hospital|clinic|dental|pharm|medical/.test(c)) return 'clinic';
  if (/school|academy|college|tutor/.test(c)) return 'school';
  if (/real ?estate|property|realtor/.test(c)) return 'real_estate';
  if (/store|shop|boutique|fashion|retail/.test(c)) return 'shop';
  return 'other';
}

const truthy = (v: unknown) => /^(y|yes|true|1|opted ?in|consented)$/i.test(String(v ?? '').trim());

/** CSV or XLSX with a header row. Unknown columns are ignored; rows without a name are skipped. */
export async function importLeads(userId: string, buf: Buffer) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const pick = (row: Record<string, unknown>, field: string) => {
    const key = Object.keys(row).find((k) => CSV_ALIASES[field].includes(k.toLowerCase().trim()));
    return key ? String(row[key] ?? '').trim() : '';
  };
  let created = 0;
  const skipped: string[] = [];
  for (const [i, row] of rows.slice(0, 1000).entries()) {
    const name = pick(row, 'name');
    if (!name) {
      skipped.push(`row ${i + 2}: no name`);
      continue;
    }
    const contacts: LeadContact[] = [];
    if (pick(row, 'phone')) contacts.push({ kind: 'phone', value: pick(row, 'phone'), isBusinessLine: true });
    if (pick(row, 'email')) contacts.push({ kind: 'email', value: pick(row, 'email'), isBusinessLine: true });
    const consentGiven = truthy(pick(row, 'consent'));
    const referredBy = pick(row, 'referred_by') || undefined;
    const lead = await BusinessLead.create({
      userId,
      source: referredBy ? 'referral' : 'csv',
      status: 'new',
      name,
      vertical: guessVertical(pick(row, 'category')),
      category: pick(row, 'category') || undefined,
      area: pick(row, 'area') || undefined,
      website: pick(row, 'website') || undefined,
      contacts,
      referredBy,
      consent: consentGiven ? { given: true, at: new Date(), channel: 'import', note: 'marked as consented in the imported sheet' } : undefined,
      history: [{ from: null, to: 'new', at: new Date(), note: 'imported' }],
    });
    created++;
    queueAudit(lead.id);
  }
  return { created, skipped };
}

export async function addLead(userId: string, body: Partial<IBusinessLead>) {
  const lead = await BusinessLead.create({
    userId,
    source: body.referredBy ? 'referral' : 'manual',
    status: 'new',
    name: body.name!,
    vertical: body.vertical ?? 'other',
    category: body.category,
    area: body.area,
    address: body.address,
    website: body.website,
    contacts: body.contacts ?? [],
    referredBy: body.referredBy,
    consent: body.consent?.given ? { ...body.consent, at: body.consent.at ?? new Date() } : undefined,
    history: [{ from: null, to: 'new', at: new Date(), note: 'added by you' }],
  });
  queueAudit(lead.id);
  return lead;
}

export async function listLeads(userId: string, filter: { status?: string; vertical?: string }) {
  const q: Record<string, unknown> = { userId };
  if (filter.status) q.status = filter.status;
  if (filter.vertical) q.vertical = filter.vertical;
  return BusinessLead.find(q).sort({ updatedAt: -1 }).limit(500);
}

export async function getLead(userId: string, id: string) {
  const lead = await getOwned(userId, id);
  const value = estimateValue(lead.vertical, lead.valueInputs ?? {});
  return { lead, value };
}

export async function patchLead(userId: string, id: string, patch: { contacts?: LeadContact[]; valueInputs?: Record<string, number>; note?: string; consent?: IBusinessLead['consent']; vertical?: Vertical; website?: string; name?: string; area?: string }) {
  const lead = await getOwned(userId, id);
  const { note, consent, valueInputs, ...rest } = patch;
  lead.set(rest);
  if (valueInputs) {
    lead.valueInputs = { ...(lead.valueInputs ?? {}), ...valueInputs };
    lead.markModified?.('valueInputs');
  }
  if (consent) lead.consent = { ...consent, at: consent.at ?? new Date() };
  if (note?.trim()) lead.notes.push({ text: note.trim(), at: new Date() });
  await lead.save();
  return lead;
}

export async function rerunAudit(userId: string, id: string) {
  const lead = await getOwned(userId, id);
  lead.audit = await auditLead(lead);
  lead.markModified?.('audit');
  await lead.save();
  return lead;
}

export async function quoteLead(userId: string, id: string, offer?: OfferId) {
  const lead = await getOwned(userId, id);
  if (!verticalSpec(lead.vertical)) throw new AppError(400, 'Set the lead’s business type first; pricing depends on it.');
  const services = await getServices(userId);
  const value = estimateValue(lead.vertical, lead.valueInputs ?? {});
  lead.quote = quote(lead.vertical, services, value?.monthly || undefined, offer);
  lead.markModified?.('quote');
  await lead.save();
  return { lead, value };
}

export async function pitchLead(userId: string, id: string, variant: Variant, channel: Channel, polish: boolean) {
  const lead = await getOwned(userId, id);
  const s = await sender(userId);
  let draft = composeFirstTouch(lead, s, variant, channel);
  if (polish) draft = await polishPitch(draft, lead, s);
  const pitch = { id: shortId(), createdAt: new Date(), ...draft };
  lead.pitches = [pitch, ...(lead.pitches ?? [])].slice(0, 20);
  lead.markModified?.('pitches');
  await lead.save();
  return { lead, pitch };
}

export async function scriptsFor(userId: string, id: string) {
  const lead = await getOwned(userId, id);
  const s = await sender(userId);
  return leadScripts(lead, s.services, s.firstName);
}

const MOVES: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'replied', 'call_booked', 'won', 'lost'],
  contacted: ['replied', 'call_booked', 'won', 'lost', 'new'],
  replied: ['call_booked', 'won', 'lost', 'contacted'],
  call_booked: ['won', 'lost', 'replied'],
  won: ['lost'],
  lost: ['new', 'contacted'],
};

export async function moveLead(
  userId: string,
  id: string,
  to: LeadStatus,
  extra: { note?: string; lostReason?: string; deal?: { offer?: OfferId; tier: Tier; setup?: number; monthly?: number } },
) {
  const lead = await getOwned(userId, id);
  if (!MOVES[lead.status].includes(to)) throw new AppError(400, `Can't move a lead from ${lead.status} to ${to}.`);
  if (to === 'lost' && !extra.lostReason?.trim()) throw new AppError(400, 'Say why it was lost; the reasons feed your stats.');
  if (to === 'won') {
    if (!extra.deal?.tier) throw new AppError(400, 'Record the deal: which tier they chose.');
    const fromQuote = lead.quote?.tiers.find((t) => t.tier === extra.deal!.tier);
    const setup = extra.deal.setup ?? fromQuote?.setup;
    const monthly = extra.deal.monthly ?? fromQuote?.monthly;
    if (setup === undefined || monthly === undefined) throw new AppError(400, 'Record the agreed setup and monthly fee (or quote the lead first).');
    if (lead.quote && (setup < lead.quote.floor.setup || monthly < lead.quote.floor.monthly) && extra.deal.tier === 'better') {
      throw new AppError(400, `That is below your walk-away price (₦${lead.quote.floor.setup.toLocaleString('en-NG')} + ₦${lead.quote.floor.monthly.toLocaleString('en-NG')}/month). Trade scope (Good), not margin.`);
    }
    lead.deal = { offer: extra.deal.offer ?? lead.quote?.offer ?? verticalSpec(lead.vertical)?.primaryOffer ?? 'website', tier: extra.deal.tier, setup, monthly, startedAt: new Date() };
  }
  if (to === 'lost') lead.lostReason = extra.lostReason!.trim();
  lead.history.push({ from: lead.status, to, at: new Date(), note: extra.note });
  lead.status = to;
  await lead.save();
  return lead;
}

export async function deleteLead(userId: string, id: string) {
  const lead = await getOwned(userId, id);
  await BusinessLead.deleteOne({ _id: lead._id });
}
