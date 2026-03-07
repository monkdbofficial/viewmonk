/**
 * Generates a professional PDF of the FTS test report.
 * Uses `marked` (already a project dep) to parse markdown and
 * Playwright's page.pdf() to render it with Chrome's PDF engine.
 *
 * Usage: node scripts/generate-fts-report-pdf.mjs
 * Output: docs/fts-test-report.pdf
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { chromium } from 'playwright-core';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');

const mdPath  = resolve(ROOT, 'docs/fts-test-report.md');
const outPath = resolve(ROOT, 'docs/fts-test-report.pdf');

// ── Convert markdown → HTML body ─────────────────────────────────────────────
const markdown = readFileSync(mdPath, 'utf8');
const body     = marked.parse(markdown);

// ── Full HTML with print-optimised CSS ───────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FTS Test Report — MonkDB Workbench</title>
<style>
  /* ── Fonts ── */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  /* ── Page ── */
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-center {
      content: "MonkDB Workbench  ·  FTS Test Report  ·  Page " counter(page) " of " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #9ca3af;
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10pt;
    line-height: 1.65;
    color: #1f2937;
    background: #ffffff;
  }

  /* ── Cover banner ── */
  .cover {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0e7490 100%);
    color: #ffffff;
    padding: 36pt 32pt 32pt;
    border-radius: 6pt;
    margin-bottom: 28pt;
    page-break-inside: avoid;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    color: #e0f2fe;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3pt 10pt;
    border-radius: 20pt;
    margin-bottom: 14pt;
  }
  .cover h1 {
    font-size: 26pt;
    font-weight: 700;
    line-height: 1.15;
    color: #ffffff;
    margin-bottom: 8pt;
    border: none;
    padding: 0;
  }
  .cover-sub {
    font-size: 11pt;
    color: #bae6fd;
    margin-bottom: 24pt;
  }
  .cover-meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12pt;
    margin-top: 20pt;
  }
  .cover-meta-item label {
    display: block;
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #7dd3fc;
    margin-bottom: 3pt;
  }
  .cover-meta-item span {
    font-size: 10pt;
    font-weight: 500;
    color: #f0f9ff;
  }
  .cover-status {
    display: inline-flex;
    align-items: center;
    gap: 6pt;
    background: rgba(34,197,94,0.2);
    border: 1px solid rgba(34,197,94,0.4);
    color: #86efac;
    font-size: 9pt;
    font-weight: 600;
    padding: 5pt 14pt;
    border-radius: 20pt;
    margin-top: 18pt;
  }
  .cover-status::before { content: "✓"; font-size: 11pt; }

  /* ── Typography ── */
  h1, h2, h3, h4 {
    font-weight: 700;
    color: #0f172a;
    line-height: 1.25;
  }
  h1 { display: none; } /* hidden — shown in cover instead */

  h2 {
    font-size: 15pt;
    margin-top: 28pt;
    margin-bottom: 12pt;
    padding-bottom: 7pt;
    border-bottom: 2.5pt solid #0e7490;
    color: #0c4a6e;
    page-break-after: avoid;
  }
  h2:first-of-type { margin-top: 0; }

  h3 {
    font-size: 11.5pt;
    margin-top: 20pt;
    margin-bottom: 8pt;
    color: #1e40af;
    padding-left: 8pt;
    border-left: 3pt solid #3b82f6;
    page-break-after: avoid;
  }

  h4 {
    font-size: 10pt;
    margin-top: 14pt;
    margin-bottom: 6pt;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 8.5pt;
    page-break-after: avoid;
  }

  p { margin-bottom: 9pt; }

  a { color: #0369a1; text-decoration: none; }

  strong { font-weight: 600; color: #111827; }

  em { font-style: italic; color: #374151; }

  hr {
    border: none;
    border-top: 1pt solid #e5e7eb;
    margin: 22pt 0;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0 16pt;
    font-size: 9pt;
    page-break-inside: auto;
  }
  thead tr {
    background: #0c4a6e;
    color: #ffffff;
  }
  thead th {
    padding: 7pt 10pt;
    text-align: left;
    font-weight: 600;
    font-size: 8.5pt;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  tbody tr:nth-child(even) { background: #f0f9ff; }
  tbody tr:nth-child(odd)  { background: #ffffff; }
  tbody tr:hover           { background: #e0f2fe; }
  tbody td {
    padding: 6pt 10pt;
    border-bottom: 0.5pt solid #e5e7eb;
    vertical-align: top;
  }
  tbody td:first-child { font-weight: 500; white-space: nowrap; }

  /* Executive summary table — make pass/fail column coloured */
  tbody td:nth-child(3):not(:only-child) {
    font-weight: 600;
  }

  /* ── Code ── */
  code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 8.2pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1pt 4pt;
    border-radius: 3pt;
    border: 0.5pt solid #e2e8f0;
  }

  pre {
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 6pt;
    padding: 14pt 16pt;
    margin: 12pt 0;
    overflow: hidden;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    color: #e2e8f0;
    border: none;
    padding: 0;
    font-size: 8pt;
    line-height: 1.6;
  }

  /* ── Block quote (used for notes) ── */
  blockquote {
    border-left: 3.5pt solid #f59e0b;
    background: #fffbeb;
    padding: 10pt 14pt;
    margin: 12pt 0;
    border-radius: 0 5pt 5pt 0;
    font-size: 9pt;
    color: #78350f;
    page-break-inside: avoid;
  }
  blockquote p { margin: 0; }
  blockquote strong { color: #92400e; }

  /* ── Lists ── */
  ul, ol {
    margin: 8pt 0 10pt 18pt;
    padding: 0;
  }
  li { margin-bottom: 4pt; }

  /* ── Key Findings ── */
  .finding {
    background: #fff7ed;
    border: 1pt solid #fed7aa;
    border-left: 4pt solid #ea580c;
    border-radius: 0 6pt 6pt 0;
    padding: 14pt 16pt;
    margin: 14pt 0;
    page-break-inside: avoid;
  }

  /* ── Page breaks ── */
  .page-break { page-break-before: always; }

  /* ── Stat cards (summary) ── */
  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10pt;
    margin: 16pt 0;
  }
  .stat-card {
    background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
    border: 1pt solid #bae6fd;
    border-radius: 6pt;
    padding: 12pt;
    text-align: center;
    page-break-inside: avoid;
  }
  .stat-card .number {
    font-size: 22pt;
    font-weight: 700;
    color: #0c4a6e;
    line-height: 1;
    margin-bottom: 4pt;
  }
  .stat-card .label {
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #0369a1;
  }
  .stat-card.green { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-color: #86efac; }
  .stat-card.green .number { color: #14532d; }
  .stat-card.green .label  { color: #15803d; }
</style>
</head>
<body>

<!-- ── Cover ─────────────────────────────────────────────────────────────── -->
<div class="cover">
  <div class="cover-badge">MonkDB Workbench · Engineering</div>
  <h1 class="cover-h1">Full-Text Search Module<br>Test Report</h1>
  <p class="cover-sub">Comprehensive end-to-end test suite — SQL compatibility &amp; browser UI</p>
  <div class="cover-meta">
    <div class="cover-meta-item"><label>Report Date</label><span>2026-03-02</span></div>
    <div class="cover-meta-item"><label>MonkDB Version</label><span>6.0.0-SNAPSHOT</span></div>
    <div class="cover-meta-item"><label>Playwright</label><span>1.58.2 · Chromium</span></div>
    <div class="cover-meta-item"><label>Total Tests</label><span>68</span></div>
    <div class="cover-meta-item"><label>SQL Compat</label><span>37 tests</span></div>
    <div class="cover-meta-item"><label>Browser UI</label><span>31 tests</span></div>
  </div>
  <div class="cover-status">All 68 tests passing — 0 failures</div>
</div>

<!-- ── Stat cards ─────────────────────────────────────────────────────────── -->
<div class="stat-row">
  <div class="stat-card green"><div class="number">68</div><div class="label">Total Tests</div></div>
  <div class="stat-card green"><div class="number">68</div><div class="label">Passed</div></div>
  <div class="stat-card"><div class="number">37</div><div class="label">SQL Compat</div></div>
  <div class="stat-card"><div class="number">31</div><div class="label">Browser UI</div></div>
</div>

<!-- ── Markdown content ───────────────────────────────────────────────────── -->
${body}

</body>
</html>`;

// ── Launch Playwright, render, export PDF ────────────────────────────────────
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page    = await browser.newPage();

await page.setContent(html, { waitUntil: 'networkidle' });

// Give Google Fonts a moment to load (they're fetched over the network)
await page.waitForTimeout(2500);

const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: false,   // footer handled via @page CSS
  margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
});

await browser.close();

writeFileSync(outPath, pdfBuffer);
