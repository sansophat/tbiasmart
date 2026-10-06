import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Warehouse, 
  Coffee, 
  Clock, 
  Phone, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Flame,
  Palette,
  Shield,
  Sliders,
  FileText,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Radio,
  RefreshCw,
  Eye,
  Megaphone,
  Check,
  Globe,
  Compass,
  Zap,
  Tag,
  Mail,
  UserCheck,
  Layers,
  History,
  Database,
  Calendar,
  CalendarCheck,
  UserX,
  Undo2,
  KeyRound,
  RotateCcw,
  AlertTriangle,
  Download,
  Smartphone,
  Laptop,
  Monitor,
  ExternalLink,
  LayoutGrid,
  Type,
  Fuel,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { 
  Branch, 
  CompanyBranding, 
  RolePermission, 
  SystemSettings, 
  AuditLogEntry, 
  Employee, 
  Language, 
  BranchType,
  AttendanceRecord,
  LeaveRequest,
  BranchTransferRecord,
  SystemBackupData,
  ConnectedPeer,
  AuthUser,
  Shift
} from '../types';
import { INITIAL_SHIFTS } from '../data/initialData';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import { BackupRestorePanel } from './BackupRestorePanel';
import { updateDynamicAppBranding } from '../utils/pwaBrandUtils';
import { KhmerTypographySettings } from './KhmerTypographySettings';
import { DashboardLeaveApprovals } from './DashboardLeaveApprovals';
import { unbindEmployeeDevice } from '../utils/deviceSecurityUtils';
import { getEmployeeDayOffName, getEmployeeWorkingHours, getShiftCategoryBadge } from '../utils/dayOffUtils';

interface AdminSettingsViewProps {
  branches: Branch[];
  onUpdateBranch: (updatedBranch: Branch) => void;
  onAddBranch?: (newBranch: Branch) => void;
  onDeleteBranch?: (branchId: string) => void;
  branding: CompanyBranding;
  onUpdateBranding: (newBranding: CompanyBranding) => void;
  onOpenInstallModal?: () => void;
  rolePermissions: RolePermission[];
  onUpdateRolePermissions: (newPermissions: RolePermission[]) => void;
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (newSettings: SystemSettings) => void;
  auditLogs: AuditLogEntry[];
  onAddAuditLog: (log: AuditLogEntry) => void;
  employees: Employee[];
  currentUser?: AuthUser | null;
  adminProfile?: AuthUser;
  attendanceRecords?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveStatus?: (requestId: string, newStatus: 'approved' | 'rejected', comment?: string) => void;
  transferRecords?: BranchTransferRecord[];
  shifts?: Shift[];
  onUpdateShifts?: (shifts: Shift[]) => void;
  initialActiveTab?: 'branches' | 'shifts' | 'branding' | 'typography' | 'roles' | 'leaves' | 'system' | 'audit' | 'backup';
  onRestoreBackup?: (backupData: SystemBackupData, mode: 'merge' | 'overwrite') => void;
  onResetSystem?: (type: 'demo_seed' | 'clean_fresh') => void;
  onUpdateLeaveRequests?: (leaves: LeaveRequest[]) => void;
  onUpdateEmployeesList?: (employees: Employee[]) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  isLiveSyncConnected?: boolean;
  onlinePeersCount?: number;
  connectedPeers?: ConnectedPeer[];
  lang: Language;
}

const LOGO_PRESETS = [
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=200&auto=format&fit=crop&q=80'
];

const THEME_COLOR_PRESETS = [
  { name: 'Indigo Corporate', primary: '#4F46E5', accent: '#10B981', class: 'bg-indigo-600' },
  { name: 'Sapphire Night', primary: '#7C3AED', accent: '#EC4899', class: 'bg-purple-600' },
  { name: 'Emerald Green', primary: '#059669', accent: '#F59E0B', class: 'bg-emerald-600' },
  { name: 'Ocean Cyan', primary: '#0284C7', accent: '#6366F1', class: 'bg-sky-600' },
  { name: 'Amber Gold', primary: '#D97706', accent: '#EF4444', class: 'bg-amber-600' },
  { name: 'Crimson Executive', primary: '#DC2626', accent: '#8B5CF6', class: 'bg-rose-600' },
];

const PHNOM_PENH_LOCATIONS = [
  { name: 'BKK1 (Boeung Keng Kang 1)', lat: 11.5528, lng: 104.9272 },
  { name: 'Daun Penh (Riverside/Rooftop)', lat: 11.5645, lng: 104.9189 },
  { name: 'Toul Kork (Commercial District)', lat: 11.5735, lng: 104.8955 },
  { name: 'Sen Sok (Phnom Penh Thmey)', lat: 11.5880, lng: 104.8810 },
  { name: 'Veng Sreng (Industrial Logistics)', lat: 11.5230, lng: 104.8620 },
  { name: 'Phnom Penh Airport Logistics Hub', lat: 11.5460, lng: 104.8450 },
  { name: 'Chroy Changvar Waterfront', lat: 11.5820, lng: 104.9350 },
];

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  branches,
  onUpdateBranch,
  onAddBranch,
  onDeleteBranch,
  branding,
  onUpdateBranding,
  onOpenInstallModal,
  rolePermissions,
  onUpdateRolePermissions,
  systemSettings,
  onUpdateSystemSettings,
  auditLogs,
  onAddAuditLog,
  employees,
  currentUser,
  adminProfile,
  attendanceRecords = [],
  leaveRequests = [],
  onUpdateLeaveStatus,
  transferRecords = [],
  shifts = INITIAL_SHIFTS,
  onUpdateShifts,
  initialActiveTab,
  onRestoreBackup = () => {},
  onResetSystem = () => {},
  onUpdateLeaveRequests,
  onUpdateEmployeesList,
  onUpdateEmployee,
  isLiveSyncConnected = true,
  onlinePeersCount = 1,
  connectedPeers = [],
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'shifts' | 'branding' | 'typography' | 'roles' | 'leaves' | 'system' | 'audit' | 'backup'>(
    initialActiveTab || 'branches'
  );

  // Shift Management State
  const [shiftsList, setShiftsList] = useState<Shift[]>(shifts);
  const [shiftFilter, setShiftFilter] = useState<'all' | 'cafe' | 'gas_station' | 'office'>('all');
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showAddShiftModal, setShowAddShiftModal] = useState<boolean>(false);
  const [newShiftForm, setNewShiftForm] = useState<Partial<Shift>>({
    nameKh: '',
    nameEn: '',
    startTime: '08:00',
    endTime: '17:00',
    workHours: 8,
    shiftCategory: 'cafe',
    branchTypes: ['cafe'],
    description: '',
  });
  const [assignShiftModal, setAssignShiftModal] = useState<Shift | null>(null);

  // Device Management & Anti-Fraud State
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [deviceBranchFilter, setDeviceBranchFilter] = useState('all');
  const [empToResetDevice, setEmpToResetDevice] = useState<Employee | null>(null);
  const [showResetAllDevicesModal, setShowResetAllDevicesModal] = useState<boolean>(false);

  // Branch Management State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const [branchForm, setBranchForm] = useState<Branch>(activeBranch);
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [newBranchForm, setNewBranchForm] = useState<Partial<Branch>>({
    nameKh: '',
    nameEn: '',
    type: 'cafe',
    addressKh: '',
    addressEn: '',
    lat: 11.5560,
    lng: 104.9280,
    radiusMeters: 80,
    openTime: '07:00',
    closeTime: '21:00',
    managerName: employees[0]?.nameEn || 'Branch Manager',
    contactPhone: '012 345 678',
    themeColor: 'from-indigo-600 to-blue-600',
    iconName: 'Coffee',
  });

  // Branding Form State
  const [brandForm, setBrandForm] = useState<CompanyBranding>(branding);

  // RBAC Form State
  const [rolesForm, setRolesForm] = useState<RolePermission[]>(rolePermissions);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const activeRole = rolesForm.find((r) => r.roleId === selectedRoleId) || rolesForm[0];

  // System Settings State
  const [settingsForm, setSettingsForm] = useState<SystemSettings>(systemSettings);

  // Success / Feedback Alerts
  const [toastMessage, setToastMessage] = useState<string>('');

  // Navigation helpers & responsive layout controls
  type SettingsTabId = 'branches' | 'shifts' | 'branding' | 'typography' | 'roles' | 'leaves' | 'system' | 'audit' | 'backup';
  type SettingsCategory = 'all' | 'operations' | 'branding' | 'security' | 'system';

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('all');
  const [viewMode, setViewMode] = useState<'slider' | 'grid'>('slider');
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const activeTabBtnRef = useRef<HTMLButtonElement>(null);

  const categoryOptions = [
    { id: 'all' as SettingsCategory, labelKh: 'ទាំងអស់ (All 9)', labelEn: 'All Menus (9)', icon: Sliders },
    { id: 'operations' as SettingsCategory, labelKh: '🏢 សាខា & វេនការងារ', labelEn: '🏢 Branches & Shifts', icon: Building2 },
    { id: 'branding' as SettingsCategory, labelKh: '🎨 ស្លាកយីហោ & ពុម្ពអក្សរ', labelEn: '🎨 Branding & Fonts', icon: Palette },
    { id: 'security' as SettingsCategory, labelKh: '🛡️ សិទ្ធិ & ច្បាប់សម្រាក', labelEn: '🛡️ Roles & Leaves', icon: Shield },
    { id: 'system' as SettingsCategory, labelKh: '⚙️ ប្រព័ន្ធ & ស្តារទិន្នន័យ', labelEn: '⚙️ System & Backup', icon: Database },
  ];

  const tabDefinitions = useMemo(() => [
    {
      id: 'branches' as SettingsTabId,
      num: '1',
      category: 'operations' as SettingsCategory,
      labelKh: '១. ទីតាំង & Geofence ៧ សាខា',
      labelEn: '1. Branch Locations & Geofences',
      shortKh: 'ទីតាំង & Geofence',
      shortEn: 'Branches & Geofences',
      icon: MapPin,
      badge: `${branches.length}`,
      badgeColor: 'bg-indigo-100 text-indigo-700',
      descKh: 'កំណត់ទីតាំង GPS, រង្វង់ Geofence, ប្រភេទសាខា ៧ កន្លែង',
      descEn: 'Configure GPS coordinates, geofence radius & 7 branch profiles',
    },
    {
      id: 'shifts' as SettingsTabId,
      num: '2',
      category: 'operations' as SettingsCategory,
      labelKh: '២. វេនការងារ & ម៉ោងបំពេញ',
      labelEn: '2. Work Shifts & Hours',
      shortKh: 'វេនការងារ',
      shortEn: 'Work Shifts',
      icon: Clock,
      badge: `${shiftsList.length} Shifts`,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-200',
      descKh: 'វេនព្រឹក/រសៀល បារីស្តា, ស្ថានីយប្រេង, ការិយាល័យ & ថ្ងៃឈប់សម្រាក',
      descEn: 'Cafe Barista, Gas Station, and Office shift schedules & day-offs',
    },
    {
      id: 'branding' as SettingsTabId,
      num: '3',
      category: 'branding' as SettingsCategory,
      labelKh: '៣. ស្លាកយីហោ & Logo ក្រុមហ៊ុន',
      labelEn: '3. Branding & Corporate Logo',
      shortKh: 'ស្លាកយីហោ & Logo',
      shortEn: 'Branding & Logo',
      icon: Palette,
      badge: undefined,
      badgeColor: undefined,
      descKh: 'ផ្លាស់ប្តូរ Logo, ឈ្មោះក្រុមហ៊ុនជាភាសាខ្មែរ/អង់គ្លេស, ពណ៌ & Portal',
      descEn: 'Corporate logo, Khmer/English company names & visual themes',
    },
    {
      id: 'typography' as SettingsTabId,
      num: '4',
      category: 'branding' as SettingsCategory,
      labelKh: '៤. អក្សរ & Visual (Khmer Fonts)',
      labelEn: '4. Khmer Typography & Visual',
      shortKh: 'ពុម្ពអក្សរខ្មែរ',
      shortEn: 'Khmer Typography',
      icon: Type,
      badge: 'ADMIN ONLY',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-200',
      descKh: 'ជ្រើសរើសពុម្ពអក្សរ Kantumruy Pro, Battambang, Scale & Contrast',
      descEn: 'System font family, typography scale & high-contrast mode',
    },
    {
      id: 'roles' as SettingsTabId,
      num: '5',
      category: 'security' as SettingsCategory,
      labelKh: '៥. សិទ្ធិតួនាទី (RBAC Permissions)',
      labelEn: '5. RBAC Role Permissions',
      shortKh: 'សិទ្ធិតួនាទី RBAC',
      shortEn: 'RBAC Roles',
      icon: Shield,
      badge: `${rolesForm.length} Roles`,
      badgeColor: 'bg-indigo-100 text-indigo-700',
      descKh: 'កំណត់សិទ្ធិមើល, កែប្រែ, អនុម័ត និងចូលកាន់ផ្ទាំងតាមមុខតំណែង',
      descEn: 'Granular privileges for Admin, Supervisor, Manager & Staff',
    },
    {
      id: 'leaves' as SettingsTabId,
      num: '6',
      category: 'security' as SettingsCategory,
      labelKh: '៦. គ្រប់គ្រងច្បាប់ & សិទ្ធិអនុញ្ញាត',
      labelEn: '6. Leave & Quota Controls',
      shortKh: 'ច្បាប់ & កូតាសម្រាក',
      shortEn: 'Leave & Quotas',
      icon: CalendarCheck,
      badge: `${leaveRequests.length}`,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      descKh: 'កូតាច្បាប់ប្រចាំឆ្នាំ, ច្បាប់ឈឺ, បន្ទាន់, ការកាត់ប្រាក់ & នីតិវិធី',
      descEn: 'Annual, sick and emergency quotas, allowance limits & rules',
    },
    {
      id: 'system' as SettingsTabId,
      num: '7',
      category: 'system' as SettingsCategory,
      labelKh: '៧. ប៉ារ៉ាម៉ែត្រប្រព័ន្ធ & ការប្រកាស',
      labelEn: '7. System Rules & Broadcast',
      shortKh: 'ច្បាប់វត្តមាន & ប្រកាស',
      shortEn: 'System Rules',
      icon: Zap,
      badge: undefined,
      badgeColor: undefined,
      descKh: 'ច្បាប់យឺតយ៉ាវ Grace Period, កាត់ប្រាក់, Marquee ប្រកាសដំណឹង',
      descEn: 'Late tolerance grace period, absent deductions & broadcast notice',
    },
    {
      id: 'audit' as SettingsTabId,
      num: '8',
      category: 'system' as SettingsCategory,
      labelKh: '៨. កំណត់ត្រាសវនកម្ម (Audit Trail)',
      labelEn: '8. Audit Trail & Logs',
      shortKh: 'កំណត់ត្រាសវនកម្ម',
      shortEn: 'Audit Trail',
      icon: History,
      badge: undefined,
      badgeColor: undefined,
      descKh: 'ប្រវត្តិកែប្រែទិន្នន័យ, សកម្មភាព Admin & កំណត់ត្រាប្រតិបត្តិការ',
      descEn: 'Administrative activity trail, login logs & data modification records',
    },
    {
      id: 'backup' as SettingsTabId,
      num: '9',
      category: 'system' as SettingsCategory,
      labelKh: '៩. បម្រុងទុក & ស្តារទិន្នន័យ (Backup & Sync)',
      labelEn: '9. Backup, Restore & Sync',
      shortKh: 'បម្រុងទុក & Sync',
      shortEn: 'Backup & Sync',
      icon: Database,
      badge: 'LIVE SYNC',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      descKh: 'ទាញយកទិន្នន័យ JSON, ស្តារទិន្នន័យ, Cloud Sync & Storage',
      descEn: 'Download JSON snapshots, cloud database sync & data recovery',
    },
  ], [branches.length, shiftsList.length, rolesForm.length, leaveRequests.length]);

  const displayedTabs = useMemo(() => {
    if (activeCategory === 'all') return tabDefinitions;
    return tabDefinitions.filter((t) => t.category === activeCategory);
  }, [activeCategory, tabDefinitions]);

  const activeTabMeta = useMemo(() => {
    return tabDefinitions.find((t) => t.id === activeTab) || tabDefinitions[0];
  }, [activeTab, tabDefinitions]);

  // Smooth scroll tabs horizontally
  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (!tabsScrollRef.current) return;
    const scrollAmount = direction === 'left' ? -320 : 320;
    tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Convert mouse wheel vertical scroll to horizontal scroll on the tabs strip
  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!tabsScrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      tabsScrollRef.current.scrollLeft += e.deltaY * 1.3;
    }
  };

  // Auto-center active tab
  useEffect(() => {
    if (activeTabBtnRef.current && tabsScrollRef.current) {
      activeTabBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeTab]);

  // Back to top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (catId: SettingsCategory) => {
    setActiveCategory(catId);
    if (catId !== 'all') {
      const match = tabDefinitions.find((t) => t.category === catId);
      if (match && !tabDefinitions.filter(t => t.category === catId).some(t => t.id === activeTab)) {
        setActiveTab(match.id);
      }
    }
  };

  // Sync selected branch to form when changed
  const handleSelectBranch = (b: Branch) => {
    setSelectedBranchId(b.id);
    setBranchForm(b);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 1. SAVE BRANCH LOCATION CHANGES
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBranch(branchForm);

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Updated Branch Geofence',
      actionKh: 'កែប្រែទីតាំង និង Geofence សាខា',
      module: 'branches',
      details: `Saved updates for ${branchForm.nameEn} (Radius: ${branchForm.radiusMeters}m, Lat: ${branchForm.lat}, Lng: ${branchForm.lng})`,
      detailsKh: `បានកែប្រែទិន្នន័យ ${branchForm.nameKh} (រង្វង់ Geofence: ${branchForm.radiusMeters}ម, Lat: ${branchForm.lat})`,
      status: 'success',
    });

    showToast(lang === 'km' ? 'ទីតាំងសាខា និង Geofence ត្រូវបានរក្សាទុកជោគជ័យ!' : 'Branch location & geofence saved successfully!');
  };

  // CREATE NEW BRANCH
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchForm.nameEn || !newBranchForm.nameKh) {
      alert(lang === 'km' ? 'សូមបំពេញឈ្មោះសាខាជាភាសាខ្មែរ និងអង់គ្លេស' : 'Please provide both English & Khmer branch names');
      return;
    }

    const created: Branch = {
      id: `br_${newBranchForm.type}_${Date.now()}`,
      nameKh: newBranchForm.nameKh || 'សាខាថ្មី',
      nameEn: newBranchForm.nameEn || 'New Branch',
      type: (newBranchForm.type as BranchType) || 'cafe',
      addressKh: newBranchForm.addressKh || 'រាជធានីភ្នំពេញ',
      addressEn: newBranchForm.addressEn || 'Phnom Penh City',
      lat: Number(newBranchForm.lat) || 11.5560,
      lng: Number(newBranchForm.lng) || 104.9280,
      radiusMeters: Number(newBranchForm.radiusMeters) || 80,
      openTime: newBranchForm.openTime || '07:00',
      closeTime: newBranchForm.closeTime || '21:00',
      managerName: newBranchForm.managerName || 'Manager',
      contactPhone: newBranchForm.contactPhone || '012 000 000',
      themeColor: newBranchForm.themeColor || 'from-indigo-600 to-blue-600',
      iconName: newBranchForm.iconName || 'Building2',
      activeStaffCount: 0,
    };

    if (onAddBranch) {
      onAddBranch(created);
    }
    setSelectedBranchId(created.id);
    setBranchForm(created);
    setShowAddBranchModal(false);

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Created New Branch',
      actionKh: 'បានបង្កើតសាខាថ្មី',
      module: 'branches',
      details: `Added new branch ${created.nameEn} with ${created.radiusMeters}m geofence radius.`,
      detailsKh: `បានបង្កើតសាខាថ្មី ${created.nameKh} រង្វង់ Geofence ${created.radiusMeters}ម។`,
      status: 'success',
    });

    showToast(lang === 'km' ? 'បានបន្ថែមសាខាថ្មីជោគជ័យ!' : 'New branch created successfully!');
  };

  // 2. SAVE BRANDING
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBranding = {
      ...brandForm,
      appIcon: brandForm.appIcon || brandForm.logoUrl,
    };
    onUpdateBranding(updatedBranding);
    updateDynamicAppBranding(updatedBranding, lang);

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Updated Corporate Branding & Identity',
      actionKh: 'កែប្រែស្លាកយីហោ ឡូហ្គោ & Title Bar',
      module: 'branding',
      details: `Updated brand name to ${updatedBranding.companyNameEn}, synced to Window Title Bar, Favicon and PWA Home Screen.`,
      detailsKh: `បានកែប្រែឈ្មោះក្រុមហ៊ុន ${updatedBranding.companyNameKh} និងបាន Sync ទៅ Title Bar, Favicon & Home Screen។`,
      status: 'success',
    });

    showToast(
      lang === 'km' 
        ? 'ស្លាកយីហោត្រូវបានរក្សាទុក និង Sync ទៅកាន់ Window Title Bar, Favicon & Home Screen PWA!' 
        : 'Company branding saved & synced to Window Title Bar, Favicon & PWA Home Screen!'
    );
  };

  const handleApplyLiveBranding = () => {
    const updatedBranding = {
      ...brandForm,
      appIcon: brandForm.appIcon || brandForm.logoUrl,
    };
    updateDynamicAppBranding(updatedBranding, lang);
    showToast(
      lang === 'km'
        ? 'បានបង្ហាញលើ Window Title Bar និង Favicon ផ្ទាល់ភ្លាមៗ!'
        : 'Live applied to Browser Title Bar & Favicon!'
    );
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === 'km' ? 'ទំហំរូបភាពមិនត្រូវលើសពី 2MB ឡើយ' : 'Logo size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultUrl = reader.result as string;
        setBrandForm((prev) => ({ 
          ...prev, 
          logoUrl: resultUrl,
          appIcon: resultUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. TOGGLE PERMISSION
  const handleTogglePermission = (key: keyof RolePermission['permissions']) => {
    setRolesForm((prev) =>
      prev.map((role) => {
        if (role.roleId === selectedRoleId) {
          return {
            ...role,
            permissions: {
              ...role.permissions,
              [key]: !role.permissions[key],
            },
          };
        }
        return role;
      })
    );
  };

  const handleSaveRolePermissions = () => {
    onUpdateRolePermissions(rolesForm);

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Updated Role Permissions Matrix',
      actionKh: 'កែប្រែកម្រិតសិទ្ធិ Role Permissions',
      module: 'roles',
      details: `Modified RBAC permissions matrix for ${activeRole.roleNameEn}.`,
      detailsKh: `បានកែប្រែកម្រិតសិទ្ធិប្រើប្រាស់សម្រាប់ ${activeRole.roleNameKh}។`,
      status: 'success',
    });

    showToast(lang === 'km' ? 'សិទ្ធិតួនាទី (RBAC Permissions) ត្រូវបានរក្សាទុក!' : 'Role permissions matrix saved successfully!');
  };

  // =========================================================================
  // 3.5 LEAVE PERMISSIONS & QUOTA RESET HANDLERS
  // =========================================================================
  const [selectedEmpForLeaveReset, setSelectedEmpForLeaveReset] = useState<string>(employees[0]?.id || '');
  const [customLeaveQuotaDays, setCustomLeaveQuotaDays] = useState<number>(18);
  const [leavePolicyNoticeDays, setLeavePolicyNoticeDays] = useState<number>(3);
  const [requireMedCertDays, setRequireMedCertDays] = useState<number>(2);
  const [allowEmergencyLeave, setAllowEmergencyLeave] = useState<boolean>(true);

  // Reset all employees' used leave balance to 0 (Full 18 Days Restored)
  const handleResetAllLeaveBalances = () => {
    if (!window.confirm(lang === 'km' 
      ? 'តើអ្នកពិតជាចង់ Reset សមតុល្យច្បាប់សម្រាក (Annual Leave Quotas) របស់បុគ្គលិកទាំងអស់មក 0 ថ្ងៃដែលបានប្រើ (សល់ 18 ថ្ងៃពេញ) មែនទេ?' 
      : 'Are you sure you want to reset used leave balances to 0 for all employees (restoring full 18 days annual leave)?')) {
      return;
    }

    if (onUpdateEmployeesList) {
      const updated = employees.map(emp => ({
        ...emp,
        annualLeaveUsed: 0,
        annualLeaveQuota: 18,
        sickLeaveUsed: 0,
        sickLeaveQuota: 7,
      }));
      onUpdateEmployeesList(updated);
    }

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Reset All Employee Leave Quotas',
      actionKh: 'បាន Reset សមតុល្យច្បាប់បុគ្គលិកទាំងអស់',
      module: 'leaves',
      details: `Reset annual leave used balance to 0 (full 18 days quota restored) for all ${employees.length} employees.`,
      detailsKh: `បាន Reset ច្បាប់សម្រាកប្រចាំឆ្នាំបុគ្គលិកទាំងអស់ទាំង ${employees.length} នាក់ មកសល់ ១៨ ថ្ងៃពេញ។`,
      status: 'warning',
    });

    showToast(lang === 'km' ? 'បាន Reset សមតុល្យច្បាប់បុគ្គលិកទាំងអស់មក ១៨ ថ្ងៃពេញដោយជោគជ័យ!' : 'All employees leave quotas have been reset to 18 full days!');
  };

  // Reset single employee leave balance
  const handleResetSingleEmpLeave = (empId: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;

    if (onUpdateEmployeesList) {
      const updated = employees.map(e => e.id === empId ? { ...e, annualLeaveUsed: 0, annualLeaveQuota: 18, sickLeaveUsed: 0, sickLeaveQuota: 7 } : e);
      onUpdateEmployeesList(updated);
    }

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Reset Employee Leave Balance',
      actionKh: `បាន Reset ច្បាប់បុគ្គលិក ${targetEmp.nameKh}`,
      module: 'leaves',
      details: `Restored full leave balances (18 annual days, 7 sick days) for ${targetEmp.nameEn} (${targetEmp.code}).`,
      detailsKh: `បាន Reset ច្បាប់សម្រាកមកសល់ ១៨ ថ្ងៃពេញ (ច្បាប់ប្រចាំឆ្នាំ) និង ៧ ថ្ងៃពេញ (ច្បាប់ឈឺ) សម្រាប់ ${targetEmp.nameKh} (${targetEmp.code})។`,
      status: 'success',
    });

    showToast(lang === 'km' ? `បាន Reset ច្បាប់សម្រាកសម្រាប់ ${targetEmp.nameKh} រួចរាល់!` : `Leave balance reset for ${targetEmp.nameEn}!`);
  };

  // Reset or clear leave requests
  const handleClearAllLeaveRequests = (filter: 'all' | 'pending') => {
    if (!onUpdateLeaveRequests) return;

    if (filter === 'all') {
      if (!window.confirm(lang === 'km' ? 'តើអ្នកចង់សម្អាត និង Reset រាល់ពាក្យស្នើសុំច្បាប់ទាំងអស់ក្នុងប្រព័ន្ធមែនទេ?' : 'Are you sure you want to clear all leave requests?')) return;
      onUpdateLeaveRequests([]);
      showToast(lang === 'km' ? 'បានសម្អាត និង Reset ពាក្យស្នើសុំច្បាប់ទាំងអស់ជោគជ័យ!' : 'All leave requests have been cleared!');
    } else {
      const remaining = leaveRequests.filter(r => r.status !== 'pending');
      onUpdateLeaveRequests(remaining);
      showToast(lang === 'km' ? 'បានសម្អាតរាល់ពាក្យស្នើសុំច្បាប់ដែលកំពុងរង់ចាំ (Pending) រួចរាល់!' : 'Pending leave requests have been cleared!');
    }

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Cleared Leave Requests Log',
      actionKh: 'បានសម្អាតកំណត់ត្រាស្នើសុំច្បាប់',
      module: 'leaves',
      details: `Admin performed reset on leave requests (${filter}).`,
      detailsKh: `Admin បាន Reset កំណត់ត្រាស្នើសុំច្បាប់ (${filter})។`,
      status: 'warning',
    });
  };

  // Reset Role Leave Permissions to Standard Labor Compliance
  const handleResetLeavePermissionsPolicy = () => {
    const updatedRoles = rolesForm.map(r => {
      if (r.roleId === 'admin') {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            canApproveRequests: true,
            canManageSystemSettings: true,
            canManageBranches: true,
          }
        };
      }
      if (r.roleId === 'manager') {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            canApproveRequests: true,
          }
        };
      }
      if (r.roleId === 'supervisor') {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            canApproveRequests: true,
          }
        };
      }
      return {
        ...r,
        permissions: {
          ...r.permissions,
          canApproveRequests: false,
        }
      };
    });

    setRolesForm(updatedRoles);
    onUpdateRolePermissions(updatedRoles);

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Reset Leave Permissions & Policy',
      actionKh: 'បាន Reset សិទ្ធិ និងគោលការណ៍អនុញ្ញាតច្បាប់',
      module: 'roles',
      details: 'Reset leave approval delegation to standard Cambodian Labor Law hierarchy.',
      detailsKh: 'បាន Reset សិទ្ធិអនុម័តច្បាប់សម្រាកតាមបទដ្ឋានស្តង់ដារច្បាប់ការងារ។',
      status: 'success',
    });

    showToast(lang === 'km' ? 'បាន Reset សិទ្ធិ និងគោលការណ៍អនុញ្ញាតច្បាប់មកស្តង់ដាររួចរាល់!' : 'Leave approval permissions have been reset to standard compliance!');
  };

  // 4. SAVE SYSTEM SETTINGS
  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSystemSettings(settingsForm);

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Updated System Parameters',
      actionKh: 'កែប្រែប៉ារ៉ាម៉ែត្រប្រព័ន្ធ & ការជូនដំណឹង',
      module: 'system',
      details: `Grace period: ${settingsForm.gracePeriodMins}m, Strict Geofence: ${settingsForm.strictGeofenceEnforcement}, Broadcast: ${settingsForm.broadcastActive ? 'Active' : 'Disabled'}`,
      detailsKh: `រយៈពេលអនុគ្រោះ: ${settingsForm.gracePeriodMins}នាទី, Geofence តឹងរ៉ឹង: ${settingsForm.strictGeofenceEnforcement}`,
      status: 'success',
    });

    showToast(lang === 'km' ? 'ប៉ារ៉ាម៉ែត្រប្រព័ន្ធ និងសារប្រកាសត្រូវបានរក្សាទុក!' : 'System parameters & broadcast alert updated!');
  };

  // Reset trusted hardware device binding for single employee
  const handleResetSingleEmployeeDevice = (targetEmp: Employee) => {
    const updated = unbindEmployeeDevice(targetEmp);
    if (onUpdateEmployee) {
      onUpdateEmployee(updated);
    }
    if (onUpdateEmployeesList) {
      onUpdateEmployeesList(employees.map(e => e.id === targetEmp.id ? updated : e));
    }
    onAddAuditLog({
      id: `sec_rst_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.name || adminProfile?.name || 'Super Admin',
      actorRole: currentUser?.role || 'admin',
      action: 'Reset Employee Device Binding',
      actionKh: 'ដោះសោឧបករណ៍បុគ្គលិក',
      module: 'security',
      details: `Reset trusted device binding for ${targetEmp.nameEn} (${targetEmp.code}). Staff can now register a new device on next scan.`,
      detailsKh: `បានដោះសោឧបករណ៍សម្រាប់ ${targetEmp.nameKh} (${targetEmp.code})។ បុគ្គលិកអាចចុះឈ្មោះឧបករណ៍ថ្មីពេលស្កេនលើកក្រោយ។`,
      status: 'warning',
    });
    setEmpToResetDevice(null);
    showToast(lang === 'km' ? `បានដោះសោឧបករណ៍សម្រាប់ ${targetEmp.nameKh} រួចរាល់!` : `Reset device binding for ${targetEmp.nameEn}!`);
  };

  // Reset trusted hardware device bindings for all employees
  const handleResetAllDevices = () => {
    const updatedList = employees.map(e => unbindEmployeeDevice(e));
    if (onUpdateEmployeesList) {
      onUpdateEmployeesList(updatedList);
    }
    onAddAuditLog({
      id: `sec_rst_all_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.name || adminProfile?.name || 'Super Admin',
      actorRole: currentUser?.role || 'admin',
      action: 'Reset All Employee Devices',
      actionKh: 'ដោះសោឧបករណ៍បុគ្គលិកទាំងអស់ក្នុងស្ថាប័ន',
      module: 'security',
      details: `Reset trusted device bindings for all ${employees.length} employees.`,
      detailsKh: `បានដោះសោឧបករណ៍សម្រាប់បុគ្គលិកទាំងអស់ចំនួន ${employees.length} នាក់។`,
      status: 'warning',
    });
    setShowResetAllDevicesModal(false);
    showToast(lang === 'km' ? 'បានដោះសោឧបករណ៍បុគ្គលិកទាំងអស់រួចរាល់!' : 'Reset all employee device bindings!');
  };

  // Shift Management Handlers
  const handleSaveEditShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    const updated = shiftsList.map(s => s.id === editingShift.id ? editingShift : s);
    setShiftsList(updated);
    if (onUpdateShifts) onUpdateShifts(updated);

    // Sync assigned employees with updated shift timing
    const updatedEmployees = employees.map(emp => {
      if (emp.shiftId === editingShift.id) {
        return {
          ...emp,
          shiftStartTime: editingShift.startTime,
          shiftEndTime: editingShift.endTime,
          scheduledDailyHours: editingShift.workHours,
          workingHoursText: `${editingShift.startTime} - ${editingShift.endTime} (${editingShift.workHours || 8}h)`,
        };
      }
      return emp;
    });
    if (onUpdateEmployeesList) {
      onUpdateEmployeesList(updatedEmployees);
    }

    onAddAuditLog({
      id: `shift_mod_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.name || adminProfile?.name || 'Super Admin',
      actorRole: currentUser?.role || 'admin',
      action: 'Updated Work Shift',
      actionKh: 'បានកែប្រែវេនការងារ',
      module: 'system',
      details: `Updated shift ${editingShift.nameEn} (${editingShift.startTime} - ${editingShift.endTime}).`,
      detailsKh: `បានកែប្រែវេនការងារ ${editingShift.nameKh} (${editingShift.startTime} - ${editingShift.endTime})។`,
      status: 'success',
    });

    setEditingShift(null);
    showToast(lang === 'km' ? 'បានរក្សាទុកការកែប្រែវេនការងារជោគជ័យ!' : 'Shift updated successfully!');
  };

  const handleCreateNewShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftForm.nameKh || !newShiftForm.startTime || !newShiftForm.endTime) return;
    const newId = `shift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const createdShift: Shift = {
      id: newId,
      nameKh: newShiftForm.nameKh || 'វេនការងារថ្មី',
      nameEn: newShiftForm.nameEn || 'New Shift',
      startTime: newShiftForm.startTime || '08:00',
      endTime: newShiftForm.endTime || '17:00',
      workHours: Number(newShiftForm.workHours) || 8,
      gracePeriodMins: 15,
      shiftCategory: newShiftForm.shiftCategory || 'cafe',
      branchTypes: newShiftForm.branchTypes || ['cafe'],
      description: newShiftForm.description || '',
    };
    const updated = [...shiftsList, createdShift];
    setShiftsList(updated);
    if (onUpdateShifts) onUpdateShifts(updated);

    onAddAuditLog({
      id: `shift_add_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.name || adminProfile?.name || 'Super Admin',
      actorRole: currentUser?.role || 'admin',
      action: 'Created New Work Shift',
      actionKh: 'បានបង្កើតវេនការងារថ្មី',
      module: 'system',
      details: `Created new shift ${createdShift.nameEn} (${createdShift.startTime} - ${createdShift.endTime}).`,
      detailsKh: `បានបង្កើតវេនការងារថ្មី ${createdShift.nameKh} (${createdShift.startTime} - ${createdShift.endTime})។`,
      status: 'success',
    });

    setShowAddShiftModal(false);
    setNewShiftForm({
      nameKh: '',
      nameEn: '',
      startTime: '08:00',
      endTime: '17:00',
      workHours: 8,
      shiftCategory: 'cafe',
      branchTypes: ['cafe'],
      description: '',
    });
    showToast(lang === 'km' ? 'បានបង្កើតវេនការងារថ្មីជោគជ័យ!' : 'New shift created successfully!');
  };

  const handleAssignEmployeeToShift = (empId: string, shift: Shift, dayOff?: number) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;
    const defaultDayOff = dayOff !== undefined ? dayOff : (targetEmp.weeklyDayOff !== undefined ? targetEmp.weeklyDayOff : 1);
    const updated: Employee = {
      ...targetEmp,
      shiftId: shift.id,
      shiftStartTime: shift.startTime,
      shiftEndTime: shift.endTime,
      scheduledDailyHours: shift.workHours || 8,
      workingHoursText: `${shift.startTime} - ${shift.endTime} (${shift.workHours || 8}h)`,
      weeklyDayOff: defaultDayOff,
    };
    if (onUpdateEmployee) {
      onUpdateEmployee(updated);
    }
    if (onUpdateEmployeesList) {
      onUpdateEmployeesList(employees.map(e => e.id === empId ? updated : e));
    }
    showToast(lang === 'km' ? `បានចាត់តាំង ${targetEmp.nameKh} ទៅ ${shift.nameKh}` : `Assigned ${targetEmp.nameEn} to ${shift.nameEn}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Control Center Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sliders className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                {lang === 'km' ? 'មជ្ឈមណ្ឌលគ្រប់គ្រងប្រព័ន្ធ (Admin Control Center)' : 'Admin System Settings & Management'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {lang === 'km'
                  ? 'កំណត់ទីតាំង និងរង្វង់ Geofence ៧ សាខា, ស្លាកយីហោក្រុមហ៊ុន, សិទ្ធិតួនាទី (RBAC) និងប៉ារ៉ាម៉ែត្រប្រព័ន្ធ'
                  : 'Configure 7 branch geofences, company branding, role-based access control (RBAC), and security policies'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'Super Admin សិទ្ធិពេញលេញ' : 'Super Admin Mode Active'}</span>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-200 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENHANCED STICKY ADMIN NAVIGATION & MANAGEMENT MENU BAR */}
      {/* ========================================================================= */}
      <div className="sticky top-16 sm:top-[72px] z-30 bg-slate-50/95 backdrop-blur-md pt-3 pb-3 border-y border-slate-200/90 shadow-xs -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 space-y-3">
        {/* Top Control Strip: Category Filter Chips + View Mode Toggle + Mobile Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Category Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar max-w-full">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline shrink-0 mr-1">
              {lang === 'km' ? 'ផ្នែក:' : 'Group:'}
            </span>
            {categoryOptions.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <CatIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{lang === 'km' ? cat.labelKh : cat.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Tools: Grid Toggle & Mobile Quick Dropdown */}
          <div className="flex items-center space-x-2 shrink-0 ml-auto">
            {/* Mobile / Tablet Quick Select Dropdown */}
            <div className="sm:hidden relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as SettingsTabId)}
                aria-label={lang === 'km' ? 'ជ្រើសរើសផ្នែកកំណត់' : 'Jump to section'}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 pr-7 appearance-none cursor-pointer"
              >
                {tabDefinitions.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.num}. {lang === 'km' ? tab.shortKh : tab.shortEn}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            {/* Slider vs Grid Overview Toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'slider'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={lang === 'km' ? 'របៀបរមូរ (Scroll Slider)' : 'Horizontal Slider'}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'km' ? 'រមូរ' : 'Scroll'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={lang === 'km' ? 'បង្ហាញទាំងអស់ (Overview Grid)' : 'Overview Grid (All in View)'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'km' ? 'មើលទាំងអស់' : 'Grid'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: Slider Mode with Left/Right Arrows & Wheel Support */}
        {viewMode === 'slider' ? (
          <div className="relative flex items-center gap-1.5">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => handleScrollTabs('left')}
              className="hidden sm:flex p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs transition shrink-0 cursor-pointer items-center justify-center"
              title={lang === 'km' ? 'រមូរទៅឆ្វេង' : 'Scroll left'}
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Horizontal Scrollable Tabs Strip */}
            <div
              ref={tabsScrollRef}
              onWheel={handleTabsWheel}
              className="flex-1 flex items-center space-x-2 overflow-x-auto pb-1 scroll-smooth custom-scrollbar select-none"
            >
              {displayedTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={isActive ? activeTabBtnRef : null}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                    <span>{lang === 'km' ? tab.labelKh : tab.labelEn}</span>
                    {tab.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-indigo-700 text-white'
                            : tab.badgeColor || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => handleScrollTabs('right')}
              className="hidden sm:flex p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs transition shrink-0 cursor-pointer items-center justify-center"
              title={lang === 'km' ? 'រមូរទៅស្តាំ' : 'Scroll right'}
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          /* View Mode 2: Grid Overview (All 9 tabs visible at a glance without scrolling!) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {tabDefinitions.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start space-x-3 ${
                    isActive
                      ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`font-black text-xs sm:text-sm truncate ${
                          isActive ? 'text-indigo-950 font-black' : 'text-slate-800'
                        }`}
                      >
                        {lang === 'km' ? tab.labelKh : tab.labelEn}
                      </h4>
                      {tab.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : tab.badgeColor || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {lang === 'km' ? tab.descKh : tab.descEn}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Current Active Tab Context Bar */}
        <div className="flex items-center justify-between text-xs px-2 pt-0.5 text-slate-500">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-semibold text-slate-400">{lang === 'km' ? 'កំពុងជ្រើសរើស:' : 'Active Menu:'}</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 truncate">
              {lang === 'km' ? activeTabMeta.labelKh : activeTabMeta.labelEn}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {tabDefinitions.findIndex((t) => t.id === activeTab) + 1} / {tabDefinitions.length}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BRANCH LOCATIONS & GEOFENCES */}
      {/* ========================================================================= */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Branch Directory & Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'km' ? 'បញ្ជីសាខាទាំង ៧' : 'All 7 Branch Profiles'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'បន្ថែមសាខា' : 'Add Branch'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {branches.map((b) => {
                  const isSelected = b.id === selectedBranchId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBranch(b)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2.5 rounded-xl text-white bg-gradient-to-br ${b.themeColor || 'from-indigo-600 to-blue-600'} shadow-sm shrink-0`}>
                          {b.type === 'club' ? <Sparkles className="w-4 h-4" /> :
                           b.type === 'warehouse' ? <Warehouse className="w-4 h-4" /> :
                           b.type === 'cafe' ? <Coffee className="w-4 h-4" /> :
                           <Building2 className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-800 truncate">
                            {lang === 'km' ? b.nameKh : b.nameEn}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate font-mono">
                            Lat: {b.lat.toFixed(4)}, Lng: {b.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {b.radiusMeters}m
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Branch Geofence & Details Form */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSaveBranch} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-2xl text-white bg-gradient-to-br ${branchForm.themeColor} shadow-md`}>
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      {lang === 'km' ? branchForm.nameKh : branchForm.nameEn}
                    </h2>
                    <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                      {branchForm.type.toUpperCase()} LOCATION • GEOFENCE {branchForm.radiusMeters}M
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{lang === 'km' ? 'រក្សាទុកទីតាំង' : 'Save Branch'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Map & Geofence Picker */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'km' ? 'ផែនទីកំណត់ទីតាំង & Auto-Fetch កូអរដោនេ (Interactive Map)' : 'Interactive Location Map & Auto-Fetch'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {lang === 'km'
                        ? 'ចុចលើផែនទី អូស Pin ឬស្វែងរកទីតាំង ដើម្បីទាញយក Latitude/Longitude ដោយស្វ័យប្រវត្តិ'
                        : 'Click on map, drag marker, search places, or click Auto-Fetch GPS to auto-populate coordinates'}
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-800 font-bold self-start sm:self-auto">
                    Live Geofence: {branchForm.radiusMeters}m
                  </span>
                </div>

                <InteractiveMapPicker
                  lat={branchForm.lat}
                  lng={branchForm.lng}
                  radiusMeters={branchForm.radiusMeters}
                  branchName={lang === 'km' ? branchForm.nameKh : branchForm.nameEn}
                  branchType={branchForm.type}
                  lang={lang}
                  heightClass="h-[280px] sm:h-[340px]"
                  onChange={(newLat, newLng, addr) => {
                    setBranchForm((prev) => ({
                      ...prev,
                      lat: newLat,
                      lng: newLng,
                      addressKh: prev.addressKh ? prev.addressKh : (addr?.nameKh || prev.addressKh),
                      addressEn: prev.addressEn ? prev.addressEn : (addr?.nameEn || prev.addressEn),
                    }));
                  }}
                />
              </div>

              {/* Core Branch Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះសាខាជាភាសាខ្មែរ (Khmer Name):' : 'Khmer Branch Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.nameKh}
                    onChange={(e) => setBranchForm({ ...branchForm, nameKh: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះសាខាជាភាសាអង់គ្លេស (English Name):' : 'English Branch Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.nameEn}
                    onChange={(e) => setBranchForm({ ...branchForm, nameEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* GPS Latitude & Longitude (Auto-Fetched from Map or Manually Editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {lang === 'km' ? 'រយៈទទឹង (Latitude - Auto Fetched):' : 'Latitude (Auto-Fetched):'}
                    </label>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      GPS WGS84
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={branchForm.lat}
                    onChange={(e) => setBranchForm({ ...branchForm, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-indigo-50/40 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-indigo-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {lang === 'km' ? 'រយៈបណ្តោយ (Longitude - Auto Fetched):' : 'Longitude (Auto-Fetched):'}
                    </label>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      GPS WGS84
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={branchForm.lng}
                    onChange={(e) => setBranchForm({ ...branchForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-indigo-50/40 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-indigo-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              {/* Geofence Radius Slider with Live Visual Simulation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'km' ? 'កាំរង្វង់ Geofence អនុញ្ញាត (Allowed Geofence Radius):' : 'Geofence Security Radius:'}</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'បុគ្គលិកអាចចុះវត្តមានបានតែក្នុងរង្វង់ចម្ងាយនេះប៉ុណ្ណោះ' : 'Staff are validated only when their device is within this radius'}
                    </p>
                  </div>
                  <span className="text-lg font-black text-indigo-700 font-mono px-3 py-1 bg-white rounded-xl border border-indigo-200">
                    {branchForm.radiusMeters} m
                  </span>
                </div>

                <input
                  type="range"
                  min={20}
                  max={300}
                  step={5}
                  value={branchForm.radiusMeters}
                  onChange={(e) => setBranchForm({ ...branchForm, radiusMeters: parseInt(e.target.value) || 80 })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>20m (Strict Cafe Door)</span>
                  <span>80m (Standard Club / Store)</span>
                  <span>300m (Large Logistics Zone)</span>
                </div>
              </div>

              {/* Address & Operational Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'អាសយដ្ឋានជាភាសាខ្មែរ:' : 'Khmer Address Description:'}
                  </label>
                  <textarea
                    rows={2}
                    value={branchForm.addressKh}
                    onChange={(e) => setBranchForm({ ...branchForm, addressKh: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'អាសយដ្ឋានជាភាសាអង់គ្លេស:' : 'English Address Description:'}
                  </label>
                  <textarea
                    rows={2}
                    value={branchForm.addressEn}
                    onChange={(e) => setBranchForm({ ...branchForm, addressEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ម៉ោងបើក & បិទ (Operating Shifts):' : 'Operating Hours:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={branchForm.openTime}
                      onChange={(e) => setBranchForm({ ...branchForm, openTime: e.target.value })}
                      placeholder="Open e.g. 07:00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                    />
                    <input
                      type="text"
                      value={branchForm.closeTime}
                      onChange={(e) => setBranchForm({ ...branchForm, closeTime: e.target.value })}
                      placeholder="Close e.g. 23:00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'អ្នកគ្រប់គ្រង & ទូរស័ព្ទ:' : 'Branch Manager & Contact:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={branchForm.managerName}
                      onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                      placeholder="Manager Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                    <input
                      type="text"
                      value={branchForm.contactPhone}
                      onChange={(e) => setBranchForm({ ...branchForm, contactPhone: e.target.value })}
                      placeholder="Phone e.g. 012 345 678"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WORKING SHIFTS, HOURS & DAY OFF (BARISTA, GAS STATION, OFFICE) */}
      {/* ========================================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Header & Quick Action */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    {lang === 'km' ? 'វេនការងារ ម៉ោងបំពេញ & ថ្ងៃឈប់សម្រាក (Working Shifts & Hours)' : 'Working Shifts, Scheduled Hours & Weekly Day-Off'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'km'
                      ? 'កំណត់វេនព្រឹក វេនរសៀល និងវេនពេញម៉ោង សម្រាប់បុគ្គលិកកាហ្វេ (Barista), ស្ថានីយប្រេង (Gas Station) និងការិយាល័យ'
                      : 'Configure Morning, Afternoon, and Full-Time shifts for Baristas, Gas Station staff, and Office employees'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddShiftModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'km' ? 'បង្កើតវេនការងារថ្មី' : 'Create New Shift'}</span>
              </button>
            </div>

            {/* Shift Distribution Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'km' ? '☕ ហាងកាហ្វេ & បារីស្តា (Cafe)' : '☕ Cafe & Barista'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {shiftsList.filter(s => s.shiftCategory === 'cafe').length} {lang === 'km' ? 'វេន' : 'shifts'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• វេនព្រឹក:' : '• Morning:'}</span>
                    <span className="font-mono font-semibold">06:30 - 14:30 (8h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• វេនរសៀល:' : '• Afternoon:'}</span>
                    <span className="font-mono font-semibold">13:30 - 21:30 (8h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• ពេញម៉ោង:' : '• Full-Time:'}</span>
                    <span className="font-mono font-semibold">07:00 - 16:30 (8.5h)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'km' ? '⛽ ស្ថានីយប្រេងឥន្ធនៈ (Gas)' : '⛽ Gas Station Staff'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {shiftsList.filter(s => s.shiftCategory === 'gas_station').length} {lang === 'km' ? 'វេន' : 'shifts'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• វេនព្រឹក:' : '• Morning:'}</span>
                    <span className="font-mono font-semibold">06:00 - 14:00 (8h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• វេនរសៀល:' : '• Afternoon:'}</span>
                    <span className="font-mono font-semibold">14:00 - 22:00 (8h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• ពេញម៉ោង:' : '• Full-Time:'}</span>
                    <span className="font-mono font-semibold">07:00 - 16:30 (8.5h)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'km' ? '🏢 ការិយាល័យ & ឃ្លាំង' : '🏢 Office & Warehouse'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {shiftsList.filter(s => s.shiftCategory !== 'cafe' && s.shiftCategory !== 'gas_station').length} {lang === 'km' ? 'វេន' : 'shifts'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• ម៉ោងរដ្ឋបាល:' : '• Standard Hours:'}</span>
                    <span className="font-mono font-semibold">08:00 - 17:30 (8.5h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• សម្រាកបាយថ្ងៃ:' : '• Lunch Break:'}</span>
                    <span className="font-mono font-semibold">12:00 - 13:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'km' ? '• ថ្ងៃឈប់សម្រាក:' : '• Day Off:'}</span>
                    <span className="font-semibold text-indigo-700">{lang === 'km' ? 'ថ្ងៃអាទិត្យ (Sunday)' : 'Sunday'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Policy Guide */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800">
                  {lang === 'km' 
                    ? '💡 គោលការណ៍ថ្ងៃឈប់សម្រាក (Weekly Day Off Policy) សម្រាប់បុគ្គលិកបារីស្តា និងស្ថានីយប្រេង:' 
                    : '💡 Weekly Day Off Policy for Baristas and Gas Station Staff:'}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {lang === 'km'
                    ? 'ដោយសារហាងកាហ្វេ និងស្ថានីយប្រេងឥន្ធនៈដំណើរការ ៧ថ្ងៃក្នុងមួយសប្តាហ៍ បុគ្គលិកផ្នែកនេះអាចកំណត់ថ្ងៃឈប់សម្រាកប្រចាំសប្តាហ៍នៅថ្ងៃធ្វើការ (ច័ន្ទ, អង្គារ, ពុធ, ព្រហស្បតិ៍, សុក្រ, សៅរ៍) ឬវេនវិលជុំ (Rotating) ដើម្បីធានាបាននូវការបម្រើសេវាកម្មរលូនគ្រប់ពេលវេលា។'
                    : 'Because cafe and gas station branches operate 7 days a week, staff can be assigned weekday day-offs (Monday through Saturday) or rotating schedules, while working on Sunday shifts.'}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setShiftFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                shiftFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {lang === 'km' ? 'ទាំងអស់' : 'All Shifts'} ({shiftsList.length})
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('cafe')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                shiftFilter === 'cafe'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? '☕ ហាងកាហ្វេ & បារីស្តា' : '☕ Barista / Cafe'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {shiftsList.filter(s => s.shiftCategory === 'cafe').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('gas_station')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                shiftFilter === 'gas_station'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? '⛽ ស្ថានីយប្រេងឥន្ធនៈ' : '⛽ Gas Station'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {shiftsList.filter(s => s.shiftCategory === 'gas_station').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('office')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                shiftFilter === 'office'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? '🏢 ការិយាល័យ & ឃ្លាំង' : '🏢 Office & Warehouse'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                {shiftsList.filter(s => s.shiftCategory !== 'cafe' && s.shiftCategory !== 'gas_station').length}
              </span>
            </button>
          </div>

          {/* Shifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shiftsList
              .filter(s => {
                if (shiftFilter === 'cafe') return s.shiftCategory === 'cafe';
                if (shiftFilter === 'gas_station') return s.shiftCategory === 'gas_station';
                if (shiftFilter === 'office') return s.shiftCategory !== 'cafe' && s.shiftCategory !== 'gas_station';
                return true;
              })
              .map(shift => {
                const assignedStaff = employees.filter(e => e.shiftId === shift.id);
                const isCafe = shift.shiftCategory === 'cafe';
                const isGas = shift.shiftCategory === 'gas_station';

                return (
                  <div
                    key={shift.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Shift Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2.5 rounded-2xl ${
                            isCafe 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : isGas 
                              ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {isCafe ? <Coffee className="w-5 h-5" /> : isGas ? <Fuel className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                              {lang === 'km' ? shift.nameKh : shift.nameEn}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {lang === 'km' ? shift.nameEn : shift.nameKh}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCafe
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isGas
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {isCafe ? '☕ Cafe / Barista' : isGas ? '⛽ Gas Station' : '🏢 Office'}
                        </span>
                      </div>

                      {/* Working Time Badge */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            {lang === 'km' ? 'ម៉ោងបំពេញការងារ' : 'Working Shift Time'}
                          </span>
                          <span className="font-mono text-base font-black text-slate-800">
                            {shift.startTime} <span className="text-slate-400 font-sans">➔</span> {shift.endTime}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            {lang === 'km' ? 'ម៉ោងសរុប' : 'Duration'}
                          </span>
                          <span className="font-bold text-xs px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {shift.workHours || 8} {lang === 'km' ? 'ម៉ោង' : 'Hours'}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {shift.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {shift.description}
                        </p>
                      )}

                      {/* Assigned Employees */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <span>{lang === 'km' ? 'បុគ្គលិកប្រចាំវេន:' : 'Assigned Staff:'}</span>
                            <span className="font-bold text-slate-800">({assignedStaff.length})</span>
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold">
                            {lang === 'km' ? 'ថ្ងៃឈប់សម្រាក' : 'Weekly Day Off'}
                          </span>
                        </div>

                        {assignedStaff.length > 0 ? (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {assignedStaff.map(emp => (
                              <div
                                key={emp.id}
                                className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <img
                                    src={emp.avatar || LOGO_PRESETS[0]}
                                    alt=""
                                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                                  />
                                  <span className="font-semibold text-slate-700 truncate text-[11px]">
                                    {emp.nameKh || emp.nameEn}
                                  </span>
                                  <span className="font-mono text-[9px] text-slate-400 shrink-0">
                                    ({emp.code})
                                  </span>
                                </div>
                                <span className="font-bold text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
                                  {getEmployeeDayOffName(emp, lang)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center rounded-xl bg-slate-50 text-[11px] text-slate-400 italic">
                            {lang === 'km' ? 'មិនទាន់មានបុគ្គលិកចាត់តាំងនៅឡើយ' : 'No staff currently assigned'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingShift(shift)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{lang === 'km' ? 'កែប្រែម៉ោង' : 'Edit Shift'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignShiftModal(shift)}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'km' ? 'ចាត់តាំងបុគ្គលិក' : 'Assign Staff'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Edit Shift Timing Modal */}
          {editingShift && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-base">
                      {lang === 'km' ? 'កែប្រែព័ត៌មានវេនការងារ' : 'Edit Shift & Timing'}
                    </h3>
                  </div>
                  <button onClick={() => setEditingShift(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditShift} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ឈ្មោះវេន (Khmer):' : 'Shift Name (Khmer):'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editingShift.nameKh}
                      onChange={(e) => setEditingShift({ ...editingShift, nameKh: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ឈ្មោះវេន (English):' : 'Shift Name (English):'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editingShift.nameEn}
                      onChange={(e) => setEditingShift({ ...editingShift, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ម៉ោងចូល:' : 'Start Time:'}
                      </label>
                      <input
                        type="time"
                        required
                        value={editingShift.startTime}
                        onChange={(e) => setEditingShift({ ...editingShift, startTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ម៉ោងចេញ:' : 'End Time:'}
                      </label>
                      <input
                        type="time"
                        required
                        value={editingShift.endTime}
                        onChange={(e) => setEditingShift({ ...editingShift, endTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ម៉ោងសរុប:' : 'Daily Hours:'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="16"
                        required
                        value={editingShift.workHours || 8}
                        onChange={(e) => setEditingShift({ ...editingShift, workHours: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ការពិពណ៌នាអំពីការងារ (Description):' : 'Role Description:'}
                    </label>
                    <textarea
                      rows={2}
                      value={editingShift.description || ''}
                      onChange={(e) => setEditingShift({ ...editingShift, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex space-x-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingShift(null)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                    >
                      {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 transition"
                    >
                      {lang === 'km' ? 'រក្សាទុកការកែប្រែ' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add New Custom Shift Modal */}
          {showAddShiftModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-base">
                      {lang === 'km' ? 'បង្កើតវេនការងារថ្មី' : 'Create New Shift'}
                    </h3>
                  </div>
                  <button onClick={() => setShowAddShiftModal(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateNewShift} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ប្រភេទវេន (Category):' : 'Shift Category:'}
                    </label>
                    <select
                      value={newShiftForm.shiftCategory}
                      onChange={(e) => setNewShiftForm({ ...newShiftForm, shiftCategory: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="cafe">☕ ហាងកាហ្វេ & បារីស្តា (Cafe / Barista)</option>
                      <option value="gas_station">⛽ ស្ថានីយប្រេងឥន្ធនៈ (Gas Station)</option>
                      <option value="standard">🏢 ការិយាល័យ & ឃ្លាំង (Office / Warehouse)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ឈ្មោះវេន (Khmer):' : 'Shift Name (Khmer):'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ឧ. វេនយប់ / វេនចុងសប្តាហ៍"
                      value={newShiftForm.nameKh}
                      onChange={(e) => setNewShiftForm({ ...newShiftForm, nameKh: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ឈ្មោះវេន (English):' : 'Shift Name (English):'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Night Shift / Weekend Shift"
                      value={newShiftForm.nameEn}
                      onChange={(e) => setNewShiftForm({ ...newShiftForm, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ម៉ោងចូល:' : 'Start Time:'}
                      </label>
                      <input
                        type="time"
                        required
                        value={newShiftForm.startTime}
                        onChange={(e) => setNewShiftForm({ ...newShiftForm, startTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ម៉ោងចេញ:' : 'End Time:'}
                      </label>
                      <input
                        type="time"
                        required
                        value={newShiftForm.endTime}
                        onChange={(e) => setNewShiftForm({ ...newShiftForm, endTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-semibold">
                        {lang === 'km' ? 'ម៉ោងសរុប:' : 'Daily Hours:'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="16"
                        required
                        value={newShiftForm.workHours}
                        onChange={(e) => setNewShiftForm({ ...newShiftForm, workHours: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">
                      {lang === 'km' ? 'ការពិពណ៌នាអំពីភារកិច្ច:' : 'Role Description:'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Fuel dispensing, store checkout, customer assistance"
                      value={newShiftForm.description}
                      onChange={(e) => setNewShiftForm({ ...newShiftForm, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex space-x-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddShiftModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                    >
                      {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 transition"
                    >
                      {lang === 'km' ? 'បង្កើតវេនការងារ' : 'Create Shift'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Quick Staff Assignment Modal */}
          {assignShiftModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">
                        {lang === 'km' ? `ចាត់តាំងបុគ្គលិកទៅ ${assignShiftModal.nameKh}` : `Assign Staff to ${assignShiftModal.nameEn}`}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {assignShiftModal.startTime} - {assignShiftModal.endTime} ({assignShiftModal.workHours || 8}h)
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setAssignShiftModal(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'km'
                      ? 'ជ្រើសរើសបុគ្គលិកដើម្បីប្តូរវេនការងារ និងម៉ោងបំពេញដោយស្វ័យប្រវត្តិ:'
                      : 'Select employee to immediately update their working shift, timing, and daily hours:'}
                  </p>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {employees.map(emp => {
                      const isAlreadyAssigned = emp.shiftId === assignShiftModal.id;

                      return (
                        <div
                          key={emp.id}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                            isAlreadyAssigned
                              ? 'bg-indigo-50/70 border-indigo-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <img
                              src={emp.avatar || LOGO_PRESETS[0]}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200"
                            />
                            <div className="truncate">
                              <h4 className="font-bold text-slate-800 text-xs truncate">
                                {emp.nameKh || emp.nameEn}
                              </h4>
                              <p className="text-[10px] text-slate-500">
                                {emp.code} • {emp.departmentKh || emp.role}
                              </p>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {lang === 'km' ? 'វេនបច្ចុប្បន្ន:' : 'Current Shift:'} {emp.workingHoursText || 'Default'}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isAlreadyAssigned ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-indigo-600 text-white flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>{lang === 'km' ? 'ក្នុងវេននេះ' : 'Assigned'}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAssignEmployeeToShift(emp.id, assignShiftModal)}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                              >
                                {lang === 'km' ? 'ចាត់តាំង' : 'Assign'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAssignShiftModal(null)}
                    className="py-2.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    {lang === 'km' ? 'បិទ' : 'Done'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BRANDING & LOGO CUSTOMIZATION */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Branding Controls */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Palette className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 font-battambang">
                      {lang === 'km' ? 'ស្លាកយីហោ & ព័ត៌មានក្រុមហ៊ុន (Corporate Identity)' : 'Brand Customizer & Corporate Identity'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'km' ? 'កែប្រែឈ្មោះក្រុមហ៊ុន ឡូហ្គោ Window Title Bar, Favicon, និង Home Screen PWA' : 'Customize company name, logo, window title bar, favicon, and PWA install icon'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleApplyLiveBranding}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer font-battambang"
                    title={lang === 'km' ? 'បង្ហាញលើ Title Bar & Favicon ភ្លាមៗ' : 'Apply live to Title Bar & Favicon'}
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'km' ? 'សាកល្បង Live' : 'Apply Live'}</span>
                  </button>

                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer font-battambang"
                  >
                    <Save className="w-4 h-4" />
                    <span>{lang === 'km' ? 'រក្សាទុកស្លាកយីហោ' : 'Save Branding'}</span>
                  </button>
                </div>
              </div>

              {/* Company Names & Slogan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះក្រុមហ៊ុនជាភាសាខ្មែរ (Company Name Khmer):' : 'Company Name (Khmer):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={brandForm.companyNameKh}
                    onChange={(e) => setBrandForm({ ...brandForm, companyNameKh: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {lang === 'km' ? 'បង្ហាញលើ Header, Windows Title Bar និង Home Screen' : 'Shown on Header, Windows Title Bar & Home Screen'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះក្រុមហ៊ុនជាភាសាអង់គ្លេស (Company Name English):' : 'Company Name (English):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={brandForm.companyNameEn}
                    onChange={(e) => setBrandForm({ ...brandForm, companyNameEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {lang === 'km' ? 'បង្ហាញលើ Header EN, Reports និង PWA metadata' : 'Shown on EN Header, Reports & PWA metadata'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ពាក្យស្លោកជាភាសាខ្មែរ (Slogan Khmer):' : 'Slogan / Tagline (Khmer):'}
                  </label>
                  <input
                    type="text"
                    value={brandForm.sloganKh}
                    onChange={(e) => setBrandForm({ ...brandForm, sloganKh: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ពាក្យស្លោកជាភាសាអង់គ្លេស (Slogan English):' : 'Slogan / Tagline (English):'}
                  </label>
                  <input
                    type="text"
                    value={brandForm.sloganEn}
                    onChange={(e) => setBrandForm({ ...brandForm, sloganEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Logo & App Icon Selection & Upload */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 font-battambang">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'km' ? 'ឡូហ្គោ & App Icon (Logo, Favicon & Home Screen)' : 'Corporate Logo, Favicon & App Icon'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'រូបភាពនេះនឹង Sync ទៅកាន់ Window Title Bar, Browser Tab Favicon និង Home Screen App Icon លើទូរស័ព្ទ' : 'This logo will sync to Window Title Bar, Browser Favicon, and Mobile Home Screen'}
                    </p>
                  </div>

                  <label className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'បញ្ចូល Logo ផ្ទាល់ខ្លួន' : 'Upload File'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center space-x-3 pt-1 overflow-x-auto pb-1">
                  {LOGO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBrandForm({ ...brandForm, logoUrl: preset, appIcon: preset });
                      }}
                      className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                        brandForm.logoUrl === preset
                          ? 'border-indigo-600 ring-2 ring-indigo-400 scale-105 shadow-md'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <img src={preset} alt="Preset Logo" className="w-full h-full object-cover" />
                      {brandForm.logoUrl === preset && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Colors & Dynamic Watermark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {lang === 'km' ? 'ក្ដារពណ៌ Theme សំខាន់ (Primary Color Palette):' : 'Primary Theme Accent:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {THEME_COLOR_PRESETS.map((col, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBrandForm({ ...brandForm, primaryColor: col.primary, accentColor: col.accent })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition cursor-pointer ${
                          brandForm.primaryColor === col.primary
                            ? 'border-slate-800 ring-2 ring-slate-400 bg-white'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.primary }} />
                        <span>{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {lang === 'km' ? 'Watermark លើផ្ទាំង QR Kiosk:' : 'Dynamic QR Code Watermark:'}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={brandForm.qrWatermarkText}
                      onChange={(e) => setBrandForm({ ...brandForm, qrWatermarkText: e.target.value })}
                      placeholder="VERIFIED GEO-ATTENDANCE • PPHG"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{lang === 'km' ? 'រយៈពេលផ្លាស់ប្តូរ QR Token:' : 'QR Token Refresh:'}</span>
                      <select
                        value={brandForm.qrRefreshIntervalSecs}
                        onChange={(e) => setBrandForm({ ...brandForm, qrRefreshIntervalSecs: Number(e.target.value) })}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-700"
                      >
                        <option value={15}>15 {lang === 'km' ? 'វិនាទី' : 'Secs (High Security)'}</option>
                        <option value={30}>30 {lang === 'km' ? 'វិនាទី' : 'Secs (Standard)'}</option>
                        <option value={60}>60 {lang === 'km' ? 'វិនាទី' : 'Secs (Eco)'}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Page Layout & Theme Style Selection */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 font-battambang">
                      <LayoutGrid className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'km' ? 'ម៉ូតផ្ទាំងចូលគណនី (Login Gateway Style Layout)' : 'Login Screen Layout & Style Options'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'ជ្រើសរើសម៉ូតផ្ទាំង Login ដែលត្រូវបង្ហាញជូនអ្នកប្រើប្រាស់ និងបុគ្គលិក' : 'Choose the design layout presented to staff and administrators'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {brandForm.loginStyle === 'option_b' ? 'Option B Active' : brandForm.loginStyle === 'option_a' ? 'Option A Active' : 'Option C Active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Option B: Split Screen Showcase (Recommended) */}
                  <button
                    type="button"
                    onClick={() => setBrandForm({ ...brandForm, loginStyle: 'option_b' })}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      (brandForm.loginStyle || 'option_b') === 'option_b'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-400 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-indigo-900 font-battambang">Option B (Split Showcase)</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Recommended</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {lang === 'km' ? 'ផ្ទាំងធំ Split-Screen បង្ហាញ Logo ធំ ម៉ោង Live Clock ៧ សាខា និង Form ស ទំនើប' : 'Dual-panel hero showcase with logo, real-time clock, 7 branches status & modern white sign-in card.'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ម៉ូតពេញនិយម' : 'Split-Screen Showcase'}</span>
                    </div>
                  </button>

                  {/* Option A: Midnight Executive Luxury Modal */}
                  <button
                    type="button"
                    onClick={() => setBrandForm({ ...brandForm, loginStyle: 'option_a' })}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      brandForm.loginStyle === 'option_a'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-400 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900 font-battambang">Option A (Dark Luxury)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {lang === 'km' ? 'ផ្ទាំងកណ្តាល Midnight Slate ជាមួយពន្លឺ Ambient Glow និងផ្លាកសុវត្ថិភាពខ្ពស់' : 'Centered dark luxury modal with midnight slate glass and glowing security accents.'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{lang === 'km' ? 'Dark Executive' : 'Midnight Executive'}</span>
                    </div>
                  </button>

                  {/* Option C: Clean Minimalist Light Corporate */}
                  <button
                    type="button"
                    onClick={() => setBrandForm({ ...brandForm, loginStyle: 'option_c' })}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      brandForm.loginStyle === 'option_c'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-400 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900 font-battambang">Option C (Clean Light)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {lang === 'km' ? 'ផ្ទាំងសស្អាត Minimalist ទំហំល្មម ស័ក្តិសមជាមួយបរិយាកាសការិយាល័យធម្មតា' : 'Minimalist clean white card with corporate blue typography and compact inputs.'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{lang === 'km' ? 'Light Corporate' : 'Clean Light Minimal'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Live Simulation Previews Card */}
            <div className="lg:col-span-5 space-y-4">
              {/* Windows Title Bar & Browser Tab Simulation */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-battambang">
                    {lang === 'km' ? '🪟 Windows Title Bar & Favicon Preview' : 'Windows Title Bar & Favicon Preview'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Live Synced
                  </span>
                </div>

                {/* Simulated Windows Window Header */}
                <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 text-white">
                  {/* Windows OS Title Bar */}
                  <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-800 select-none">
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      <img
                        src={brandForm.logoUrl}
                        alt="Favicon"
                        className="w-4 h-4 rounded-sm object-cover shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-200 truncate font-hanuman">
                        {lang === 'km' ? brandForm.companyNameKh : brandForm.companyNameEn} | {lang === 'km' ? (brandForm.sloganKh || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន') : (brandForm.sloganEn || 'Attendance System')}
                      </span>
                    </div>
                    {/* Window Controls */}
                    <div className="flex items-center space-x-2 text-slate-400 text-xs shrink-0">
                      <span className="w-3 h-3 hover:text-white cursor-default flex items-center justify-center">─</span>
                      <span className="w-3 h-3 hover:text-white cursor-default flex items-center justify-center">□</span>
                      <span className="w-3 h-3 hover:text-rose-400 cursor-default flex items-center justify-center">✕</span>
                    </div>
                  </div>

                  {/* Simulated Browser Tab Bar */}
                  <div className="bg-slate-900/80 px-2.5 pt-2 flex items-center space-x-1 border-b border-slate-800">
                    <div className="bg-slate-800 text-white px-3 py-1.5 rounded-t-xl text-xs font-bold flex items-center space-x-2 border-t-2 border-indigo-500 max-w-[200px] truncate shadow-sm">
                      <img src={brandForm.logoUrl} alt="Favicon" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                      <span className="truncate text-[11px]">
                        {lang === 'km' ? brandForm.companyNameKh : brandForm.companyNameEn}
                      </span>
                      <span className="text-slate-400 hover:text-white text-[10px] ml-1">×</span>
                    </div>
                    <div className="text-slate-500 text-xs px-2">+</div>
                  </div>

                  {/* Window Body Preview */}
                  <div className="p-3 bg-slate-950/60 text-center space-y-1">
                    <div className="text-[11px] text-indigo-400 font-bold">
                      {lang === 'km' ? '✅ បង្ហាញ Logo & ឈ្មោះលើ Title Bar ត្រឹមត្រូវ' : '✅ Logo & Name Active in Windows Title Bar'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      document.title & favicon updated in real-time
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Home Screen App Icon Simulation */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-battambang">
                    {lang === 'km' ? '📱 Mobile Home Screen Icon Preview' : 'Mobile Home Screen App Preview'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    PWA Ready
                  </span>
                </div>

                {/* Phone Wallpaper Simulation */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl border border-slate-800 text-white text-center space-y-4 shadow-lg">
                  <p className="text-[10px] text-slate-400">
                    {lang === 'km' ? 'នៅពេលបុគ្គលិកដំឡើងលើ iPhone / Android Home Screen:' : 'When installed onto iPhone or Android Home Screen:'}
                  </p>

                  <div className="flex justify-center items-center">
                    <div className="flex flex-col items-center space-y-1.5 group">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 ring-4 ring-indigo-500/30 transition transform hover:scale-105">
                        <img
                          src={brandForm.logoUrl}
                          alt="App Icon"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-bold text-white tracking-tight drop-shadow font-battambang max-w-[130px] truncate">
                        {lang === 'km' ? (brandForm.companyNameKh || 'វត្តមាន QR') : (brandForm.companyNameEn || 'Attendance')}
                      </span>
                    </div>
                  </div>

                  {/* Install Launcher Button */}
                  {onOpenInstallModal && (
                    <button
                      type="button"
                      onClick={onOpenInstallModal}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer font-battambang"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'km' ? 'ដំឡើងលើឧបករណ៍ (Install to Device)' : 'Install to Home Screen'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KHMER TYPOGRAPHY & VISUAL SUITE (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'typography' && (
        <KhmerTypographySettings
          currentUser={currentUser || adminProfile}
          lang={lang}
          branding={brandForm}
          onUpdateBranding={(partial) => {
            const updated = { ...brandForm, ...partial };
            setBrandForm(updated);
            onUpdateBranding(updated);
            updateDynamicAppBranding(updated, lang);
          }}
          onAddAuditLog={(action, actionKh, details, detailsKh, status = 'success') => {
            const logEntry: AuditLogEntry = {
              id: `log_${Date.now()}`,
              timestamp: new Date().toISOString(),
              actorName: currentUser?.nameKh || currentUser?.nameEn || adminProfile?.nameKh || 'Super Admin',
              actorRole: 'admin',
              action,
              actionKh,
              module: 'system',
              details,
              detailsKh,
              status,
            };
            onAddAuditLog(logEntry);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RBAC ROLE PERMISSIONS MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Role Selector List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'km' ? 'តួនាទីក្នុងប្រព័ន្ធ (System Roles)' : 'Configured System Roles'}</span>
              </h3>

              <div className="space-y-2">
                {rolesForm.map((role) => {
                  const isSelected = role.roleId === selectedRoleId;
                  return (
                    <button
                      key={role.roleId}
                      type="button"
                      onClick={() => setSelectedRoleId(role.roleId)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-800">
                            {lang === 'km' ? role.roleNameKh : role.roleNameEn}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {lang === 'km' ? role.descriptionKh : role.descriptionEn}
                        </p>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${role.roleBadgeColor}`}>
                        {role.roleId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Granular Permission Toggles Matrix */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${activeRole.roleBadgeColor}`}>
                    {activeRole.roleId}
                  </span>
                  <h2 className="text-lg font-black text-slate-800">
                    {lang === 'km' ? activeRole.roleNameKh : activeRole.roleNameEn}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {lang === 'km' ? activeRole.descriptionKh : activeRole.descriptionEn}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveRolePermissions}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'km' ? 'រក្សាទុកសិទ្ធិ' : 'Save Permissions'}</span>
              </button>
            </div>

            {/* Permission Checkboxes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { key: 'canViewDashboard', labelEn: 'View Multi-Branch Analytics Dashboard', labelKh: 'មើលផ្ទាំង Dashboard វិភាគគ្រប់សាខា' },
                { key: 'canScanAttendance', labelEn: 'Self Attendance Punch (QR / GPS)', labelKh: 'ចុះវត្តមានផ្ទាល់ខ្លួន (QR / GPS Geofence)' },
                { key: 'canUseKioskPin', labelEn: 'Kiosk 4-Digit Touch PIN Punch', labelKh: 'ចុចលេខសម្ងាត់ PIN ៤ ខ្ទង់លើ Tablet Kiosk' },
                { key: 'canSubmitRequests', labelEn: 'Submit Leave & Overtime Requests', labelKh: 'ដាក់ពាក្យស្នើសុំច្បាប់ និងម៉ោងថែម (OT)' },
                { key: 'canApproveRequests', labelEn: 'Approve / Reject Leave & OT Requests', labelKh: 'អនុម័ត ឬបដិសេធពាក្យសុំច្បាប់ & OT' },
                { key: 'canTransferStaff', labelEn: 'Authorize Cross-Branch Staff Transfers', labelKh: 'អនុញ្ញាតផ្ទេរបុគ្គលិកឆ្លងសាខា' },
                { key: 'canManageEmployees', labelEn: 'Add / Edit Employee Directory Profiles', labelKh: 'បញ្ចូល និងកែប្រែព័ត៌មានបុគ្គលិក' },
                { key: 'canManageBranches', labelEn: 'Configure Branch Locations & Geofences', labelKh: 'កែប្រែកូអរដោនេទីតាំង និងរង្វង់ Geofence' },
                { key: 'canManageBranding', labelEn: 'Edit Branding, Company Logo & Kiosk Themes', labelKh: 'កែប្រែ Logo ស្លាកយីហោ និង Theme' },
                { key: 'canManageRoles', labelEn: 'Manage User Roles & RBAC Matrix', labelKh: 'កំណត់សិទ្ធិតួនាទី និង RBAC Matrix' },
                { key: 'canOverrideGeofence', labelEn: 'Override GPS Geofence Spoofing Flag', labelKh: 'អនុញ្ញាត Override ពេល GPS ចេញក្រៅរង្វង់' },
                { key: 'canExportReports', labelEn: 'Export Excel Attendance & Payroll Logs', labelKh: 'ទាញយករបាយការណ៍វត្តមាន Excel/CSV' },
                { key: 'canViewFinancials', labelEn: 'View Overtime Rates & Hourly Payroll Data', labelKh: 'មើលទិន្នន័យប្រាក់បៀវត្ស និងថ្លៃ OT' },
              ].map((perm) => {
                const isEnabled = activeRole.permissions[perm.key as keyof RolePermission['permissions']];
                return (
                  <div
                    key={perm.key}
                    onClick={() => handleTogglePermission(perm.key as keyof RolePermission['permissions'])}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                      isEnabled
                        ? 'border-indigo-200 bg-indigo-50/60'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="pr-3">
                      <span className="text-xs font-bold text-slate-800 block">
                        {lang === 'km' ? perm.labelKh : perm.labelEn}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        perm.{perm.key}
                      </span>
                    </div>

                    <div className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isEnabled ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEAVE & QUOTA CONTROLS, PERMISSION POLICIES & RESETS */}
      {/* ========================================================================= */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 font-battambang">
                  {lang === 'km' ? 'គ្រប់គ្រងច្បាប់ & សិទ្ធិអនុញ្ញាត (Leave & Quota Controls)' : 'Leave Quotas, Permissions & Admin Resets'}
                </h2>
                <p className="text-xs text-slate-500 font-hanuman">
                  {lang === 'km' 
                    ? 'គ្រប់គ្រងសមតុល្យច្បាប់សម្រាកប្រចាំឆ្នាំ (Annual Leave Quotas), Reset សិទ្ធិអនុម័ត និងសម្អាតកំណត់ត្រាស្នើសុំ'
                    : 'Manage annual leave quotas, reset employee balances, enforce labor law policies, and clear leave logs.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetLeavePermissionsPolicy}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer font-battambang"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'Reset សិទ្ធិអនុម័តស្តង់ដារ' : 'Reset Standard Permissions'}</span>
              </button>
            </div>
          </div>

          {/* Section: Live Leave Requests & Approvals Queue */}
          {onUpdateLeaveStatus && (
            <div className="space-y-4">
              <DashboardLeaveApprovals
                leaveRequests={leaveRequests}
                employees={employees}
                branches={branches}
                currentUser={currentUser || adminProfile}
                onUpdateLeaveStatus={onUpdateLeaveStatus}
                lang={lang}
              />
            </div>
          )}

          {/* Grid of Reset Controls & Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-hanuman">
            {/* Card 1: Global Leave Quota Resets */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Calendar className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-800 text-sm font-battambang">
                  {lang === 'km' ? 'Reset សមតុល្យច្បាប់បុគ្គលិកទាំងអស់' : 'Reset All Employees Leave Quota'}
                </h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'km'
                  ? 'កំណត់សមតុល្យច្បាប់សម្រាកប្រចាំឆ្នាំរបស់បុគ្គលិកទាំងអស់ក្នុងស្ថាប័នមក ១៨ ថ្ងៃពេញ (Used: 0 days) សម្រាប់ការចាប់ផ្តើមឆ្នាំសារពើពន្ធថ្មី។'
                  : 'Reset used annual leave balance to 0 for all staff across all 7 branches, restoring their full 18-day yearly entitlement.'}
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>{lang === 'km' ? 'ចំនួនបុគ្គលិកសរុប:' : 'Total Staff Count:'}</span>
                  <span className="font-bold text-slate-800">{employees.length} {lang === 'km' ? 'នាក់' : 'people'}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{lang === 'km' ? 'កូតាស្តង់ដារ:' : 'Standard Entitlement:'}</span>
                  <span className="font-bold text-emerald-600 font-mono">18 Days / Year</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAllLeaveBalances}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center space-x-2 cursor-pointer font-battambang"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{lang === 'km' ? 'Reset ច្បាប់បុគ្គលិកទាំងអស់ (18 ថ្ងៃ)' : 'Reset All to Full 18 Days'}</span>
              </button>
            </div>

            {/* Card 2: Single Employee Leave Balance Reset & Adjust */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <UserCheck className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-800 text-sm font-battambang">
                  {lang === 'km' ? 'Reset ច្បាប់បុគ្គលិកម្នាក់ៗ' : 'Individual Employee Reset'}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ជ្រើសរើសបុគ្គលិក:' : 'Select Employee:'}
                  </label>
                  <select
                    value={selectedEmpForLeaveReset}
                    onChange={(e) => setSelectedEmpForLeaveReset(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} - {lang === 'km' ? emp.nameKh : emp.nameEn} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const targetEmp = employees.find(e => e.id === selectedEmpForLeaveReset) || employees[0];
                  if (!targetEmp) return null;
                  const totalQuota = targetEmp.annualLeaveQuota || 18;
                  const used = targetEmp.annualLeaveUsed || 0;
                  const remaining = Math.max(0, totalQuota - used);
                  const totalSick = targetEmp.sickLeaveQuota || 7;
                  const usedSick = targetEmp.sickLeaveUsed || 0;
                  const remainingSick = Math.max(0, totalSick - usedSick);
                  return (
                    <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">{lang === 'km' ? 'ឈ្មោះ & លេខកូដ:' : 'Staff Profile:'}</span>
                        <span className="font-bold text-indigo-900">{targetEmp.nameKh} ({targetEmp.code})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">{lang === 'km' ? 'ច្បាប់ប្រចាំឆ្នាំបានប្រើ:' : 'Annual Leave Used:'}</span>
                        <span className="font-mono font-bold text-blue-700">{used} / {totalQuota} {lang === 'km' ? 'ថ្ងៃ (សល់ ' + remaining + ' ថ្ងៃ)' : `days (${remaining} left)`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">{lang === 'km' ? 'ច្បាប់ឈឺបានប្រើ:' : 'Sick Leave Used:'}</span>
                        <span className="font-mono font-bold text-rose-700">{usedSick} / {totalSick} {lang === 'km' ? 'ថ្ងៃ (សល់ ' + remainingSick + ' ថ្ងៃ)' : `days (${remainingSick} left)`}</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => handleResetSingleEmpLeave(selectedEmpForLeaveReset)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center space-x-2 cursor-pointer font-battambang"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'Reset ច្បាប់បុគ្គលិកនេះ (18 ថ្ងៃ)' : 'Reset This Employee (18 Days)'}</span>
                </button>
              </div>
            </div>

            {/* Card 3: Clear / Reset Leave Requests Queue */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Trash2 className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-800 text-sm font-battambang">
                  {lang === 'km' ? 'សម្អាតកំណត់ត្រាស្នើសុំច្បាប់' : 'Clear & Purge Leave Requests'}
                </h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'km'
                  ? 'សម្អាតពាក្យស្នើសុំច្បាប់ដែលកំពុងរង់ចាំ (Pending) ឬសម្អាតប្រវត្តិស្នើសុំច្បាប់ទាំងអស់ក្នុងប្រព័ន្ធ។'
                  : 'Purge pending unapproved requests or clear all historical leave application logs across the company.'}
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>{lang === 'km' ? 'ពាក្យស្នើសុំសរុប:' : 'Total Leave Requests:'}</span>
                  <span className="font-bold text-slate-800">{leaveRequests.length}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{lang === 'km' ? 'កំពុងរង់ចាំ (Pending):' : 'Pending Approvals:'}</span>
                  <span className="font-bold text-amber-600 font-mono">
                    {leaveRequests.filter(r => r.status === 'pending').length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleClearAllLeaveRequests('pending')}
                  className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition flex items-center justify-center space-x-1 cursor-pointer font-battambang"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'លុប Pending' : 'Clear Pending'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClearAllLeaveRequests('all')}
                  className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center space-x-1 cursor-pointer font-battambang"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'សម្អាតទាំងអស់' : 'Clear All'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Leave Policies & Approval Delegation Matrix */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base font-battambang flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span>{lang === 'km' ? 'គោលការណ៍ & សិទ្ធិអនុម័តច្បាប់តាមតួនាទី (Role Delegation Policy)' : 'Leave Approval Delegation by Role'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'km' ? 'កំណត់ថាតើតួនាទីណាខ្លះមានសិទ្ធិអនុម័ត ឬបដិសេធពាក្យស្នើសុំច្បាប់របស់បុគ្គលិក' : 'Control which roles can approve or reject employee leave applications.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {rolesForm.map((role) => {
                const canApprove = role.permissions.canApproveRequests;
                return (
                  <div
                    key={role.roleId}
                    className={`p-4 rounded-2xl border transition ${
                      canApprove
                        ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 text-sm font-battambang">
                        {lang === 'km' ? role.roleNameKh : role.roleNameEn}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        canApprove ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {canApprove ? (lang === 'km' ? 'មានសិទ្ធិ' : 'Authorized') : (lang === 'km' ? 'គ្មានសិទ្ធិ' : 'Restricted')}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3">
                      {role.descriptionKh || role.descriptionEn}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = rolesForm.map(r => 
                          r.roleId === role.roleId 
                            ? { ...r, permissions: { ...r.permissions, canApproveRequests: !r.permissions.canApproveRequests } }
                            : r
                        );
                        setRolesForm(updated);
                        onUpdateRolePermissions(updated);
                        showToast(lang === 'km' ? `បានកែប្រែសិទ្ធិច្បាប់សម្រាប់ ${role.roleNameKh}` : `Updated leave permission for ${role.roleNameEn}`);
                      }}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold font-battambang transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                        canApprove
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {canApprove ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{canApprove ? (lang === 'km' ? 'បិទសិទ្ធិអនុម័ត' : 'Revoke Approval') : (lang === 'km' ? 'បើកសិទ្ធិអនុម័ត' : 'Grant Approval')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM PARAMETERS & BROADCAST */}
      {/* ========================================================================= */}
      {activeTab === 'system' && (
        <form onSubmit={handleSaveSystemSettings} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {lang === 'km' ? 'ប៉ារ៉ាម៉ែត្រប្រព័ន្ធ & ការប្រកាស (System Rules & Broadcast)' : 'System Rules & Anti-Fraud Security'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'កំណត់ម៉ោងអនុគ្រោះចូលយឺត, ម៉ោងថែម (OT), ការពារ Fake GPS និងផ្ញើសារប្រកាសបន្ទាន់' : 'Set late grace period, overtime threshold, strict anti-spoofing, and company broadcast'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'km' ? 'រក្សាទុកប៉ារ៉ាម៉ែត្រ' : 'Save System Rules'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'km' ? 'រយៈពេលអនុគ្រោះចូលយឺត (Grace Period):' : 'Late Grace Period:'}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={settingsForm.gracePeriodMins}
                  onChange={(e) => setSettingsForm({ ...settingsForm, gracePeriodMins: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700"
                />
                <span className="text-xs text-slate-500 font-bold">{lang === 'km' ? 'នាទី' : 'Mins'}</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {lang === 'km' ? 'ឧទាហរណ៍៖ ១៥ នាទីបន្ទាប់ពីម៉ោងវេនចាប់ផ្តើម' : 'e.g. 15 mins after shift starts'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'km' ? 'កម្រិតចាប់ផ្តើមគិតម៉ោង OT (OT Threshold):' : 'Overtime Threshold:'}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={settingsForm.overtimeThresholdHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, overtimeThresholdHours: parseInt(e.target.value) || 8 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700"
                />
                <span className="text-xs text-slate-500 font-bold">{lang === 'km' ? 'ម៉ោង/ថ្ងៃ' : 'Hours/day'}</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {lang === 'km' ? 'គិត OT បន្ទាប់ពីធ្វើការលើស ៨ ម៉ោង' : 'Calculates OT after standard 8 hours'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'km' ? 'ស្វ័យប្រវត្តិចេញ (Auto Checkout):' : 'Auto Checkout Window:'}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={8}
                  max={24}
                  value={settingsForm.autoCheckoutHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoCheckoutHours: parseInt(e.target.value) || 12 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700"
                />
                <span className="text-xs text-slate-500 font-bold">{lang === 'km' ? 'ម៉ោង' : 'Hours'}</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {lang === 'km' ? 'ការពារភ្លេច Check-out វេនយប់' : 'Closes punch if employee forgets checkout'}
              </span>
            </div>
          </div>

          {/* Broadcast Announcement Bar Config */}
          <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-amber-900 text-sm">
                  {lang === 'km' ? '📢 ការប្រកាសជាសកល (Company-Wide Broadcast Banner)' : '📢 Global Broadcast Banner'}
                </h3>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.broadcastActive}
                  onChange={(e) => setSettingsForm({ ...settingsForm, broadcastActive: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-900">
                  {settingsForm.broadcastActive ? (lang === 'km' ? 'កំពុងបើកបង្ហាញ' : 'Live Banner Active') : (lang === 'km' ? 'បានបិទ' : 'Disabled')}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  {lang === 'km' ? 'សារប្រកាសជាភាសាខ្មែរ:' : 'Broadcast Message (Khmer):'}
                </label>
                <input
                  type="text"
                  value={settingsForm.broadcastNoticeKh || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, broadcastNoticeKh: e.target.value })}
                  placeholder="e.g. 📢 សូមរំលឹកបុគ្គលិកគ្រប់សាខា..."
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  {lang === 'km' ? 'សារប្រកាសជាភាសាអង់គ្លេស:' : 'Broadcast Message (English):'}
                </label>
                <input
                  type="text"
                  value={settingsForm.broadcastNoticeEn || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, broadcastNoticeEn: e.target.value })}
                  placeholder="e.g. 📢 Reminder to all staff across 7 branches..."
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Anti-Fraud Security Policies & 1-Device Binding Controls */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-battambang">
                    {lang === 'km' ? 'គោលការណ៍សុវត្ថិភាពការពារ Fake Scanning & ចាក់សោឧបករណ៍ (Anti-Fraud Policy)' : 'Anti-Proxy & Device Hardware Security Policies'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'km' ? 'ទប់ស្កាត់ការ Login លើឧបករណ៍អ្នកដទៃដើម្បីស្កេនជំនួស (1-Employee = 1-Device Lock)' : 'Strict 1-Device hardware binding preventing proxy attendance & account sharing'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Policy 1: Strict 1-Device Binding */}
              <div className={`p-4 rounded-2xl border transition ${settingsForm.strictDeviceBinding !== false ? 'bg-indigo-50/60 border-indigo-200 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs font-battambang">
                      {lang === 'km' ? 'ចាក់សោ ១ នាក់ = ១ ឧបករណ៍' : 'Strict 1-Device Binding'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.strictDeviceBinding !== false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, strictDeviceBinding: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'km'
                    ? 'បុគ្គលិកអាចស្កេនបានតែលើទូរស័ព្ទផ្ទាល់ខ្លួនដែលបានចុះឈ្មោះប៉ុណ្ណោះ។ ការ Login លើទូរស័ព្ទមិត្តភក្តិដើម្បីស្កេនជំនួស ត្រូវបានបដិសេធដាច់ខាត។'
                    : 'Employees can only punch from their personal registered phone. Logging into someone else\'s phone to scan for them is strictly blocked.'}
                </p>
              </div>

              {/* Policy 2: Prevent Device Sharing */}
              <div className={`p-4 rounded-2xl border transition ${settingsForm.preventDeviceSharing !== false ? 'bg-indigo-50/60 border-indigo-200 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs font-battambang">
                      {lang === 'km' ? 'ទប់ស្កាត់ការប្រើទូរស័ព្ទរួមគ្នា' : 'Block Device Sharing'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.preventDeviceSharing !== false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, preventDeviceSharing: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'km'
                    ? 'ការពារកុំឱ្យបុគ្គលិក ២ នាក់ ប្រើទូរស័ព្ទតែមួយដើម្បីស្កេនជំនួសគ្នាទៅវិញទៅមក (Anti-Buddy Punching)។'
                    : 'Detects if two separate employees try using the exact same mobile device, blocking simultaneous proxy attendance.'}
                </p>
              </div>

              {/* Policy 3: Selfie Verification */}
              <div className={`p-4 rounded-2xl border transition ${settingsForm.enableSelfieVerification !== false ? 'bg-indigo-50/60 border-indigo-200 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs font-battambang">
                      {lang === 'km' ? 'ថតរូបជាក់ស្តែងពេលស្កេន' : 'Live Camera Audit Snapshot'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.enableSelfieVerification !== false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, enableSelfieVerification: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === 'km'
                    ? 'ថតរូបភាពផ្ទាល់ពីកាមេរ៉ាក្នុងពេលស្កេន ភ្ជាប់ជាមួយកំណត់ត្រាវត្តមាន ដើម្បីផ្ទៀងផ្ទាត់មុខអ្នកស្កេនជាក់ស្តែង។'
                    : 'Snaps an authentic live camera photo on every QR punch, maintaining visual proof of the physical attendee.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Employee Device Management & Anti-Fraud Center */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 font-battambang">
                    {lang === 'km' ? 'ការគ្រប់គ្រងឧបករណ៍បុគ្គលិក & ដោះសោឧបករណ៍ (Device Management Hub)' : 'Staff Device Binding Management & Hardware Security'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'km'
                      ? 'មើលបញ្ជីទូរស័ព្ទដែលបានចាក់សោភ្ជាប់ជាមួយបុគ្គលិកម្នាក់ៗ និងដោះសោឧបករណ៍ឡើងវិញប្រសិនបើបុគ្គលិកប្តូរទូរស័ព្ទ'
                      : 'View bound hardware devices per employee, monitor security locks, and reset binding for legitimate phone upgrades.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResetAllDevicesModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer self-start sm:self-center font-battambang"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'ដោះសោឧបករណ៍ទាំងអស់ (Reset All)' : 'Reset All Devices'}</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'ឧបករណ៍បានចាក់សោ' : 'Bound Devices'}</span>
                <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">
                  {employees.filter(e => e.trustedDeviceId).length} / {employees.length}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block font-hanuman">
                  {Math.round((employees.filter(e => e.trustedDeviceId).length / (employees.length || 1)) * 100)}% {lang === 'km' ? 'បានភ្ជាប់សុវត្ថិភាព' : 'enrolled'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'រង់ចាំស្កេនលើកដំបូង' : 'Pending 1st Scan'}</span>
                <span className="text-xl font-black text-amber-600 font-mono mt-0.5 block">
                  {employees.filter(e => !e.trustedDeviceId).length}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block font-hanuman">
                  {lang === 'km' ? 'នឹងចាក់សោពេលស្កេន' : 'auto-binds on punch'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'ស្ថានភាពចាក់សោ ១-១' : 'Binding Policy'}</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 inline-block mt-1 font-mono">
                  {settingsForm.strictDeviceBinding !== false ? 'STRICT LOCKED' : 'PERMISSIVE'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block font-hanuman">
                  {lang === 'km' ? '១ នាក់ = ១ ឧបករណ៍' : '1 staff = 1 phone'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{lang === 'km' ? 'ស្កេនខុសច្បាប់ត្រូវបានទប់ស្កាត់' : 'Proxy Scans Blocked'}</span>
                <span className="text-xl font-black text-rose-600 font-mono mt-0.5 block">
                  {auditLogs.filter(l => l.module === 'security' && l.status === 'alert').length}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block font-hanuman">
                  {lang === 'km' ? 'ការពារសុវត្ថិភាព' : 'security alerts'}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  placeholder={lang === 'km' ? 'ស្វែងរកតាមឈ្មោះបុគ្គលិក, លេខកូដ, ឬឈ្មោះឧបករណ៍...' : 'Search by staff name, code, or device name...'}
                  value={deviceSearchQuery}
                  onChange={(e) => setDeviceSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="w-full sm:w-auto">
                <select
                  value={deviceBranchFilter}
                  onChange={(e) => setDeviceBranchFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="all">{lang === 'km' ? 'គ្រប់សាខាទាំងអស់ (All Branches)' : 'All Branches'}</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{lang === 'km' ? b.nameKh : b.nameEn}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Device Directory Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs font-hanuman divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                    <th className="px-4 py-3">{lang === 'km' ? 'សាខា & ផ្នែក' : 'Branch & Dept'}</th>
                    <th className="px-4 py-3">{lang === 'km' ? 'ឧបករណ៍ដែលបានចាក់សោ (Registered Hardware)' : 'Registered Device'}</th>
                    <th className="px-4 py-3">{lang === 'km' ? 'ស្ថានភាពចាក់សោ' : 'Lock Status'}</th>
                    <th className="px-4 py-3 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {employees
                    .filter(emp => {
                      const matchQuery = 
                        emp.nameKh.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
                        emp.nameEn.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
                        emp.code.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
                        (emp.trustedDeviceName && emp.trustedDeviceName.toLowerCase().includes(deviceSearchQuery.toLowerCase()));
                      const matchBranch = deviceBranchFilter === 'all' || emp.branchId === deviceBranchFilter;
                      return matchQuery && matchBranch;
                    })
                    .map(emp => {
                      const empBranch = branches.find(b => b.id === emp.branchId);
                      const isBound = !!emp.trustedDeviceId;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-3">
                              <img
                                src={emp.avatar}
                                alt={emp.nameEn}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs font-battambang">
                                  {lang === 'km' ? emp.nameKh : emp.nameEn}
                                </h4>
                                <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  {emp.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-700 block text-xs">
                              {lang === 'km' ? empBranch?.nameKh : empBranch?.nameEn}
                            </span>
                            <span className="text-[10px] text-slate-400">{emp.department}</span>
                          </td>

                          <td className="px-4 py-3.5">
                            {isBound ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-xs">
                                  <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-mono text-emerald-950 font-bold">{emp.trustedDeviceName}</span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono block truncate max-w-[200px]">
                                  ID: {emp.trustedDeviceId}
                                </span>
                                {emp.trustedDeviceBoundAt && (
                                  <span className="text-[9px] text-slate-500 block">
                                    {lang === 'km' ? 'ភ្ជាប់នៅ:' : 'Bound:'} {new Date(emp.trustedDeviceBoundAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 text-amber-700 text-xs font-medium bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 inline-flex">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>{lang === 'km' ? 'មិនទាន់ភ្ជាប់ (ចាក់សោស្វ័យប្រវត្តពេលស្កេន)' : 'Pending (Auto-binds on 1st punch)'}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {isBound ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Lock className="w-3 h-3" />
                                <span>{lang === 'km' ? 'ចាក់សោសុវត្ថិភាព' : '1-Device Locked'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Unlock className="w-3 h-3" />
                                <span>{lang === 'km' ? 'មិនទាន់ចាក់សោ' : 'Unbound'}</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {isBound ? (
                              <button
                                type="button"
                                onClick={() => setEmpToResetDevice(emp)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition inline-flex items-center space-x-1 cursor-pointer font-battambang"
                                title="Reset device binding for employee"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{lang === 'km' ? 'ដោះសោឧបករណ៍' : 'Reset Device'}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                {lang === 'km' ? 'រួចរាល់សម្រាប់ស្កេន' : 'Ready'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDIT TRAIL LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {lang === 'km' ? 'កំណត់ត្រាសវនកម្មរដ្ឋបាល (Administrative Audit Trail)' : 'Administrative Audit Trail & Security Logs'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'តាមដានរាល់សកម្មភាពកែប្រែទីតាំងសាខា ប្តូរសិទ្ធិ និងការផ្ទេរបុគ្គលិក' : 'Complete immutable logs of location updates, permission edits, and staff rotations'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl text-xs font-bold uppercase shrink-0 mt-0.5 ${
                    log.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                    log.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {log.module}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-800">
                        {lang === 'km' ? log.actionKh : log.action}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        by {log.actorName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {lang === 'km' ? log.detailsKh : log.details}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: COMPLETE SYSTEM BACKUP, RESTORE & REALTIME SYNC */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <BackupRestorePanel
          branches={branches}
          employees={employees}
          attendanceRecords={attendanceRecords}
          leaveRequests={leaveRequests}
          transferRecords={transferRecords}
          branding={branding}
          rolePermissions={rolePermissions}
          systemSettings={systemSettings}
          auditLogs={auditLogs}
          adminProfile={adminProfile}
          onRestoreBackup={onRestoreBackup}
          onResetSystem={onResetSystem}
          onAddAuditLog={onAddAuditLog}
          isLiveSyncConnected={isLiveSyncConnected}
          onlinePeersCount={onlinePeersCount}
          connectedPeers={connectedPeers}
          lang={lang}
        />
      )}

      {/* MODAL: ADD NEW BRANCH */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'km' ? 'បន្ថែមទីតាំងសាខាថ្មី' : 'Create New Branch Profile'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះខ្មែរ:' : 'Khmer Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchForm.nameKh}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, nameKh: e.target.value })}
                    placeholder="e.g. ហាងកាហ្វេ អារ៉ូម៉ា - សែនសុខ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ឈ្មោះអង់គ្លេស:' : 'English Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchForm.nameEn}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, nameEn: e.target.value })}
                    placeholder="e.g. Aroma Cafe - Sen Sok"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Interactive Map Picker for New Branch */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    {lang === 'km' ? 'ជ្រើសរើសទីតាំងលើផែនទី (Auto-Fetch Coordinates):' : 'Pin Location on Map (Auto-Fetch Lat/Lng):'}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">
                    Lat: {(newBranchForm.lat || 11.556).toFixed(4)}, Lng: {(newBranchForm.lng || 104.928).toFixed(4)}
                  </span>
                </div>

                <InteractiveMapPicker
                  lat={newBranchForm.lat || 11.5560}
                  lng={newBranchForm.lng || 104.9280}
                  radiusMeters={newBranchForm.radiusMeters || 80}
                  branchName={newBranchForm.nameEn || 'New Branch'}
                  branchType={newBranchForm.type || 'cafe'}
                  lang={lang}
                  heightClass="h-[220px]"
                  onChange={(newLat, newLng, addr) => {
                    setNewBranchForm((prev) => ({
                      ...prev,
                      lat: newLat,
                      lng: newLng,
                      addressKh: prev.addressKh || addr?.nameKh || '',
                      addressEn: prev.addressEn || addr?.nameEn || '',
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'ប្រភេទសាខា:' : 'Category:'}
                  </label>
                  <select
                    value={newBranchForm.type}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, type: e.target.value as BranchType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="cafe">☕ Cafe</option>
                    <option value="club">🍸 Nightclub</option>
                    <option value="warehouse">📦 Logistics Warehouse</option>
                    <option value="office">🏢 Office</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'km' ? 'កាំ Geofence (ម):' : 'Radius (Meters):'}
                  </label>
                  <input
                    type="number"
                    value={newBranchForm.radiusMeters}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, radiusMeters: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">Latitude (Auto):</label>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">GPS</span>
                  </div>
                  <input
                    type="number"
                    step="0.000001"
                    value={newBranchForm.lat}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, lat: Number(e.target.value) })}
                    className="w-full bg-indigo-50/40 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-900"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">Longitude (Auto):</label>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">GPS</span>
                  </div>
                  <input
                    type="number"
                    step="0.000001"
                    value={newBranchForm.lng}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, lng: Number(e.target.value) })}
                    className="w-full bg-indigo-50/40 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200"
                >
                  {lang === 'km' ? 'បង្កើតសាខា' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Confirm Reset Single Employee Device */}
      {empToResetDevice && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200 text-left font-hanuman">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-battambang">
                  {lang === 'km' ? 'ដោះសោឧបករណ៍បុគ្គលិក (Reset Device)' : 'Reset Employee Device Binding'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'អនុញ្ញាតឱ្យបុគ្គលិកភ្ជាប់ទូរស័ព្ទថ្មីពេលស្កេនលើកក្រោយ' : 'Allow employee to rebind a new phone on their next scan'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center space-x-3">
                <img
                  src={empToResetDevice.avatar}
                  alt={empToResetDevice.nameEn}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-slate-800 font-battambang">{empToResetDevice.nameKh} ({empToResetDevice.nameEn})</h4>
                  <span className="font-mono text-indigo-600 font-bold">{empToResetDevice.code} • {empToResetDevice.department}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[11px]">{lang === 'km' ? 'ឧបករណ៍ដែលកំពុងចាក់សោបច្ចុប្បន្ន:' : 'Currently Bound Hardware:'}</span>
                <span className="font-mono font-bold text-rose-700 block">{empToResetDevice.trustedDeviceName || 'Unknown Device'}</span>
                <span className="font-mono text-[9px] text-slate-400 block truncate">ID: {empToResetDevice.trustedDeviceId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'km'
                ? 'តើអ្នកប្រាកដជាចង់ដោះសោឧបករណ៍នេះដែរឬទេ? ប្រសិនបើដោះសោ បុគ្គលិកនឹងអាចយកទូរស័ព្ទថ្មីមកស្កេនដើម្បីចាក់សោស្វ័យប្រវត្តបាន។'
                : 'Are you sure you want to reset this device binding? The employee will be able to enroll their new personal phone on their next QR attendance scan.'}
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEmpToResetDevice(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer font-battambang"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleResetSingleEmployeeDevice(empToResetDevice)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition cursor-pointer font-battambang"
              >
                {lang === 'km' ? 'យល់ព្រមដោះសោ' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset All Devices */}
      {showResetAllDevicesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200 text-left font-hanuman">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-battambang">
                  {lang === 'km' ? 'ដោះសោឧបករណ៍បុគ្គលិកទាំងអស់' : 'Reset All Staff Devices'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'ដោះសោឧបករណ៍សម្រាប់បុគ្គលិកគ្រប់រូបក្នុងស្ថាប័ន' : 'Clear all hardware device locks across the company'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'km'
                ? `តើអ្នកប្រាកដជាចង់ដោះសោឧបករណ៍សម្រាប់បុគ្គលិកទាំងអស់ចំនួន ${employees.length} នាក់ដែរឬទេ? បុគ្គលិកទាំងអស់នឹងត្រូវស្កេនដើម្បីចុះឈ្មោះឧបករណ៍ថ្មីឡើងវិញ។`
                : `Are you sure you want to reset device locks for all ${employees.length} employees? Every staff member will be re-enrolled on their next scan.`}
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetAllDevicesModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer font-battambang"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleResetAllDevices}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition cursor-pointer font-battambang"
              >
                {lang === 'km' ? 'យល់ព្រមដោះសោទាំងអស់' : 'Reset All Devices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top Quick Action Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-2xl bg-slate-900/90 hover:bg-indigo-600 text-white shadow-xl shadow-slate-900/30 border border-slate-700 hover:border-indigo-400 transition-all duration-200 hover:scale-105 flex items-center space-x-1.5 text-xs font-bold cursor-pointer backdrop-blur-md animate-in fade-in"
          title={lang === 'km' ? 'រមូរទៅលើបង្អស់' : 'Scroll to top'}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline font-battambang">{lang === 'km' ? 'ទៅលើ' : 'Top'}</span>
        </button>
      )}
    </div>
  );
};
