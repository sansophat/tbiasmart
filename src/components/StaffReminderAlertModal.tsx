import React, { useEffect, useRef } from 'react';
import { Bell, Clock, QrCode, Volume2, VolumeX, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Language, StaffReminderPayload } from '../types';
import { playReminderRingtone } from '../utils/soundUtils';

interface StaffReminderAlertModalProps {
  reminder: StaffReminderPayload;
  lang: Language;
  onClose: () => void;
  onNavigateToScan: () => void;
  onSnooze?: (minutes: number) => void;
}

export const StaffReminderAlertModal: React.FC<StaffReminderAlertModalProps> = ({
  reminder,
  lang,
  onClose,
  onNavigateToScan,
  onSnooze,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const ringIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Initial ring
    playReminderRingtone(3);

    // Repeat ringing every 4.5 seconds until acknowledged or muted
    ringIntervalRef.current = setInterval(() => {
      if (!isMuted) {
        playReminderRingtone(2);
      }
    }, 4500);

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
      }
    };
  }, [isMuted]);

  const handleStopRinging = () => {
    setIsMuted(true);
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
    }
  };

  const isEmergency = reminder.reminderType === 'emergency_roll_call';
  const isForgotCheckIn = reminder.reminderType === 'forgot_checkin';
  const isForgotCheckOut = reminder.reminderType === 'forgot_checkout';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white border-2 border-rose-500/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden text-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Glowing top ambient light */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none ${
            isEmergency ? 'bg-rose-500/40' : isForgotCheckIn ? 'bg-emerald-500/30' : 'bg-amber-500/40'
          }`}
        />

        {/* Close / Dismiss cross button */}
        <button
          type="button"
          onClick={() => {
            handleStopRinging();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          title={lang === 'km' ? 'បិទ' : 'Dismiss'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing Bell / Siren Icon */}
        <div className="relative inline-flex items-center justify-center mx-auto mt-2">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl animate-bounce ${
              isEmergency
                ? 'bg-rose-600 text-white shadow-rose-500/40'
                : isForgotCheckIn
                ? 'bg-emerald-600 text-white shadow-emerald-500/40'
                : 'bg-amber-500 text-white shadow-amber-500/40'
            }`}
          >
            {isEmergency ? (
              <ShieldAlert className="w-10 h-10 animate-pulse" />
            ) : isForgotCheckIn ? (
              <Bell className="w-10 h-10 animate-pulse" />
            ) : (
              <AlertTriangle className="w-10 h-10 animate-pulse" />
            )}
          </div>
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-white text-[10px] font-bold items-center justify-center">
              !
            </span>
          </span>
        </div>

        {/* Title & Urgent Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <Bell className="w-3.5 h-3.5 animate-spin" />
            <span>
              {isEmergency
                ? lang === 'km'
                  ? 'ការប្រកាសបន្ទាន់ (Emergency Alert)'
                  : 'Emergency Roll Call'
                : isForgotCheckIn
                ? lang === 'km'
                  ? 'រំលឹកស្កេនចូល (Check-In Reminder)'
                  : 'Check-In Reminder'
                : lang === 'km'
                ? 'រំលឹកស្កេនចេញ (Check-Out Reminder)'
                : 'Check-Out Reminder'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {lang === 'km' ? reminder.titleKh : reminder.titleEn}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto font-medium">
            {lang === 'km' ? reminder.messageKh : reminder.messageEn}
          </p>
        </div>

        {/* Context Information Box */}
        {(reminder.shiftName || reminder.shiftHours || reminder.sentBy) && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 flex flex-wrap items-center justify-around gap-2">
            {reminder.shiftName && (
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>{reminder.shiftName}</span>
                {reminder.shiftHours && (
                  <span className="text-indigo-600 font-mono font-semibold">({reminder.shiftHours})</span>
                )}
              </div>
            )}
            {reminder.sentBy && (
              <div className="text-[11px] text-slate-500">
                {lang === 'km' ? 'ផ្ញើដោយ:' : 'Triggered by:'} <span className="font-bold text-slate-700">{reminder.sentBy}</span>
              </div>
            )}
          </div>
        )}

        {/* Ringing Sound Indicator & Mute Button */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleStopRinging}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isMuted
                ? 'bg-slate-100 text-slate-500 border-slate-200'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>
              {isMuted
                ? lang === 'km'
                  ? 'សំឡេងរោទិ៍ត្រូវបានបិទ'
                  : 'Alarm Muted'
                : lang === 'km'
                ? 'កំពុងរោទិ៍... ចុចដើម្បីបិទសំឡេង'
                : 'Ringing... Tap to Mute'}
            </span>
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              handleStopRinging();
              onClose();
              onNavigateToScan();
            }}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer transform active:scale-95"
          >
            <QrCode className="w-5 h-5" />
            <span>
              {isForgotCheckIn
                ? lang === 'km'
                  ? 'ស្កេនចូលឥឡូវនេះ (Scan Check-In)'
                  : 'Scan Check-In Now'
                : isForgotCheckOut
                ? lang === 'km'
                  ? 'ស្កេនចេញឥឡូវនេះ (Scan Check-Out)'
                  : 'Scan Check-Out Now'
                : lang === 'km'
                ? 'ទៅកាន់ផ្ទាំងស្កេនវត្តមាន (Scan Now)'
                : 'Open Scan View'}
            </span>
          </button>

          {onSnooze && (
            <button
              type="button"
              onClick={() => {
                handleStopRinging();
                onSnooze(10);
                onClose();
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer shrink-0"
            >
              {lang === 'km' ? 'ពន្យារ ១០នាទី' : 'Snooze 10m'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleStopRinging();
              onClose();
            }}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition cursor-pointer shrink-0"
          >
            {lang === 'km' ? 'បានដឹង (Dismiss)' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
};
