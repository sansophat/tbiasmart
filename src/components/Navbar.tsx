import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  MapPin, 
  Users, 
  Globe, 
  ShieldCheck, 
  Radio, 
  Clock,
  User,
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  Megaphone,
  CheckCircle2,
  Sliders,
  Tv,
  LayoutDashboard,
  Lock,
  ChevronRight,
  ChevronDown,
  Download,
  Calendar,
  Bell,
  Pause,
  Play,
  X
} from 'lucide-react';
import { AuthUser, Branch, CompanyBranding, Language, UserGeoLocation, Employee } from '../types';
import { toKhmerNumeral } from '../utils/geoUtils';
import { AdminQuickVisualWidget } from './AdminQuickVisualWidget';
import { ActionAlertItem } from './RealtimeActionAlertCenter';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  branches: Branch[];
  currentGeo: UserGeoLocation;
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenQuickScan: () => void;
  currentUser: AuthUser | null;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
  employees?: Employee[];
  pendingLeavesCount?: number;
  actionAlerts?: ActionAlertItem[];
  onClearAlerts?: () => void;
  branding?: CompanyBranding;
  onUpdateBranding?: (branding: Partial<CompanyBranding>) => void;
  onNavigateToSettingsTypography?: () => void;
  broadcastNoticeKh?: string;
  broadcastNoticeEn?: string;
  broadcastActive?: boolean;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  isLiveSyncConnected?: boolean;
  onlinePeersCount?: number;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedBranchId,
  setSelectedBranchId,
  branches,
  currentGeo,
  lang,
  setLang,
  onOpenQuickScan,
  currentUser,
  onOpenLoginModal,
  onLogout,
  employees = [],
  pendingLeavesCount = 0,
  actionAlerts = [],
  onClearAlerts,
  branding,
  onUpdateBranding,
  onNavigateToSettingsTypography,
  broadcastNoticeKh,
  broadcastNoticeEn,
  broadcastActive = true,
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  isLiveSyncConnected = true,
  onlinePeersCount = 1,
  onOpenInstallModal,
}) => {
  const [time, setTime] = useState(new Date());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isTickerPaused, setIsTickerPaused] = useState(false);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const alertsMenuRef = useRef<HTMLDivElement>(null);

  // Sync / reset error if user or avatar changes
  useEffect(() => {
    setImgError(false);
  }, [currentUser?.id, currentUser?.avatar]);

  // Click outside to close user menu & alerts menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(event.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchingEmp = employees.find(
    (e) => e.id === currentUser?.employeeId || e.code === currentUser?.employeeCode
  );
  const avatarUrl = currentUser?.avatar || matchingEmp?.avatar || '';
  const userName = currentUser
    ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) || currentUser.username
    : 'Guest';

  const getUserInitials = (name?: string) => {
    if (!name || name === 'Guest') return 'U';
    const clean = name.replace(/\(.*?\)/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'U';
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatKhmerTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;
    return lang === 'km' ? toKhmerNumeral(timeStr) : timeStr;
  };

  const isEmployee = currentUser?.role === 'employee';

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រងទូទៅ (Dashboard)' : 'Operational Dashboard';
      case 'scan':
        return lang === 'km' ? 'ស្កេន QR & GPS Geofence' : 'QR & GPS Attendance Punch';
      case 'kiosk':
        return lang === 'km' ? 'ផ្ទាំង Tablet Kiosk សាខា' : 'Branch Touch Kiosk';
      case 'gps_radar':
        return lang === 'km' ? 'ផែនទី GPS Geofence Radar' : 'Live Geofence Radar';
      case 'employees':
        return lang === 'km' ? 'បញ្ជីឈ្មោះបុគ្គលិក (Staff Directory)' : 'Workforce Directory';
      case 'reports':
        return lang === 'km' ? 'របាយការណ៍ & អនុម័តច្បាប់ (Reports & Approvals)' : 'Reports & Approvals';
      case 'portal':
        return lang === 'km' ? 'ផតថលបុគ្គលិក (Employee Portal)' : 'Employee Self-Service Portal';
      case 'profile':
        return lang === 'km' ? 'ការកំណត់ប្រវត្តិរូប & PIN' : 'Profile & PIN Settings';
      case 'settings':
        return lang === 'km' ? 'មជ្ឈមណ្ឌលគ្រប់គ្រងប្រព័ន្ធ (Admin Settings)' : 'Admin Control Center';
      default:
        return 'Attendance Management System';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all shadow-xs">
      {/* Broadcast Announcement Scrolling Ticker Bar */}
      {broadcastActive && !isReminderDismissed && (broadcastNoticeKh || broadcastNoticeEn) && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white py-1.5 px-3 sm:px-4 text-xs font-medium shadow-inner border-b border-amber-600/50 overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {/* Pinned Left Badge */}
            <div className="flex items-center space-x-1.5 bg-black/25 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 z-20 shadow-xs border border-white/20 select-none">
              <Megaphone className="w-3.5 h-3.5 text-amber-200 animate-bounce shrink-0" />
              <span>{lang === 'km' ? 'សាររំលឹក' : 'Reminder'}</span>
            </div>

            {/* Continuous Scrolling Marquee Viewport */}
            <div className="relative flex-1 overflow-hidden min-w-0 flex items-center">
              {/* Left and Right Fade Gradients */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-amber-500 to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-orange-500 to-transparent z-10" />

              {/* Scrolling Loop Container (Dual segments for seamless 100% infinite scroll) */}
              <div
                className={`animate-reminder-marquee items-center text-xs font-semibold py-0.5 select-none ${
                  isTickerPaused ? 'is-paused' : ''
                }`}
                title={lang === 'km' ? 'ដាក់កណ្ដុរពីលើដើម្បីផ្អាកការរមូរ (Hover to pause)' : 'Hover to pause scrolling'}
              >
                <div className="flex items-center space-x-6 shrink-0 pr-12">
                  {broadcastNoticeKh && <span className="font-battambang font-bold">{broadcastNoticeKh}</span>}
                  {broadcastNoticeEn && broadcastNoticeKh && (
                    <span className="text-amber-200/90 font-black text-sm">✦</span>
                  )}
                  {broadcastNoticeEn && (
                    <span className="font-semibold text-amber-50">{broadcastNoticeEn}</span>
                  )}
                  <span className="text-amber-200/90 font-black text-sm">✦</span>
                </div>
                <div className="flex items-center space-x-6 shrink-0 pr-12" aria-hidden="true">
                  {broadcastNoticeKh && <span className="font-battambang font-bold">{broadcastNoticeKh}</span>}
                  {broadcastNoticeEn && broadcastNoticeKh && (
                    <span className="text-amber-200/90 font-black text-sm">✦</span>
                  )}
                  {broadcastNoticeEn && (
                    <span className="font-semibold text-amber-50">{broadcastNoticeEn}</span>
                  )}
                  <span className="text-amber-200/90 font-black text-sm">✦</span>
                </div>
              </div>
            </div>

            {/* Right Action Controls: Pause/Play & Dismiss */}
            <div className="flex items-center space-x-1 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setIsTickerPaused(!isTickerPaused)}
                className="p-1 rounded-lg hover:bg-black/25 text-white/90 hover:text-white transition cursor-pointer"
                title={isTickerPaused ? (lang === 'km' ? 'បន្តការរមូរ (Resume)' : 'Resume scrolling') : (lang === 'km' ? 'ផ្អាកការរមូរ (Pause)' : 'Pause scrolling')}
                aria-label="Toggle ticker animation"
              >
                {isTickerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsReminderDismissed(true)}
                className="p-1 rounded-lg hover:bg-black/25 text-white/80 hover:text-white transition cursor-pointer"
                title={lang === 'km' ? 'បិទការរំលឹកនេះ' : 'Dismiss reminder'}
                aria-label="Dismiss reminder"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Content */}
      <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 max-w-full overflow-visible relative">
        {/* Left Side: Mobile Menu Button & Breadcrumbs */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Expand Sidebar button with [>] symbol when sidebar is collapsed */}
          {isSidebarCollapsed && onToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer text-xs font-bold shadow-xs group shrink-0"
              title={lang === 'km' ? 'ពង្រីក Sidebar [>]' : 'Expand Sidebar [>]'}
            >
              <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
              <span>{lang === 'km' ? 'ពង្រីក' : 'Expand'}</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 font-medium shrink-0">
              <span>AMS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-xs sm:text-base font-black text-slate-800 tracking-tight truncate">
              {getTabTitle(activeTab)}
            </h1>
          </div>
        </div>

        {/* Right Side: Geofence Status, Clock, Language, Quick Scan, and User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Real-time Server & Cloud Database Sync Status Indicator */}
          <div
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition shadow-xs ${
              isLiveSyncConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title={
              isLiveSyncConnected
                ? `Firebase Cloud Database Synchronized (${onlinePeersCount} terminal nodes active)`
                : 'Connecting to Cloud Database...'
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isLiveSyncConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
              }`}
            />
            <span className="text-[11px]">
              {isLiveSyncConnected
                ? lang === 'km'
                  ? `Cloud Sync (${onlinePeersCount})`
                  : `Cloud Live (${onlinePeersCount})`
                : lang === 'km'
                ? 'កំពុងភ្ជាប់...'
                : 'Connecting...'}
            </span>
          </div>

          {/* Real-time Digital Clock */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-mono font-bold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{formatKhmerTime(time)}</span>
          </div>

          {/* GPS Geofence Accuracy Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>GPS ±{Math.round(currentGeo.accuracy)}m</span>
          </div>

          {/* Install App / PWA Button */}
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer shadow-xs shrink-0"
              title={lang === 'km' ? 'ដំឡើងលើទូរស័ព្ទ / កុំព្យូទ័រ (Install App)' : 'Install App to Device'}
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">{lang === 'km' ? 'ដំឡើង App' : 'Install'}</span>
            </button>
          )}

          {/* Pending Leaves Alert Pill */}
          {pendingLeavesCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setTimeout(() => {
                  const el = document.getElementById('dashboard-leave-approvals-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 shadow-xs cursor-pointer animate-pulse transition shrink-0"
              title={lang === 'km' ? `មាន ${pendingLeavesCount} ពាក្យស្នើសុំច្បាប់រង់ចាំអនុម័ត` : `${pendingLeavesCount} pending leave requests waiting for approval`}
            >
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline font-battambang">
                {lang === 'km' ? 'ច្បាប់រង់ចាំ' : 'Leaves'}
              </span>
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                {pendingLeavesCount}
              </span>
            </button>
          )}

          {/* Real-time Staff Alerts & GPS Feed Bell */}
          <div className={`relative shrink-0 ${isAlertsOpen ? 'z-50' : 'z-20'}`} ref={alertsMenuRef}>
            <button
              type="button"
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className={`flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-2xl text-xs font-bold border transition cursor-pointer shadow-xs ${
                actionAlerts.some((a) => a.isUnread)
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-400/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={lang === 'km' ? 'ការជូនដំណឹងសកម្មភាពបុគ្គលិក & ស្កេន GPS' : 'Staff Activity & GPS Punch Alerts'}
            >
              <div className="relative">
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                {actionAlerts.some((a) => a.isUnread) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="hidden sm:inline font-battambang">
                {lang === 'km' ? 'ដំណឹងបុគ្គលិក' : 'Staff Alerts'}
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                actionAlerts.some((a) => a.isUnread)
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}>
                {actionAlerts.length}
              </span>
            </button>

            {/* Quick Alerts Dropdown Popover */}
            {isAlertsOpen && (
              <>
                {/* Mobile Backdrop Overlay to dismiss on outside tap */}
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-150"
                  onClick={() => setIsAlertsOpen(false)}
                />

                <div className="fixed top-16 inset-x-3 sm:inset-x-auto sm:right-0 sm:absolute sm:top-full sm:mt-2 w-auto sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 p-4 animate-in fade-in zoom-in-95 sm:zoom-in-100 sm:slide-in-from-top-2 duration-150 ring-1 ring-slate-900/10">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span className="font-bold text-slate-800 text-xs font-battambang">
                        {lang === 'km' ? 'សកម្មភាពបុគ្គលិកផ្ទាល់ (Live Staff Alerts)' : 'Live Staff Activity Alerts'}
                      </span>
                    </div>
                    {onClearAlerts && actionAlerts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearAlerts();
                          setIsAlertsOpen(false);
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                      >
                        {lang === 'km' ? 'សម្អាត' : 'Clear'}
                      </button>
                    )}
                  </div>

                  {/* Alert Items List */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {actionAlerts.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        {lang === 'km' ? 'មិនទាន់មានសកម្មភាពថ្មីទេ' : 'No staff activity recorded yet'}
                      </div>
                    ) : (
                      actionAlerts.slice(0, 15).map((a) => (
                        <div
                          key={a.id}
                          className={`p-2.5 rounded-2xl border text-xs flex items-center space-x-2.5 shadow-2xs ${
                            a.isUnread ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50/70 border-slate-100'
                          }`}
                        >
                          {a.actorAvatar ? (
                            <img
                              src={a.actorAvatar}
                              alt=""
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                              a.type === 'punch' ? 'bg-emerald-600' :
                              a.type === 'login' ? 'bg-blue-600' :
                              a.type === 'leave_submit' ? 'bg-amber-600' : 'bg-indigo-600'
                            }`}>
                              {a.type === 'punch' ? 'GPS' : a.type === 'login' ? 'IN' : 'REQ'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-[11px] truncate">
                                {lang === 'km' ? a.titleKh : a.titleEn}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">{a.timestamp}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 truncate mt-0.5">
                              {lang === 'km' ? a.detailKh : a.detailEn}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer link to Dashboard */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAlertsOpen(false);
                        setActiveTab('dashboard');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{lang === 'km' ? 'មើលទាំងអស់លើ Dashboard' : 'View Full Feed on Dashboard'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-slate-400 text-[10px]">{actionAlerts.length} {lang === 'km' ? 'កំណត់ត្រា' : 'total'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'km' ? 'en' : 'km')}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shrink-0"
            title={lang === 'km' ? 'ប្តូរជាភាសាអង់គ្លេស (Switch to English)' : 'Switch to Khmer (ប្តូរជាភាសាខ្មែរ)'}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">{lang === 'km' ? 'ខ្មែរ' : 'EN'}</span>
          </button>

          {/* Quick Khmer Typography & Zoom Widget */}
          {branding && onUpdateBranding && (
            <AdminQuickVisualWidget
              currentUser={currentUser}
              lang={lang}
              branding={branding}
              onUpdateBranding={onUpdateBranding}
              onNavigateToSettingsTypography={onNavigateToSettingsTypography}
            />
          )}

          {/* Quick Scan Punch Button */}
          <button
            type="button"
            onClick={onOpenQuickScan}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer shrink-0"
            title={lang === 'km' ? 'ស្កេនវត្តមាន' : 'Quick Punch'}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{lang === 'km' ? 'ស្កេនវត្តមាន' : 'Quick Punch'}</span>
          </button>

          {/* User Account Capsule with Dropdown Menu */}
          <div className={`relative shrink-0 ${isUserMenuOpen ? 'z-50' : 'z-20'}`} ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onOpenLoginModal();
                } else {
                  setIsUserMenuOpen(!isUserMenuOpen);
                }
              }}
              className="flex items-center space-x-2 p-1 sm:px-2.5 sm:py-1 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50 transition cursor-pointer shadow-xs group"
              title={currentUser ? (lang === 'km' ? 'ម៉ឺនុយគណនីអ្នកប្រើ' : 'User Account Menu') : (lang === 'km' ? 'ចូលប្រព័ន្ធ (Sign In)' : 'Sign In')}
            >
              {/* User Avatar Circle */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-300 shadow-inner bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
                {avatarUrl && !imgError ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">
                    {currentUser ? getUserInitials(userName) : <User className="w-4 h-4 text-white" />}
                  </span>
                )}
                {currentUser && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 ring-2 ring-white rounded-full" />
                )}
              </div>

              {/* User Text Info on Larger Screens */}
              <div className="hidden lg:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[110px]">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase block leading-none">
                  {currentUser?.role || (lang === 'km' ? 'ចូលគណនី' : 'Sign In')}
                </span>
              </div>

              {currentUser && (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* User Dropdown Menu Popover - Floating smoothly at the top on mobile, without exceeding the frame */}
            {isUserMenuOpen && currentUser && (
              <>
                {/* Mobile Backdrop Overlay to dismiss on outside tap */}
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-150"
                  onClick={() => setIsUserMenuOpen(false)}
                />

                <div className="fixed top-16 inset-x-3 sm:inset-x-auto sm:right-0 sm:absolute sm:top-full sm:mt-2 w-auto sm:w-80 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200/90 py-3 z-50 animate-in fade-in zoom-in-95 sm:zoom-in-100 sm:slide-in-from-top-2 duration-150">
                  {/* Header with big photo & details */}
                  <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-500/20 shadow-md shrink-0 bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
                        {avatarUrl && !imgError ? (
                          <img
                            src={avatarUrl}
                            alt={userName}
                            referrerPolicy="no-referrer"
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <span className="text-white font-black text-base">
                            {getUserInitials(userName)}
                          </span>
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 ring-2 ring-white rounded-full" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-800 text-sm truncate font-battambang">
                          {userName}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            currentUser.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            currentUser.role === 'manager' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {currentUser.role}
                          </span>
                          {currentUser.employeeCode && (
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {currentUser.employeeCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                          {currentUser.email || (currentUser.branchId ? branches.find((b) => b.id === currentUser.branchId)?.nameEn : 'Enterprise User')}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="sm:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 ml-2"
                      title={lang === 'km' ? 'បិទម៉ឺនុយ' : 'Close Menu'}
                      aria-label="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                {/* Menu Items */}
                <div className="p-2 space-y-1 text-xs font-semibold text-slate-700">
                  {/* Profile & PIN Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('profile');
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-indigo-600" />
                    <span className="font-battambang">
                      {lang === 'km' ? 'ប្រវត្តិរូប & លេខសម្ងាត់ PIN' : 'My Profile & PIN Settings'}
                    </span>
                  </button>

                  {/* Switch Account */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenLoginModal();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-battambang">
                      {lang === 'km' ? 'ប្តូរគណនី / តួនាទី (Switch Role)' : 'Switch Account / Role'}
                    </span>
                  </button>

                  {/* Sign Out */}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition cursor-pointer border-t border-slate-100 mt-1 pt-2 font-battambang"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>{lang === 'km' ? 'ចាកចេញពីគណនី (Sign Out)' : 'Sign Out'}</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </header>
  );
};
