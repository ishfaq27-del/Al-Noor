/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SCHOOL_NAME, SCHOOL_LOCATION, PREPARED_BY, SCHOOL_LOGO } from '../constants.ts';
import { ClassReportData, Student, SchoolClass } from '../types.ts';
import { formatDatePretty } from '../utils/export.ts';

export type PrintMode = 'daily' | 'studentList' | 'report' | null;

interface PrintAreaProps {
  mode: PrintMode;
  date: string;
  dailySets: ClassReportData[];
  currentClass: SchoolClass;
  students: Student[];
  cumulativeReportRows: {
    student: Student;
    p: number;
    a: number;
    l: number;
    percentage: number;
  }[];
  recordedDaysCount: number;
}

export const PrintArea: React.FC<PrintAreaProps> = ({
  mode,
  date,
  dailySets,
  currentClass,
  students,
  cumulativeReportRows,
  recordedDaysCount,
}) => {
  if (!mode) return null;

  return (
    <div id="printArea" className="print:block hidden bg-white text-black p-4 text-[11pt] font-sans">
      {/* 1. Daily Attendance Print */}
      {mode === 'daily' && (
        <div>
          {dailySets.map((set, sIdx) => (
            <div key={set.c.id} className={sIdx > 0 ? 'break-before-page pt-6' : ''}>
              {/* Header */}
              <div className="flex items-center gap-4 pb-3 border-b-2 border-emerald-800 mb-3">
                <img src={SCHOOL_LOGO} alt="" className="w-16 h-16 object-contain" />
                <div>
                  <h2 className="text-xl font-bold text-emerald-900 m-0 leading-tight">
                    {SCHOOL_NAME}
                  </h2>
                  <p className="text-sm text-slate-600 m-0">{SCHOOL_LOCATION}</p>
                </div>
              </div>

              <h3 className="text-base font-bold text-blue-800 m-0 mb-1">
                Daily Attendance Report
              </h3>

              <div className="text-xs text-slate-700 mb-2 flex flex-wrap gap-4 font-medium">
                <span>Class: <strong>{set.c.name}</strong></span>
                <span>Teacher: <strong>{set.c.teacher || '-'}</strong></span>
                <span>Date: <strong>{formatDatePretty(date)}</strong></span>
              </div>

              <div className="bg-slate-100 p-2 rounded text-xs font-bold mb-3 flex gap-4">
                <span>Present: {set.g.P.length}</span>
                <span className="text-rose-700">Absent: {set.g.A.length}</span>
                <span className="text-amber-700">Leave: {set.g.L.length}</span>
                {set.g.N.length > 0 && <span>Not marked: {set.g.N.length}</span>}
                <span>Total Enrolled: {set.list.length}</span>
              </div>

              {/* Absent Table */}
              <div className="mb-4">
                <div className="bg-rose-700 text-white font-bold text-xs px-2.5 py-1">
                  Absent Students ({set.g.A.length})
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1.5 text-left w-14">Roll</th>
                      <th className="border border-slate-300 p-1.5 text-left">Student Name</th>
                      <th className="border border-slate-300 p-1.5 text-left">Father Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {set.g.A.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-500 italic">
                          None
                        </td>
                      </tr>
                    ) : (
                      set.g.A.map((s) => (
                        <tr key={s.id} className="border border-slate-300">
                          <td className="border border-slate-300 p-1.5 font-bold">{s.roll || '-'}</td>
                          <td className="border border-slate-300 p-1.5 font-bold">{s.name}</td>
                          <td className="border border-slate-300 p-1.5">{s.father || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Leave Table */}
              <div className="mb-4">
                <div className="bg-amber-700 text-white font-bold text-xs px-2.5 py-1">
                  Leave Students ({set.g.L.length})
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1.5 text-left w-14">Roll</th>
                      <th className="border border-slate-300 p-1.5 text-left">Student Name</th>
                      <th className="border border-slate-300 p-1.5 text-left">Father Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {set.g.L.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-500 italic">
                          None
                        </td>
                      </tr>
                    ) : (
                      set.g.L.map((s) => (
                        <tr key={s.id} className="border border-slate-300">
                          <td className="border border-slate-300 p-1.5 font-bold">{s.roll || '-'}</td>
                          <td className="border border-slate-300 p-1.5 font-bold">{s.name}</td>
                          <td className="border border-slate-300 p-1.5">{s.father || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature */}
              <div className="mt-12 ml-auto w-56 border-t border-black pt-1 text-center text-xs font-semibold">
                Teacher Signature
              </div>

              <div className="mt-6 text-center text-[9pt] text-slate-500 border-t border-slate-200 pt-2">
                {PREPARED_BY}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Student List Print */}
      {mode === 'studentList' && (
        <div>
          <div className="flex items-center gap-4 pb-3 border-b-2 border-emerald-800 mb-3">
            <img src={SCHOOL_LOGO} alt="" className="w-16 h-16 object-contain" />
            <div>
              <h2 className="text-xl font-bold text-emerald-900 m-0 leading-tight">
                {SCHOOL_NAME}
              </h2>
              <p className="text-sm text-slate-600 m-0">{SCHOOL_LOCATION}</p>
            </div>
          </div>

          <h3 className="text-base font-bold text-blue-800 m-0 mb-1">
            Student Enrolment Roster
          </h3>

          <div className="text-xs text-slate-700 mb-3 flex gap-4 font-medium">
            <span>Class: <strong>{currentClass.name}</strong></span>
            <span>Teacher: <strong>{currentClass.teacher || '-'}</strong></span>
            <span>Total Enrolled: <strong>{students.length} students</strong></span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1.5 text-left w-14">Roll</th>
                <th className="border border-slate-300 p-1.5 text-left">Student Name</th>
                <th className="border border-slate-300 p-1.5 text-left">Father Name</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="border border-slate-300 p-1.5 font-bold">{s.roll || '-'}</td>
                  <td className="border border-slate-300 p-1.5 font-bold">{s.name}</td>
                  <td className="border border-slate-300 p-1.5">{s.father || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 ml-auto w-56 border-t border-black pt-1 text-center text-xs font-semibold">
            Teacher Signature
          </div>

          <div className="mt-6 text-center text-[9pt] text-slate-500 border-t border-slate-200 pt-2">
            {PREPARED_BY}
          </div>
        </div>
      )}

      {/* 3. Cumulative Report Print */}
      {mode === 'report' && (
        <div>
          <div className="flex items-center gap-4 pb-3 border-b-2 border-emerald-800 mb-3">
            <img src={SCHOOL_LOGO} alt="" className="w-16 h-16 object-contain" />
            <div>
              <h2 className="text-xl font-bold text-emerald-900 m-0 leading-tight">
                {SCHOOL_NAME}
              </h2>
              <p className="text-sm text-slate-600 m-0">{SCHOOL_LOCATION}</p>
            </div>
          </div>

          <h3 className="text-base font-bold text-blue-800 m-0 mb-1">
            Attendance Summary Report
          </h3>

          <div className="text-xs text-slate-700 mb-3 flex gap-4 font-medium">
            <span>Class: <strong>{currentClass.name}</strong></span>
            <span>Teacher: <strong>{currentClass.teacher || '-'}</strong></span>
            <span>Recorded Days: <strong>{recordedDaysCount} days</strong></span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1.5 text-left w-12">Roll</th>
                <th className="border border-slate-300 p-1.5 text-left">Student Name</th>
                <th className="border border-slate-300 p-1.5 text-left">Father Name</th>
                <th className="border border-slate-300 p-1.5 text-center w-14">Present</th>
                <th className="border border-slate-300 p-1.5 text-center w-14">Absent</th>
                <th className="border border-slate-300 p-1.5 text-center w-14">Leave</th>
                <th className="border border-slate-300 p-1.5 text-center w-16">Percent</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeReportRows.map(({ student, p, a, l, percentage }) => (
                <tr key={student.id}>
                  <td className="border border-slate-300 p-1.5 font-bold">{student.roll || '-'}</td>
                  <td className="border border-slate-300 p-1.5 font-bold">{student.name}</td>
                  <td className="border border-slate-300 p-1.5">{student.father || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-emerald-800">{p}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-rose-800">{a}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-amber-800">{l}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold">{percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 ml-auto w-56 border-t border-black pt-1 text-center text-xs font-semibold">
            Teacher Signature
          </div>

          <div className="mt-6 text-center text-[9pt] text-slate-500 border-t border-slate-200 pt-2">
            {PREPARED_BY}
          </div>
        </div>
      )}
    </div>
  );
};
