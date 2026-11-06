// @ts-ignore
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function openPdf(buffer: Buffer | Uint8Array): Promise<any> {
  const data = new Uint8Array(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );
  return pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0
  }).promise;
}

export async function pdfText(doc: any): Promise<string> {
  const pageTexts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let pageStr = '';

    for (const item of content.items) {
      if ('str' in item) {
        pageStr += item.str;
        if (item.hasEOL) {
          pageStr += '\n';
        }
      }
    }

    pageTexts.push(pageStr);
  }

  const combined = pageTexts.join('\n\n');
  return combined.replace(/[ \t]+/g, ' ').trim();
}

export async function pdfLinks(
  doc: any
): Promise<Array<{ url: string; page: number }>> {
  const links: Array<{ url: string; page: number }> = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const annotations = await page.getAnnotations();

    for (const annot of annotations) {
      const url = annot.url || annot.unsafeUrl;
      if (annot.subtype === 'Link' && url) {
        links.push({ url, page: i });
      }
    }
  }

  return links;
}

export async function extractPdfText(
  buffer: Buffer | Uint8Array
): Promise<string> {
  const doc = await openPdf(buffer);
  try {
    return await pdfText(doc);
  } finally {
    await doc.destroy();
  }
}

export async function extractPdfLinks(
  buffer: Buffer | Uint8Array
): Promise<Array<{ url: string; page: number }>> {
  const doc = await openPdf(buffer);
  try {
    return await pdfLinks(doc);
  } finally {
    await doc.destroy();
  }
}
