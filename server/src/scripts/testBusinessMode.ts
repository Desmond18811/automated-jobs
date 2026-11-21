/**
 * Business Mode round 1: pricing against the spec table, value estimate, website audit, pitches
 * under the fact guard, CSV import, lead search, and status rules, over real HTTP (in-memory DB).
 *
 *   npx tsx src/scripts/testBusinessMode.ts          # mocked OpenStreetMap
 *   npx tsx src/scripts/testBusinessMode.ts --live   # also hits the real OSM servers (Lekki, Lagos)
 */
import { LIVE_OSM, MOCK_PORT } from './businessTestEnv'; // must stay first
import express from 'express';
import type { AddressInfo } from 'node:net';
import { activateMemoryDb } from '../lib/memoryDb';
import { createApp } from '../app';
import { createTestSession } from './authTestHelper';
import { quote } from '../services/business/pricing';
import { estimateValue } from '../services/business/value';
import { auditLead } from '../services/business/audit';
import { checkPitch, composeFirstTouch } from '../services/business/pitch';
import { searchBusinesses } from '../services/business/leadFinder';

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${name}${!ok && detail !== undefined ? `\n   ${JSON.stringify(detail).slice(0, 600)}` : ''}`);
  if (!ok) failures++;
}

/** Mock websites for the audit, plus mock Nominatim/Overpass. */
function mocks() {
  const app = express();
  const page = (body: string, head = '') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
  app.get('/bad', (_req, res) => res.send(page('<h1>Mama Put Kitchen</h1><p>Call us to order.</p><footer>© 2019 Mama Put</footer>')));
  app.get('/good', (_req, res) =>
    res.send(
      page(
        '<h1>Grill House</h1><a href="/cart">Add to cart</a><a href="https://wa.me/2348030000000">WhatsApp</a><a href="https://instagram.com/grillhouse">IG</a><footer>© 2026</footer>',
        '<meta name="viewport" content="width=device-width">',
      ),
    ),
  );
  app.get('/nominatim/search', (_req, res) => res.json([{ lat: '6.4474', lon: '3.4723', display_name: 'Lekki, Lagos, Nigeria' }]));
  app.post('/overpass', express.urlencoded({ extended: false }), (_req, res) =>
    res.json({
      elements: [
        { type: 'node', id: 101, lat: 6.44, lon: 3.47, tags: { name: 'Bukka Hut Lekki', amenity: 'restaurant', phone: '+234 803 111 2222', website: `http://127.0.0.1:${MOCK_PORT}/bad` } },
        { type: 'way', id: 202, center: { lat: 6.45, lon: 3.48 }, tags: { name: 'Grill House', amenity: 'restaurant', 'contact:phone': '0803 333 4444', website: `http://127.0.0.1:${MOCK_PORT}/good` } },
        { type: 'node', id: 303, lat: 6.46, lon: 3.49, tags: { amenity: 'restaurant' } }, // no name: skipped
      ],
    }),
  );
  return app.listen(MOCK_PORT);
}

async function main() {
  const mockServer = mocks();
  activateMemoryDb();
  const settings = { hourlyRate: 7500, fxRate: 1550, marginPct: 30 };

  // ── Pricing reproduces the spec table ─────────────────────────────────────
  const table: Record<string, [number, number, number]> = {
    restaurant: [470_000, 55_000, 19],
    salon: [450_000, 60_000, 17],
    clinic: [450_000, 60_000, 17],
    shop: [590_000, 80_000, 13],
    school: [710_000, 105_000, 10],
    real_estate: [330_000, 35_000, 29],
  };
  for (const [v, [setup, monthly, clients]] of Object.entries(table)) {
    const better = quote(v, settings).tiers.find((t) => t.tier === 'better')!;
    check(`pricing ${v}: Better ₦${setup / 1000}k + ₦${monthly / 1000}k/month, ${clients} clients for ₦1m`, better.setup === setup && better.monthly === monthly && Math.ceil(1_000_000 / better.monthly) === clients, better);
  }
  const r = quote('restaurant', settings);
  const t = Object.fromEntries(r.tiers.map((x) => [x.tier, x]));
  check('restaurant worked example: Good 190k+20k, Best 820k+110k, walk-away 360k+45k', t.good.setup === 190_000 && t.good.monthly === 20_000 && t.best.setup === 820_000 && t.best.monthly === 110_000 && r.floor.setup === 360_000 && r.floor.monthly === 45_000, { tiers: r.tiers, floor: r.floor });
  check('tiers ordered Best, Better (recommended), Good', r.tiers.map((x) => x.tier).join() === 'best,better,good' && r.tiers[1].recommended === true);
  check('running cost about ₦38k, margin ~31%', Math.abs(r.cost.monthly - 38_650) < 500 && Math.round(((55_000 - r.cost.monthly) / 55_000) * 100) === 30, r.cost);

  const value = estimateValue('restaurant', { appOrdersPerDay: 25, avgOrderValue: 9000, waHoursPerDay: 3, staffHourlyCost: 1500 });
  check('value example: ₦175,500 + ₦46,800 = ₦222,300/month', value?.monthly === 222_300 && value.parts[0].monthly === 175_500 && value.parts[1].monthly === 46_800, value);
  check('value lists every assumption it used', (value?.assumptions.length ?? 0) >= 4 && value!.assumptions.some((a) => /26/.test(a)), value?.assumptions);
  check('no owner numbers → no value estimate', estimateValue('restaurant', {})?.monthly === 0);
  const thin = quote('restaurant', settings, 60_000);
  check('thin value case is flagged', thin.warnings.some((w) => /Thin value/.test(w)), thin.warnings);

  // ── Audit ─────────────────────────────────────────────────────────────────
  const base = `http://127.0.0.1:${MOCK_PORT}`;
  const bad = await auditLead({ name: 'Mama Put Kitchen', vertical: 'restaurant', website: `${base}/bad`, contacts: [] });
  const ids = bad.findings.map((f) => f.id);
  check('audit (weak site): not mobile, no ordering, no WhatsApp, stale ©2019, not https', ['not_mobile', 'no_online_ordering', 'no_whatsapp_link', 'stale_site', 'no_https'].every((i) => ids.includes(i)), ids);
  check('every finding says how the owner can check it', bad.findings.every((f) => f.howToCheck && f.evidence));
  const good = await auditLead({ name: 'Grill House', vertical: 'restaurant', website: `${base}/good`, contacts: [] });
  const gids = good.findings.map((f) => f.id);
  check('audit (good site): no mobile/ordering/WhatsApp findings', !gids.includes('not_mobile') && !gids.includes('no_online_ordering') && !gids.includes('no_whatsapp_link'), gids);
  const none = await auditLead({ name: 'Iya Basira', vertical: 'restaurant', contacts: [] });
  check('no website: "We couldn\'t find a website listed", never "you have no website"', none.findings[0]?.title === "We couldn't find a website listed for Iya Basira", none.findings);

  // ── Pitch ─────────────────────────────────────────────────────────────────
  const sender = {
    firstName: 'Desmond',
    services: {
      brandName: 'Dope Studio',
      city: 'Lagos',
      caseStudies: [
        { name: 'DopeChef', vertical: 'restaurant', result: 'direct orders now come through their own site instead of the apps', permissionToShare: true },
        { name: 'Secret Client', vertical: 'restaurant', result: 'tripled revenue', permissionToShare: false },
      ],
    },
  };
  const lead = { name: 'Mama Put Kitchen', vertical: 'restaurant' as const, area: 'Lekki', audit: bad, contacts: [{ kind: 'phone' as const, value: '08030000000' }], website: `${base}/bad` };
  for (const variant of ['observation', 'question', 'proof'] as const) {
    const p = composeFirstTouch(lead, sender, variant, 'whatsapp');
    const c = checkPitch(p.body, lead, sender);
    check(`pitch ${variant}: 60-110 words, no money, passes fact guard, ends with a question`, c.rules.length === 0 && c.facts.passed && /\?\s*\n\n[^\n]+$/.test(p.body), { rules: c.rules, facts: c.facts, body: p.body });
  }
  const proof = composeFirstTouch(lead, sender, 'proof', 'whatsapp');
  check('proof cites only case studies with permission', proof.body.includes('DopeChef') && !proof.body.includes('Secret Client'));
  check('WhatsApp pitch comes with a wa.me link for YOU to send (0803… → 234803…)', proof.waLink?.startsWith('https://wa.me/2348030000000?text=') === true, proof.waLink);
  const fake = checkPitch(`${proof.body}\nOur clients see 47% more orders and Jumia loves us.`, lead, sender);
  check('fact guard blocks an invented statistic and an invented name', !fake.facts.passed && fake.facts.blocking.some((b) => /47/.test(b)) && fake.facts.blocking.some((b) => /Jumia/.test(b)), fake.facts);

  // ── Lead search ───────────────────────────────────────────────────────────
  const found = await searchBusinesses('restaurant', LIVE_OSM ? 'Lekki, Lagos' : 'Lekki, Lagos (mock)');
  if (LIVE_OSM) {
    check('live OSM: real restaurants near Lekki with OSM ids', found.results.length > 0 && found.results.every((b) => /^(node|way|relation)\/\d+$/.test(b.osmId)), found.results.slice(0, 3));
    console.log(`   ${found.results.length} real places, e.g. ${found.results.slice(0, 3).map((b) => b.name).join(', ')}`);
  } else {
    check('OSM search maps name, phone, website; skips unnamed places', found.results.length === 2 && found.results[0].contacts.length === 1 && Boolean(found.results[0].website), found.results);
  }

  // ── HTTP: services, add, import, search, quote, pitch, status ─────────────
  const server = createApp().listen(0);
  const api = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/business`;
  const email = `biz_${Date.now()}@example.com`;
  const { accessToken } = await createTestSession(email, 'Biz Tester');
  const call = async (method: string, path: string, body?: unknown, form?: FormData) => {
    const res = await fetch(api + path, { method, headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
    return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
  };

  const cat = await call('GET', '/catalog');
  check('GET /catalog lists six verticals and six offers', cat.json.verticals?.length === 6 && cat.json.offers?.length === 6);
  const svc = await call('PUT', '/services', { brandName: 'Dope Studio', city: 'Lagos', caseStudies: sender.services.caseStudies });
  check('PUT /services saves brand and case studies', svc.status === 200 && svc.json.brandName === 'Dope Studio' && svc.json.caseStudies.length === 2, svc.json);

  const csv = 'name,phone,email,website,area,category,consent,referred_by\nChicken Republic Ikoyi,0803 555 6666,,,Ikoyi,Restaurant,yes,\nGlow Salon,,glow@example.com,,Yaba,Beauty salon,,Tunde\n,,,,,,,\n';
  const fd = new FormData();
  fd.append('file', new Blob([csv], { type: 'text/csv' }), 'leads.csv');
  const imp = await call('POST', '/leads/import', undefined, fd);
  check('CSV import: 2 named leads created (blank rows ignored)', imp.status === 201 && imp.json.created === 2, imp.json);
  const listed = (await call('GET', '/leads')).json.leads as any[];
  const chicken = listed.find((l) => l.name === 'Chicken Republic Ikoyi');
  const glow = listed.find((l) => l.name === 'Glow Salon');
  check('CSV: vertical guessed, consent recorded, referral source kept', chicken?.vertical === 'restaurant' && chicken?.consent?.given === true && glow?.vertical === 'salon' && glow?.source === 'referral' && glow?.referredBy === 'Tunde', { chicken, glow });

  const s1 = await call('POST', '/leads/search', { vertical: 'restaurant', area: LIVE_OSM ? 'Lekki, Lagos' : 'Lekki, Lagos (mock)' });
  const s2 = await call('POST', '/leads/search', { vertical: 'restaurant', area: LIVE_OSM ? 'Lekki, Lagos' : 'Lekki, Lagos (mock)' });
  check('search adds leads once; repeating it adds none', s1.status === 200 && s1.json.added > 0 && s2.json.added === 0 && s1.json.attribution === '© OpenStreetMap contributors', { s1: s1.json.added, s2: s2.json.added });

  const id = chicken._id ?? chicken.id;
  await call('PATCH', `/leads/${id}`, { valueInputs: { appOrdersPerDay: 25, avgOrderValue: 9000, waHoursPerDay: 3, staffHourlyCost: 1500 }, note: 'Spoke to the manager' });
  const q = await call('POST', `/leads/${id}/quote`);
  check('quote uses the owner’s numbers (value ₦222,300) and returns three tiers', q.json.value?.monthly === 222_300 && q.json.lead?.quote?.tiers?.length === 3, q.json.value);
  const pitch = await call('POST', `/leads/${id}/pitch`, { variant: 'proof', channel: 'whatsapp' });
  check('POST /pitch stores the draft with a wa.me link', pitch.status === 201 && pitch.json.pitch?.waLink?.includes('wa.me/2348035556666'), pitch.json.pitch);
  const scripts = await call('GET', `/leads/${id}/scripts`);
  check('GET /scripts: call, walk-in, objections, takeaway', scripts.json.call?.length > 3 && scripts.json.walkIn?.length > 2 && scripts.json.objections?.length >= 5 && Boolean(scripts.json.takeaway));

  const lost = await call('POST', `/leads/${id}/status`, { to: 'lost' });
  check('lost without a reason → 400', lost.status === 400);
  const cheap = await call('POST', `/leads/${id}/status`, { to: 'won', deal: { tier: 'better', setup: 200_000, monthly: 20_000 } });
  check('won below walk-away price → 400 (trade scope, not margin)', cheap.status === 400 && /walk-away/.test(cheap.json.error), cheap.json);
  const won = await call('POST', `/leads/${id}/status`, { to: 'won', deal: { tier: 'better' } });
  check('won with the quoted Better tier records the deal', won.status === 200 && won.json.deal?.setup === 470_000 && won.json.deal?.monthly === 55_000, won.json.deal);

  server.close();
  mockServer.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
