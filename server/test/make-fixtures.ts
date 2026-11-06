import fs from 'node:fs';
import path from 'node:path';
import * as xlsx from 'xlsx';
import { Document, Packer, Paragraph, TextRun, ExternalHyperlink } from 'docx';
import { chromium } from 'playwright';

const fixturesDir = path.resolve(
  process.cwd().endsWith('server')
    ? 'test/fixtures'
    : 'server/test/fixtures'
);

fs.mkdirSync(fixturesDir, { recursive: true });

async function makeFixtures() {
  console.log(`Generating fixtures in: ${fixturesDir}`);

  // 1. jobs.xlsx
  const wsData = [
    ['Company', 'Role', 'Link', 'Email', 'Deadline'],
    ['Acme Corp', 'Software Engineer', 'Apply', '', '2026-12-31'],
    [
      'Zeta Inc',
      'Backend Lead',
      'https://boards.greenhouse.io/zeta/jobs/4012345',
      '',
      '2026-12-15'
    ],
    ['Example Bank', 'Graphic Designer', '', 'hr@example-bank.ng', '2026-11-30'],
    ['OnlyCompany Ltd', '', '', '', '']
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  // Row 1 Link cell is at C2 (index: r=1, c=2)
  ws['C2'].l = {
    Target: 'https://jobs.lever.co/acme/11111111-2222-3333-4444-555555555555'
  };

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  const xlsxBuf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(path.join(fixturesDir, 'jobs.xlsx'), xlsxBuf);
  console.log('✓ Created jobs.xlsx');

  // 2. jobs.csv
  const csvData = [
    'Company,Role,Link,Email,Deadline',
    'Acme Corp,Software Engineer,https://jobs.lever.co/acme/11111111-2222-3333-4444-555555555555,,2026-12-31',
    'Zeta Inc,Backend Lead,https://boards.greenhouse.io/zeta/jobs/4012345,,2026-12-15',
    'Example Bank,Graphic Designer,,hr@example-bank.ng,2026-11-30',
    'OnlyCompany Ltd,,,,'
  ].join('\n');
  fs.writeFileSync(path.join(fixturesDir, 'jobs.csv'), csvData, 'utf-8');
  console.log('✓ Created jobs.csv');

  // 3. jobs.docx
  const docxFile = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: 'Apply here',
                    style: 'Hyperlink'
                  })
                ],
                link: 'https://careers.example.com/jobs/data-analyst-77'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Send your CV to recruit@example.org with the subject "Data Analyst - Abuja"'
              })
            ]
          })
        ]
      }
    ]
  });
  const docxBuf = await Packer.toBuffer(docxFile);
  fs.writeFileSync(path.join(fixturesDir, 'jobs.docx'), docxBuf);
  console.log('✓ Created jobs.docx');

  // 4. jobs.pdf
  const pdfHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Jobs</title></head>
<body>
  <h1>Job Openings</h1>
  <p><a href="https://apply.workable.com/acme/j/ABC123/">Apply here</a></p>
  <p><a href="https://facebook.com/example">Facebook</a></p>
  <p><a href="https://example.com/unsubscribe">Unsubscribe</a></p>
  <p>Interested candidates should send their CV to jobs@example.com using the job title as subject</p>
</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(pdfHtml);
    await page.pdf({
      path: path.join(fixturesDir, 'jobs.pdf'),
      format: 'A4'
    });
    console.log('✓ Created jobs.pdf');
  } finally {
    await browser.close();
  }

  // 5. listing.html
  const listing1Html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Listing Page 1</title></head>
<body>
  <nav>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
    <a href="index.html">Home</a>
    <a href="https://twitter.com/example">Twitter</a>
  </nav>
  <main>
    <ul>
      <li><a href="jobs/1.html">Senior Software Engineer</a></li>
      <li><a href="jobs/2.html">Product Designer</a></li>
      <li><a href="jobs/3.html">Data Scientist</a></li>
      <li><a href="jobs/4.html">DevOps Specialist</a></li>
      <li><a href="jobs/5.html">QA Lead</a></li>
      <li><a href="jobs/6.html">Engineering Manager</a></li>
      <li><a href="jobs/7.html">Frontend Architect</a></li>
      <li><a href="jobs/8.html">Backend Developer</a></li>
    </ul>
  </main>
  <footer>
    <a rel="next" href="listing-2.html">Next</a>
  </footer>
</body>
</html>`;
  fs.writeFileSync(path.join(fixturesDir, 'listing.html'), listing1Html, 'utf-8');
  console.log('✓ Created listing.html');

  // 6. listing-2.html
  const listing2Html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Listing Page 2</title></head>
<body>
  <main>
    <ul>
      <li><a href="jobs/9.html">Site Reliability Engineer</a></li>
      <li><a href="jobs/10.html">Security Analyst</a></li>
      <li><a href="jobs/11.html">Solutions Architect</a></li>
    </ul>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(fixturesDir, 'listing-2.html'), listing2Html, 'utf-8');
  console.log('✓ Created listing-2.html');

  console.log('Fixtures generated successfully.');
}

makeFixtures().catch((e) => {
  console.error('Fixture generation failed:', e);
  process.exit(1);
});
