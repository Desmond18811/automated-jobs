import * as xlsx from 'xlsx';
import type { Job } from '../types.js';

export function exportQueue(
  jobs: Job[],
  format: 'xlsx' | 'csv'
): { data: Buffer | string; fileName: string; contentType: string } {
  const rows = jobs.map((j) => ({
    Status: j.status,
    Title: j.title || '',
    Company: j.company || '',
    'How to apply (URL or email)': j.url || j.applyEmail || '',
    Kind: j.kind,
    Source: j.source || '',
    Message: j.message || '',
    Added: j.createdAt || '',
    'Last update': j.updatedAt || '',
    'Sent/applied at': j.sentAt || ''
  }));

  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Jobs');

  const today = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csvContent = xlsx.utils.sheet_to_csv(ws);
    return {
      data: csvContent,
      fileName: `job-autopilot-${today}.csv`,
      contentType: 'text/csv; charset=utf-8'
    };
  }

  const xlsxBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return {
    data: xlsxBuffer,
    fileName: `job-autopilot-${today}.xlsx`,
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}
