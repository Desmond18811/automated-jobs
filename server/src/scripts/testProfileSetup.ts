process.env.NODE_ENV = 'test';
import type { AddressInfo } from 'node:net';
import { activateMemoryDb } from '../lib/memoryDb';
import { createApp } from '../app';
import { createTestSession } from './authTestHelper';

/**
 * Exercises the profile-setup contract end to end over real HTTP (in-memory DB):
 * taxonomy endpoints, step-by-step PUTs, field round-trips, /verify gating and CV merge.
 * Run: npx tsx src/scripts/testProfileSetup.ts [path/to/cv.pdf]
 */

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${name}${!ok && detail !== undefined ? `\n   ${JSON.stringify(detail).slice(0, 400)}` : ''}`);
  if (!ok) failures++;
}

async function main() {
  activateMemoryDb();
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

  const email = `setup_${Date.now()}@example.com`;
  const { accessToken } = await createTestSession(email, 'Setup Tester');
  const call = async (method: string, path: string, body?: unknown, raw?: FormData) => {
    const res = await fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: raw ?? (body ? JSON.stringify(body) : undefined),
    });
    return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
  };

  // ── Taxonomy ───────────────────────────────────────────────────────────────
  const fields = await call('GET', '/taxonomy/fields');
  check('GET /taxonomy/fields returns role categories + industries', fields.status === 200 && fields.json.fields.length >= 5 && fields.json.industries.length > 0, fields.json);
  check('each field has roles', fields.json.fields.every((f: any) => f.roles.length > 0));

  const cat = await call('GET', '/taxonomy/skills/catalog?query=re');
  check('GET /taxonomy/skills/catalog searches names', cat.status === 200 && cat.json.skills.some((s: any) => s.name === 'React'), cat.json.skills?.slice(0, 5));
  check('catalog ranks prefix matches first', /^re/i.test(cat.json.skills?.[0]?.name ?? ''), cat.json.skills?.[0]);
  const alias = await call('GET', '/taxonomy/skills/catalog?query=k8s');
  check('catalog matches aliases (k8s → Kubernetes)', alias.json.skills?.some((s: any) => s.name === 'Kubernetes'), alias.json.skills);
  const lang = await call('GET', '/taxonomy/skills/catalog?category=Languages');
  check('Python is categorised as a language', lang.json.skills?.some((s: any) => s.name === 'Python'), lang.json.skills?.map((s: any) => s.name));

  const multi = await call('GET', '/taxonomy/skills?roles=Product%20Designer,Backend%20Engineer');
  check('GET /taxonomy/skills?roles= merges several roles', multi.status === 200 && multi.json.skills.includes('Figma') && multi.json.skills.some((s: string) => /node|go|postgres/i.test(s)), multi.json.skills);

  const req = await call('POST', '/taxonomy/request', { skill_name: 'Zig' });
  check('POST /taxonomy/request persists a skill request', req.status === 201 && req.json.item?.id, req.json);

  // ── Profile: empty start ───────────────────────────────────────────────────
  const fresh = await call('GET', '/profile');
  // Sign-up prefills name and email; nothing else may be there (memoryDb used to clone a demo profile).
  check('new user gets an empty draft (only sign-up name/email)', fresh.status === 200 && fresh.json.fullName === 'Setup Tester' && !fresh.json.headline?.includes('Automation') && fresh.json.experience?.length === 0 && fresh.json.status === 'draft', fresh.json);
  check('no invented legal answers on a new profile', fresh.json.workAuthorization === undefined && fresh.json.requiresSponsorship === undefined && fresh.json.yearsOfExperience === undefined);

  const early = await call('POST', '/profile/verify');
  check('verify on empty profile → 422 with details.missing[]', early.status === 422 && Array.isArray(early.json.details?.missing) && early.json.details.missing.length >= 5, early.json);

  // ── Step saves ─────────────────────────────────────────────────────────────
  const blank = await call('PUT', '/profile', { firstName: 'Ada', email: '', address: { city: '', country: '' } });
  check('blank email and blank address are treated as "not provided"', blank.status === 200, blank.json);

  const sneaky = await call('PUT', '/profile', { status: 'verified' });
  check('PUT cannot set status (only /verify can)', sneaky.status === 200 && sneaky.json.status === 'draft', sneaky.json.status);

  const bad = await call('PUT', '/profile', { linkedinUrl: 'not a url' });
  check('invalid URL → 400 with fieldErrors', bad.status === 400 && bad.json.details?.fieldErrors?.linkedinUrl, bad.json);

  const full = {
    firstName: 'Ada', lastName: 'Obi', fullName: 'Ada Obi', pronouns: 'she/her', email: 'ada@example.com', phone: '+234 803 000 0000',
    headline: 'Senior Product Designer', avatarUrl: '',
    address: { street: '1 Admiralty Way', city: 'Lagos', state: 'Lagos', postalCode: '105102', country: 'Nigeria' },
    targetRoles: ['Product Designer', 'UX Designer'], industry: 'FinTech & Digital Banking', specificTitle: 'Design Systems Lead',
    currentTitle: 'Product Designer', currentCompany: 'Kuda', yearsOfExperience: 6, inferredLevel: 'senior', validatedLevel: 'senior',
    remotePreference: 'any', locations: ['Remote (Pan-Africa)', 'London, UK'], willingToRelocate: true,
    salaryExpectation: { minimum: 30000000, currency: 'NGN', period: 'year', negotiable: true },
    salaryFloor: { amount: 20000000, currency: 'NGN', period: 'year' },
    experience: [{ id: 'e1', company: 'Kuda', title: 'Product Designer', location: 'Lagos', start: 'Jan 2021', current: true, bullets: [{ id: 'b1', text: 'Shipped the card flow.' }] }],
    education: [{ id: 'd1', institution: 'UNILAG', degree: 'B.Sc.', field: 'Systems Engineering', start: '2014', end: '2018', grade: 'First Class' }],
    highestEducationLevel: 'bachelor',
    projects: [{ id: 'p1', name: 'Open icons', url: 'https://icons.example.com', description: 'Icon set', skills: ['Figma'], bullets: [] }],
    certifications: [{ id: 'c1', name: 'Google UX', issuer: 'Google', year: '2022' }],
    languages: [{ language: 'English', proficiency: 'native' }, { language: 'Yoruba', proficiency: 'fluent' }],
    skills: [{ name: 'Figma', years: 6 }, { name: 'Design Systems', years: 4 }, { name: 'Prototyping' }, { name: 'User Research', years: 3 }, { name: 'HTML5 & CSS3', years: 2 }],
    primarySkills: ['Figma', 'Design Systems', 'User Research'], secondarySkills: ['Prototyping'], toolsAndFrameworks: ['HTML5 & CSS3'],
    summary: 'Designer with six years in fintech.', elevatorPitch: 'I make money apps feel simple.',
    linkedinUrl: 'https://linkedin.com/in/ada', githubUrl: '', portfolioUrl: 'https://ada.design', twitterUrl: '',
    links: [{ label: 'Dribbble', url: 'https://dribbble.com/ada' }],
    workAuthorization: 'authorized', requiresSponsorship: false, futureSponsorship: true, securityClearance: 'none',
    noticePeriod: '1 month', earliestStartDate: '1 March 2027',
    eeo: { gender: 'female', raceEthnicity: 'black_african_american', veteranStatus: 'not_veteran', disabilityStatus: 'decline' },
    rules: { dailySendCap: 25, approvalMode: 'review', autoApproveMinScore: 0.8, sendingHours: { start: 9, end: 17, timezone: 'Africa/Lagos' }, weekdaysOnly: false },
    blockedCompanies: ['Kuda'],
  };
  const put = await call('PUT', '/profile', full);
  check('full profile PUT accepted', put.status === 200, put.json);

  const got = (await call('GET', '/profile')).json;
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const strip = (v: any) => JSON.parse(JSON.stringify(v));
  const mismatched = Object.entries(full).filter(([k, v]) => !same(strip(got[k]), strip(v))).map(([k]) => k);
  check(`every field round-trips (${Object.keys(full).length} fields)`, mismatched.length === 0, { mismatched, sample: mismatched.slice(0, 3).map((k) => [k, got[k], (full as any)[k]]) });
  check('skill ratings are not part of the contract', got.skillRatings === undefined && got.skills.every((s: any) => s.rating === undefined));
  check('GET /profile hides CV path and raw text', !got.cv?.path && !got.cv?.rawText);

  const ok = await call('POST', '/profile/verify');
  check('verify on complete profile → 200 verified', ok.status === 200 && ok.json.status === 'verified', ok.json);

  // ── CV merge (optional: pass a text-based PDF/DOCX path) ──────────────────
  const broken = new FormData();
  broken.append('cv', new Blob([Buffer.from('%PDF-1.4 not really a pdf')], { type: 'application/pdf' }), 'broken.pdf');
  const brokenRes = await call('POST', '/profile/cv', undefined, broken);
  check('unreadable CV → 422 with a readable message (not 500)', brokenRes.status === 422, brokenRes.json);

  const cvPath = process.argv[2];
  if (cvPath) {
    const fs = await import('node:fs/promises');
    const buf = await fs.readFile(cvPath);
    const fd = new FormData();
    fd.append('cv', new Blob([buf], { type: cvPath.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), cvPath.split('/').pop());
    const up = await call('POST', '/profile/cv', undefined, fd);
    check('CV upload accepted', up.status === 200, up.json);
    const after = (await call('GET', '/profile')).json;
    check('CV upload keeps existing experience when the parser finds none', after.experience.length >= 1, after.experience);
    check('CV upload keeps existing education/certifications', after.education.length >= 1 && after.certifications.length >= 1);
    check('CV upload resets status to draft for re-review', after.status === 'draft');
  } else {
    console.log('ℹ️  CV merge checks skipped (pass a PDF/DOCX path to run them)');
  }

  server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
