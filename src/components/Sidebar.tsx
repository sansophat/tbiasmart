import React from 'react';
import { 
  LayoutDashboard, 
  QrCode, 
  Tv, 
  Users, 
  FileSpreadsheet, 
  Radio, 
  Settings, 
  UserCheck, 
  User, 
  Building2, 
  Sparkles, 
  Warehouse, 
  Coffee, 
  ShieldCheck, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  LogIn, 
  Sliders, 
  Palette, 
  Shield, 
  Flame,
  Clock,
  Compass,
  Download
} from 'lucide-react';
import { AuthUser, Branch, CompanyBranding, Language, UserGeoLocation } from '../types';
import { toKhmerNumeral } from '../utils/geoUtils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  branding: CompanyBranding;
  currentUser: AuthUser | null;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  branches: Branch[];
  currentGeo: UserGeoLocation;
  lang: Language;
  pendingLeavesCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenInstallModal?: () => void;
}

interface NavItem {
  id: string;
  labelKh: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | undefined;
  badgeColor?: string;
  highlight?: boolean;
}

interface NavGroup {
  groupNameKh: string;
  groupNameEn: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  branding,
  currentUser,
  selectedBranchId,
  setSelectedBranchId,
  branches,
  lang,
  pendingLeavesCount,
  isCollapsed,
  setIsCollapsed,
  onOpenLoginModal,
  onLogout,
  isOpenMobile,
  setIsOpenMobile,
  onOpenInstallModal,
}) => {
  const isEmployee = currentUser?.role === 'employee';
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  // Navigation Items by Category
  const navigationGroups: NavGroup[] = isEmployee
    ? [
        {
          groupNameKh: 'សេវាកម្មបុគ្គលិក',
          groupNameEn: 'Self Service',
          items: [
            {
              id: 'portal',
              labelKh: 'ផតថលរបស់ខ្ញុំ',
              labelEn: 'My Portal (Leaves & OT)',
              icon: UserCheck,
              badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
              badgeColor: 'bg-amber-500 text-white',
            },
            {
              id: 'scan',
              labelKh: 'ស្កេនវត្តមាន QR & GPS',
              labelEn: 'Mobile QR Punch',
              icon: QrCode,
              highlight: true,
            },
            {
              id: 'dashboard',
              labelKh: 'ផ្ទាំងព័ត៌មានសាខា',
              labelEn: 'Branch Overview',
              icon: LayoutDashboard,
            },
            {
              id: 'profile',
              labelKh: 'ប្រវត្តិរូប & រូបថត',
              labelEn: 'Profile & PIN',
              icon: User,
            },
          ],
        },
      ]
    : [
        {
          groupNameKh: 'ប្រតិបត្តិការវត្តមាន',
          groupNameEn: 'Presence Operations',
          items: [
            {
              id: 'dashboard',
              labelKh: 'ផ្ទាំងគ្រប់គ្រងទូទៅ',
              labelEn: 'Dashboard',
              icon: LayoutDashboard,
            },
            {
              id: 'scan',
              labelKh: 'ស្កេនវត្តមាន QR & GPS',
              labelEn: 'QR & GPS Scan',
              icon: QrCode,
              highlight: true,
            },
            {
              id: 'kiosk',
              labelKh: 'Tablet Kiosk ៧ សាខា',
              labelEn: 'Branch Touch Kiosk',
              icon: Tv,
            },
            {
              id: 'gps_radar',
              labelKh: 'ផែនទី GPS Radar',
              labelEn: 'GPS Geofence Radar',
              icon: Radio,
            },
          ],
        },
        {
          groupNameKh: 'ការគ្រប់គ្រងបុគ្គលិក & សាខា',
          groupNameEn: 'Workforce & Branches',
          items: [
            {
              id: 'employees',
              labelKh: 'បញ្ជីឈ្មោះបុគ្គលិក',
              labelEn: 'Staff Directory',
              icon: Users,
            },
            {
              id: 'branches',
              labelKh: 'គ្រប់គ្រង ៧ សាខា & ប្រភេទ',
              labelEn: 'Branch Management',
              icon: Building2,
              badge: `${branches.length}`,
              badgeColor: 'bg-indigo-600 text-white',
            },
            {
              id: 'reports',
              labelKh: 'របាយការណ៍ & សុំច្បាប់',
              labelEn: 'Reports & Leave Approvals',
              icon: FileSpreadsheet,
              badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
              badgeColor: 'bg-amber-500 text-white',
            },
          ],
        },
        {
          groupNameKh: 'ការកំណត់រដ្ឋបាល & សុវត្ថិភាព',
          groupNameEn: 'Administration & System',
          items: [
            {
              id: 'settings',
              labelKh: 'ការកំណត់រដ្ឋបាល (Admin Settings)',
              labelEn: 'Admin Settings & Branding',
              icon: Sliders,
              badge: isAdmin ? 'ADMIN' : undefined,
              badgeColor: 'bg-indigo-600 text-white',
            },
            {
              id: 'profile',
              labelKh: 'ប្រវត្តិរូបគណនី',
              labelEn: 'My Account Settings',
              icon: User,
            },
          ],
        },
      ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`sidebar-container font-hanuman fixed top-0 bottom-0 left-0 z-50 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between min-h-[72px]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={branding.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80';
                }}
                className="w-10 h-10 rounded-2xl object-cover border border-indigo-500/50 shadow-md ring-2 ring-indigo-500/20"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-black text-white truncate tracking-tight">
                  {lang === 'km' ? branding.companyNameKh : branding.companyNameEn}
                </h2>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block truncate">
                  {lang === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន AMS' : 'Smart Attendance Suite'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Branch Quick Indicator (Non-collapsible view) */}
        {!isCollapsed && (
          <div className="p-3 mx-3 mt-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-bold">
              <span>{lang === 'km' ? 'ទីតាំងសាខាប្រតិបត្តិការ' : 'Operational Scope'}</span>
              <span className="text-[10px] text-indigo-400 font-mono">7 Branches</span>
            </div>

            {isEmployee ? (
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 bg-slate-800 p-2 rounded-xl border border-slate-700">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {branches.find((b) => b.id === (currentUser?.branchId))?.nameEn || 'Assigned Branch'}
                </span>
              </div>
            ) : (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-slate-800 text-xs font-bold text-slate-100 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">🌐 {lang === 'km' ? 'គ្រប់សាខាទាំង ៧ (All Branches)' : 'All 7 Branches'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.type === 'club' ? '🍸 ' : b.type === 'warehouse' ? '📦 ' : b.type === 'cafe' ? '☕ ' : '🏢 '}
                    {lang === 'km' ? b.nameKh : b.nameEn}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Main Navigation Items Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navigationGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  {lang === 'km' ? group.groupNameKh : group.groupNameEn}
                </span>
              )}

              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-2xl font-bold text-xs transition cursor-pointer group ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : item.highlight
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    title={isCollapsed ? (lang === 'km' ? item.labelKh : item.labelEn) : undefined}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition ${
                        isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                      }`} />
                      {!isCollapsed && (
                        <span className="truncate">
                          {lang === 'km' ? item.labelKh : item.labelEn}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Optional Install PWA App action */}
        {onOpenInstallModal && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={onOpenInstallModal}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-start space-x-2.5 px-3 py-2'
              } rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white border border-indigo-800/60 text-xs font-bold transition cursor-pointer`}
              title={lang === 'km' ? 'ដំឡើងលើទូរស័ព្ទ / កុំព្យូទ័រ' : 'Install App to Device'}
            >
              <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {!isCollapsed && (
                <span className="truncate">{lang === 'km' ? 'ដំឡើង App លើ Home Screen' : 'Install App to Device'}</span>
              )}
            </button>
          </div>
        )}

        {/* User Account & Login Footer Widget */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          {currentUser ? (
            <div className={`p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/60 flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}>
              <div className="flex items-center space-x-2.5 min-w-0">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.nameKh || currentUser.nameEn || 'User'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                  className="w-8 h-8 rounded-xl object-cover border border-slate-600 shrink-0 bg-slate-800"
                />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">
                      {(lang === 'km' ? currentUser.nameKh : currentUser.nameEn) || currentUser.username}
                    </h5>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      currentUser.role === 'admin' ? 'text-amber-400' :
                      currentUser.role === 'manager' ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      ● {currentUser.role}
                    </span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                    title={lang === 'km' ? 'ប្តូរគណនី' : 'Switch Account'}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title={lang === 'km' ? 'ចាកចេញ' : 'Sign Out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {!isCollapsed && <span>{lang === 'km' ? 'ចូលប្រព័ន្ធ (Sign In)' : 'Sign In / Switch Role'}</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
