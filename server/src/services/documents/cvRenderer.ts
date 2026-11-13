import { getBrowser } from '../../lib/browser';
import { storagePath } from '../../lib/storage';
import { escapeHtml as e } from '../../lib/text';

export interface CvData {
  name: string;
  headline?: string;
  contact: string[];
  summary: string;
  skills: string[];
  experience: { company: string; title: string; location?: string; dates: string; bullets: string[] }[];
  projects: { name: string; url?: string; bullets: string[] }[];
  education: { line: string; sub?: string }[];
  certifications: string[];
}

const ul = (items: string[]) => (items.length ? `<ul>${items.map((b) => `<li>${e(b)}</li>`).join('')}</ul>` : '');
const section = (title: string, body: string) => (body ? `<section><h2>${title}</h2>${body}</section>` : '');

/** Single-column, text-first layout: reads cleanly for humans and for applicant tracking systems. */
export function renderCvHtml(cv: CvData): string {
  const experience = cv.experience
    .map(
      (x) => `<div class="item"><div class="row"><strong>${e(x.title)}, ${e(x.company)}</strong><span>${e(x.dates)}</span></div>
      ${x.location ? `<div class="sub">${e(x.location)}</div>` : ''}${ul(x.bullets)}</div>`,
    )
    .join('');
  const projects = cv.projects
    .map((p) => `<div class="item"><div class="row"><strong>${e(p.name)}</strong>${p.url ? `<span>${e(p.url)}</span>` : ''}</div>${ul(p.bullets)}</div>`)
    .join('');
  const education = cv.education
    .map((ed) => `<div class="item"><strong>${e(ed.line)}</strong>${ed.sub ? `<div class="sub">${e(ed.sub)}</div>` : ''}</div>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(cv.name)} CV</title><style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#111;line-height:1.38;margin:0}
  h1{font-size:20pt;margin:0}
  .headline{font-size:11pt;color:#333;margin:2pt 0 4pt}
  .contact{font-size:9.5pt;color:#333;margin-bottom:6pt}
  h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #888;padding-bottom:2pt;margin:12pt 0 6pt}
  .item{margin-bottom:7pt}
  .row{display:flex;justify-content:space-between;gap:12pt}
  .row span{color:#333;white-space:nowrap}
  .sub{color:#444;font-style:italic}
  ul{margin:3pt 0 0 14pt;padding:0}
  li{margin:0 0 2pt}
  p{margin:0}
  </style></head><body>
  <h1>${e(cv.name)}</h1>
  ${cv.headline ? `<div class="headline">${e(cv.headline)}</div>` : ''}
  <div class="contact">${cv.contact.map(e).join(' &nbsp;|&nbsp; ')}</div>
  ${section('Summary', cv.summary ? `<p>${e(cv.summary)}</p>` : '')}
  ${section('Skills', cv.skills.length ? `<p>${cv.skills.map(e).join(', ')}</p>` : '')}
  ${section('Experience', experience)}
  ${section('Projects', projects)}
  ${section('Education', education)}
  ${section('Certifications', ul(cv.certifications))}
  </body></html>`;
}

/** fileStem must start with the userId (see lib/storage removeUserFiles). */
export async function renderCvPdf(cv: CvData, fileStem: string): Promise<string> {
  const out = await storagePath('generated', `${fileStem}.pdf`);
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent(renderCvHtml(cv), { waitUntil: 'load' });
    await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '15mm', right: '15mm' } });
  } finally {
    await context.close();
  }
  return out;
}

export const cvFileName = (fullName: string): string => `${fullName.trim().replace(/[^A-Za-z0-9]+/g, '_') || 'Candidate'}_CV.pdf`;
