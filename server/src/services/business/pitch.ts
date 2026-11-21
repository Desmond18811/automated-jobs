import { z } from 'zod';
import type { IBusinessLead, LeadPitch } from '../../models/businessLead.model';
import type { IBusinessServices } from '../../models/businessServices.model';
import { buildBusinessVocab, checkFacts } from '../documents/factGuard';
import { guarded } from '../documents/generators';
import { completeJson, llmEnabled } from '../documents/llm';
import { OFFERS, verticalSpec } from './catalog';

/**
 * The first touch asks permission, not for time: one checkable fact about THEIR business, who you
 * are in a line, the offer of a free audit, and an easy-to-answer question. 60-110 words, no money
 * figures (value only comes after they reply), no fear copy, no invented proof.
 */

export type Variant = LeadPitch['variant'];
export type Channel = LeadPitch['channel'];

interface Sender {
  firstName?: string;
  services: Pick<IBusinessServices, 'brandName' | 'city' | 'publicPhone' | 'publicEmail' | 'caseStudies'>;
}

type LeadForPitch = Pick<IBusinessLead, 'name' | 'vertical' | 'area' | 'audit' | 'contacts' | 'website'>;

const PLURAL: Record<string, string> = {
  restaurant: 'restaurants',
  salon: 'salons',
  clinic: 'clinics',
  shop: 'shops',
  school: 'schools',
  real_estate: 'estate agents',
  other: 'local businesses',
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** wa.me needs international digits; Nigerian local numbers (0803…) become 234803…. */
export function waNumber(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 11) d = `234${d.slice(1)}`;
  return d.length >= 10 ? d : null;
}

function observation(lead: LeadForPitch): { fact: string; question: string } {
  const f = lead.audit?.findings?.[0];
  if (!f) return { fact: `I came across ${lead.name}${lead.area ? ` in ${lead.area}` : ''}.`, question: `how customers find and reach ${lead.name} online` };
  switch (f.id) {
    case 'no_website_listed':
      return { fact: `I couldn't find a website listed for ${lead.name} on the map.`, question: 'how new customers find you when they search' };
    case 'not_mobile':
      return { fact: `I opened ${lead.name}'s website on my phone and had to pinch and zoom to read it.`, question: 'how many of your visitors come from phones' };
    case 'no_online_ordering':
      return { fact: `I looked at ${lead.name}'s website and couldn't find a way to order without calling or messaging.`, question: 'how orders reach you today' };
    case 'no_online_booking':
      return { fact: `I looked at ${lead.name}'s website and couldn't find a way to book a time without calling.`, question: 'how customers book with you today' };
    case 'site_unreachable':
      return { fact: `The website listed for ${lead.name} didn't open when I tried it today.`, question: 'whether that site is still the one you use' };
    case 'no_https':
      return { fact: `${lead.name}'s website shows "Not secure" in the browser.`, question: 'whether customers have mentioned it' };
    default:
      return { fact: `${f.title.replace(/\.$/, '')} on ${lead.name}'s website.`, question: 'how customers reach you today' };
  }
}

function signature(sender: Sender): string {
  const who = [sender.firstName, sender.services.brandName].filter(Boolean).join(', ');
  return who || 'Thanks';
}

export function composeFirstTouch(lead: LeadForPitch, sender: Sender, variant: Variant, channel: Channel): Omit<LeadPitch, 'id' | 'createdAt'> {
  const spec = verticalSpec(lead.vertical);
  const offer = spec ? OFFERS[spec.primaryOffer] : OFFERS.website;
  const who = sender.firstName ? `I'm ${sender.firstName}` : "I'm a developer";
  const where = sender.services.city ? ` in ${sender.services.city}` : '';
  const brand = sender.services.brandName ? ` at ${sender.services.brandName}` : '';
  const helps = `I build ${offer.label.toLowerCase()} for ${PLURAL[lead.vertical] ?? 'local businesses'}${where}, set up so it works with the WhatsApp you already use`;
  const audit = `I put together a short, free audit of ${lead.name}'s online presence, with a few things you can check yourself in a minute each. It's yours to keep either way.`;
  const ask = 'Would you like me to send it over?';
  const { fact, question } = observation(lead);
  const proofCase = sender.services.caseStudies.find((c) => c.permissionToShare && (!c.vertical || c.vertical === lead.vertical)) ?? sender.services.caseStudies.find((c) => c.permissionToShare);

  let lines: string[];
  if (variant === 'question') {
    lines = [`Hi ${lead.name} team, quick question: ${question}?`, `${fact} ${who}${brand}; ${helps}.`, audit, ask];
  } else if (variant === 'proof' && proofCase) {
    lines = [`Hi ${lead.name} team. ${fact}`, `${who}${brand}. I recently worked with ${proofCase.name}: ${proofCase.result.replace(/\.$/, '')}.`, audit, ask];
  } else {
    lines = [`Hi ${lead.name} team. ${fact}`, `${who}${brand}; ${helps}.`, audit, ask];
  }
  const sig = signature(sender);
  let body = `${lines.join('\n\n')}\n\n${sig}`;
  if (words(body) < 60) body = `${lines.join('\n\n')}\n\nIf now isn't a good time, no problem at all; a quick "no" is fine.\n\n${sig}`;

  const phone = lead.contacts.find((c) => c.kind === 'whatsapp') ?? lead.contacts.find((c) => c.kind === 'phone');
  const wa = channel === 'whatsapp' && phone ? waNumber(phone.value) : null;
  return {
    variant: variant === 'proof' && !proofCase ? 'observation' : variant,
    channel,
    subject: channel === 'email' ? `Free audit for ${lead.name}` : undefined,
    body,
    // The user opens this and presses send themselves; JAVI never messages businesses from your number.
    waLink: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(body)}` : undefined,
  };
}

/** Facts a pitch may use: yours (services, shareable case studies) and theirs (name, area, audit). */
export function pitchVocab(lead: LeadForPitch, sender: Sender) {
  const s = sender.services;
  return buildBusinessVocab({
    ownFacts: [
      sender.firstName ?? '',
      s.brandName ?? '',
      s.city ?? '',
      s.publicPhone ?? '',
      s.publicEmail ?? '',
      ...s.caseStudies.filter((c) => c.permissionToShare).flatMap((c) => [c.name, c.result, c.url ?? '', c.offer ?? '']),
      ...Object.values(OFFERS).map((o) => `${o.label} ${o.fixes}`),
      'WhatsApp Google Maps',
    ],
    leadFacts: [lead.name, lead.area ?? '', lead.website ?? '', ...(lead.audit?.findings ?? []).flatMap((f) => [f.title, f.evidence, f.howToCheck])],
    expected: [lead.name, lead.area ?? ''],
  });
}

/** Blocks money figures and percentages in a first touch, on top of the fact guard. */
export function firstTouchProblems(body: string): string[] {
  const problems: string[] = [];
  if (/₦|\bNGN\b|\$|%|\bnaira\b/i.test(body)) problems.push('A first message must not mention money or percentages.');
  const n = words(body);
  if (n < 60 || n > 110) problems.push(`Keep it between 60 and 110 words (this is ${n}).`);
  return problems;
}

const Polished = z.object({ body: z.string() });

/**
 * Optional: let the model smooth the template's wording. The result must pass the fact guard and the
 * first-touch rules, or the template is used as-is.
 */
export async function polishPitch(draft: Omit<LeadPitch, 'id' | 'createdAt'>, lead: LeadForPitch, sender: Sender) {
  if (!llmEnabled()) return { ...draft, polished: false };
  const vocab = pitchVocab(lead, sender);
  try {
    const { value, check } = await guarded(
      (feedback) =>
        completeJson(Polished, {
          system:
            'You lightly edit a short first message to a small business owner. Keep every fact exactly as given and add none: no numbers, prices, percentages, statistics, clients or claims that are not in the draft. Keep it warm, plain and specific, 60-110 words, ending with the same yes/no question. Return {"body": "..."}',
          prompt: `DRAFT:\n${draft.body}${feedback?.length ? `\n\nFIX THESE PROBLEMS:\n- ${feedback.join('\n- ')}` : ''}`,
          maxTokens: 400,
        }),
      (v) => [v.body],
      vocab,
    );
    if (!check.passed || firstTouchProblems(value.body).length) return { ...draft, polished: false };
    return { ...draft, body: value.body, waLink: draft.waLink ? draft.waLink.replace(/\?text=.*$/, `?text=${encodeURIComponent(value.body)}`) : undefined, polished: true };
  } catch {
    return { ...draft, polished: false };
  }
}

/** For tests: run the deterministic checks on any text. */
export function checkPitch(body: string, lead: LeadForPitch, sender: Sender) {
  return { facts: checkFacts([body], pitchVocab(lead, sender)), rules: firstTouchProblems(body) };
}
