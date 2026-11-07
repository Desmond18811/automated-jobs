/**
 * Checks for the step 18 upgrade: structured AI replies, image routing, answer library,
 * CV extraction that never invents eligibility answers, WhatsApp notifier, AI navigator.
 * Runs in a temporary data folder with a fake AI and a fake WhatsApp provider:
 * no internet, no API keys, and your real profile and queue are never touched.
 *   npm --prefix server run upgrade-check
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (f: string) => pathToFileURL(path.join(here, 'fixtures', f)).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ja-check-'));
fs.mkdirSync(path.join(tmp, 'server'));
process.chdir(path.join(tmp, 'server')); // store.ts puts data/ under the working folder
for (const k of Object.keys(process.env)) if (/^(ANTHROPIC|OPENROUTER|QWEN|DEEPSEEK|AI_PROVIDER|WHATSAPP|CALLMEBOT|TEXTMEBOT)/.test(k)) delete process.env[k];

const ok = (c: boolean, n: string) => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`);
  if (!c) process.exitCode = 1;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const realFetch = globalThis.fetch;
const setFetch = (f: (url: string, init: any) => Promise<Response>) => {
  (globalThis as any).fetch = async (input: any, init: any) => {
    const url = String(input);
    return url.startsWith('http') ? f(url, init) : realFetch(input, init);
  };
};

// ---------- schemas ----------
const { validate, ANSWERS_SCHEMA, NEXT_STEP_SCHEMA, parseJsonText } = await import('../src/llm/schema.js');
ok(validate(ANSWERS_SCHEMA, { answers: [{ id: 'f1', value: 'Yes', needsHuman: false, reason: '' }] }).length === 0, 'valid AI reply passes the schema');
ok(validate(ANSWERS_SCHEMA, { answers: [{ id: 'f1', value: 3, needsHuman: false, reason: '' }] }).length > 0, 'wrong-typed AI reply is caught');
ok(validate(NEXT_STEP_SCHEMA, { action: 'explode', role: 'button', name: 'x', reason: '' }).length > 0, 'unknown navigator action is caught');
ok((parseJsonText('Sure!\n```json\n{"a":1}\n```') as any).a === 1, 'JSON pulled out of chatter and code fences');

// ---------- providers ----------
const calls: any[] = [];
let mode = 'ok';
setFetch(async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ url, body });
  if (url.includes('anthropic')) {
    const answers = { answers: [{ id: 'f9', value: 'Because I like SOC work', needsHuman: false, reason: '' }] };
    return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: body.tools?.[0]?.name, input: answers }] }));
  }
  if (mode === 'no-schema' && body.response_format?.type === 'json_schema') return new Response('{"error":"No endpoints found"}', { status: 404 });
  if (mode === 'bad-then-good' && calls.length === 1) {
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"answers":[{"id":"f9","value":42}]}' } }] }));
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: '{"answers":[{"id":"f9","value":"From OpenRouter","needsHuman":false,"reason":""}]}' } }] }));
});

const ai = await import('../src/ai.js');
const answers = await import('../src/answers.js');
const profile: any = { firstName: 'Ada', lastName: 'Obi', email: 'a@x.com', phone: '+2348000000000', portalPassword: 'hunter2' };
const why = { id: 'f9', type: 'textarea', label: 'Why do you want this job?', required: true, filled: false };

process.env.ANTHROPIC_API_KEY = 'k';
let r = await ai.answerFields({ fields: [why] as any, profile, cvText: 'CV', jobText: 'job', source: 'https://acme.com/j' });
ok(calls[0].body.tool_choice?.type === 'tool' && r[0].value === 'Because I like SOC work', 'Anthropic: forced tool call returns schema-shaped JSON');
ok(!JSON.stringify(calls[0].body).includes('hunter2'), 'no password ever reaches the AI');

delete process.env.ANTHROPIC_API_KEY;
process.env.OPENROUTER_API_KEY = 'k';
calls.length = 0;
r = await ai.answerFields({ fields: [why] as any, profile, cvText: 'CV', jobText: 'job', source: 'x' });
ok(calls[0].body.response_format?.json_schema?.strict === true && calls[0].body.provider?.require_parameters === true, 'OpenRouter: strict json_schema requested');
mode = 'no-schema';
calls.length = 0;
r = await ai.answerFields({ fields: [why] as any, profile, cvText: 'CV', jobText: 'job', source: 'x' });
ok(calls.length === 2 && r[0].value === 'From OpenRouter', 'falls back when a model lacks json_schema');
mode = 'bad-then-good';
calls.length = 0;
r = await ai.answerFields({ fields: [why] as any, profile, cvText: 'CV', jobText: 'job', source: 'x' });
ok(calls.length === 2 && r[0].value === 'From OpenRouter', 'a malformed reply is retried once with the errors');
mode = 'ok';

let err = '';
try {
  await ai.extractPostings({ visual: { mediaType: 'image/png', base64: 'AAAA' }, source: 'flyer.png' });
} catch (e: any) {
  err = e.message;
}
ok(/Reading images needs/.test(err), 'flyer image with a text-only model: clear error, not silently dropped');

// ---------- answer library ----------
answers.upsertAnswer({ question: 'What is your expected monthly salary in Naira?', answer: '900000', source: 'dashboard' });
ok(answers.upsertAnswer({ question: 'Enter your BVN', answer: '123', source: 'dashboard' }) === null, 'ID and bank numbers are never stored');
calls.length = 0;
r = await ai.answerFields({ fields: [{ id: 'a', type: 'text', label: 'Expected monthly salary in Naira *', required: true, filled: false }] as any, profile, cvText: '', jobText: '', source: 'x' });
ok(calls.length === 0 && r[0].value === '900000', 'a question answered before is filled without the AI');

// ---------- CV extraction ----------
setFetch(async () =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
    firstName: 'Ada', lastName: 'Obi', email: 'a@x.com', phone: null, streetAddress: null, city: 'Abuja', stateProvince: null, postalCode: null,
    country: 'Nigeria', linkedin: null, github: null, twitter: null, portfolio: null, website: null, currentTitle: 'Threat Analyst',
    currentCompany: null, yearsExperience: 4, skills: 'SIEM', highestDegree: 'B.Sc. Computer Science', school: null, fieldOfStudy: null,
    graduationYear: null, languages: null }) } }] }))
);
const prof: any = await ai.extractProfileFromCv('Ada Obi\nThreat Analyst');
const invented = ['workAuthorization', 'needsSponsorship', 'willingToRelocate', 'gender', 'raceEthnicity', 'veteranStatus', 'disabilityStatus', 'noticePeriod', 'referredBy'].filter((k) => k in prof);
ok(invented.length === 0, `CV autofill never invents eligibility or EEO answers (found: ${invented.join(', ') || 'none'})`);
ok(prof.yearsExperience === '3 - 5 years (Mid-level)', 'years of experience mapped to your dropdown');

// ---------- WhatsApp notifier ----------
process.env.WHATSAPP_PROVIDER = 'callmebot';
process.env.WHATSAPP_TO = '2348012345678';
process.env.CALLMEBOT_APIKEY = 'secretkey123';
const sent: string[] = [];
setFetch(async (url) => {
  sent.push(new URL(url).searchParams.get('text') || '');
  return new Response('Message queued.');
});
const store = await import('../src/store.js');
const alerts = await import('../src/notify/alerts.js');
store.setSettings(store.cleanSettings({ whatsappAlerts: true, notifyGapSec: 2, alertDelaySec: 0 }));
const job = (i: number): any => ({ id: 'j' + i, kind: 'form', url: `https://acme${i}.com/jobs/1`, title: `Role ${i}`, status: 'running' });
ok((await alerts.sendTest()).ok, 'test message sent');
sent.length = 0;
for (let i = 1; i <= 7; i++) await alerts.jobStarted(job(i));
alerts.jobWaiting({ ...job(99), status: 'needs_you', message: 'CAPTCHA detected.' }, 1);
await sleep(6500);
ok(sent.length <= 4 && sent.some((s) => /started \d+ jobs/.test(s)), `routine messages merged into a digest (${sent.length} sent)`);
ok(sent.findIndex((s) => s.includes('needs you')) <= 1, '"needs you" goes out first');
ok(!JSON.stringify(alerts.getLog()).includes('secretkey123'), 'message log hides the API key');

// ---------- navigator + answer capture (real browser) ----------
delete process.env.OPENROUTER_API_KEY;
process.env.ANTHROPIC_API_KEY = 'k';
const seen: string[] = [];
setFetch(async (_url, init) => {
  const text: string = JSON.parse(init.body).messages[0].content.map((b: any) => b.text || '').join('');
  seen.push(text);
  let step: any = { action: 'stuck', role: null, name: null, reason: 'nothing' };
  if (/textbox/.test(text)) step = { action: 'done', role: null, name: null, reason: 'form' };
  else if (/Continue as guest/.test(text)) step = { action: 'click', role: 'link', name: 'Continue as guest', reason: 'guest' };
  else if (/Begin your journey/.test(text))
    step = /refused/.test(text)
      ? { action: 'click', role: 'button', name: 'Begin your journey', reason: 'start' }
      : { action: 'click', role: 'button', name: 'Submit feedback', reason: 'forbidden' };
  return new Response(JSON.stringify({ content: [{ type: 'tool_use', input: step }] }));
});
const { navigate } = await import('../src/worker/navigator.js');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(fixture('nav-start.html'));
  const nav = await navigate(page, 'Reach the application form for this job.');
  ok(nav.outcome === 'done' && nav.page.url().endsWith('form.html'), 'AI navigator found the form on an unfamiliar site');
  ok(seen.some((s) => s.includes('refused button "Submit feedback"')), 'a Submit-style click was refused');

  if (nav.outcome !== 'done') throw new Error(`Navigator stopped: ${nav.reason}`);
  await nav.page.fill('#clr', 'No, but eligible for one');
  const saved = await answers.captureAnswers(nav.page.mainFrame(), [
    { label: 'Do you hold a government security clearance?', reason: 'x', required: true },
    { label: 'Why do you want to work at Acme?', reason: 'x', required: true }
  ]);
  ok(saved === 1, 'your typed answer was captured; the empty one was not');
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
