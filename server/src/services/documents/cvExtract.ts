import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { AppError } from '../../lib/http';

export const CV_MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

interface Item {
  x: number;
  y: number;
  w: number;
  h: number;
  s: string;
}

/** Group text runs into lines (same baseline), left to right. */
function toLines(items: Item[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Item[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= Math.max(2, it.h * 0.45)) last.push(it);
    else lines.push([it]);
  }
  return lines.map((ln) => {
    ln.sort((a, b) => a.x - b.x);
    let out = '';
    let prevEnd = -Infinity;
    for (const it of ln) {
      const gap = it.x - prevEnd;
      out += out && gap > Math.max(1.5, it.h * 0.2) ? ' ' + it.s : it.s;
      prevEnd = it.x + it.w;
    }
    return out.trim();
  });
}

/**
 * Rebuild reading order for one PDF page. Plain extraction follows the content stream, which interleaves
 * the sidebar and main column of a two-column CV. Here a gutter is detected from the x positions of the text,
 * each column is read top to bottom, and the wider column comes first.
 */
export function layoutPage(items: Item[], pageWidth: number): string {
  if (items.length < 25) return toLines(items).join('\n');
  let best: { x: number; gap: number } | null = null;
  const step = pageWidth / 120;
  let runStart: number | null = null;
  for (let gx = pageWidth * 0.2; gx <= pageWidth * 0.8; gx += step) {
    const crossing = items.filter((i) => i.x < gx && i.x + i.w > gx).length;
    const empty = crossing <= Math.max(1, items.length * 0.04);
    if (empty && runStart === null) runStart = gx;
    if ((!empty || gx + step > pageWidth * 0.8) && runStart !== null) {
      const gap = gx - runStart;
      if (gap >= pageWidth * 0.015 && (!best || gap > best.gap)) best = { x: (runStart + gx) / 2, gap };
      runStart = null;
    }
  }
  if (!best) return toLines(items).join('\n');
  const gx = best.x;
  const banner = items.filter((i) => i.x < gx && i.x + i.w > gx);
  const rest = items.filter((i) => !banner.includes(i));
  const left = rest.filter((i) => i.x + i.w / 2 < gx);
  const right = rest.filter((i) => i.x + i.w / 2 >= gx);
  if (left.length < items.length * 0.12 || right.length < items.length * 0.12) return toLines(items).join('\n');
  const span = (col: Item[]) => Math.max(...col.map((i) => i.x + i.w)) - Math.min(...col.map((i) => i.x));
  const cols = span(left) >= span(right) ? [left, right] : [right, left];
  return [...(banner.length ? [toLines(banner).join('\n')] : []), ...cols.map((c) => toLines(c).join('\n'))].join('\n\n');
}

async function pageRender(pageData: any): Promise<string> {
  const content = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
  const items: Item[] = content.items
    .filter((i: any) => typeof i.str === 'string' && i.str.trim())
    .map((i: any) => ({ x: i.transform[4], y: i.transform[5], w: i.width || 0, h: i.height || Math.abs(i.transform[3]) || 10, s: i.str }));
  const [x0, , x1] = pageData.view;
  return layoutPage(items, x1 - x0);
}

const LIGATURES: Record<string, string> = { 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl' };

/** Clean artefacts PDF/DOCX extraction leaves behind. */
export function normaliseText(text: string): string {
  let t = text
    .replace(/[ﬁﬂﬀﬃﬄ]/g, (c) => LIGATURES[c])
    .replace(/[   ]/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[▪●◦‣⁃]/g, '•')
    .replace(/\r/g, '')
    .replace(/(\w)-\n([a-z])/g, '$1$2');
  let lines = t.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim());
  // Page furniture: "Page 2 of 3", and short lines repeated on three or more pages (running headers/footers).
  lines = lines.filter((l) => !/^page\s+\d+(\s*(of|\/)\s*\d+)?$/i.test(l));
  const seen = new Map<string, number>();
  for (const l of lines) if (l.length > 3 && l.length < 70) seen.set(l, (seen.get(l) || 0) + 1);
  lines = lines.filter((l) => !(seen.get(l)! >= 3 && !/^[•\-*]/.test(l) && !/^[A-Z][A-Z &/]{2,30}$/.test(l)));
  t = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

const entity = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** DOCX through HTML so list items and table cells survive instead of being flattened. */
export function htmlToText(html: string): string {
  return entity(
    html
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/(p|h[1-6]|ul|ol|tr|div|table)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/t[dh]>/gi, '  ')
      .replace(/<[^>]+>/g, ''),
  );
}

export async function extractText(buffer: Buffer, mime: string): Promise<string> {
  if (mime === CV_MIME.pdf) {
    let text = '';
    try {
      text = (await (pdfParse as any)(buffer, { pagerender: pageRender })).text;
    } catch {
      /* fall through to plain extraction */
    }
    if (text.trim().length < 100) text = (await pdfParse(buffer)).text;
    return normaliseText(text);
  }
  if (mime === CV_MIME.docx) {
    let text = '';
    try {
      text = htmlToText((await (mammoth as any).convertToHtml({ buffer })).value);
    } catch {
      /* fall through */
    }
    if (text.trim().length < 50) text = (await mammoth.extractRawText({ buffer })).value;
    return normaliseText(text);
  }
  throw new AppError(415, 'Upload your CV as a PDF or DOCX file');
}
