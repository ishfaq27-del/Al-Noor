/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { StorageData } from '../types.ts';
import {
  Database,
  Download,
  Upload,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  FileJson,
} from 'lucide-react';
import { getDefaultData } from '../utils/storage.ts';

interface BackupTabProps {
  currentData: StorageData;
  onRestoreData: (data: StorageData) => void;
}

export const BackupTab: React.FC<BackupTabProps> = ({ currentData, onRestoreData }) => {
  const [backupMessage, setBackupMessage] = useState<string>('');
  const [pendingRestore, setPendingRestore] = useState<{
    data: StorageData;
    summary: string;
  } | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getExportJsonString = () => {
    return JSON.stringify({
      app: 'al-noor-attendance',
      version: 2,
      saved: new Date().toISOString(),
      data: currentData,
    }, null, 2);
  };

  const handleDownloadBackup = () => {
    const text = getExportJsonString();
    const blob = new Blob([text], { type: 'application/json' });
    const today = new Date().toISOString().slice(0, 10);
    const filename = `attendance-backup-${today}.json`;

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

    setBackupMessage('Backup file downloaded! Keep this file in a safe location.');
  };

  const handleCopyBackup = () => {
    const text = getExportJsonString();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setBackupMessage('Backup text copied to clipboard! You can paste it into WhatsApp or Notes.');
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      setBackupMessage('Could not access clipboard.');
    });
  };

  const validateAndPrepare = (jsonText: string) => {
    try {
      const clean = jsonText.replace(/^\uFEFF/, '').trim();
      if (!clean) throw new Error('Empty backup content');
      const parsed = JSON.parse(clean);
      const data: StorageData = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

      if (!data || !Array.isArray(data.students) || typeof data.records !== 'object') {
        throw new Error('Invalid structure');
      }

      const classesCount = Array.isArray(data.classes) ? data.classes.length : 1;
      const studentsCount = data.students.length;
      const daysCount = Object.keys(data.records).length;
      const dateSaved = parsed.saved ? ` (saved on ${parsed.saved.slice(0, 10)})` : '';

      const summary = `Found ${classesCount} ${classesCount === 1 ? 'class' : 'classes'}, ${studentsCount} ${
        studentsCount === 1 ? 'student' : 'students'
      }, and ${daysCount} ${daysCount === 1 ? 'day' : 'days'} of attendance records${dateSaved}.`;

      setPendingRestore({ data, summary });
      setBackupMessage('');
    } catch (err) {
      setPendingRestore(null);
      setBackupMessage('Invalid backup format. Please ensure you selected a valid attendance backup.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      validateAndPrepare(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handlePasteRestore = () => {
    if (!pasteText.trim()) {
      setBackupMessage('Please paste backup JSON text into the box first.');
      return;
    }
    validateAndPrepare(pasteText);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    onRestoreData(pendingRestore.data);
    setBackupMessage('Backup successfully restored! All student and attendance records are updated.');
    setPendingRestore(null);
    setPasteText('');
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to load sample demo data? This will overwrite existing records.')) {
      onRestoreData(getDefaultData());
      setBackupMessage('Reset to sample school data complete.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Backup Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600" />
          Create Backup
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Save all classes, student rosters, and daily attendance history into a single safe file or text.
        </p>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            Download Backup File (.json)
          </button>

          <button
            onClick={handleCopyBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Backup Text'}
          </button>
        </div>
      </div>

      {/* Restore Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          Restore Backup
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Restore previous data from a saved JSON file or by pasting backup text.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-xs"
          >
            <FileJson className="w-4 h-4" />
            Select Backup File (.json)
          </button>
        </div>

        {/* Text Area for manual paste fallback */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
            Or Paste Backup Text directly:
          </label>
          <textarea
            rows={3}
            placeholder="Paste raw backup JSON text here..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handlePasteRestore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Verify & Preview Text
          </button>
        </div>

        {/* Preview Confirmation Dialog */}
        {pendingRestore && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Backup Ready to Restore
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-300 font-medium leading-relaxed">
              {pendingRestore.summary}
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
              Warning: Restoring will overwrite all current classes, students, and attendance.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleConfirmRestore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                Restore Now
              </button>
              <button
                onClick={() => setPendingRestore(null)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-semibold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {backupMessage && (
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-semibold text-teal-900 dark:text-teal-200">
            {backupMessage}
          </div>
        )}
      </div>

      {/* Demo Seed Reset */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Reset to Sample Data
          </h4>
          <p className="text-xs text-slate-500">
            Load default classes (10-A, 9-A, 8-A) and student roster.
          </p>
        </div>
        <button
          onClick={handleResetToDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Sample Data
        </button>
      </div>
    </div>
  );
};
