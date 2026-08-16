/** Wraps a CSV cell, escaping quotes and anything that would break parsing. */
function csvCell(value: unknown) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]) {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.value(row))).join(','));
  }
  return lines.join('\r\n');
}

/**
 * Triggers a browser download. The BOM makes Excel read the file as UTF-8,
 * without it Arabic headers come out as mojibake.
 */
export function downloadCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const blob = new Blob([`﻿${toCsv(rows, columns)}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * PDF export goes through the browser's own print-to-PDF. Canvas-based PDF
 * libraries break Arabic letter joining, and the print path renders with the
 * same font stack the user already sees.
 */
export function printCurrentView() {
  window.print();
}

export function timestampedName(base: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `${base}-${stamp}`;
}
