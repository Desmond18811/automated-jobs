import fs from 'node:fs';
import path from 'node:path';
import { parseCvDeterministic } from '../services/documents/cvParser';
import { normaliseText, htmlToText, layoutPage } from '../services/documents/cvExtract';
import { splitSections } from '../services/documents/cvSections';
import { enrichParsed } from '../controllers/profile.controller';

let failed = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
};

const fixture = fs.readFileSync(path.join(__dirname, '../../test-fixtures/cv/single-column.txt'), 'utf8');
const text = normaliseText(fixture);
const lines = text.split('\n').filter(Boolean);

const sec = splitSections(lines);
eq('interests is not swallowed by languages', sec.sections.languages, ['English, Yoruba']);
eq('skills stay in skills', sec.sections.skills, ['Figma, Sketch, User research, Prototyping, Design systems, React']);

const p: any = enrichParsed(parseCvDeterministic(text));
eq('name', p.fullName, 'Adaeze Okafor');
eq('headline is title not summary', p.headline, 'Senior Product Designer');
eq('email', p.email, 'adaeze.okafor@example.com');
eq('location is home', p.location, 'Lagos, Nigeria');
eq('summary is paragraph', /eight years/.test(p.summary || ''), true);
eq('two jobs', p.experience?.map((e: any) => [e.company, e.title]), [['Paystack', 'Senior Product Designer'], ['Kuda Bank', 'Product Designer']]);
eq('current job', [p.currentTitle, p.currentCompany], ['Senior Product Designer', 'Paystack']);
eq('education', p.education?.map((e: any) => e.institution), ['University of Lagos']);
eq('no interests in skills', (p.skills || []).some((s: any) => /photography|chess/i.test(s.name || s)), false);
eq('no invented defaults', [p.workAuthorization, p.noticePeriod, p.remotePreference, p.avatarUrl], [undefined, undefined, undefined, undefined]);
eq('x.com host check', enrichParsed({ links: [{ url: 'https://max.com/me' }] }).twitterUrl, undefined);
eq('ligatures + page furniture', normaliseText('ﬁnance\nPage 2 of 3\nlead'), 'finance\nlead');
eq('docx html keeps bullets', htmlToText('<p>Skills</p><ul><li>A</li><li>B</li></ul>').split('\n').filter(Boolean), ['Skills', '• A', '• B']);

const item = (x: number, y: number, s: string) => ({ x, y, w: s.length * 5, h: 10, s });
const two = [
  ...Array.from({ length: 10 }, (_, i) => item(20, 700 - i * 14, `side${i}`)),
  ...Array.from({ length: 20 }, (_, i) => item(300, 700 - i * 14, `main${i}`)),
];
const laid = layoutPage(two, 600).split('\n').filter(Boolean);
eq('two-column: main column read first, whole', laid.slice(0, 3), ['main0', 'main1', 'main2']);
eq('two-column: sidebar not interleaved', laid.indexOf('side0'), 20);

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
