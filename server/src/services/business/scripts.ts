import type { IBusinessLead } from '../../models/businessLead.model';
import type { IBusinessServices } from '../../models/businessServices.model';
import { OFFERS, verticalSpec } from './catalog';

/**
 * Call and walk-in scripts plus objection answers. The posture: diagnose before prescribing, make
 * "no" easy, use their numbers not your claims, offer choice, remove the risk, and be willing to
 * walk away rather than cut margin.
 */
export function leadScripts(lead: Pick<IBusinessLead, 'name' | 'vertical' | 'audit'>, services: Pick<IBusinessServices, 'brandName' | 'guarantees' | 'capacityPerMonth'>, firstName?: string) {
  const spec = verticalSpec(lead.vertical);
  const offer = spec ? OFFERS[spec.primaryOffer] : OFFERS.website;
  const me = [firstName, services.brandName].filter(Boolean).join(' from ') || 'me';
  const top = lead.audit?.findings?.[0];
  const fact = top ? top.title.replace(/\.$/, '') : `I was looking at how customers reach ${lead.name}`;
  const liveBy = services.guarantees?.liveByDays;
  const risk = [
    services.guarantees?.ownership !== false && 'the domain, hosting and code are in your name from day one',
    liveBy && `it's live within ${liveBy} days or your first month is free`,
    'one fixed monthly fee covers changes and fixes',
  ].filter(Boolean) as string[];

  return {
    call: [
      `Hi, is this ${lead.name}? This is ${me}. Is now a bad time for a 30-second question?`,
      `[If yes, it's a bad time] No problem. When would be better? [Note it, end the call.]`,
      `${fact}. I put together a short free audit of it. Would it be crazy to send it to you on WhatsApp?`,
      `[If they're open] Can I ask how ${spec?.id === 'restaurant' ? 'orders come in today, and roughly how many a day go through the delivery apps' : spec?.id === 'salon' || spec?.id === 'clinic' ? 'appointments get booked today, and how many people don\'t show up' : 'customers reach you today, and who answers them'}?`,
      `[Listen. Write their numbers into the lead so the value estimate uses them.]`,
      `Based on that, I'd suggest a quick look at three options. Is it a bad idea to go through them this week? Does Thursday at 11 or Friday at 3 work better?`,
    ],
    walkIn: [
      `Ask for the owner or manager by role, not by sales pitch: "Who looks after how customers order/book here?"`,
      `Open with the fact, and show it on your phone: "${fact}. Here's what I mean." [Show the audit finding.]`,
      `Leave the printed one-pager: "This is yours to keep. Everything on it you can check yourself."`,
      `Ask one question: "Would it be a bad idea if I sent you the full audit on WhatsApp?" Record their answer as consent (or not).`,
      `Don't sell on the first visit. Leave within five minutes.`,
    ],
    objections: [
      {
        objection: "We've been burned by a developer before.",
        answer: `That happens a lot, and it's why ${risk.join('; ')}. You can take it all to someone else at any time.`,
      },
      { objection: "It's too expensive.", answer: "Fair. Then let's look at the smaller option; it does less, but it's the same quality. I won't cut the price of the bigger one, because then I can't support it properly." },
      { objection: 'My nephew / a friend does our website.', answer: "Great, keep him. The audit is yours either way; give it to him. If he'd rather not handle the ordering/booking side, I'm here." },
      { objection: 'We use WhatsApp; customers like it.', answer: `Good, so do I. This plugs into the WhatsApp you already use: ${offer.fixes.toLowerCase()} It doesn't replace your chats; it takes the repeat work out of them.` },
      { objection: 'Send me something and I will think about it.', answer: 'Sure. I will send the audit and three options. Is it okay if I check in on a specific day, say next Tuesday, or would you rather message me when you are ready?' },
      { objection: 'Not now.', answer: 'No problem at all. When would be a better time to look at it again? [Record the date.]' },
    ],
    // Only real capacity is ever mentioned; no invented scarcity.
    capacityNote: services.capacityPerMonth ? `You take on ${services.capacityPerMonth} new clients a month. Mention it only if they ask about timing.` : undefined,
    takeaway: `If after the options they're still unsure: "It sounds like this might not be the right time, and that's completely fine. Should I close the file for now?" Then stop following up.`,
  };
}
