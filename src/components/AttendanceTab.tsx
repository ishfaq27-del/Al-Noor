/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, AttendanceStatus, SchoolClass, ClassReportData } from '../types.ts';
import {
  Printer,
  FileText,
  Share2,
  CheckCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  MessageCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import {
  generateDailyAttendancePdf,
  createReportImageBlob,
  generateWhatsAppText,
} from '../utils/export.ts';

interface AttendanceTabProps {
  date: string;
  onChangeDate: (date: string) => void;
  students: Student[];
  currentClass: SchoolClass;
  allClasses: SchoolClass[];
  records: Record<string, Record<string, AttendanceStatus>>;
  onUpdateStatus: (studentId: string, status: AttendanceStatus | undefined) => void;
  onMarkAllPresent: () => void;
  onPrintDaily: (all: boolean) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  date,
  onChangeDate,
  students,
  currentClass,
  allClasses,
  records,
  onUpdateStatus,
  onMarkAllPresent,
  onPrintDaily,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const dayRecords = records[date] || {};

  // Sort students by roll number
  const sortedStudents = [...students].sort(
    (a, b) => (parseInt(a.roll) || 0) - (parseInt(b.roll) || 0)
  );

  const filteredStudents = sortedStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.father || '').toLowerCase().includes(q) || s.roll.includes(q);
  });

  // Calculate statistics
  const stats = sortedStudents.reduce(
    (acc, s) => {
      const st = dayRecords[s.id];
      if (st === 'P') acc.P++;
      else if (st === 'A') acc.A++;
      else if (st === 'L') acc.L++;
      else acc.N++;
      return acc;
    },
    { P: 0, A: 0, L: 0, N: 0 }
  );

  // Helper for date shift
  const shiftDate = (days: number) => {
    const [y, m, d] = date.split('-').map(Number);
    const target = new Date(y, m - 1, d + days);
    const yr = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const dy = String(target.getDate()).padStart(2, '0');
    onChangeDate(`${yr}-${mo}-${dy}`);
  };

  const setToday = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const dy = String(now.getDate()).padStart(2, '0');
    onChangeDate(`${yr}-${mo}-${dy}`);
  };

  // Build report set for single or all classes
  const getReportSets = (all: boolean): ClassReportData[] => {
    const targetClasses = all ? allClasses : [currentClass];
    return targetClasses.map((cls) => {
      const clsStudents = sortedStudents.filter((s) => s.cls === cls.id);
      const g = { P: [] as Student[], A: [] as Student[], L: [] as Student[], N: [] as Student[] };
      clsStudents.forEach((s) => {
        const v = dayRecords[s.id] || 'N';
        g[v].push(s);
      });
      return { c: cls, list: clsStudents, g };
    }).filter((x) => x.list.length > 0);
  };

  // Download PDF
  const handlePdfExport = async (all: boolean) => {
    setIsProcessing(true);
    setStatusMessage('Generating PDF...');
    try {
      const sets = getReportSets(all);
      if (sets.length === 0 || sets.every((s) => s.list.length === 0)) {
        setStatusMessage('No student records found to generate PDF.');
        setIsProcessing(false);
        return;
      }
      await generateDailyAttendancePdf(date, sets, all);
      setStatusMessage(`PDF downloaded successfully for ${date}!`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Could not create PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // WhatsApp Image Share / Download
  const handleJpgExport = async (all: boolean) => {
    setIsProcessing(true);
    setStatusMessage('Rendering high-res card for WhatsApp...');
    try {
      const sets = getReportSets(all);
      if (sets.length === 0) {
        setStatusMessage('No attendance records available for this date.');
        setIsProcessing(false);
        return;
      }

      const files: File[] = [];
      for (const set of sets) {
        const blob = await createReportImageBlob(set, date);
        const fileName = `attendance-${set.c.name.replace(/[^\w-]+/g, '-')}-${date}.jpg`;
        files.push(new File([blob], fileName, { type: 'image/jpeg' }));
      }

      const textSummary = generateWhatsAppText(date, sets);

      // Check if navigator.share with files is supported
      if (navigator.canShare && navigator.canShare({ files })) {
        try {
          await navigator.share({
            files,
            title: `Attendance Report - ${date}`,
            text: textSummary,
          });
          setStatusMessage('Shared successfully to WhatsApp / apps!');
          setIsProcessing(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setStatusMessage('');
            setIsProcessing(false);
            return;
          }
        }
      }

      // Fallback: trigger download for files
      for (const f of files) {
        const url = URL.createObjectURL(f);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.remove();
        }, 1000);
      }
      setStatusMessage('JPG image saved! You can now send it on WhatsApp.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Error creating image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // WhatsApp Text Summary
  const handleCopyWhatsAppText = () => {
    const sets = getReportSets(false);
    const text = generateWhatsAppText(date, sets);
    navigator.clipboard.writeText(text).then(() => {
      setStatusMessage('WhatsApp report text copied to clipboard! Paste it into WhatsApp.');
    }).catch(() => {
      setStatusMessage('Failed to copy text.');
    });
  };

  const handleOpenWhatsAppDirect = () => {
    const sets = getReportSets(false);
    const text = encodeURIComponent(generateWhatsAppText(date, sets));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Date & Mark All Present Row */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition active:scale-95 cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex-1">
            <input
              type="date"
              aria-label="Attendance Date"
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition active:scale-95 cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={setToday}
            className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Today
          </button>
        </div>

        <button
          onClick={onMarkAllPresent}
          className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs text-sm transition active:scale-95 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          Mark All Present
        </button>
      </div>

      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-3 rounded-2xl shadow-sm text-center">
          <span className="block text-2xl sm:text-3xl font-extrabold leading-none mb-1">{stats.P}</span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-100">Present</span>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white p-3 rounded-2xl shadow-sm text-center">
          <span className="block text-2xl sm:text-3xl font-extrabold leading-none mb-1">{stats.A}</span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-100">Absent</span>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white p-3 rounded-2xl shadow-sm text-center">
          <span className="block text-2xl sm:text-3xl font-extrabold leading-none mb-1">{stats.L}</span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-100">Leave</span>
        </div>

        <div className="col-span-3 sm:col-span-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center flex sm:flex-col items-center justify-center gap-1.5">
          <span className="text-sm font-bold sm:text-xs uppercase text-slate-500 dark:text-slate-400">Total Enrolled:</span>
          <span className="text-xl sm:text-2xl font-extrabold leading-none">{sortedStudents.length}</span>
          {stats.N > 0 && (
            <span className="text-xs font-semibold text-rose-500 sm:mt-0.5">({stats.N} unmarked)</span>
          )}
        </div>
      </div>

      {/* Search Input for Roster */}
      {sortedStudents.length > 5 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or father name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Student Attendance List */}
      <div className="space-y-2">
        {sortedStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 text-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-semibold text-base">No students enrolled in {currentClass.name} yet.</p>
            <p className="text-sm mt-1">Go to the <strong>Students</strong> tab to add students or import from Excel.</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200">
            No students match "{searchQuery}".
          </div>
        ) : (
          filteredStudents.map((s, idx) => {
            const currentStatus = dayRecords[s.id];
            const borderColors: Record<string, string> = {
              P: 'border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20',
              A: 'border-l-rose-600 bg-rose-50/20 dark:bg-rose-950/20',
              L: 'border-l-amber-600 bg-amber-50/20 dark:bg-amber-950/20',
            };

            const itemClass = currentStatus
              ? borderColors[currentStatus] || 'border-l-slate-300'
              : 'border-l-slate-300 dark:border-l-slate-700';

            return (
              <div
                key={s.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 ${itemClass} p-3 sm:p-3.5 shadow-xs flex items-center gap-3 transition-colors`}
              >
                {/* Roll Badge */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs ${
                    idx % 3 === 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : idx % 3 === 1
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  }`}
                >
                  {s.roll || '-'}
                </div>

                {/* Name & Father Name */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug truncate">
                    {s.name}
                  </h4>
                  {s.father && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      Father: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.father}</span>
                    </p>
                  )}
                </div>

                {/* P / A / L Segment Control */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Present Button */}
                  <button
                    onClick={() => onUpdateStatus(s.id, currentStatus === 'P' ? undefined : 'P')}
                    aria-label={`Mark Present for ${s.name}`}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-extrabold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                      currentStatus === 'P'
                        ? 'bg-emerald-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800'
                    }`}
                  >
                    P
                  </button>

                  {/* Absent Button */}
                  <button
                    onClick={() => onUpdateStatus(s.id, currentStatus === 'A' ? undefined : 'A')}
                    aria-label={`Mark Absent for ${s.name}`}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-extrabold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                      currentStatus === 'A'
                        ? 'bg-rose-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-800'
                    }`}
                  >
                    A
                  </button>

                  {/* Leave Button */}
                  <button
                    onClick={() => onUpdateStatus(s.id, currentStatus === 'L' ? undefined : 'L')}
                    aria-label={`Mark Leave for ${s.name}`}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-extrabold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                      currentStatus === 'L'
                        ? 'bg-amber-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-800'
                    }`}
                  >
                    L
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">
        💡 <strong>P</strong> = Present, <strong>A</strong> = Absent, <strong>L</strong> = Leave. Tap again to clear. Changes save automatically.
      </p>

      {/* Export & Print Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Printer className="w-4 h-4 text-teal-600" />
          Print & PDF Reports
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onPrintDaily(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print this class
          </button>
          <button
            onClick={() => onPrintDaily(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print all classes
          </button>

          <button
            onClick={() => handlePdfExport(false)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4" />
            PDF: this class
          </button>
          <button
            onClick={() => handlePdfExport(true)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4" />
            PDF: all classes
          </button>
        </div>

        {/* WhatsApp Sharing Card */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              Share on WhatsApp
            </span>
            <span className="text-xs text-slate-400">Card images & summary</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleJpgExport(false)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
            >
              JPG: this class
            </button>
            <button
              onClick={() => handleJpgExport(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
            >
              JPG: all classes
            </button>

            <button
              onClick={handleCopyWhatsAppText}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
              title="Copy formatted text message for WhatsApp"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy text
            </button>

            <button
              onClick={handleOpenWhatsAppDirect}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
              title="Open WhatsApp directly with report"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send to WhatsApp
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold animate-in fade-in">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};
