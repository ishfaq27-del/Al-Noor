/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageData } from '../types.ts';

export const STORAGE_KEY = 'attendance-v1';

export function getDefaultData(): StorageData {
  const initialClass = { id: 'c1', name: 'Class 10-A', teacher: 'Muhammad Ishfaq' };
  return {
    classes: [
      initialClass,
      { id: 'c2', name: 'Class 9-A', teacher: 'Sir Tariq' },
      { id: 'c3', name: 'Class 8-A', teacher: 'Sir Zahid' },
    ],
    cur: 'c1',
    students: [
      { id: 's1', name: 'Muhammad Huzaifa', roll: '1', father: 'Sher Ali Khan', cls: 'c1' },
      { id: 's2', name: 'Abdullah Khan', roll: '2', father: 'Muhammad Farooq', cls: 'c1' },
      { id: 's3', name: 'Hamza Ahmad', roll: '3', father: 'Niaz Muhammad', cls: 'c1' },
      { id: 's4', name: 'Zubair Shah', roll: '4', father: 'Syed Anwar Shah', cls: 'c1' },
      { id: 's5', name: 'Bilal Khan', roll: '5', father: 'Gulzar Ahmad', cls: 'c1' },
      { id: 's6', name: 'Usman Ali', roll: '6', father: 'Liaqat Ali', cls: 'c1' },
      { id: 's7', name: 'Danish Khan', roll: '1', father: 'Zulfiqar Khan', cls: 'c2' },
      { id: 's8', name: 'Abu Bakar', roll: '2', father: 'Said Rahman', cls: 'c2' },
    ],
    records: {},
  };
}

export function loadStorageData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const classes = Array.isArray(parsed.classes) && parsed.classes.length > 0
          ? parsed.classes
          : [{ id: 'c1', name: 'Class 1', teacher: '' }];

        const cur = parsed.cur && classes.some((c: { id: string }) => c.id === parsed.cur)
          ? parsed.cur
          : classes[0].id;

        const students = Array.isArray(parsed.students)
          ? parsed.students.map((s: any) => ({
              ...s,
              cls: s.cls || classes[0].id,
            }))
          : [];

        const records = parsed.records && typeof parsed.records === 'object' && !Array.isArray(parsed.records)
          ? parsed.records
          : {};

        return { classes, students, cur, records };
      }
    }
  } catch (err) {
    console.error('Error loading data from localStorage:', err);
  }

  // Fallback to initial defaults if first time
  const defaults = getDefaultData();
  saveStorageData(defaults);
  return defaults;
}

export function saveStorageData(data: StorageData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Error saving data to localStorage:', err);
    return false;
  }
}
