import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  LogIn,
  MapPin,
  Filter,
  Trash2
} from 'lucide-react';
import { AttendanceRecord, LeaveRequest, Language, AuthUser, Employee } from '../types';
import { resolveAvatar, handleAvatarError } from '../utils/avatarUtils';

export interface ActionAlertItem {
  id: string;
  type: 'leave_submit' | 'leave_status' | 'punch' | 'transfer' | 'system' | 'login';
  titleKh: string;
  titleEn: string;
  detailKh: string;
  detailEn: string;
  timestamp: string;
  rawTimestamp?: number;
  actorName?: string;
  actorAvatar?: string;
  branchName?: string;
  branchId?: string;
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'punch' | 'login' | 'leave' | 'warning'>('all');

  const unreadCount = alerts.filter(a => a.isUnread).length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (activeFilter === 'punch') return item.type === 'punch';
      if (activeFilter === 'login') return item.type === 'login';
      if (activeFilter === 'leave') return item.type === 'leave_submit' || item.type === 'leave_status';
      if (activeFilter === 'warning') {
        return (
          item.titleEn.toLowerCase().includes('warning') ||
          item.titleKh.includes('⚠️') ||
          item.detailEn.toLowerCase().includes('out of range') ||
          item.detailKh.includes('លើសដែនកំណត់')
        );
      }
      return true;
    });
  }, [alerts, activeFilter]);

  const punchCount = alerts.filter(a => a.type === 'punch').length;
  const loginCount = alerts.filter(a => a.type === 'login').length;
  const leaveCount = alerts.filter(a => a.type === 'leave_submit' || a.type === 'leave_status').length;
  const warningCount = alerts.filter(a => 
    a.titleEn.toLowerCase().includes('warning') || 
    a.titleKh.includes('⚠️') || 
    a.detailEn.toLowerCase().includes('out of range')
  ).length;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-indigo-200/80 rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Ticker Headline */}
        <div className="flex items-center space-x-3">
          <div className="relative p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
            {unreadCount > 0 && (
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
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {unreadCount} {lang === 'km' ? 'ថ្មី' : 'NEW'}
                </span>
              )}
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 shadow-xs cursor-pointer ${
              isOpen
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-indigo-600'}`} />
            <span>{lang === 'km' ? 'ប្រវត្តិកត់ត្រា' : 'Activity History'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              isOpen ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {alerts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Alert History Drawer */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3 animate-fadeIn">
          {/* Header Controls & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
                <span className="text-[10px] opacity-80">({alerts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('punch')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'punch'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-emerald-700 border border-emerald-200'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>{lang === 'km' ? 'ស្កេន GPS' : 'GPS Punches'}</span>
                <span className="text-[10px] opacity-80">({punchCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('login')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'login'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-blue-700 border border-blue-200'
                }`}
              >
                <LogIn className="w-3 h-3" />
                <span>{lang === 'km' ? 'ចូលប្រព័ន្ធ' : 'Logins'}</span>
                <span className="text-[10px] opacity-80">({loginCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('leave')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'leave'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-amber-700 border border-amber-200'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{lang === 'km' ? 'ច្បាប់' : 'Leaves'}</span>
                <span className="text-[10px] opacity-80">({leaveCount})</span>
              </button>

              {warningCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeFilter === 'warning'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>{lang === 'km' ? 'ការព្រមាន' : 'Warnings'}</span>
                  <span className="text-[10px] opacity-80">({warningCount})</span>
                </button>
              )}
            </div>

            {/* Clear All button */}
            {onClearAlerts && alerts.length > 0 && (
              <button
                type="button"
                onClick={onClearAlerts}
                className="text-slate-500 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer self-end sm:self-auto transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>{lang === 'km' ? 'សម្អាតទាំងអស់' : 'Clear All'}</span>
              </button>
            )}
          </div>

          {/* List of Alerts */}
          <div className="max-h-88 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                <p>
                  {lang === 'km'
                    ? 'គ្មានកំណត់ត្រាសកម្មភាពក្នុងផ្នែកនេះទេ'
                    : 'No real-time activity recorded in this category yet'}
                </p>
              </div>
            ) : (
              filteredAlerts.map((item) => {
                const isGeofenceWarning =
                  item.titleEn.toLowerCase().includes('warning') ||
                  item.titleKh.includes('⚠️') ||
                  item.detailEn.toLowerCase().includes('out of range');

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                      item.isUnread
                        ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
                        : isGeofenceWarning
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {/* Staff Avatar or Type Icon */}
                      <div className="relative shrink-0">
                        {item.actorAvatar ? (
                          <img
                            src={resolveAvatar(item.actorAvatar, null, item.actorName || 'Staff')}
                            alt={item.actorName || ''}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100 shadow-2xs"
                            onError={(e) => handleAvatarError(e, item.actorName || 'Staff')}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            item.type === 'punch' ? 'bg-emerald-100 text-emerald-700' :
                            item.type === 'login' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'leave_submit' ? 'bg-amber-100 text-amber-700' :
                            item.type === 'leave_status' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.type === 'punch' ? <MapPin className="w-5 h-5" /> :
                             item.type === 'login' ? <LogIn className="w-5 h-5" /> :
                             item.type === 'leave_submit' ? <Calendar className="w-5 h-5" /> :
                             item.type === 'leave_status' ? <CheckCircle2 className="w-5 h-5" /> :
                             <Bell className="w-5 h-5" />}
                          </div>
                        )}

                        {/* Tiny Indicator Icon Badge */}
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white border-2 border-white shadow-2xs ${
                          isGeofenceWarning ? 'bg-rose-500' :
                          item.type === 'punch' ? 'bg-emerald-500' :
                          item.type === 'login' ? 'bg-blue-500' :
                          item.type === 'leave_submit' ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}>
                          {item.type === 'punch' ? '📍' :
                           item.type === 'login' ? '🔑' :
                           item.type === 'leave_submit' ? '📋' : '🔔'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isGeofenceWarning ? 'bg-rose-500 animate-ping' :
                            item.type === 'punch' ? 'bg-emerald-500' :
                            item.type === 'login' ? 'bg-blue-500' :
                            item.type === 'leave_submit' ? 'bg-amber-500' : 'bg-indigo-500'
                          }`} />
                          <p className="font-bold text-slate-800 truncate">
                            {lang === 'km' ? item.titleKh : item.titleEn}
                          </p>
                          {item.isUnread && (
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                              NEW
                            </span>
                          )}
                          {item.actorName && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold truncate max-w-[120px]">
                              {item.actorName}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {lang === 'km' ? item.detailKh : item.detailEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        {item.timestamp}
                      </span>

                      {/* Quick Approve / Reject action if it's a leave submit */}
                      {item.type === 'leave_submit' && item.leaveRequestId && onApproveLeave && onRejectLeave && (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => onApproveLeave(item.leaveRequestId!)}
                            title={lang === 'km' ? 'អនុម័ត' : 'Approve'}
                            className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectLeave(item.leaveRequestId!)}
                            title={lang === 'km' ? 'បដិសេធ' : 'Reject'}
                            className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
