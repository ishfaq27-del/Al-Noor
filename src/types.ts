/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SchoolClass {
  id: string;
  name: string;
  teacher?: string;
}

export interface Student {
  id: string;
  name: string;
  roll: string;
  father?: string;
  cls: string;
}

export type AttendanceStatus = 'P' | 'A' | 'L'; // P = Present, A = Absent, L = Leave

export interface StorageData {
  classes: SchoolClass[];
  students: Student[];
  cur: string;
  records: Record<string, Record<string, AttendanceStatus>>; // date (YYYY-MM-DD) -> studentId -> P/A/L
}

export interface ClassReportData {
  c: SchoolClass;
  list: Student[];
  g: {
    P: Student[];
    A: Student[];
    L: Student[];
    N: Student[]; // Not marked
  };
}
