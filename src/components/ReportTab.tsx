/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, SchoolClass, AttendanceStatus, ClassReportData } from '../types.ts';
import {
  Calendar,
  Printer,
  FileText,
  UserX,
  Clock,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDatePretty, generateDailyAttendancePdf } from '../utils/export.ts';

interface ReportTabProps {
  date: string;
  onChangeDate: (date: string) => void;
  currentClass: SchoolClass;
  students: Student[];
  records: Record<string, Record<string, AttendanceStatus>>;
  onPrintReport: () => void;
}

export const ReportTab: React.FC<ReportTabProps> = ({
  date,
  onChangeDate,
  currentClass,
  students,
  records,
  onPrintReport,
}) => {
  const [showPresentList, setShowPresentList] = useState(false);
  const [reportSort, setReportSort] = useState<'roll' | 'lowest' | 'highest'>('roll');

  const classStudents = students
    .filter((s) => s.cls === currentClass.id)
    .sort((a, b) => (parseInt(a.roll) || 0) - (parseInt(b.roll) || 0));

  const studentIds = new Set(classStudents.map((s) => s.id));

  // Find all recorded dates that have at least one attendance entry for this class
  const recordedDates = Object.keys(records)
    .filter((d) => Object.keys(records[d]).some((sid) => studentIds.has(sid)))
    .sort()
    .reverse();

  // Selected Day records
  const dayRecord = records[date] || {};
  const dayGroups = {
    P: [] as Student[],
    A: [] as Student[],
    L: [] as Student[],
    N: [] as Student[],
  };

  classStudents.forEach((s) => {
    const status = dayRecord[s.id] || 'N';
    dayGroups[status].push(s);
  });

  const hasDayData = dayGroups.P.length > 0 || dayGroups.A.length > 0 || dayGroups.L.length > 0;

  // Student cumulative stats
  const cumulativeData = classStudents.map((s) => {
    let p = 0;
    let a = 0;
    let l = 0;
    recordedDates.forEach((d) => {
      const v = records[d]?.[s.id];
      if (v === 'P') p++;
      else if (v === 'A') a++;
      else if (v === 'L') l++;
    });
    const total = p + a + l;
    const percentage = total > 0 ? Math.round((p / total) * 100) : 0;
    return { student: s, p, a, l, total, percentage };
  });

  // Sort cumulative data
  const sortedCumulative = [...cumulativeData].sort((x, y) => {
    if (reportSort === 'lowest') return x.percentage - y.percentage;
    if (reportSort === 'highest') return y.percentage - x.percentage;
    return (parseInt(x.student.roll) || 0) - (parseInt(y.student.roll) || 0);
  });

  const handleDownloadDayPdf = async (targetDate: string) => {
    const r = records[targetDate] || {};
    const g = { P: [] as Student[], A: [] as Student[], L: [] as Student[], N: [] as Student[] };
    classStudents.forEach((s) => {
      const st = r[s.id] || 'N';
      g[st].push(s);
    });
    const set: ClassReportData = { c: currentClass, list: classStudents, g };
    await generateDailyAttendancePdf(targetDate, [set], false);
  };

  return (
    <div className="space-y-5">
      {/* Date Inspection Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
              Daily Attendance Breakdown
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Report Inspection Date"
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            />
            <button
              onClick={onPrintReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              Print
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Date: <strong className="text-slate-700 dark:text-slate-200">{formatDatePretty(date)}</strong>
          {currentClass.teacher ? ` • Teacher: ${currentClass.teacher}` : ''}
        </p>

        {!hasDayData ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-sm">
            No attendance has been marked for {currentClass.name} on this date.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Absent Block */}
            <div className="border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden bg-rose-50/20">
              <div className="bg-rose-600 text-white px-3.5 py-2 font-bold text-xs sm:text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserX className="w-4 h-4" />
                  Absent Students ({dayGroups.A.length})
                </span>
                <span className="text-xs opacity-90">{dayGroups.A.length === 0 ? 'All Present' : ''}</span>
              </div>
              <div className="p-2 sm:p-3 divide-y divide-rose-100 dark:divide-rose-950/40">
                {dayGroups.A.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-1">No students absent on this day.</p>
                ) : (
                  dayGroups.A.map((s) => (
                    <div key={s.id} className="py-1.5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 w-6">{s.roll}.</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                      </div>
                      {s.father && (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">Father: {s.father}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Leave Block */}
            <div className="border border-amber-200 dark:border-amber-900/60 rounded-xl overflow-hidden bg-amber-50/20">
              <div className="bg-amber-600 text-white px-3.5 py-2 font-bold text-xs sm:text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Leave Students ({dayGroups.L.length})
                </span>
              </div>
              <div className="p-2 sm:p-3 divide-y divide-amber-100 dark:divide-amber-950/40">
                {dayGroups.L.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-1">No students on leave on this day.</p>
                ) : (
                  dayGroups.L.map((s) => (
                    <div key={s.id} className="py-1.5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 w-6">{s.roll}.</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                      </div>
                      {s.father && (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">Father: {s.father}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Present Block (Collapsible) */}
            <div className="border border-emerald-200 dark:border-emerald-900/60 rounded-xl overflow-hidden bg-emerald-50/20">
              <button
                onClick={() => setShowPresentList(!showPresentList)}
                className="w-full bg-emerald-700 text-white px-3.5 py-2 font-bold text-xs sm:text-sm flex items-center justify-between cursor-pointer"
              >
                <span>Present Students ({dayGroups.P.length})</span>
                {showPresentList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPresentList && (
                <div className="p-2 sm:p-3 divide-y divide-emerald-100 dark:divide-emerald-950/40 max-h-52 overflow-y-auto">
                  {dayGroups.P.map((s) => (
                    <div key={s.id} className="py-1.5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 w-6">{s.roll}.</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</span>
                      </div>
                      {s.father && (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">Father: {s.father}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cumulative Attendance by Student */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Cumulative Attendance by Student
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Based on {recordedDates.length} recorded {recordedDates.length === 1 ? 'day' : 'days'} of attendance
            </p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Sort:</span>
            <button
              onClick={() => setReportSort('roll')}
              className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                reportSort === 'roll' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Roll
            </button>
            <button
              onClick={() => setReportSort('lowest')}
              className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                reportSort === 'lowest' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Lowest %
            </button>
            <button
              onClick={() => setReportSort('highest')}
              className={`px-2 py-1 rounded-md font-bold cursor-pointer ${
                reportSort === 'highest' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Highest %
            </button>
          </div>
        </div>

        {classStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">No students in this class.</div>
        ) : recordedDates.length === 0 ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
            Cumulative attendance statistics will appear after you mark attendance for at least one day.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedCumulative.map(({ student, p, a, l, percentage }) => {
              const barColor =
                percentage >= 80 ? 'bg-emerald-600' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-600';
              const badgeColor =
                percentage >= 80
                  ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                  : percentage >= 60
                  ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40';

              return (
                <div
                  key={student.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                        {student.roll || '-'}
                      </span>
                      <div className="truncate">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {student.name}
                        </h4>
                        {student.father && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            Father: {student.father}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`px-2 py-0.5 rounded-md font-extrabold text-sm ${badgeColor}`}>
                      {percentage}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Breakdown counts */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="text-emerald-700 dark:text-emerald-400">Present: {p}</span>
                    <span className="text-rose-700 dark:text-rose-400">Absent: {a}</span>
                    <span className="text-amber-700 dark:text-amber-400">Leave: {l}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily PDF Reports List */}
      {recordedDates.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Saved Daily Attendance PDF Reports
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {recordedDates.map((d) => {
              const r = records[d] || {};
              let a = 0;
              let l = 0;
              classStudents.forEach((s) => {
                if (r[s.id] === 'A') a++;
                else if (r[s.id] === 'L') l++;
              });

              return (
                <div
                  key={d}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                      {formatDatePretty(d)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      Absent: {a} | Leave: {l}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDownloadDayPdf(d)}
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
