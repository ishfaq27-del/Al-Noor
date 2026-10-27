/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SCHOOL_NAME, SCHOOL_LOCATION, PREPARED_BY, SCHOOL_LOGO } from '../constants.ts';
import { ClassReportData, Student, SchoolClass } from '../types.ts';

// Helper to sanitize non-latin chars for standard PDF Helvetica font
function cleanText(str: string): string {
  return String(str || '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

export function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64.split(',')[1] || base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

/**
 * Generate PDF for Daily Attendance Report
 */
export async function generateDailyAttendancePdf(
  date: string,
  sets: ClassReportData[],
  all: boolean
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logoImage = null;
  try {
    logoImage = await doc.embedJpg(base64ToUint8Array(SCHOOL_LOGO));
  } catch (err) {
    console.warn('Could not embed logo in PDF:', err);
  }

  const K = 72 / 25.4; // 1 mm in points
  const M = 15; // margin in mm
  const W = 210; // A4 width mm
  const H = 297; // A4 height mm

  for (const set of sets) {
    let page = doc.addPage([W * K, H * K]);
    let y = 20;

    const newPage = () => {
      page = doc.addPage([W * K, H * K]);
      y = 20;
    };

    const drawHeader = () => {
      // Top colored accent bars
      page.drawRectangle({
        x: 0,
        y: (H - 6) * K,
        width: W * K,
        height: 6 * K,
        color: rgb(15 / 255, 107 / 255, 87 / 255), // emerald green
      });
      page.drawRectangle({
        x: 0,
        y: (H - 8) * K,
        width: W * K,
        height: 2 * K,
        color: rgb(29 / 255, 95 / 255, 209 / 255), // royal blue
      });

      // School Logo
      if (logoImage) {
        page.drawImage(logoImage, {
          x: M * K,
          y: (H - 34) * K,
          width: 22 * K,
          height: 22 * K,
        });
      }

      // Title & Subtitle
      page.drawText(cleanText(SCHOOL_NAME), {
        x: (M + 27) * K,
        y: (H - 21) * K,
        size: 15,
        font: fontBold,
        color: rgb(15 / 255, 107 / 255, 87 / 255),
      });
      page.drawText(cleanText(SCHOOL_LOCATION), {
        x: (M + 27) * K,
        y: (H - 28) * K,
        size: 11,
        font: fontRegular,
        color: rgb(91 / 255, 115 / 255, 109 / 255),
      });

      // Divider line
      page.drawLine({
        start: { x: M * K, y: (H - 38) * K },
        end: { x: (W - M) * K, y: (H - 38) * K },
        thickness: 0.6,
        color: rgb(200 / 255, 200 / 255, 200 / 255),
      });
    };

    drawHeader();

    // Report meta
    page.drawText('Daily Attendance Report', {
      x: M * K,
      y: (H - 48) * K,
      size: 13,
      font: fontBold,
      color: rgb(29 / 255, 95 / 255, 209 / 255),
    });

    page.drawText(`Class: ${cleanText(set.c.name)}`, {
      x: M * K,
      y: (H - 56) * K,
      size: 11,
      font: fontRegular,
    });
    page.drawText(`Teacher: ${cleanText(set.c.teacher || '-')}`, {
      x: M * K,
      y: (H - 62) * K,
      size: 11,
      font: fontRegular,
    });
    page.drawText(`Date: ${cleanText(formatDatePretty(date))}`, {
      x: M * K,
      y: (H - 68) * K,
      size: 11,
      font: fontRegular,
    });

    const summaryText = `Present: ${set.g.P.length}   Absent: ${set.g.A.length}   Leave: ${set.g.L.length}${
      set.g.N.length ? `   Not marked: ${set.g.N.length}` : ''
    }   Total students: ${set.list.length}`;

    page.drawText(cleanText(summaryText), {
      x: M * K,
      y: (H - 77) * K,
      size: 10.5,
      font: fontBold,
      color: rgb(18 / 255, 48 / 255, 42 / 255),
    });

    y = 89;

    const sections = [
      { key: 'A', title: 'Absent', color: [179 / 255, 38 / 255, 30 / 255], items: set.g.A },
      { key: 'L', title: 'Leave', color: [199 / 255, 119 / 255, 0 / 255], items: set.g.L },
    ];

    for (const sec of sections) {
      if (y > 255) {
        newPage();
        drawHeader();
        y = 50;
      }

      // Section header banner
      page.drawRectangle({
        x: M * K,
        y: (H - y - 3) * K,
        width: (W - 2 * M) * K,
        height: 7.5 * K,
        color: rgb(sec.color[0], sec.color[1], sec.color[2]),
      });

      page.drawText(`${sec.title} (${sec.items.length})`, {
        x: (M + 3) * K,
        y: (H - y + 2) * K,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      y += 9;

      if (sec.items.length === 0) {
        page.drawText('None', {
          x: (M + 3) * K,
          y: (H - y) * K,
          size: 11,
          font: fontRegular,
          color: rgb(110 / 255, 110 / 255, 110 / 255),
        });
        y += 8;
      } else {
        for (const s of sec.items) {
          if (y > 275) {
            newPage();
            drawHeader();
            y = 50;
          }

          page.drawText(cleanText(s.roll || '-'), {
            x: (M + 3) * K,
            y: (H - y) * K,
            size: 10.5,
            font: fontRegular,
          });

          page.drawText(cleanText(s.name), {
            x: (M + 18) * K,
            y: (H - y) * K,
            size: 10.5,
            font: fontBold,
          });

          page.drawText(`Father: ${cleanText(s.father || '-')}`, {
            x: (M + 90) * K,
            y: (H - y) * K,
            size: 10.5,
            font: fontRegular,
            color: rgb(80 / 255, 80 / 255, 80 / 255),
          });

          page.drawLine({
            start: { x: M * K, y: (H - y - 2) * K },
            end: { x: (W - M) * K, y: (H - y - 2) * K },
            thickness: 0.5,
            color: rgb(225 / 255, 225 / 255, 225 / 255),
          });

          y += 7.5;
        }
      }
      y += 6;
    }

    // Teacher Signature line
    if (y > 260) {
      newPage();
      drawHeader();
      y = 60;
    }
    y += 12;
    page.drawLine({
      start: { x: (W - M - 60) * K, y: (H - y) * K },
      end: { x: (W - M) * K, y: (H - y) * K },
      thickness: 0.8,
      color: rgb(100 / 255, 100 / 255, 100 / 255),
    });
    page.drawText('Teacher Signature', {
      x: (W - M - 55) * K,
      y: (H - y - 5) * K,
      size: 10,
      font: fontRegular,
    });
  }

  // Footer on all pages
  const totalPages = doc.getPages();
  totalPages.forEach((pg) => {
    const textWidth = fontRegular.widthOfTextAtSize(PREPARED_BY, 9);
    pg.drawText(PREPARED_BY, {
      x: (W * K - textWidth) / 2,
      y: (H - 289) * K,
      size: 9,
      font: fontRegular,
      color: rgb(91 / 255, 115 / 255, 109 / 255),
    });
  });

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const filename = `attendance-${all ? 'all-classes' : sets[0].c.name.replace(/[^\w-]+/g, '-')}-${date}.pdf`;
  triggerDownload(blob, filename);
  return blob;
}

/**
 * Generate PDF for Student List
 */
export async function generateStudentListPdf(cls: SchoolClass, students: Student[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logoImage = null;
  try {
    logoImage = await doc.embedJpg(base64ToUint8Array(SCHOOL_LOGO));
  } catch (err) {}

  const K = 72 / 25.4;
  const M = 15;
  const W = 210;
  const H = 297;

  let page = doc.addPage([W * K, H * K]);
  let y = 20;

  const newPage = () => {
    page = doc.addPage([W * K, H * K]);
    y = 20;
    drawTopBanner();
    drawTableHead();
  };

  const drawTopBanner = () => {
    page.drawRectangle({
      x: 0,
      y: (H - 6) * K,
      width: W * K,
      height: 6 * K,
      color: rgb(15 / 255, 107 / 255, 87 / 255),
    });
    page.drawRectangle({
      x: 0,
      y: (H - 8) * K,
      width: W * K,
      height: 2 * K,
      color: rgb(29 / 255, 95 / 255, 209 / 255),
    });

    if (logoImage) {
      page.drawImage(logoImage, {
        x: M * K,
        y: (H - 34) * K,
        width: 22 * K,
        height: 22 * K,
      });
    }

    page.drawText(cleanText(SCHOOL_NAME), {
      x: (M + 27) * K,
      y: (H - 21) * K,
      size: 15,
      font: fontBold,
      color: rgb(15 / 255, 107 / 255, 87 / 255),
    });
    page.drawText(cleanText(SCHOOL_LOCATION), {
      x: (M + 27) * K,
      y: (H - 28) * K,
      size: 11,
      font: fontRegular,
      color: rgb(91 / 255, 115 / 255, 109 / 255),
    });

    page.drawLine({
      start: { x: M * K, y: (H - 38) * K },
      end: { x: (W - M) * K, y: (H - 38) * K },
      thickness: 0.6,
      color: rgb(200 / 255, 200 / 255, 200 / 255),
    });
  };

  const drawTableHead = () => {
    page.drawRectangle({
      x: M * K,
      y: (H - y - 3) * K,
      width: (W - 2 * M) * K,
      height: 7.5 * K,
      color: rgb(214 / 255, 232 / 255, 255 / 255),
    });
    page.drawText('Roll No', { x: (M + 3) * K, y: (H - y + 2) * K, size: 10, font: fontBold });
    page.drawText('Student Name', { x: (M + 25) * K, y: (H - y + 2) * K, size: 10, font: fontBold });
    page.drawText('Father Name', { x: (M + 100) * K, y: (H - y + 2) * K, size: 10, font: fontBold });
    y += 9;
  };

  drawTopBanner();

  page.drawText('Student Enrolment List', {
    x: M * K,
    y: (H - 48) * K,
    size: 13,
    font: fontBold,
    color: rgb(29 / 255, 95 / 255, 209 / 255),
  });

  page.drawText(`Class: ${cleanText(cls.name)}   Teacher: ${cleanText(cls.teacher || '-')}   Total: ${students.length} students`, {
    x: M * K,
    y: (H - 56) * K,
    size: 10.5,
    font: fontRegular,
  });

  y = 66;
  drawTableHead();

  students.forEach((s) => {
    if (y > 275) {
      newPage();
    }
    page.drawText(cleanText(s.roll || '-'), { x: (M + 3) * K, y: (H - y) * K, size: 10.5, font: fontRegular });
    page.drawText(cleanText(s.name), { x: (M + 25) * K, y: (H - y) * K, size: 10.5, font: fontBold });
    page.drawText(cleanText(s.father || '-'), { x: (M + 100) * K, y: (H - y) * K, size: 10.5, font: fontRegular });

    page.drawLine({
      start: { x: M * K, y: (H - y - 2) * K },
      end: { x: (W - M) * K, y: (H - y - 2) * K },
      thickness: 0.5,
      color: rgb(225 / 255, 225 / 255, 225 / 255),
    });
    y += 7.5;
  });

  // Footer on all pages
  doc.getPages().forEach((pg) => {
    const textWidth = fontRegular.widthOfTextAtSize(PREPARED_BY, 9);
    pg.drawText(PREPARED_BY, {
      x: (W * K - textWidth) / 2,
      y: (H - 289) * K,
      size: 9,
      font: fontRegular,
      color: rgb(91 / 255, 115 / 255, 109 / 255),
    });
  });

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const filename = `students-${cls.name.replace(/[^\w-]+/g, '-')}.pdf`;
  triggerDownload(blob, filename);
  return blob;
}

/**
 * Generate High-Resolution Image for WhatsApp Card
 */
export async function createReportImageBlob(set: ClassReportData, date: string): Promise<Blob> {
  const W = 1080;
  const P = 50;
  const RH = 52;
  const SH = 56;
  const rowsA = Math.max(1, set.g.A.length);
  const rowsL = Math.max(1, set.g.L.length);
  const H = 500 + (SH + rowsA * RH + 34) + (SH + rowsL * RH + 34) + 150 + 70;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const fontFam = 'system-ui, -apple-system, sans-serif';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Top color accents
  ctx.fillStyle = '#0f6b57';
  ctx.fillRect(0, 0, W, 22);
  ctx.fillStyle = '#1d5fd1';
  ctx.fillRect(0, 22, W, 8);

  // Draw Logo
  const img = new Image();
  img.src = SCHOOL_LOGO;
  await new Promise((res) => {
    if (img.complete) res(null);
    else {
      img.onload = () => res(null);
      img.onerror = () => res(null);
    }
  });

  try {
    ctx.drawImage(img, P, 62, 112, 112);
  } catch (err) {}

  // School Name
  ctx.fillStyle = '#0f6b57';
  ctx.font = `bold 38px ${fontFam}`;
  ctx.fillText(SCHOOL_NAME, P + 135, 110);

  ctx.fillStyle = '#5b736d';
  ctx.font = `28px ${fontFam}`;
  ctx.fillText(SCHOOL_LOCATION, P + 135, 152);

  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(P, 200, W - P * 2, 3);

  // Daily report banner
  ctx.fillStyle = '#1d5fd1';
  ctx.font = `bold 38px ${fontFam}`;
  ctx.fillText('Daily Attendance Report', P, 258);

  ctx.fillStyle = '#12302a';
  ctx.font = `30px ${fontFam}`;
  ctx.fillText(`Class: ${set.c.name}`, P, 312);
  ctx.fillText(`Teacher: ${set.c.teacher || '-'}`, P, 354);
  ctx.fillText(`Date: ${formatDatePretty(date)}`, P, 396);

  ctx.font = `bold 30px ${fontFam}`;
  ctx.fillText(
    `Present: ${set.g.P.length}   Absent: ${set.g.A.length}   Leave: ${set.g.L.length}   Total: ${set.list.length}`,
    P,
    452
  );

  let y = 490;
  const sections = [
    { title: 'Absent', count: set.g.A.length, items: set.g.A, color: '#b3261e' },
    { title: 'Leave', count: set.g.L.length, items: set.g.L, color: '#c77700' },
  ];

  for (const sec of sections) {
    ctx.fillStyle = sec.color;
    ctx.fillRect(P, y, W - P * 2, SH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 30px ${fontFam}`;
    ctx.fillText(`${sec.title} (${sec.count})`, P + 16, y + 39);
    y += SH;

    ctx.font = `28px ${fontFam}`;
    if (sec.items.length === 0) {
      ctx.fillStyle = '#6e6e6e';
      ctx.fillText('None', P + 16, y + 36);
      y += RH;
    } else {
      for (const s of sec.items) {
        ctx.fillStyle = '#12302a';
        ctx.font = `bold 28px ${fontFam}`;
        ctx.fillText(s.roll ? `${s.roll}.` : '-', P + 16, y + 36);

        ctx.font = `28px ${fontFam}`;
        ctx.fillText(s.name, P + 90, y + 36);

        ctx.fillStyle = '#555555';
        ctx.fillText(`Father: ${s.father || '-'}`, P + 560, y + 36);

        ctx.fillStyle = '#e1e1e1';
        ctx.fillRect(P, y + RH - 2, W - P * 2, 2);
        y += RH;
      }
    }
    y += 34;
  }

  // Teacher signature line
  y += 50;
  ctx.fillStyle = '#787878';
  ctx.fillRect(W - P - 300, y, 300, 2);
  ctx.fillStyle = '#000000';
  ctx.font = `26px ${fontFam}`;
  ctx.fillText('Teacher signature', W - P - 300, y + 38);

  // Footer
  ctx.fillStyle = '#5b736d';
  ctx.font = `24px ${fontFam}`;
  const textWidth = ctx.measureText(PREPARED_BY).width;
  ctx.fillText(PREPARED_BY, (W - textWidth) / 2, H - 28);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
  });
}

/**
 * Generate formatted text message for WhatsApp
 */
export function generateWhatsAppText(date: string, sets: ClassReportData[]): string {
  const lines: string[] = [
    `*${SCHOOL_NAME}*`,
    `_${SCHOOL_LOCATION}_`,
    `📋 *Daily Attendance Report*`,
    `📅 Date: ${formatDatePretty(date)}`,
    '',
  ];

  sets.forEach((set) => {
    lines.push(`🏫 *Class: ${set.c.name}*` + (set.c.teacher ? ` (Teacher: ${set.c.teacher})` : ''));
    lines.push(`✅ Present: ${set.g.P.length} | ❌ Absent: ${set.g.A.length} | 🟡 Leave: ${set.g.L.length}`);
    
    if (set.g.A.length > 0) {
      lines.push(`\n*🔴 Absent Students (${set.g.A.length}):*`);
      set.g.A.forEach((s) => {
        lines.push(`• ${s.roll ? `${s.roll}. ` : ''}${s.name}${s.father ? ` (S/D of ${s.father})` : ''}`);
      });
    }

    if (set.g.L.length > 0) {
      lines.push(`\n*🟡 Leave Students (${set.g.L.length}):*`);
      set.g.L.forEach((s) => {
        lines.push(`• ${s.roll ? `${s.roll}. ` : ''}${s.name}${s.father ? ` (S/D of ${s.father})` : ''}`);
      });
    }

    lines.push(`Total Students: ${set.list.length}`);
    lines.push('──────────────────────');
  });

  lines.push(`\n_${PREPARED_BY}_`);
  return lines.join('\n');
}
