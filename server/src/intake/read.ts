import * as xlsx from 'xlsx';
import { openPdf, pdfText, pdfLinks } from '../files/pdf.js';
import { docxText, docxHtml } from '../files/docx.js';

export interface RawMaterial {
  source: string;
  text: string;
  links: Array<{ url: string; text?: string; page?: number }>;
  rows?: Record<string, string>[];
  visual?: { mediaType: string; base64: string };
  warnings: string[];
}

export interface InputFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function readSingleInput(
  name: string,
  buffer: Buffer,
  source: string
): Promise<RawMaterial> {
  const warnings: string[] = [];
  const links: Array<{ url: string; text?: string; page?: number }> = [];
  let text = '';
  let rows: Record<string, string>[] | undefined;
  let visual: { mediaType: string; base64: string } | undefined;

  const lowerName = name.toLowerCase();

  try {
    if (lowerName.endsWith('.pdf')) {
      const doc = await openPdf(buffer);
      try {
        text = await pdfText(doc);
        const pLinks = await pdfLinks(doc);
        links.push(...pLinks);

        const avgChars = doc.numPages > 0 ? text.length / doc.numPages : 0;
        if (avgChars < 100) {
          if (buffer.length <= 32 * 1024 * 1024 && doc.numPages <= 100) {
            visual = {
              mediaType: 'application/pdf',
              base64: buffer.toString('base64')
            };
          } else {
            warnings.push(
              `${name} looks like a scan and is too big to read. Export a smaller PDF.`
            );
          }
        }
      } finally {
        await doc.destroy();
      }
    } else if (lowerName.endsWith('.docx')) {
      text = await docxText(buffer);
      const html = await docxHtml(buffer);
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        const url = m[1];
        const rawAnchor = m[2].replace(/<[^>]+>/g, '').trim();
        if (url && /^https?:\/\//i.test(url)) {
          links.push({ url, text: rawAnchor || undefined });
        }
      }
    } else if (lowerName.endsWith('.doc')) {
      warnings.push(
        `${name} is an old Word file. Save it as .docx or PDF and upload it again.`
      );
    } else if (
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls') ||
      lowerName.endsWith('.ods') ||
      lowerName.endsWith('.csv')
    ) {
      const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
      rows = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet || !sheet['!ref']) continue;

        const range = xlsx.utils.decode_range(sheet['!ref']);
        let headerRowIndex = -1;
        const headers: { col: number; name: string }[] = [];

        // Find first row with at least 2 non-empty cells
        for (let r = range.s.r; r <= range.e.r; r++) {
          let count = 0;
          const currentHeaders: { col: number; name: string }[] = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = xlsx.utils.encode_cell({ r, c });
            const cell = sheet[cellAddr];
            const val = cell ? String(cell.w || cell.v || '').trim() : '';
            if (val) {
              count++;
              currentHeaders.push({ col: c, name: val });
            }
          }
          if (count >= 2) {
            headerRowIndex = r;
            headers.push(...currentHeaders);
            break;
          }
        }

        if (headerRowIndex === -1) continue;

        for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
          const rowObj: Record<string, string> = {};
          let hasAnyData = false;

          for (const h of headers) {
            const cellAddr = xlsx.utils.encode_cell({ r, c: h.col });
            const cell = sheet[cellAddr];
            if (cell) {
              const displayVal = String(cell.w ?? cell.v ?? '').trim();
              if (displayVal) {
                rowObj[h.name] = displayVal;
                hasAnyData = true;
              }

              // Check cell hyperlink (cell.l?.Target)
              if (cell.l && cell.l.Target) {
                rowObj[`${h.name} (link)`] = cell.l.Target;
                links.push({ url: cell.l.Target, text: displayVal });
              }

              // URL-looking cell text
              if (/^https?:\/\//i.test(displayVal)) {
                links.push({ url: displayVal, text: h.name });
              }
            }
          }

          if (hasAnyData) {
            rows.push(rowObj);
          }
        }
      }
    } else if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.json')
    ) {
      text = buffer.toString('utf-8');
    } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      const htmlStr = buffer.toString('utf-8');
      text = htmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const linkRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(htmlStr)) !== null) {
        const url = m[1];
        const anchor = m[2].replace(/<[^>]+>/g, '').trim();
        links.push({ url, text: anchor || undefined });
      }
    } else if (
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.gif')
    ) {
      if (buffer.length > 5 * 1024 * 1024) {
        warnings.push(`${name} is too large. Crop or resize it under 5 MB.`);
      } else {
        const ext = lowerName.split('.').pop() || 'jpeg';
        const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        visual = { mediaType, base64: buffer.toString('base64') };
      }
    } else {
      warnings.push(
        `${name}: unsupported file type. Use PDF, Word (.docx), Excel/CSV, text, HTML or an image.`
      );
    }
  } catch (err: any) {
    warnings.push(`Error reading ${name}: ${err?.message || String(err)}`);
  }

  // Pull plain-text URLs and emails from text
  if (text) {
    const urlMatches = text.match(/https?:\/\/[^\s<>"'`)\]]+/g) || [];
    for (const rawUrl of urlMatches) {
      const cleaned = rawUrl.replace(/[.,;:!?)]+$/, '');
      if (cleaned && !links.some((l) => l.url === cleaned)) {
        links.push({ url: cleaned });
      }
    }
  }

  return {
    source,
    text,
    links,
    rows,
    visual,
    warnings
  };
}

export async function downloadFile(
  url: string,
  timeoutMs = 30_000
): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DESKTOP_UA },
      redirect: 'follow',
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 25 * 1024 * 1024) {
      throw new Error(`File at ${url} exceeds 25 MB limit`);
    }

    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

export async function processInputs(params: {
  files?: InputFile[];
  pastedText?: string;
  scanListings?: boolean;
}): Promise<{
  materials: RawMaterial[];
  listingUrls: string[];
  warnings: string[];
}> {
  const materials: RawMaterial[] = [];
  const listingUrls: string[] = [];
  const warnings: string[] = [];

  // 1. Process uploaded files
  if (params.files) {
    for (const f of params.files) {
      const mat = await readSingleInput(f.originalname, f.buffer, f.originalname);
      materials.push(mat);
      warnings.push(...mat.warnings);
    }
  }

  // 2. Process pasted text
  if (params.pastedText && params.pastedText.trim()) {
    const textMat = await readSingleInput(
      'pasted text.txt',
      Buffer.from(params.pastedText, 'utf-8'),
      'pasted text'
    );
    materials.push(textMat);
    warnings.push(...textMat.warnings);

    // Extract URLs from pasted text
    const urlMatches =
      params.pastedText.match(/https?:\/\/[^\s<>"'`)\]]+/g) || [];
    const uniqueUrls = Array.from(
      new Set(urlMatches.map((u) => u.replace(/[.,;:!?)]+$/, '')))
    );

    for (const url of uniqueUrls) {
      try {
        const u = new URL(url);

        // Google Sheets
        const sheetMatch = url.match(
          /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
        );
        if (sheetMatch) {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=xlsx`;
          try {
            const { buffer, contentType } = await downloadFile(exportUrl);
            if (contentType.includes('text/html')) {
              warnings.push(
                "This Google file isn't shared publicly. Download it and upload the file instead."
              );
            } else {
              const mat = await readSingleInput('sheet.xlsx', buffer, url);
              materials.push(mat);
              warnings.push(...mat.warnings);
              continue;
            }
          } catch (e: any) {
            warnings.push(`Couldn't download Google Sheet: ${e?.message || e}`);
          }
        }

        // Google Docs
        const docMatch = url.match(
          /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/
        );
        if (docMatch) {
          const exportUrl = `https://docs.google.com/document/d/${docMatch[1]}/export?format=docx`;
          try {
            const { buffer, contentType } = await downloadFile(exportUrl);
            if (contentType.includes('text/html')) {
              warnings.push(
                "This Google file isn't shared publicly. Download it and upload the file instead."
              );
            } else {
              const mat = await readSingleInput('doc.docx', buffer, url);
              materials.push(mat);
              warnings.push(...mat.warnings);
              continue;
            }
          } catch (e: any) {
            warnings.push(`Couldn't download Google Doc: ${e?.message || e}`);
          }
        }

        // Google Drive file
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch) {
          const exportUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
          try {
            const { buffer, contentType } = await downloadFile(exportUrl);
            if (contentType.includes('text/html')) {
              warnings.push(
                "This Google file isn't shared publicly. Download it and upload the file instead."
              );
            } else {
              const mat = await readSingleInput('drive-file', buffer, url);
              materials.push(mat);
              warnings.push(...mat.warnings);
              continue;
            }
          } catch (e: any) {
            warnings.push(`Couldn't download Drive file: ${e?.message || e}`);
          }
        }

        // File download by extension or content-type
        const pathname = u.pathname.toLowerCase();
        const isFileUrl =
          pathname.endsWith('.pdf') ||
          pathname.endsWith('.docx') ||
          pathname.endsWith('.xlsx') ||
          pathname.endsWith('.xls') ||
          pathname.endsWith('.csv');

        if (isFileUrl) {
          try {
            const { buffer, contentType } = await downloadFile(url);
            const ext = pathname.split('.').pop() || 'bin';
            const mat = await readSingleInput(`downloaded.${ext}`, buffer, url);
            materials.push(mat);
            warnings.push(...mat.warnings);
            continue;
          } catch (e: any) {
            warnings.push(`Couldn't download file from ${url}: ${e?.message || e}`);
          }
        }

        // If scanListings was ticked, and not a file
        if (params.scanListings) {
          listingUrls.push(url);
        }
      } catch {
        // invalid URL, ignore
      }
    }
  }

  return { materials, listingUrls, warnings };
}
