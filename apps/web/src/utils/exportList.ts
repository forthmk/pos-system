/* ──────────────────────────────────────────────────────────────────────────
 * exportList — CSV download and Print for a list page. Both take plain
 * strings (headers + rows), so a page passes what it already shows on screen.
 *
 *  - downloadCsv: a .csv that opens in Excel / Google Sheets. Starts with a
 *    BOM so Excel reads ñ and other accents correctly; every value is quoted.
 *    (The commissary's downloadXlsx was left out: the POS exports CSV / Z-Read.)
 *  - printFile: prints a file chosen from the device (a PDF or a photo) —
 *    through the same browser print screen.
 *  - printList: prints a simple table (title, filter line, table) from a
 *    hidden iframe, so no new tab or pop-up is needed.
 * ────────────────────────────────────────────────────────────────────────── */

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
    const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function printList(title: string, subtitle: string, headers: string[], rows: string[][]) {
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = rows.length
        ? rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" class="empty">No records</td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  /* No page margin: browsers print their own header and footer (date, title,
     web address, page number) in it — the body's padding is the margin instead. */
  @page { margin: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 14mm; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  p { font-size: 12px; color: #64748b; margin: 0 0 12px; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: separate; border-spacing: 4px; font-size: 12px; }
  th, td { padding: 7px 10px; border-radius: 3px; }
  th { background: #1b3768; color: #fff; font-weight: 600; text-align: center; }
  td { background: #dde5f0; text-align: center; }
  th:first-child, td:first-child { text-align: left; }
  tr { break-inside: avoid; }
  .empty { text-align: center; color: #64748b; }
</style></head><body>
<h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    // Let the table lay out, print, then remove the frame.
    setTimeout(() => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), 1000);
    }, 150);
}

/** Prints a PDF or photo chosen from the device, through the browser's own
 *  print screen. A browser that can't show a PDF inside the page (phones)
 *  opens it in a new tab instead, to print from its viewer. */
export function printFile(file: File) {
    const url = URL.createObjectURL(file);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const canShowPdf = (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
    if (isPdf && !canShowPdf) {
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
    }
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    const done = () =>
        setTimeout(() => {
            frame.remove();
            URL.revokeObjectURL(url);
        }, 60_000);
    if (isPdf) {
        frame.onload = () => {
            setTimeout(() => {
                frame.contentWindow?.focus();
                frame.contentWindow?.print();
                done();
            }, 300);
        };
        frame.src = url;
        document.body.appendChild(frame);
        return;
    }
    // A photo: on its own page, as big as the paper allows.
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title>
<style>@page { margin: 0; } html, body { margin: 0; height: 100%; }
body { display: flex; align-items: center; justify-content: center; }
img { max-width: 100%; max-height: 100vh; object-fit: contain; }</style></head>
<body><img src="${url}" alt=""></body></html>`);
    doc.close();
    const img = doc.querySelector('img')!;
    const go = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        done();
    };
    if (img.complete) setTimeout(go, 100);
    else img.onload = () => setTimeout(go, 100);
}
