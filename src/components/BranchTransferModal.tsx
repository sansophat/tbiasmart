import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Building2, 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Employee, Branch, BranchTransferRecord, Language } from '../types';

interface BranchTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  branches: Branch[];
  onConfirmTransfer: (
    employeeId: string,
    toBranchId: string,
    reason: string,
    effectiveDate: string
  ) => void;
  lang: Language;
}

export const BranchTransferModal: React.FC<BranchTransferModalProps> = ({
  isOpen,
  onClose,
  employee,
  branches,
  onConfirmTransfer,
  lang,
}) => {
  if (!isOpen || !employee) return null;

  const currentBranch = branches.find((b) => b.id === employee.branchId);
  const targetBranchOptions = branches.filter((b) => b.id !== employee.branchId);

  const [targetBranchId, setTargetBranchId] = useState<string>(
    targetBranchOptions[0]?.id || ''
  );
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [transferReason, setTransferReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const targetBranch = branches.find((b) => b.id === targetBranchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranchId) {
      setErrorMsg(lang === 'km' ? 'សូមជ្រើសរើសសាខាគោលដៅ' : 'Please select target branch');
      return;
    }
    if (!transferReason.trim()) {
      setErrorMsg(lang === 'km' ? 'សូមបញ្ជាក់មូលហេតុនៃការផ្ទេរសាខា' : 'Please provide transfer reason');
      return;
    }

    onConfirmTransfer(
      employee.id,
      targetBranchId,
      transferReason.trim(),
      effectiveDate
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {lang === 'km' ? 'ផ្ទេរបុគ្គលិកទៅកាន់សាខាថ្មី' : 'Official Branch Transfer'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'km'
                  ? 'កំណត់ទីតាំងវត្តមានថ្មី និងចាក់សោទីតាំងសម្រាប់បុគ្គលិក'
                  : 'Reassign employee location and lock mobile geofence boundary.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="flex items-center space-x-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <img
            src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'}
            alt={employee.nameEn}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces';
            }}
            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-200"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-slate-800 text-sm truncate">
                {lang === 'km' ? employee.nameKh : employee.nameEn}
              </h4>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                {employee.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'km' ? employee.roleKh : employee.role} • {employee.departmentKh}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From & To Branch visual comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Origin Branch */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                {lang === 'km' ? '📍 សាខាបច្ចុប្បន្ន (Current)' : '📍 Current Branch'}
              </span>
              <p className="font-bold text-slate-800 text-xs">
                {lang === 'km' ? currentBranch?.nameKh : currentBranch?.nameEn}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Geofence: {currentBranch?.radiusMeters}m
              </p>
            </div>

            {/* Destination Branch */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                {lang === 'km' ? '🎯 សាខាគោលដៅ (New Location)' : '🎯 Target Branch'}
              </span>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full bg-white border border-indigo-300 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {targetBranchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lang === 'km' ? b.nameKh : b.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'km' ? 'កាលបរិច្ឆេទចាប់ផ្តើមអនុវត្ត (Effective Date):' : 'Effective Transfer Date:'}
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'km' ? 'មូលហេតុនៃការផ្ទេរសាខា (Transfer Reason / HR Note):' : 'Transfer Reason / HR Note:'}
            </label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => {
                setTransferReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={
                lang === 'km'
                  ? 'e.g. ផ្ទេរដើម្បីពង្រឹងសេវាកម្ម Barista ឬបំពេញបន្ថែមវេនពេលយប់...'
                  : 'e.g. Relocated to support weekend night shift operations, staff rotation...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Notice info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <div>
              <span className="font-bold text-slate-800">
                {lang === 'km' ? 'ចំណាំច្បាប់សាខា:' : 'Branch Policy:'}
              </span>{' '}
              {lang === 'km'
                ? 'បន្ទាប់ពីផ្ទេររួច បុគ្គលិកនឹងឃើញតែទីតាំងសាខាថ្មីនេះនៅលើទូរស័ព្ទ និងផតថល ហើយត្រូវតែស្កេនវត្តមាននៅក្នុងបរិវេណ Geofence របស់សាខាថ្មី។'
                : 'Once transferred, the employee will only see and punch in at this new branch location until an Admin reassigns them.'}
            </div>
            <div className="text-indigo-700 font-medium pt-1 border-t border-slate-200/60">
              {lang === 'km'
                ? '✨ ការផ្ទេរនេះនឹងដោះសោការកំណត់ GPS ដើម្បីឱ្យបុគ្គលិកអាចកំណត់កូអរដោនេ GPS សម្រាប់សាខាថ្មីនេះជាលើកដំបូងបាន។'
                : '✨ This transfer will unlock GPS calibration so staff can set the GPS for the new branch for the 1st time.'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              {lang === 'km' ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'km' ? 'បញ្ជាក់ការផ្ទេរសាខា' : 'Confirm Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
