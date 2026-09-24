import React, { useState } from 'react';
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Radio, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  X, 
  ArrowRight, 
  Volume2, 
  VolumeX,
  Building2,
  FileText,
  AlertCircle,
  Eye,
  Check,
  ChevronRight
} from 'lucide-react';
import { AttendanceRecord, LeaveRequest, Language, AuthUser, Employee } from '../types';

export interface ActionAlertItem {
  id: string;
  type: 'leave_submit' | 'leave_status' | 'punch' | 'transfer' | 'system';
  titleKh: string;
  titleEn: string;
  detailKh: string;
  detailEn: string;
  timestamp: string;
  actorName?: string;
  actorAvatar?: string;
  leaveRequestId?: string;
  isUnread?: boolean;
}

interface RealtimeActionAlertCenterProps {
  alerts: ActionAlertItem[];
  pendingLeavesCount: number;
  onClearAlerts?: () => void;
  onApproveLeave?: (id: string) => void;
  onRejectLeave?: (id: string) => void;
  onNavigateToLeaves?: () => void;
  onNavigateToAttendance?: () => void;
  lang: Language;
}

export const RealtimeActionAlertCenter: React.FC<RealtimeActionAlertCenterProps> = ({
  alerts,
  pendingLeavesCount,
  onClearAlerts,
  onApproveLeave,
  onRejectLeave,
  onNavigateToLeaves,
  onNavigateToAttendance,
  lang,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const unreadCount = alerts.filter(a => a.isUnread).length;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-indigo-200/80 rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Ticker Headline */}
        <div className="flex items-center space-x-3">
          <div className="relative p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
            {pendingLeavesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md font-mono">
                LIVE ACTION FEED
              </span>
              <span className="text-xs font-bold text-slate-800 font-battambang">
                {lang === 'km' ? 'សកម្មភាពបុគ្គលិក & ការជូនដំណឹងផ្ទាល់' : 'Live Staff Actions & Alerts'}
              </span>
            </div>

            {/* Current latest action text */}
            <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">
              {alerts.length > 0 ? (
                <>
                  <span className="text-slate-900 font-bold">
                    {lang === 'km' ? alerts[0].titleKh : alerts[0].titleEn}:
                  </span>{' '}
                  {lang === 'km' ? alerts[0].detailKh : alerts[0].detailEn}
                </>
              ) : (
                lang === 'km'
                  ? 'ប្រព័ន្ធកំពុងតាមដានវត្តមាន និងច្បាប់បុគ្គលិកតាមអនឡាញ Real-time...'
                  : 'Monitoring real-time staff punches and leave requests online...'
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Dropdown Trigger */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          {pendingLeavesCount > 0 && onNavigateToLeaves && (
            <button
              type="button"
              onClick={onNavigateToLeaves}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-200 transition flex items-center space-x-1.5 cursor-pointer font-battambang animate-pulse"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? `ពិនិត្យច្បាប់ (${pendingLeavesCount})` : `Review Leaves (${pendingLeavesCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'km' ? 'ប្រវត្តិកត់ត្រា' : 'Activity History'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
              {alerts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Alert History Drawer */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>{lang === 'km' ? 'កំណត់ត្រាសកម្មភាពចុងក្រោយ (Recent Real-time Activity)' : 'Recent Real-time Activity Logs'}</span>
            {onClearAlerts && alerts.length > 0 && (
              <button
                type="button"
                onClick={onClearAlerts}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] cursor-pointer"
              >
                {lang === 'km' ? 'សម្អាត' : 'Clear All'}
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                {lang === 'km' ? 'គ្មានកំណត់ត្រាសកម្មភាពថ្មីទេ' : 'No recent activity recorded yet'}
              </div>
            ) : (
              alerts.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      item.type === 'leave_submit' ? 'bg-amber-500' :
                      item.type === 'leave_status' ? 'bg-emerald-500' :
                      item.type === 'punch' ? 'bg-indigo-500' : 'bg-slate-400'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">
                        {lang === 'km' ? item.titleKh : item.titleEn}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lang === 'km' ? item.detailKh : item.detailEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.timestamp}
                    </span>

                    {/* Quick Approve / Reject action if it's a leave submit */}
                    {item.type === 'leave_submit' && item.leaveRequestId && onApproveLeave && onRejectLeave && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => onApproveLeave(item.leaveRequestId!)}
                          title="Approve"
                          className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectLeave(item.leaveRequestId!)}
                          title="Reject"
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
