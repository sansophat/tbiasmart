import React, { useState, useEffect } from 'react';
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
  Download,
  Calendar,
  Bell
} from 'lucide-react';
import { AuthUser, Branch, CompanyBranding, Language, UserGeoLocation } from '../types';
import { toKhmerNumeral } from '../utils/geoUtils';
import { AdminQuickVisualWidget } from './AdminQuickVisualWidget';

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
  pendingLeavesCount?: number;
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
  pendingLeavesCount = 0,
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
      {/* Broadcast Announcement Bar */}
      {broadcastActive && (broadcastNoticeKh || broadcastNoticeEn) && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white py-1.5 px-4 text-xs font-bold shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 truncate">
              <Megaphone className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="truncate">
                {lang === 'km' ? broadcastNoticeKh : broadcastNoticeEn}
              </span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              {lang === 'km' ? 'សារផ្លូវការ' : 'Notice'}
            </span>
          </div>
        </div>
      )}

      {/* Main Header Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Expand Sidebar button with [>] symbol when sidebar is collapsed */}
          {isSidebarCollapsed && onToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer text-xs font-bold shadow-xs group"
              title={lang === 'km' ? 'ពង្រីក Sidebar [>]' : 'Expand Sidebar [>]'}
            >
              <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
              <span>{lang === 'km' ? 'ពង្រីក' : 'Expand'}</span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
              <span>AMS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              {getTabTitle(activeTab)}
            </h1>
          </div>
        </div>

        {/* Right Side: Geofence Status, Clock, Language, Quick Scan, and User Profile */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer shadow-xs"
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
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 shadow-xs cursor-pointer animate-pulse transition"
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

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'km' ? 'en' : 'km')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
            title={lang === 'km' ? 'ប្តូរជាភាសាអង់គ្លេស (Switch to English)' : 'Switch to Khmer (ប្តូរជាភាសាខ្មែរ)'}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'km' ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}</span>
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
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'km' ? 'ស្កេនវត្តមាន' : 'Quick Punch'}</span>
          </button>

          {/* User Account Capsule */}
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="flex items-center space-x-2 p-1 sm:px-2.5 sm:py-1 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50 transition cursor-pointer"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.nameKh || currentUser?.nameEn || 'User'}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
              }}
              className="w-7 h-7 rounded-xl object-cover border border-slate-300 shrink-0 bg-slate-200"
            />
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[100px]">
                {currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) || currentUser.username : 'Guest'}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase block leading-none">
                {currentUser?.role || 'Sign In'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
