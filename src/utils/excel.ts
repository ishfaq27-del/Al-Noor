/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  roll: string;
  name: string;
  father: string;
}

export async function parseStudentFile(file: File): Promise<ParsedStudentRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];

  // Convert sheet to array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) return [];

  // Search first 6 rows for header row
  let headerIndex = -1;
  let nameCol = -1;
  let rollCol = -1;
  let fatherCol = -1;

  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim().toLowerCase();
      if (/father|walid|guardian|father'?s?\s*name/i.test(cell) && fatherCol === -1) {
        fatherCol = c;
      } else if (/^(students?\s*)?(name|naam)s?$/i.test(cell) && nameCol === -1) {
        nameCol = c;
      } else if (/(roll|sr|serial|s\.?\s*no)/i.test(cell) && rollCol === -1) {
        rollCol = c;
      }
    }
    if (nameCol !== -1) {
      headerIndex = r;
      break;
    }
  }

  const results: ParsedStudentRow[] = [];

  if (headerIndex !== -1 && nameCol !== -1) {
    // Structured header found
    for (let r = headerIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const name = String(row[nameCol] ?? '').trim();
      if (!name) continue;
      // Skip repeated header line if any
      if (/^(students?\s*)?(name|naam)s?$/i.test(name)) continue;

      const roll = rollCol !== -1 ? String(row[rollCol] ?? '').trim() : '';
      const father = fatherCol !== -1 ? String(row[fatherCol] ?? '').trim() : '';
      results.push({ roll, name, father });
    }
  } else {
    // Fallback: heuristic detection across each row
    for (const row of rawRows) {
      if (!row) continue;
      const cells = row.map((cell) => String(cell ?? '').trim()).filter(Boolean);
      if (cells.length === 0) continue;

      let roll = '';
      let name = '';
      let father = '';

      for (const cell of cells) {
        const isNumeric = /^\d{1,5}$/.test(cell);
        if (isNumeric && !roll) {
          roll = cell;
        } else if (!name) {
          name = cell;
        } else if (!father) {
          father = cell;
        }
      }

      if (!name || /^(students?\s*)?(name|naam)s?$/i.test(name) || /^(roll|sr|serial)/i.test(name)) {
        continue;
      }

      results.push({ roll, name, father });
    }
  }

  return results;
}

export function downloadStudentTemplate() {
  const wsData = [
    ['Roll No', 'Student Name', 'Father Name'],
    [1, 'Muhammad Huzaifa', 'Sher Ali Khan'],
    [2, 'Abdullah Khan', 'Muhammad Farooq'],
    [3, 'Hamza Ahmad', 'Niaz Muhammad'],
    [4, 'Zubair Shah', 'Syed Anwar Shah'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Set custom column widths
  ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'student-import-template.xlsx');
}
