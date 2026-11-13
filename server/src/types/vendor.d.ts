// Minimal typings for packages that ship none (or whose typings we don't need in full).

// Importing pdf-parse's inner module avoids its debug-mode bug that reads a test PDF on import.
declare module 'pdf-parse/lib/pdf-parse.js' {
  function pdfParse(data: Buffer): Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}

declare module 'mammoth' {
  const mammoth: { extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }> };
  export default mammoth;
}
