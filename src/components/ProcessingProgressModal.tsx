import React from 'react';
import { Loader2, CheckCircle2, CloudUpload, Database, Sparkles } from 'lucide-react';
import { Language } from '../types';

export interface ProcessingState {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  progress?: number;
  steps?: Array<{ label: string; status: 'pending' | 'processing' | 'completed' }>;
  titleKh?: string;
  titleEn?: string;
  subtitleKh?: string;
  subtitleEn?: string;
  currentStep?: number;
  totalSteps?: number;
  progressPercent?: number;
  isComplete?: boolean;
}

export interface ProcessingProgressModalProps {
  isOpen?: boolean;
  state?: ProcessingState;
  titleKh?: string;
  titleEn?: string;
  subtitleKh?: string;
  subtitleEn?: string;
  currentStep?: number;
  totalSteps?: number;
  progressPercent?: number;
  isComplete?: boolean;
  lang?: Language;
}

export const ProcessingProgressModal: React.FC<ProcessingProgressModalProps> = (props) => {
  const merged = { ...props.state, ...props };
  const isOpen = merged.isOpen;
  const titleKh = merged.titleKh || 'កំពុងដំណើរការរក្សាទុក...';
  const titleEn = merged.titleEn || 'Processing & Saving...';
  const subtitleKh = merged.subtitleKh || 'សូមរង់ចាំមួយភ្លែត ប្រព័ន្ធកំពុងដំណើរការទិន្នន័យ និងតភ្ជាប់ Cloud...';
  const subtitleEn = merged.subtitleEn || 'Please wait, syncing changes with Cloud Database & Realtime...';
  const currentStep = merged.currentStep ?? 2;
  const totalSteps = merged.totalSteps ?? 3;
  const progressPercent = merged.progressPercent;
  const isComplete = merged.isComplete ?? false;
  const lang = merged.lang || 'km';

  if (!isOpen) return null;

  const calculatedPercent = progressPercent !== undefined 
    ? Math.min(100, Math.max(0, progressPercent)) 
    : isComplete 
      ? 100 
      : Math.round((currentStep / totalSteps) * 100);

  const stepsKh = [
    'ដំណើរការ និងរៀបចំទិន្នន័យ / រូបភាព',
    'បញ្ជូន និងរក្សាទុកទៅកាន់ Cloud & Server',
    'ធ្វើបច្ចុប្បន្នភាពទិន្នន័យរួចរាល់!',
  ];

  const stepsEn = [
    'Processing & optimizing media/payload',
    'Syncing to Cloud Database & Server',
    'Update completed successfully!',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center space-y-5 transform transition-all scale-100 animate-scale-up">
        {/* Animated Icon Header */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          {/* Animated decorative ring */}
          <div className={`absolute inset-0 rounded-full blur-md opacity-50 transition-colors duration-500 ${
            isComplete ? 'bg-emerald-400' : 'bg-indigo-400 animate-pulse'
          }`} />

          <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${
            isComplete 
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-200' 
              : 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-indigo-200'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            ) : (
              <div className="relative">
                <CloudUpload className="w-8 h-8 opacity-80" />
                <Loader2 className="w-10 h-10 animate-spin absolute -inset-1 text-white/90" />
              </div>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-800">
            {isComplete 
              ? (lang === 'km' ? '✅ រក្សាទុកជោគជ័យ!' : '✅ Saved Successfully!')
              : (lang === 'km' ? titleKh : titleEn)}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            {isComplete
              ? (lang === 'km' ? 'ទិន្នន័យត្រូវបានធ្វើបច្ចុប្បន្នភាពទូទាំងប្រព័ន្ធ។' : 'Your changes are synced across all devices.')
              : (lang === 'km' ? subtitleKh : subtitleEn)}
          </p>
        </div>

        {/* Smooth Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1 font-bold">
              <Database className="w-3 h-3 text-indigo-500" />
              <span>{lang === 'km' ? `ជំហាន ${Math.min(currentStep, totalSteps)}/${totalSteps}` : `Step ${Math.min(currentStep, totalSteps)}/${totalSteps}`}</span>
            </span>
            <span className="font-bold text-indigo-600">{calculatedPercent}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isComplete 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                  : 'bg-gradient-to-r from-indigo-600 to-blue-500'
              }`}
              style={{ width: `${calculatedPercent}%` }}
            />
          </div>
        </div>

        {/* Step checklist */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left space-y-2">
          {[0, 1, 2].map((idx) => {
            const stepNum = idx + 1;
            const isDone = currentStep > stepNum || isComplete;
            const isCurrent = currentStep === stepNum && !isComplete;

            return (
              <div key={idx} className="flex items-center space-x-2.5 text-xs">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                  isDone 
                    ? 'bg-emerald-500 text-white' 
                    : isCurrent 
                      ? 'bg-indigo-600 text-white animate-pulse ring-2 ring-indigo-200' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone ? '✓' : stepNum}
                </div>
                <span className={`text-[11px] truncate ${
                  isDone 
                    ? 'text-slate-700 font-medium line-through opacity-70' 
                    : isCurrent 
                      ? 'text-indigo-900 font-bold' 
                      : 'text-slate-400'
                }`}>
                  {lang === 'km' ? stepsKh[idx] : stepsEn[idx]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Subtle security footer note */}
        <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{lang === 'km' ? 'ប្រព័ន្ធកំពុងដំណើរការដោយសុវត្ថិភាព' : 'Secure real-time transaction'}</span>
        </div>
      </div>
    </div>
  );
};
