# JAVI Business Mode (Phase 7)

Business Mode finds small businesses with a visible, fixable problem and proves the problem to them with a free audit. It then sells a monthly service (website, ordering, booking, WhatsApp or workflow automation), priced so every client stays profitable for as long as they stay.

**Status (21 Nov 2026):**
- **Round 1 is built:** real leads, audit, value estimate, pricing, fact-checked first messages, scripts, lead board.
- **Round 2 is next:** outreach sequence, unsubscribe, public audit page, PDFs, stats.
- **Lead search uses OpenStreetMap, not Google Places.**

## 1. What the research says (summary)

| Finding | So JAVI… |
|---|---|
| **WhatsApp first.** Nigerian SMEs live on WhatsApp and phone: in 74,900+ listings, 99.5% had a phone and only 5 had an email (myhustle.space). WhatsApp Business is their most-used tool (PwC 2024). | Never pitches "a website instead of WhatsApp". Pitches "plugs into the WhatsApp you already use". Walk-ins, calls and WhatsApp *sent by you* are first-class channels. |
| **Ask for interest, briefly.** Interest-based first touches beat meeting requests (Gong, 304k emails), generic ROI claims hurt, and the shortest emails get the most replies. | First touch = a permission question ("want me to send the free audit?"), 60-110 words, no money figures. Value appears only after they reply. |
| **Show, don't tell.** A specific audit with their name on it beats "I build websites". | Every lead gets an automatic audit. Every finding has evidence plus "how to check it in a minute". |
| **Speed after interest.** Leads contacted within an hour qualify about 7× more often (HBR 2011). | Round 2: alert the moment an audit page is opened. |
| **Facts, not fear.** Loss framing is not more persuasive than gain framing (meta-analysis, 165 effects). | No scare copy. Value is stated as a conditional in the owner's own numbers. |
| **Three options.** The decoy effect: with three options, the middle one wins. | Good / Better / Best. Best is shown first, and Better is marked "Recommended". |
| **Burned owners.** Many have had developers vanish or hold their domain hostage. | Ownership guarantee (domain, hosting and code in their name), a live-by guarantee, and a fixed monthly fee. |
| **The law.** NDPA 2023 s.36 and GAID 2025 Art. 18(1)(a) require consent for direct marketing (Araka v. Ecart; GTCO 2026). | Permission-first. A recorded "yes" is consent, and opt-outs are honoured permanently. *Not legal advice; have a Nigerian data-protection lawyer review the outreach before you scale.* |

## 2. The posture, built in

| Principle | Where it lives |
|---|---|
| Diagnose before prescribing | `services/business/audit.ts`; pitches are built from findings |
| Their business first; a checkable fact | `pitch.ts` `observation()` |
| Give before asking (the audit is theirs to keep) | pitch text, objection library |
| Easy "no" ("is now a bad time?") | `scripts.ts` |
| Their numbers, not your claims | `value.ts` (every assumption disclosed) |
| Choice, not yes/no | `pricing.ts` Good / Better / Best |
| Remove the risk | services guarantees, objection answers |
| Walk-away power | walk-away price; a deal below it is refused (`moveLead`) |
| Real scarcity only | `capacityPerMonth` is mentioned only when set |
| Learn from losses | "lost" requires a reason (stats in round 2) |

**Deliberately not built:**
- fake deadlines or invented scarcity
- made-up statistics or fear copy
- follow-up spam
- **automated WhatsApp to businesses from your number**: you open the wa.me link and press send yourself
- any fact the guard can't trace to your services profile, a shareable case study, the lead's audit, or the owner's numbers

## 3. Pricing

Every price is computed from three layers (`services/business/pricing.ts`, catalog in `catalog.ts`):

- **Cost:**
  - setup = build hours × your hourly rate
  - monthly = running costs (USD items × FX, plus NGN items, plus the domain ÷ 12) + maintenance hours × rate
- **Walk-away floor:** setup cost + 20%; monthly cost + 10%, rounded up. Never quote below it; trade scope (Good), not margin.
- **Price:**
  - **Better** = floor × (1 + margin), lifted to the market minimum and to 15% of the owner's monthly value when those are higher.
  - **Best** is at least 1.7 × Better. **Good** is at most 60% of Better and never below its own floor.
  - Prices round to ₦10,000 (setup) and ₦5,000 (monthly).
  - JAVI warns when the monthly fee is more than a third of the estimated gain.

Default settings (₦7,500/hour, 30% margin, ₦1,550/$) reproduce this table exactly. `npm run test:business` checks it.

| Business type | Offer | Better tier | Clients for ₦1m/month |
|---|---|---|---|
| Restaurant | Direct online ordering | ₦470,000 + ₦55,000/month | 19 |
| Salon | Online booking | ₦450,000 + ₦60,000/month | 17 |
| Clinic | Online booking | ₦450,000 + ₦60,000/month | 17 |
| Shop | Online store | ₦590,000 + ₦80,000/month | 13 |
| School | Workflow automation | ₦710,000 + ₦105,000/month | 10 |
| Real estate | Business website | ₦330,000 + ₦35,000/month | 29 |

**Worked example (restaurant).** The owner reports about 25 app orders a day at ₦9,000, and 3 staff hours a day on WhatsApp at ₦1,500/hour. Using the stated defaults (26 days, 20% commission, 15% of orders moved to direct, 40% of time saved), JAVI estimates ₦175,500 + ₦46,800 = **₦222,300/month**.

| Tier | Setup + monthly |
|---|---|
| Good | ₦190k + ₦20k |
| Better | ₦470k + ₦55k |
| Best | ₦820k + ₦110k |
| Walk-away | ₦360k + ₦45k |

The running cost is about ₦38.7k/month.

**Payment options** for the recommended tier:
- standard: 50% / 50%, 6-month minimum
- low upfront: 25%, with the rest over 12 months
- yearly: 2 months free

Market ranges for booking, WhatsApp, workflow and app offers are flagged as estimates in `catalog.ts`; replace them with your own win/loss data. Running costs (domain about ₦20k/yr, hosting ₦25-50k/yr, Paystack fees, Meta WhatsApp message fees) are passed through at cost.

## 4. How it works

**Leads come from three places:**
- **OpenStreetMap** (`leadFinder.ts`):
  - Nominatim finds the area, preferring populated places that contain every word typed.
  - Overpass lists businesses with the vertical's tags within 4 km, trying several public servers in turn.
  - Usage policy: identifying User-Agent (`OSM_CONTACT`), at most 1 request per second, results cached for 24h.
  - The UI shows "© OpenStreetMap contributors" (ODbL).
  - **Coverage in Lagos is thin:** a live search around Lekki returned 5 named restaurants, 2 with phone numbers. Your own contacts, referrals and walk-ins will usually be better.
- **CSV / XLSX import**, with columns name, phone, email, website, area, category, consent, referred_by.
- **Manual add**, for walk-ins and referrals.

**Then, per lead:**
1. The **audit** runs in the background after a lead is added. It checks HTTPS, mobile viewport, ordering/booking signals, WhatsApp link, social links, stale copyright, page weight, and the optional PageSpeed score. With no website on the listing, the finding says "We couldn't find a website listed for …", never "you have no website".
2. You enter **the owner's numbers** → value estimate → **quote**.
3. **First message:** observation, question or proof variant, as WhatsApp (a wa.me link you send yourself) or an email draft. Deterministic templates, optionally polished by the LLM under the fact guard.
4. **Call and walk-in scripts** and an objection library.
5. The **board** moves the lead through new → contacted → replied → call booked → won (needs the deal; below walk-away is refused) or lost (needs a reason).

## 5. API (round 1)

| Method | Path | Purpose |
|---|---|---|
| GET / PUT | `/api/business/services` | Brand, rates, FX, margin, target, guarantees, capacity, case studies |
| GET | `/api/business/catalog` | Verticals, offers, value inputs |
| POST | `/api/business/leads/search` | OpenStreetMap search `{vertical, area, radiusM?}` |
| POST | `/api/business/leads/import` | CSV/XLSX (`file`) |
| POST | `/api/business/leads` | Add a lead by hand |
| GET | `/api/business/leads?status=&vertical=` | Lead board |
| GET / PATCH / DELETE | `/api/business/leads/:id` | Lead (+ value estimate); edit contacts, value inputs, notes, consent |
| POST | `/api/business/leads/:id/audit` | Re-run the audit |
| POST | `/api/business/leads/:id/quote` | Good / Better / Best |
| POST | `/api/business/leads/:id/pitch` | First-message draft `{variant, channel, polish?}` |
| GET | `/api/business/leads/:id/scripts` | Call, walk-in, objections, takeaway |
| POST | `/api/business/leads/:id/status` | Move on the board |

## 6. Setup checklist
1. In Business mode → *Your services & rates*, set your brand, city, public phone/email, physical address, real hourly rate, FX rate, margin and income target.
2. Add case studies (e.g. DopeChef, Xenon Classics) with only results you can stand behind. Tick "may share" only for clients who agreed; messages cite nothing else.
3. Set `OSM_CONTACT` in `.env`, and optionally `PAGESPEED_API_KEY`.
4. Start with one vertical and one area you know. Visit or call first; use email only for business addresses.

## 7. Round 2 (next)
- **Outreach sequence** (day 0/4/10), permission-first for Nigerian leads:
  - Email goes through Gmail with List-Unsubscribe (`buildMime` already supports it), under the shared daily cap and sending hours.
  - WhatsApp, call and visit steps are needs-you tasks.
- **Stopping rules:** stop on any reply; "stop" or an unsubscribe ends everything, and `/u/:token` adds the address or phone to the global suppression list.
- **Public audit page** `/p/:slug/a/:token`, with an alert when it's opened.
- **Proposal and one-pager PDFs.**
- **Reply recording** (`POST /leads/:id/reply`), **stats** (reply/win rates by vertical, channel and variant; recurring revenue vs target), and "not now" reminders.
