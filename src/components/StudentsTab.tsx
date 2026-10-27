/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Student, SchoolClass } from '../types.ts';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Trash2,
  Printer,
  FileText,
  AlertCircle,
  Check,
  X,
  Search,
} from 'lucide-react';
import { parseStudentFile, downloadStudentTemplate, ParsedStudentRow } from '../utils/excel.ts';
import { generateStudentListPdf } from '../utils/export.ts';

interface StudentsTabProps {
  currentClass: SchoolClass;
  allClasses: SchoolClass[];
  students: Student[];
  onAddStudent: (name: string, roll: string, father: string) => void;
  onBatchAddStudents: (newStudents: { name: string; roll: string; father: string }[]) => void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteClass: (classId: string) => void;
  onPrintStudentList: () => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  currentClass,
  allClasses,
  students,
  onAddStudent,
  onBatchAddStudents,
  onDeleteStudent,
  onDeleteClass,
  onPrintStudentList,
}) => {
  const [rollInput, setRollInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [fatherInput, setFatherInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Excel import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImports, setPendingImports] = useState<ParsedStudentRow[]>([]);
  const [importNotice, setImportNotice] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  // Arming state for deleting class
  const [armDeleteClass, setArmDeleteClass] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  const classStudents = students
    .filter((s) => s.cls === currentClass.id)
    .sort((a, b) => (parseInt(a.roll) || 0) - (parseInt(b.roll) || 0));

  const filteredStudents = classStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.father || '').toLowerCase().includes(q) || s.roll.includes(q);
  });

  // Calculate next suggested roll number
  const nextRoll = classStudents.reduce((max, s) => Math.max(max, parseInt(s.roll) || 0), 0) + 1;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;

    const roll = rollInput.trim() || String(nextRoll);
    onAddStudent(name, roll, fatherInput.trim());

    setNameInput('');
    setFatherInput('');
    setRollInput(String(parseInt(roll) + 1 || nextRoll + 1));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImporting(true);
    setImportNotice('Reading file...');

    try {
      const parsed = await parseStudentFile(file);
      if (parsed.length === 0) {
        setImportNotice('No student records found in file. Please ensure columns include Student Name.');
        setPendingImports([]);
        setIsImporting(false);
        return;
      }

      // Check duplicates against existing class students
      const existingKeySet = new Set(
        classStudents.map((s) => `${s.name.toLowerCase()}|${(s.father || '').toLowerCase()}`)
      );

      const seenInFile = new Set<string>();
      const validPending: ParsedStudentRow[] = [];
      let skippedCount = 0;

      parsed.forEach((row) => {
        const key = `${row.name.toLowerCase()}|${row.father.toLowerCase()}`;
        if (existingKeySet.has(key) || seenInFile.has(key)) {
          skippedCount++;
        } else {
          seenInFile.add(key);
          validPending.push(row);
        }
      });

      if (validPending.length === 0) {
        setImportNotice(`All ${parsed.length} names found are already in ${currentClass.name}.`);
        setPendingImports([]);
      } else {
        setImportNotice(
          `${validPending.length} new students found${
            skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''
          }. Review below and tap "Add to this class".`
        );
        setPendingImports(validPending);
      }
    } catch (err: any) {
      console.error(err);
      setImportNotice('Could not read this file. Please choose an .xlsx or .csv file.');
      setPendingImports([]);
    } finally {
      setIsImporting(false);
    }
  };

  const confirmBatchImport = () => {
    if (pendingImports.length === 0) return;

    let currentMax = nextRoll - 1;
    const toAdd = pendingImports.map((p) => {
      const assignedRoll = p.roll.trim() ? p.roll.trim() : String(++currentMax);
      return {
        name: p.name,
        roll: assignedRoll,
        father: p.father,
      };
    });

    onBatchAddStudents(toAdd);
    setImportNotice(`Successfully added ${toAdd.length} students to ${currentClass.name}!`);
    setPendingImports([]);
  };

  const handlePdfListExport = async () => {
    try {
      await generateStudentListPdf(currentClass, classStudents);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClassClick = () => {
    if (allClasses.length <= 1) {
      alert('You must keep at least one class in the system.');
      return;
    }
    if (!armDeleteClass) {
      setArmDeleteClass(true);
      setTimeout(() => setArmDeleteClass(false), 4000);
      return;
    }
    onDeleteClass(currentClass.id);
    setArmDeleteClass(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Student Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          Add Student to {currentClass.name}
        </h3>

        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Roll No
              </label>
              <input
                type="text"
                placeholder={String(nextRoll)}
                value={rollInput}
                onChange={(e) => setRollInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Student Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Muhammad Bilal"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Father Name
              </label>
              <input
                type="text"
                placeholder="e.g. Akhtar Ali"
                value={fatherInput}
                onChange={(e) => setFatherInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs text-sm transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        </form>
      </div>

      {/* Excel Import & Template Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          Import Students from Excel / CSV
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload an Excel (.xlsx, .xls) or .csv sheet. Required columns: <strong>Student Name</strong>. Optional: <strong>Roll No</strong>, <strong>Father Name</strong>.
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import from Excel
          </button>

          <button
            onClick={downloadStudentTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>

        {importNotice && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-semibold text-blue-800 dark:text-blue-200">
            {importNotice}
          </div>
        )}

        {/* Excel Import Preview */}
        {pendingImports.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Preview of {pendingImports.length} New Students to Import:
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-200 dark:divide-slate-800 pr-1 text-xs">
              {pendingImports.map((row, idx) => (
                <div key={idx} className="py-1 flex items-center justify-between text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 font-bold text-slate-400">{row.roll || idx + 1}.</span>
                    <span className="font-semibold">{row.name}</span>
                  </div>
                  {row.father && (
                    <span className="text-slate-500 dark:text-slate-400">Father: {row.father}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={confirmBatchImport}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Add to {currentClass.name}
              </button>
              <button
                onClick={() => {
                  setPendingImports([]);
                  setImportNotice('');
                }}
                className="inline-flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Roster Controls: Print / Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrintStudentList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            Print Student List
          </button>
          <button
            onClick={handlePdfListExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4" />
            PDF List
          </button>
        </div>

        {classStudents.length > 5 && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Student List View */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Students in {currentClass.name} ({classStudents.length})
          </span>
        </div>

        {classStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
            No students registered yet in this class. Use the form above to add students.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200">
            No students found matching your search.
          </div>
        ) : (
          filteredStudents.map((s, idx) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                  {s.roll || idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {s.name}
                  </h4>
                  {s.father && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Father: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.father}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Delete Student Button */}
              {deletingStudentId === s.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onDeleteStudent(s.id);
                      setDeletingStudentId(null);
                    }}
                    className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition"
                  >
                    Confirm Delete?
                  </button>
                  <button
                    onClick={() => setDeletingStudentId(null)}
                    className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeletingStudentId(s.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                  title="Remove student"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Class Button */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button
          onClick={handleDeleteClassClick}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
            armDeleteClass
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
              : 'border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {armDeleteClass ? `Confirm Delete "${currentClass.name}"?` : 'Delete this Class'}
        </button>
      </div>
    </div>
  );
};
