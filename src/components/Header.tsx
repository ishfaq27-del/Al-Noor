/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SCHOOL_NAME, SCHOOL_LOCATION, SCHOOL_LOGO } from '../constants.ts';
import { SchoolClass, Student } from '../types.ts';
import { Plus, Edit2, Users, School, Check, X } from 'lucide-react';

interface HeaderProps {
  classes: SchoolClass[];
  currentClassId: string;
  students: Student[];
  onSelectClass: (id: string) => void;
  onAddClass: (name: string, teacher: string) => void;
  onUpdateClass: (id: string, name: string, teacher: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  classes,
  currentClassId,
  students,
  onSelectClass,
  onAddClass,
  onUpdateClass,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [teacherNameInput, setTeacherNameInput] = useState('');

  const currentClass = classes.find((c) => c.id === currentClassId) || classes[0];
  const currentClassStudents = students.filter((s) => s.cls === currentClass?.id);

  const handleOpenAdd = () => {
    setEditingClass(null);
    setClassNameInput('');
    setTeacherNameInput('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = () => {
    if (!currentClass) return;
    setEditingClass(currentClass);
    setClassNameInput(currentClass.name);
    setTeacherNameInput(currentClass.teacher || '');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = classNameInput.trim();
    if (!name) return;

    if (editingClass) {
      onUpdateClass(editingClass.id, name, teacherNameInput.trim());
    } else {
      onAddClass(name, teacherNameInput.trim());
    }
    setIsFormOpen(false);
  };

  return (
    <header className="mb-5">
      {/* Brand Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-blue-800 rounded-2xl p-4 md:p-5 text-white shadow-lg flex items-center gap-3.5 sm:gap-4.5 border border-white/10">
        <div className="relative shrink-0">
          <img
            src={SCHOOL_LOGO}
            alt="School Emblem"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-white p-1 shadow-md border-2 border-white/80"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-0.5">
            <School className="w-3.5 h-3.5" />
            Attendance Portal
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight truncate drop-shadow-sm">
            {SCHOOL_NAME}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium tracking-wide">
            {SCHOOL_LOCATION}
          </p>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <select
              id="class-selector"
              aria-label="Select Class"
              value={currentClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border-2 border-teal-200 dark:border-teal-800/60 rounded-xl px-3.5 py-2.5 pr-9 font-semibold text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base cursor-pointer"
            >
              {classes.map((c) => {
                const count = students.filter((s) => s.cls === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.teacher ? `— ${c.teacher}` : ''} ({count} {count === 1 ? 'student' : 'students'})
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-teal-700 dark:text-teal-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-300 font-bold text-sm hover:bg-teal-50 dark:hover:bg-teal-950/40 transition active:scale-95 cursor-pointer shadow-xs"
            title="Create new class"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">New Class</span>
            <span className="xs:hidden">New</span>
          </button>
        </div>

        {/* Current Class Info Chip */}
        {currentClass && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 font-medium truncate">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                Teacher: <strong className="font-semibold">{currentClass.teacher || 'Not set'}</strong>
                <span className="mx-1.5 opacity-40">|</span>
                <strong>{currentClassStudents.length}</strong> {currentClassStudents.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <button
              onClick={handleOpenEdit}
              className="p-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg transition shrink-0 cursor-pointer"
              title="Edit class name or teacher"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Class Add/Edit Dialog / Drawer */}
      {isFormOpen && (
        <form
          onSubmit={handleSave}
          className="mt-3 p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-teal-400 dark:border-teal-600 shadow-md flex flex-wrap gap-2.5 items-center animate-in fade-in duration-150"
        >
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Class Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Class 10-A"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Class Teacher
            </label>
            <input
              type="text"
              placeholder="e.g. Sir Tariq Khan"
              value={teacherNameInput}
              onChange={(e) => setTeacherNameInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-lg text-sm shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium px-3 py-2 rounded-lg text-sm transition active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      )}
    </header>
  );
};
