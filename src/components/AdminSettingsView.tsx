import React, { useState } from 'react';
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
  LayoutGrid
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
  AuthUser
} from '../types';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import { BackupRestorePanel } from './BackupRestorePanel';
import { updateDynamicAppBranding } from '../utils/pwaBrandUtils';

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
  adminProfile?: AuthUser;
  attendanceRecords?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  transferRecords?: BranchTransferRecord[];
  onRestoreBackup?: (backupData: SystemBackupData, mode: 'merge' | 'overwrite') => void;
  onResetSystem?: (type: 'demo_seed' | 'clean_fresh') => void;
  onUpdateLeaveRequests?: (leaves: LeaveRequest[]) => void;
  onUpdateEmployeesList?: (employees: Employee[]) => void;
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
  adminProfile,
  attendanceRecords = [],
  leaveRequests = [],
  transferRecords = [],
  onRestoreBackup = () => {},
  onResetSystem = () => {},
  onUpdateLeaveRequests,
  onUpdateEmployeesList,
  isLiveSyncConnected = true,
  onlinePeersCount = 1,
  connectedPeers = [],
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'branding' | 'roles' | 'leaves' | 'system' | 'audit' | 'backup'>('branches');

  // Branch Management State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || 'br_club_1');
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

      {/* Tabs Menu Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{lang === 'km' ? '១. ទីតាំង & Geofence ៧ សាខា' : '1. Branch Locations & Geofences'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'branches' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {branches.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>{lang === 'km' ? '២. ស្លាកយីហោ & Logo ក្រុមហ៊ុន' : '2. Branding & Corporate Logo'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{lang === 'km' ? '៣. សិទ្ធិតួនាទី (RBAC Permissions)' : '3. RBAC Role Permissions'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'roles' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {rolesForm.length} Roles
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'leaves'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-emerald-500" />
          <span>{lang === 'km' ? '៤. គ្រប់គ្រងច្បាប់ & សិទ្ធិអនុញ្ញាត' : '4. Leave & Quota Controls'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'leaves' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {leaveRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'system'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{lang === 'km' ? '៥. ប៉ារ៉ាម៉ែត្រប្រព័ន្ធ & ការប្រកាស' : '5. System Rules & Broadcast'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{lang === 'km' ? '៦. កំណត់ត្រាសវនកម្ម (Audit Trail)' : '6. Audit Trail & Logs'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-500" />
          <span>{lang === 'km' ? '៧. បម្រុងទុក & ស្តារទិន្នន័យ (Backup & Sync)' : '7. Backup, Restore & Sync'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
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
      {/* TAB 2: BRANDING & LOGO CUSTOMIZATION */}
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
      {/* TAB 3: RBAC ROLE PERMISSIONS MATRIX */}
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
    </div>
  );
};
