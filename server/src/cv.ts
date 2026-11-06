import fs from 'node:fs';
import { extractPdfText } from './files/pdf.js';
import { docxText } from './files/docx.js';

export async function extractCvText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const lower = filePath.toLowerCase();
  let rawText = '';

  if (lower.endsWith('.pdf')) {
    rawText = await extractPdfText(buffer);
  } else if (lower.endsWith('.docx')) {
    rawText = await docxText(buffer);
  } else {
    throw new Error(`Unsupported CV format for file: ${filePath}`);
  }

  // Normalise: strip trailing spaces on lines, collapse 3+ newlines to 2, trim.
  const normalized = rawText
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized;
}
