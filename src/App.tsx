/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  INITIAL_BRANCHES, 
  INITIAL_BRANCH_TYPES,
  INITIAL_EMPLOYEES, 
  INITIAL_ATTENDANCE_RECORDS, 
  INITIAL_LEAVE_REQUESTS,
  INITIAL_TRANSFER_RECORDS,
  INITIAL_BRANDING,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SHIFTS
} from './data/initialData';
import { DEFAULT_AUTH_USER } from './data/authUsers';
import { 
  Branch, 
  BranchTypeConfig,
  Employee, 
  Shift,
  AttendanceRecord, 
  LeaveRequest, 
  UserGeoLocation, 
  Language, 
  AuthUser,
  BranchTransferRecord,
  CompanyBranding,
  RolePermission,
  SystemSettings,
  AuditLogEntry,
  SystemBackupData,
  ConnectedPeer,
  SyncMessage,
  StaffReminderPayload
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { QrAttendanceView } from './components/QrAttendanceView';
import { EmployeePortalView } from './components/EmployeePortalView';
import { LoginModal } from './components/LoginModal';
import { StaffReminderAlertModal } from './components/StaffReminderAlertModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { resolveEmployeeShift } from './utils/rosterUtils';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Code-split heavy views and secondary modals with auto-reloading retry for new releases
const DashboardView = lazyWithRetry(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const ReportsView = lazyWithRetry(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const AdminSettingsView = lazyWithRetry(() => import('./components/AdminSettingsView').then(m => ({ default: m.AdminSettingsView })));
const GpsRadarMap = lazyWithRetry(() => import('./components/GpsRadarMap').then(m => ({ default: m.GpsRadarMap })));
const EmployeeDirectoryView = lazyWithRetry(() => import('./components/EmployeeDirectoryView').then(m => ({ default: m.EmployeeDirectoryView })));
const BranchManagementView = lazyWithRetry(() => import('./components/BranchManagementView').then(m => ({ default: m.BranchManagementView })));
const BranchKioskView = lazyWithRetry(() => import('./components/BranchKioskView').then(m => ({ default: m.BranchKioskView })));
const ProfileSettingsView = lazyWithRetry(() => import('./components/ProfileSettingsView').then(m => ({ default: m.ProfileSettingsView })));
const BranchTransferModal = lazyWithRetry(() => import('./components/BranchTransferModal').then(m => ({ default: m.BranchTransferModal })));
const InstallAppModal = lazyWithRetry(() => import('./components/InstallAppModal').then(m => ({ default: m.InstallAppModal })));
const DigitalIdCardModal = lazyWithRetry(() => import('./components/DigitalIdCardModal').then(m => ({ default: m.DigitalIdCardModal })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-slate-400">
    <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
    <p className="text-sm font-medium text-slate-600 animate-pulse">កំពុងដំណើរការទិន្នន័យ... / Loading view...</p>
  </div>
);
import { updateDynamicAppBranding } from './utils/pwaBrandUtils';
import { applyKhmerTypography } from './utils/typographyUtils';
import { realtimeService } from './utils/realtimeService';
import { mergeDatasets } from './utils/backupRestoreUtils';
import { playAlertChime, playReminderRingtone, triggerBrowserReminderNotification } from './utils/soundUtils';
import { validatePunchAllowance, isEmployeeDayOff } from './utils/dayOffUtils';
import { ActionAlertItem } from './components/RealtimeActionAlertCenter';
import { Cloud, Loader2 } from 'lucide-react';
import { 
  subscribeToCloudDatabase, 
  syncStateToCloudDatabase, 
  syncStateToCloudImmediate,
  subscribeCloudConnectionStatus,
  testFirestoreConnection,
  getCloudDatabaseState,
  sanitizeForFirestore,
  saveAttendanceRecordToCloud,
  saveEmployeeToCloud,
  saveLeaveRequestToCloud,
  saveStaffAlertToCloud,
  CloudSystemState 
} from './utils/firebaseSync';
import {
  fetchInitialSupabaseData,
  saveAttendancePunchToSupabase,
  saveStaffAlertToSupabase,
  clearStaffAlertsFromSupabase,
  deleteSingleStaffAlertFromSupabase,
  saveEmployeeToSupabase,
  syncStateToSupabase,
  subscribeToSupabaseRealtime,
  broadcastSupabaseEvent,
  startSupabasePollingSync,
} from './utils/supabaseSync';
import {
  fetchInitialTursoData,
  saveEmployeeToTurso,
  deleteEmployeeFromTurso,
  saveAttendancePunchToTurso,
  saveLeaveRequestToTurso,
  deleteLeaveRequestsFromTurso,
  deleteBranchFromTurso,
  saveStaffAlertToTurso,
  clearStaffAlertsFromTurso,
  deleteSingleStaffAlertFromTurso,
  syncStateToTurso,
} from './utils/tursoSync';
import {
  queuePunchForSync,
  markPunchAsSynced,
  syncPendingPunches,
  fetchComprehensiveAttendance,
  startAttendanceSyncService,
} from './utils/attendanceSyncManager';

const DEFAULT_STARTER_BRANCH: Branch = {
  id: 'br_main_hq',
  nameKh: 'ការិយាល័យកណ្តាល (Head Office)',
  nameEn: 'Main Corporate HQ',
  type: 'office',
  addressKh: 'រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា',
  addressEn: 'Phnom Penh, Cambodia',
  lat: 11.55802,
  lng: 104.92804,
  radiusMeters: 80,
  openTime: '08:00',
  closeTime: '17:30',
  managerName: 'Administrator',
  contactPhone: '+855 23 888 999',
  themeColor: 'from-indigo-600 to-blue-600',
  iconName: 'Building2',
  activeStaffCount: 0,
};

const pendingStorageWrites = new Map<string, string>();
let storageWriteTimer: any = null;

function flushPendingStorageWrites() {
  if (pendingStorageWrites.size === 0) return;
  const entries = Array.from(pendingStorageWrites.entries());
  pendingStorageWrites.clear();
  for (const [key, str] of entries) {
    try {
      localStorage.setItem(key, str);
    } catch (e) {
      console.warn(`[SafeStorage] Flush failed for key "${key}":`, e);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingStorageWrites);
}

function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const saved = pendingStorageWrites.has(key) ? pendingStorageWrites.get(key) : localStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null') return fallback;
    const parsed = JSON.parse(saved);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && fallback.length > 0 && Array.isArray(parsed) && parsed.length === 0) {
      return fallback;
    }
    return parsed;
  } catch (err) {
    console.warn(`SafeStorage: reset corrupted key "${key}" to initial fallback.`, err);
    try {
      localStorage.removeItem(key);
      pendingStorageWrites.delete(key);
    } catch (_) {}
    return fallback;
  }
}

function safeSetJson(key: string, value: any, immediate = false): boolean {
  try {
    let payload = value;
    // Proactively compact attendance records for local storage cache (< 60KB total)
    // so mobile / desktop browser localStorage NEVER encounters QuotaExceededError or GC thrashing
    if (key === 'attend_records' && Array.isArray(value)) {
      payload = value.slice(0, 50).map((r) => {
        if (!r) return r;
        const { selfieUrl, employeeAvatar, ...rest } = r;
        return {
          ...rest,
          employeeAvatar: employeeAvatar && employeeAvatar.length < 500 ? employeeAvatar : '',
          selfieUrl: selfieUrl && selfieUrl.length < 500 ? selfieUrl : undefined,
        };
      });
    }
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (immediate || key === 'attend_auth_user' || key === 'attend_user_id' || key === 'attend_lang') {
      pendingStorageWrites.delete(key);
      localStorage.setItem(key, str);
      return true;
    }

    // Non-blocking deferred batch write for heavy collections to prevent UI thread lockups
    pendingStorageWrites.set(key, str);
    if (!storageWriteTimer) {
      storageWriteTimer = setTimeout(() => {
        storageWriteTimer = null;
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => flushPendingStorageWrites(), { timeout: 1000 });
        } else {
          flushPendingStorageWrites();
        }
      }, 250);
    }
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] Quota exceeded on "${key}". Freeing non-essential cache...`, err);
    try {
      // 1. Instantly free up non-critical bloated caches
      localStorage.removeItem('attend_audit_logs');
      localStorage.removeItem('attend_staff_alerts');
      localStorage.removeItem('attend_transfers');
      localStorage.removeItem('hrms_backup_snapshots');

      let parsed = value;
      if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch (_) {}
      }

      // 2. If saving attendance records, keep only the latest 20 without massive base64 selfies
      if (key === 'attend_records' && Array.isArray(parsed)) {
        const compact = parsed.slice(0, 20).map((r) => {
          if (!r) return r;
          const { selfieUrl, employeeAvatar, ...rest } = r;
          return {
            ...rest,
            employeeAvatar: '',
            selfieUrl: undefined,
          };
        });
        localStorage.setItem(key, JSON.stringify(compact));
        return true;
      }

      // 3. If saving employees, strip massive data-urls if quota is exceeded
      if (key === 'attend_employees' && Array.isArray(parsed)) {
        const compact = parsed.map((e) => {
          if (!e) return e;
          if (e.avatar && e.avatar.length > 1000 && e.avatar.startsWith('data:')) {
            return { ...e, avatar: undefined };
          }
          return e;
        });
        localStorage.setItem(key, JSON.stringify(compact));
        return true;
      }

      // 4. Retry saving with cleaned quota
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, str);
      return true;
    } catch (_) {
      // Mobile device hard storage limit; do not crash React!
      console.warn(`[SafeStorage] Hard quota limit on device for key "${key}". Running safely in memory.`);
      return false;
    }
  }
}

export const KNOWN_DELETED_BRANCH_IDS: string[] = [
  'br_office',
  'br_club_1',
  'br_club_2',
  'br_gas_1',
  'br_cafe_1',
  'br_cafe_2',
  'br_cafe_3',
  'br_warehouse',
];

export const KNOWN_DELETED_EMPLOYEE_IDS: string[] = [
  'emp_1790830636106',
  'emp_1790830699522',
  'emp_1790831369824',
  'emp_1790831431039',
  'emp_1790831475316',
  'emp_1790831527255',
  // Demo employee IDs
  'emp_cf1_1', 'emp_cf1_2', 'emp_cf1_3',
  'emp_cf2_1', 'emp_cf2_2',
  'emp_cf3_1', 'emp_cf3_2', 'emp_cf3_3',
  'emp_cl1_1', 'emp_cl1_2', 'emp_cl1_3', 'emp_cl1_4',
  'emp_cl2_1', 'emp_cl2_2', 'emp_cl2_3',
  'emp_gas_1', 'emp_gas_2', 'emp_gas_3', 'emp_gas_4',
  'emp_off_1', 'emp_off_2', 'emp_off_3', 'emp_off_4',
  'emp_wh_1', 'emp_wh_2', 'emp_wh_3', 'emp_wh_4',
];

/**
 * Deduplicate employees within the same branch and filter out any tombstoned/deleted employees.
 * When duplicates exist (e.g. duplicate accounts with placeholder vs real photo):
 * ALWAYS keeps the one with the real uploaded photo.
 */
export function deduplicateAndFilterEmployees(
  emps: Employee[],
  tombstones: Set<string>
): Employee[] {
  if (!Array.isArray(emps)) return [];

  // 1. Filter out all tombstoned/deleted employee IDs
  const valid = emps.filter((e) => e && e.id && !tombstones.has(e.id));

  // 2. Deduplicate within branch: each branch should only have 1 employee per code
  const codeMap = new Map<string, Employee>();
  for (const emp of valid) {
    const branchKey = emp.branchId || 'nobranch';
    const codeKey = (emp.code || '').trim().toLowerCase();
    const dedupeKey = `${branchKey}___${codeKey}`;

    const existing = codeMap.get(dedupeKey);
    if (!existing) {
      codeMap.set(dedupeKey, emp);
    } else {
      // Conflict resolution:
      // Prefer the one with a real photo (base64 image or custom URL) over default unsplash photo
      const empHasPhoto = Boolean(
        emp.avatar &&
        (emp.avatar.startsWith('data:image') || (!emp.avatar.includes('unsplash') && emp.avatar.length > 300))
      );
      const existHasPhoto = Boolean(
        existing.avatar &&
        (existing.avatar.startsWith('data:image') || (!existing.avatar.includes('unsplash') && existing.avatar.length > 300))
      );

      if (empHasPhoto && !existHasPhoto) {
        // Replace placeholder account with real photo account
        codeMap.set(dedupeKey, emp);
        tombstones.add(existing.id);
      } else if (!empHasPhoto && existHasPhoto) {
        // Keep existing real photo account, tombstone placeholder
        tombstones.add(emp.id);
      } else {
        // Both have photos or neither: keep newest created account
        if (emp.id > existing.id) {
          codeMap.set(dedupeKey, emp);
          tombstones.add(existing.id);
        } else {
          tombstones.add(emp.id);
        }
      }
    }
  }

  return Array.from(codeMap.values());
}

export default function App() {

  // Language State
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('attend_lang') as Language) || 'km';
    } catch {
      return 'km';
    }
  });

  // Persistent Admin Profile (Synced from server & localStorage)
  const [adminProfile, setAdminProfile] = useState<AuthUser>(() => {
    return safeGetJson('attend_admin_profile', DEFAULT_AUTH_USER);
  });

  // Current Logged-in User State (Requires Login on initial open if not already signed in)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return safeGetJson<AuthUser | null>('attend_auth_user', null);
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('attend_auth_user');
      return !saved || saved === 'null' || saved === 'undefined';
    } catch {
      return true;
    }
  });

  // Layout Sidebar Collapse & Mobile State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Real-time Sync Connection State
  const [isLiveSyncConnected, setIsLiveSyncConnected] = useState<boolean>(true);
  const [onlinePeersCount, setOnlinePeersCount] = useState<number>(1);
  const [connectedPeers, setConnectedPeers] = useState<ConnectedPeer[]>([]);
  const [liveToast, setLiveToast] = useState<{ title: string; message: string; type: 'punch' | 'leave' | 'transfer' | 'system' } | null>(null);
  const isReceivingCloudUpdate = useRef<boolean>(false);

  // Cloud Sync readiness check (if another browser or fresh device has no local cache, show sync overlay and load cloud state first)
  const hasLocalCache = Boolean(localStorage.getItem('attend_branches'));
  const [isCloudSyncLoading, setIsCloudSyncLoading] = useState<boolean>(!hasLocalCache);
  const isCloudInitializedRef = useRef<boolean>(hasLocalCache);
  const initialMountSkipped = useRef<boolean>(false);

  // Failsafe: Never let loading overlay block the user for more than 500ms under any network condition
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCloudSyncLoading(false);
      isCloudInitializedRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Tombstone Deletion Tracking: ensures deleted employees stay deleted and never resurrect
  const [deletedEmployeeIds, setDeletedEmployeeIds] = useState<Set<string>>(() => {
    const saved = safeGetJson<string[]>('attend_deleted_employee_ids', []);
    const initialList = Array.isArray(saved) ? saved : [];
    return new Set([...initialList, ...KNOWN_DELETED_EMPLOYEE_IDS]);
  });

  // Tombstone Deletion Tracking: ensures deleted branches stay deleted and never resurrect
  const [deletedBranchIds, setDeletedBranchIds] = useState<Set<string>>(() => {
    const saved = safeGetJson<string[]>('attend_deleted_branch_ids', []);
    return new Set([...(Array.isArray(saved) ? saved : []), ...KNOWN_DELETED_BRANCH_IDS]);
  });

  // Tombstone Deletion Tracking: ensures deleted leaves stay deleted and never resurrect
  const [deletedLeaveIds, setDeletedLeaveIds] = useState<Set<string>>(() => {
    const saved = safeGetJson<string[]>('attend_deleted_leave_ids', []);
    return new Set(Array.isArray(saved) ? saved : []);
  });

  // Persistent Core Data
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = safeGetJson('attend_branches', INITIAL_BRANCHES);
    const tombstoneArr = safeGetJson<string[]>('attend_deleted_branch_ids', []);
    const tombstones = new Set([
      ...(Array.isArray(tombstoneArr) ? tombstoneArr : []),
      ...KNOWN_DELETED_BRANCH_IDS,
    ]);
    const filtered = (Array.isArray(saved) ? saved : []).filter((b: Branch) => !tombstones.has(b.id));
    return filtered.length > 0 ? filtered : INITIAL_BRANCHES.filter((b) => !tombstones.has(b.id));
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = safeGetJson('attend_employees', INITIAL_EMPLOYEES);
    const tombstones = new Set([
      ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
      ...KNOWN_DELETED_EMPLOYEE_IDS,
    ]);
    const cleaned = deduplicateAndFilterEmployees(saved, tombstones);
    try { safeSetJson('attend_employees', JSON.stringify(cleaned)); } catch (_) {}
    return cleaned;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    return safeGetJson('attend_records', INITIAL_ATTENDANCE_RECORDS);
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = safeGetJson('attend_leaves', INITIAL_LEAVE_REQUESTS);
    const tombstoneArr = safeGetJson<string[]>('attend_deleted_leave_ids', []);
    const tombstones = new Set(Array.isArray(tombstoneArr) ? tombstoneArr : []);
    return (Array.isArray(saved) ? saved : []).filter((l: LeaveRequest) => !tombstones.has(l.id));
  });

  const [transferRecords, setTransferRecords] = useState<BranchTransferRecord[]>(() => {
    return safeGetJson('attend_transfers', INITIAL_TRANSFER_RECORDS);
  });

  const [branchTypes, setBranchTypes] = useState<BranchTypeConfig[]>(() => {
    return safeGetJson('attend_branch_types', INITIAL_BRANCH_TYPES);
  });

  // Company Branding State
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    return safeGetJson('attend_branding', INITIAL_BRANDING);
  });

  // Role Permissions (RBAC) State
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(() => {
    return safeGetJson('attend_role_permissions', INITIAL_ROLE_PERMISSIONS);
  });

  // System Settings & Broadcast State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    return safeGetJson('attend_system_settings', INITIAL_SYSTEM_SETTINGS);
  });

  // Working Shifts State (Barista, Gas Station, Office, Warehouse)
  const [shifts, setShifts] = useState<Shift[]>(() => {
    return safeGetJson('attend_shifts', INITIAL_SHIFTS);
  });

  // Administrative Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    return safeGetJson('attend_audit_logs', INITIAL_AUDIT_LOGS);
  });

  // Real-time Action Alerts State (instant feedback for all staff activities)
  const [alertsClearedAt, setAlertsClearedAt] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('attend_alerts_cleared_at') || 0);
    } catch {
      return 0;
    }
  });

  const [actionAlerts, setActionAlerts] = useState<ActionAlertItem[]>(() => {
    const saved = safeGetJson('attend_staff_alerts', []);
    try {
      const clearedAt = Number(localStorage.getItem('attend_alerts_cleared_at') || 0);
      if (clearedAt > 0 && Array.isArray(saved)) {
        return saved.filter((a: ActionAlertItem) => (a.rawTimestamp || 0) > clearedAt);
      }
    } catch {}
    return Array.isArray(saved) ? saved : [];
  });

  // Staff Device Reminder Alert State (rings phone/device for Check-In / Check-Out)
  const [activeStaffReminder, setActiveStaffReminder] = useState<StaffReminderPayload | null>(null);
  const autoRemindedCheckInRef = useRef<string>('');
  const autoRemindedCheckOutRef = useRef<string>('');

  const addActionAlert = (alert: Omit<ActionAlertItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string; rawTimestamp?: number }) => {
    const rawTime = alert.rawTimestamp || Date.now();
    const newAlert: ActionAlertItem = {
      ...alert,
      id: alert.id || `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: alert.timestamp || new Date(rawTime).toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rawTimestamp: rawTime,
      isUnread: alert.isUnread !== undefined ? alert.isUnread : true,
    };
    setActionAlerts((prev) => {
      const filtered = prev.filter((a) => a.id !== newAlert.id);
      const nextAlerts = [newAlert, ...filtered].slice(0, 50);
      try {
        safeSetJson('attend_staff_alerts', JSON.stringify(nextAlerts));
      } catch {}
      return nextAlerts;
    });
  };

  const handleClearAlerts = () => {
    const now = Date.now();
    setAlertsClearedAt(now);
    try {
      safeSetJson('attend_alerts_cleared_at', String(now));
      safeSetJson('attend_staff_alerts', JSON.stringify([]));
    } catch {}
    setActionAlerts([]);
    clearStaffAlertsFromTurso(now);
    clearStaffAlertsFromSupabase(now);
    realtimeService.emit('ACTION_ALERT', { action: 'CLEAR_ALL', clearedAt: now });
  };

  const handleDismissAlert = (alertId: string) => {
    setActionAlerts((prev) => {
      const nextAlerts = prev.filter((a) => a.id !== alertId);
      safeSetJson('attend_staff_alerts', JSON.stringify(nextAlerts));
      return nextAlerts;
    });
    deleteSingleStaffAlertFromTurso(alertId);
    deleteSingleStaffAlertFromSupabase(alertId);
    realtimeService.emit('ACTION_ALERT', { action: 'DISMISS_ONE', alertId });
  };

  const showLiveAlert = (title: string, message: string, type: 'punch' | 'leave' | 'transfer' | 'system') => {
    setLiveToast({ title, message, type });
    setTimeout(() => setLiveToast(null), 5000);
    playAlertChime(type === 'leave' ? 'leave' : type === 'punch' ? 'punch' : 'alert');
  };

  // Keep actionAlerts populated with pending leave requests and recent staff attendance punches, sorted chronologically
  useEffect(() => {
    const recentPunches: ActionAlertItem[] = attendanceRecords
      .filter((r) => {
        const timeMs = r.timestamp ? new Date(r.timestamp).getTime() : 0;
        return timeMs > alertsClearedAt;
      })
      .slice(0, 30)
      .map((r) => {
        const empName = lang === 'km' ? (r.employeeNameKh || r.employeeNameEn) : (r.employeeNameEn || r.employeeNameKh);
        const actionType = r.type === 'check_in' 
          ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
          : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');
        const timeMs = r.timestamp ? new Date(r.timestamp).getTime() : Date.now();
        const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

        const isException = r.locationExceptionStatus === 'pending' || r.method === 'weak_gps_exception';
        const isWifi = r.isWifiVerified || r.verifiedBy === 'wifi_ip';

        let titleKh = 'វត្តមានស្កេន GPS ជោគជ័យ';
        let titleEn = 'GPS Scan Punch Verified';
        if (isException) {
          titleKh = '📍 ស្នើសុំអនុម័តវត្តមានលើកលែង (GPS ក្នុងអគារ)';
          titleEn = '📍 Pending Weak GPS Exception Review';
        } else if (isWifi) {
          titleKh = '📶 វត្តមានស្កេនជោគជ័យ (Wi-Fi/IP សាខា)';
          titleEn = '📶 Verified via Office Wi-Fi/IP';
        } else if (!r.isWithinGeofence) {
          titleKh = '⚠️ វត្តមានស្កេនខុសទីតាំង Geofence';
          titleEn = '⚠️ Geofence Distance Warning';
        }

        let detailKh = `${empName} ${actionType} - ${r.branchNameKh || r.branchNameEn || ''} (${r.isWithinGeofence ? 'ត្រឹមត្រូវតាម GPS' : `លើសដែនកំណត់ ${Math.round(r.distanceToBranch || 0)}m`})`;
        let detailEn = `${empName} ${actionType} - ${r.branchNameEn || ''} (${r.isWithinGeofence ? 'Within GPS Geofence' : `${Math.round(r.distanceToBranch || 0)}m Out of Range`})`;

        if (isException) {
          detailKh = `${empName} ស្នើសុំចុះវត្តមានលើកលែងដោយសារ GPS ខ្សោយក្នុងអគារ (${Math.round(r.distanceToBranch || 0)}m, ±${r.accuracyMeters || 0}m)`;
          detailEn = `${empName} requested exception punch due to weak indoor GPS (${Math.round(r.distanceToBranch || 0)}m, ±${r.accuracyMeters || 0}m)`;
        } else if (isWifi) {
          detailKh = `${empName} ${actionType} - បានផ្ទៀងផ្ទាត់តាម Wi-Fi/IP សាខា (${r.ipAddress || 'Office IP'})`;
          detailEn = `${empName} ${actionType} - Verified via Branch Wi-Fi/IP (${r.ipAddress || 'Office IP'})`;
        }

        return {
          id: `alert_att_${r.id}`,
          type: 'punch' as const,
          titleKh,
          titleEn,
          detailKh,
          detailEn,
          timestamp: timeStr || r.timestamp || '',
          rawTimestamp: timeMs,
          actorName: empName,
          actorAvatar: r.employeeAvatar,
          branchId: r.branchId,
          branchName: r.branchNameKh || r.branchNameEn,
          isUnread: isException,
        };
      });

    const pendingLeaves: ActionAlertItem[] = leaveRequests
      .filter((r) => {
        if (r.status !== 'pending') return false;
        const timeMs = r.appliedAt ? new Date(r.appliedAt).getTime() : 0;
        return timeMs > alertsClearedAt;
      })
      .map((r) => {
        const timeMs = r.appliedAt ? new Date(r.appliedAt).getTime() : Date.now();
        return {
          id: `alert_leave_${r.id}`,
          type: 'leave_submit' as const,
          titleKh: 'សំណើសុំច្បាប់រង់ចាំអនុម័ត',
          titleEn: 'Pending Leave Approval',
          detailKh: `${r.employeeNameKh || r.employeeNameEn}: ${r.reason} (${r.typeKh || r.category || 'ច្បាប់'})`,
          detailEn: `${r.employeeNameEn || 'Staff'}: ${r.reason} (${r.startDate} → ${r.endDate})`,
          timestamp: r.appliedAt ? new Date(r.appliedAt).toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : (r.appliedAt || ''),
          rawTimestamp: timeMs,
          isUnread: true,
          leaveRequestId: r.id,
          actorName: r.employeeNameKh || r.employeeNameEn,
          actorAvatar: r.employeeAvatar,
        };
      });

    setActionAlerts((prev) => {
      // Retain live alerts (such as staff logins and recent active punches) that were pushed live and occurred after alertsClearedAt
      const liveCustomAlerts = prev.filter(
        (a) => !a.id.startsWith('alert_leave_') && !a.id.startsWith('alert_att_') && (a.rawTimestamp || 0) > alertsClearedAt
      );
      const combined = [
        ...liveCustomAlerts,
        ...recentPunches,
        ...pendingLeaves,
      ];
      const seen = new Set<string>();
      const result: ActionAlertItem[] = [];
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
      // Sort strictly by rawTimestamp descending so the newest event is ALWAYS first (at index 0)
      result.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
      return result.slice(0, 50);
    });
  }, [leaveRequests, attendanceRecords, lang, alertsClearedAt]);

  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferTargetEmp, setTransferTargetEmp] = useState<Employee | null>(null);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [onlineCardEmp, setOnlineCardEmp] = useState<Employee | null>(null);

  // Auto-detect URL parameters for ready-to-view scanned digital card (e.g. ?viewCard=EMP_CODE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const codeOrId = params.get('viewCard') || params.get('verify') || params.get('badge') || params.get('card');
      if (codeOrId) {
        const found = employees.find(
          (e) => e.code.toLowerCase() === codeOrId.toLowerCase() || e.id.toLowerCase() === codeOrId.toLowerCase()
        );
        if (found) {
          setOnlineCardEmp(found);
        }
      }
    };
    checkUrlParams();
    window.addEventListener('popstate', checkUrlParams);
    return () => window.removeEventListener('popstate', checkUrlParams);
  }, [employees]);

  // Default active tab: if employee, open portal, else dashboard
  const [activeTab, setActiveTab] = useState<string>(() => {
    return currentUser?.role === 'employee' ? 'portal' : 'dashboard';
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Live GPS state: load fast from session storage or fallback
  const [currentGeo, setCurrentGeo] = useState<UserGeoLocation>(() => {
    try {
      const saved = sessionStorage.getItem('attend_last_known_geo');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    return {
      lat: 11.55802,
      lng: 104.92804,
      accuracy: 10,
      timestamp: Date.now(),
      isReal: false,
      label: 'Initial Location',
    };
  });

  // Automatically acquire real browser GPS coordinates on app load (Two-tier fast lock)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Tier 1: Fast network / cellular / Wi-Fi lock (< 100ms)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = Math.round(pos.coords.accuracy);
          const geo: UserGeoLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: acc,
            timestamp: pos.timestamp,
            isReal: true,
            label: `Live GPS (±${acc}m)`,
          };
          setCurrentGeo(geo);
          try { sessionStorage.setItem('attend_last_known_geo', JSON.stringify(geo)); } catch (_) {}
        },
        () => {},
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
      );

      // Tier 2: Refined high accuracy GPS satellites
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = Math.round(pos.coords.accuracy);
          const geo: UserGeoLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: acc,
            timestamp: pos.timestamp,
            isReal: true,
            label: `Live GPS (±${acc}m)`,
          };
          setCurrentGeo(geo);
          try { sessionStorage.setItem('attend_last_known_geo', JSON.stringify(geo)); } catch (_) {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    }
  }, []);

  // Update Real-time Service user context
  useEffect(() => {
    realtimeService.setUserContext(currentUser);
  }, [currentUser]);

  // Initial Cloud & Canonical State Fetch on Device Startup / Page Load
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        // Fast-path: Fetch Turso SQLite Cloud (Primary Authoritative Cloud)
        const tState = await fetchInitialTursoData().catch(() => null);

        let cState: any = null;
        let suState: any = null;
        // If Turso is unconfigured or empty, fall back to Firestore and Supabase
        if (!tState || !tState.branches || tState.branches.length === 0) {
          const [cloudStateRes, supabaseRes] = await Promise.allSettled([
            getCloudDatabaseState(),
            fetchInitialSupabaseData(),
          ]);
          cState = cloudStateRes.status === 'fulfilled' ? cloudStateRes.value : null;
          suState = (supabaseRes.status === 'fulfilled' && supabaseRes.value) ? supabaseRes.value : null;
        }

        if (!isMounted) return;

        // Prioritize populated datasets to ensure no empty overwrites (Turso SQLite Cloud first)
        const bestBranches = (tState && Array.isArray(tState.branches) && tState.branches.length > 0)
          ? tState.branches
          : (suState && Array.isArray(suState.branches) && suState.branches.length > 0)
            ? suState.branches
            : (cState && Array.isArray(cState.branches) && cState.branches.length > 0)
              ? cState.branches
              : null;

        const bestEmployees = (tState && Array.isArray(tState.employees) && tState.employees.length > 0)
          ? tState.employees
          : (suState && Array.isArray(suState.employees) && suState.employees.length > 0)
            ? suState.employees
            : (cState && Array.isArray(cState.employees) && cState.employees.length > 0)
              ? cState.employees
              : null;

        const bestRecords = mergeDatasets(
          (tState?.attendanceRecords || []),
          mergeDatasets(
            (suState?.attendanceRecords || []),
            (cState?.attendanceRecords || [])
          )
        );

        const bestLeaves = (tState && Array.isArray(tState.leaveRequests) && tState.leaveRequests.length > 0)
          ? tState.leaveRequests
          : (suState && Array.isArray(suState.leaveRequests) && suState.leaveRequests.length > 0)
            ? suState.leaveRequests
            : (cState?.leaveRequests || []);

        const bestTransfers = (tState && Array.isArray(tState.transferRecords) && tState.transferRecords.length > 0)
          ? tState.transferRecords
          : (suState && Array.isArray(suState.transferRecords) && suState.transferRecords.length > 0)
            ? suState.transferRecords
            : (cState?.transferRecords || []);

        const bestBranchTypes = (tState && Array.isArray(tState.branchTypes) && tState.branchTypes.length > 0)
          ? tState.branchTypes
          : (suState && Array.isArray(suState.branchTypes) && suState.branchTypes.length > 0)
            ? suState.branchTypes
            : (cState?.branchTypes || []);

        const bestBranding = tState?.branding || suState?.branding || cState?.branding;
        const bestRolePerms = (tState && Array.isArray(tState.rolePermissions) && tState.rolePermissions.length > 0)
          ? tState.rolePermissions
          : (suState && Array.isArray(suState.rolePermissions) && suState.rolePermissions.length > 0)
            ? suState.rolePermissions
            : (cState?.rolePermissions || []);
        const bestSettings = tState?.systemSettings || suState?.systemSettings || cState?.systemSettings;
        const bestAdmin = tState?.adminProfile || suState?.adminProfile || cState?.adminProfile;
        const bestAudit = (tState && Array.isArray(tState.auditLogs) && tState.auditLogs.length > 0)
          ? tState.auditLogs
          : (suState && Array.isArray(suState.auditLogs) && suState.auditLogs.length > 0)
            ? suState.auditLogs
            : (cState?.auditLogs || []);
        const bestShifts = (tState && Array.isArray(tState.shifts) && tState.shifts.length > 0)
          ? tState.shifts
          : (suState && Array.isArray(suState.shifts) && suState.shifts.length > 0)
            ? suState.shifts
            : (cState?.shifts || []);
        const bestAlerts = (tState && Array.isArray(tState.staffAlerts) && tState.staffAlerts.length > 0)
          ? tState.staffAlerts
          : (suState && Array.isArray(suState.staffAlerts) && suState.staffAlerts.length > 0)
            ? suState.staffAlerts
            : (cState?.staffAlerts || []);

        const effectiveClearedAt = Math.max(
          alertsClearedAt,
          Number(localStorage.getItem('attend_alerts_cleared_at') || 0),
          Number((tState as any)?.alertsClearedAt || 0),
          Number((suState as any)?.alertsClearedAt || 0)
        );
        if (effectiveClearedAt > alertsClearedAt) {
          setAlertsClearedAt(effectiveClearedAt);
          try { safeSetJson('attend_alerts_cleared_at', String(effectiveClearedAt)); } catch (_) {}
        }

        const branchTombstones = new Set([
          ...safeGetJson<string[]>('attend_deleted_branch_ids', []),
          ...KNOWN_DELETED_BRANCH_IDS,
          ...(Array.isArray((suState as any)?.deletedBranchIds) ? (suState as any).deletedBranchIds : []),
        ]);

        const leaveTombstones = new Set([
          ...safeGetJson<string[]>('attend_deleted_leave_ids', []),
          ...(Array.isArray((suState as any)?.deletedLeaveIds) ? (suState as any).deletedLeaveIds : []),
        ]);

        if (bestBranches && bestBranches.length > 0) {
          setBranches((prev) => {
            const merged = mergeDatasets(prev, bestBranches).filter((b: Branch) => !branchTombstones.has(b.id));
            safeSetJson('attend_branches', JSON.stringify(merged));
            return merged;
          });
        }

        if (bestEmployees && bestEmployees.length > 0) {
          setEmployees((prev) => {
            const tombstones = new Set([
              ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
              ...KNOWN_DELETED_EMPLOYEE_IDS,
              ...(Array.isArray((suState as any)?.deletedEmployeeIds) ? (suState as any).deletedEmployeeIds : []),
            ]);
            const merged = mergeDatasets(prev, bestEmployees);
            const cleaned = deduplicateAndFilterEmployees(merged, tombstones);
            safeSetJson('attend_employees', JSON.stringify(cleaned));
            return cleaned;
          });
          setCurrentUser((curr) => {
            if (curr && curr.role !== 'admin') {
              const liveEmp = bestEmployees.find(
                (e: Employee) =>
                  e.id === curr.employeeId ||
                  e.code === curr.employeeCode ||
                  e.id === curr.id ||
                  `user_${e.id}` === curr.id ||
                  (curr.email && e.email && e.email.toLowerCase() === curr.email.toLowerCase())
              );
              if (liveEmp) {
                const updated = {
                  ...curr,
                  avatar: liveEmp.avatar || curr.avatar,
                  branchId: liveEmp.branchId || curr.branchId,
                  nameKh: liveEmp.nameKh || curr.nameKh,
                  nameEn: liveEmp.nameEn || curr.nameEn,
                  roleTitle: liveEmp.role || curr.roleTitle,
                };
                safeSetJson('attend_auth_user', JSON.stringify(updated));
                return updated;
              }
            }
            return curr;
          });
        }

        if (bestRecords.length > 0) {
          setAttendanceRecords((prev) => {
            const merged = mergeDatasets(prev, bestRecords);
            try { safeSetJson('attend_records', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
        }

        if (bestLeaves.length > 0) {
          const validLeaves = bestLeaves.filter((l: LeaveRequest) => !leaveTombstones.has(l.id));
          setLeaveRequests(validLeaves);
          safeSetJson('attend_leaves', JSON.stringify(validLeaves));
        }

        if (bestTransfers.length > 0) {
          setTransferRecords(bestTransfers);
          safeSetJson('attend_transfers', JSON.stringify(bestTransfers));
        }

        if (bestBranchTypes.length > 0) {
          setBranchTypes(bestBranchTypes);
          safeSetJson('attend_branch_types', JSON.stringify(bestBranchTypes));
        }

        if (bestBranding) {
          setBranding(bestBranding);
          safeSetJson('attend_branding', JSON.stringify(bestBranding));
        }

        if (bestRolePerms.length > 0) {
          setRolePermissions(bestRolePerms);
          safeSetJson('attend_role_permissions', JSON.stringify(bestRolePerms));
        }

        if (bestSettings && Object.keys(bestSettings).length > 0) {
          setSystemSettings(bestSettings);
          safeSetJson('attend_system_settings', JSON.stringify(bestSettings));
        }

        if (bestAdmin) {
          setAdminProfile(bestAdmin);
          safeSetJson('attend_admin_profile', JSON.stringify(bestAdmin));
          setCurrentUser((curr) => {
            if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
              const updated = { ...curr, ...bestAdmin };
              safeSetJson('attend_auth_user', JSON.stringify(updated));
              return updated;
            }
            return curr;
          });
        }

        if (bestAudit.length > 0) {
          setAuditLogs(bestAudit);
          safeSetJson('attend_audit_logs', JSON.stringify(bestAudit));
        }

        if (bestShifts.length > 0) {
          setShifts(bestShifts);
          safeSetJson('attend_shifts', JSON.stringify(bestShifts));
        }

        if (bestAlerts.length > 0) {
          const freshAlerts = bestAlerts.filter((a: any) => (a.rawTimestamp || 0) > effectiveClearedAt);
          setActionAlerts((prev) => {
            const prevIds = new Set(prev.map((a) => a.id));
            const newIncoming = freshAlerts.filter((a: any) => !prevIds.has(a.id));
            const merged = [...newIncoming, ...prev].filter((a: any) => (a.rawTimestamp || 0) > effectiveClearedAt);
            merged.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
            return merged.slice(0, 50);
          });
        }

        // Auto-heal any store that had missing/empty data
        if (bestEmployees && bestEmployees.length > 0 && bestBranches && bestBranches.length > 0) {
          const reconciledPayload = {
            branches: bestBranches.filter((b: Branch) => !branchTombstones.has(b.id)),
            employees: bestEmployees,
            attendanceRecords: bestRecords,
            leaveRequests: bestLeaves.filter((l: LeaveRequest) => !leaveTombstones.has(l.id)),
            transferRecords: bestTransfers,
            branchTypes: bestBranchTypes,
            branding: bestBranding,
            rolePermissions: bestRolePerms,
            systemSettings: bestSettings,
            adminProfile: bestAdmin,
            auditLogs: bestAudit,
            shifts: bestShifts,
          };

          // Re-sync Turso SQLite Cloud if Turso had 0 emps
          if (!tState || !Array.isArray(tState.employees) || tState.employees.length === 0) {
            syncStateToTurso(reconciledPayload);
          }

          // Re-sync Firestore if Firestore had 0 emps
          if (!cState || !Array.isArray(cState.employees) || cState.employees.length === 0) {
            syncStateToCloudImmediate(reconciledPayload);
          }

          // Re-sync Supabase if Supabase had 0 emps
          if (!suState || !Array.isArray(suState.employees) || suState.employees.length === 0) {
            syncStateToSupabase(reconciledPayload);
          }
        }

        setTimeout(() => {
          isReceivingCloudUpdate.current = false;
        }, 400);
      } catch (err) {
        console.warn('Failed to fetch initial canonical state:', err);
      } finally {
        if (isMounted) {
          isCloudInitializedRef.current = true;
          setIsCloudSyncLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time Sync Event Listeners
  useEffect(() => {
    testFirestoreConnection();

    // Subscribe to Firebase Cloud Firestore connectivity
    const unsubCloud = subscribeCloudConnectionStatus((status) => {
      // Keep live sync actively connected
      setIsLiveSyncConnected(true);
    });

    const unsubConnection = realtimeService.subscribeConnection((connected) => {
      if (connected) {
        setIsLiveSyncConnected(true);
      }
    });

    const unsubPresence = realtimeService.subscribePresence((peers, count) => {
      setConnectedPeers(peers);
      setOnlinePeersCount(Math.max(1, count));
    });

    const unsubSync = realtimeService.subscribe((message: SyncMessage) => {
      const { type, payload, senderName } = message;

      if (type === 'SYSTEM_STATE_SYNC' || type === 'CANONICAL_STATE_RESPONSE') {
        const s = payload?.state;
        if (s && (s.isReset === true || s.isRestore === true)) {
          if (Array.isArray(s.branches)) {
            setBranches(s.branches);
            safeSetJson('attend_branches', JSON.stringify(s.branches));
          }
          if (Array.isArray(s.employees)) {
            setEmployees(s.employees);
            safeSetJson('attend_employees', JSON.stringify(s.employees));
          }
          if (Array.isArray(s.attendanceRecords)) {
            setAttendanceRecords(s.attendanceRecords);
            safeSetJson('attend_records', JSON.stringify(s.attendanceRecords));
          }
          if (Array.isArray(s.leaveRequests)) {
            setLeaveRequests(s.leaveRequests);
            safeSetJson('attend_leaves', JSON.stringify(s.leaveRequests));
          }
          if (Array.isArray(s.transferRecords)) {
            setTransferRecords(s.transferRecords);
            safeSetJson('attend_transfers', JSON.stringify(s.transferRecords));
          }
          if (s.branding) {
            setBranding(s.branding);
            safeSetJson('attend_branding', JSON.stringify(s.branding));
          }
          if (Array.isArray(s.rolePermissions)) {
            setRolePermissions(s.rolePermissions);
            safeSetJson('attend_role_permissions', JSON.stringify(s.rolePermissions));
          }
          if (s.systemSettings) {
            setSystemSettings(s.systemSettings);
            safeSetJson('attend_system_settings', JSON.stringify(s.systemSettings));
          }
          if (s.adminProfile) {
            setAdminProfile(s.adminProfile);
            safeSetJson('attend_admin_profile', JSON.stringify(s.adminProfile));
            setCurrentUser((curr) => {
              if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
                const updated = { ...curr, ...s.adminProfile };
                safeSetJson('attend_auth_user', JSON.stringify(updated));
                return updated;
              }
              return curr;
            });
          }
        }
      } else if (type === 'UPDATE_USER_PROFILE' && payload) {
        const { user, employee } = payload;
        if (user && (user.role === 'admin' || user.id === 'user_admin' || user.username === 'admin')) {
          setAdminProfile(user);
          safeSetJson('attend_admin_profile', JSON.stringify(user));
          setCurrentUser((curr) => {
            if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
              const updated = { ...curr, ...user };
              safeSetJson('attend_auth_user', JSON.stringify(updated));
              return updated;
            }
            return curr;
          });
        }

        const effectiveEmp = employee || (user ? employees.find((e) =>
          e.id === user.employeeId ||
          (user.employeeId && e.id === user.employeeId.replace('user_', '')) ||
          e.code === user.employeeCode ||
          e.id === user.id ||
          `user_${e.id}` === user.id ||
          (user.username && e.code.toLowerCase() === user.username.toLowerCase()) ||
          (user.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
        ) : null);

        if (effectiveEmp && (employee?.id || user?.avatar)) {
          const empId = effectiveEmp.id;
          const newAvatar = employee?.avatar || user?.avatar;
          setEmployees((prev) => {
            const next = prev.map((e) =>
              e.id === empId
                ? {
                    ...e,
                    ...effectiveEmp,
                    ...(newAvatar ? { avatar: newAvatar } : {}),
                    ...(user?.nameKh ? { nameKh: user.nameKh } : {}),
                    ...(user?.nameEn ? { nameEn: user.nameEn } : {}),
                    ...(user?.pinCode ? { pinCode: user.pinCode } : {}),
                  }
                : e
            );
            safeSetJson('attend_employees', JSON.stringify(next));
            return next;
          });

          if (newAvatar) {
            setAttendanceRecords((prev) => {
              const next = prev.map((r) =>
                r.employeeId === empId
                  ? {
                      ...r,
                      employeeAvatar: newAvatar,
                      employeeNameKh: user?.nameKh || effectiveEmp.nameKh || r.employeeNameKh,
                      employeeNameEn: user?.nameEn || effectiveEmp.nameEn || r.employeeNameEn,
                    }
                  : r
              );
              safeSetJson('attend_records', JSON.stringify(next));
              return next;
            });
          }

          setCurrentUser((curr) => {
            if (
              curr &&
              (curr.employeeId === empId ||
                curr.id === empId ||
                curr.id === `user_${empId}` ||
                curr.employeeCode === effectiveEmp.code)
            ) {
              const updated = {
                ...curr,
                avatar: newAvatar || curr.avatar,
                nameKh: user?.nameKh || effectiveEmp.nameKh || curr.nameKh,
                nameEn: user?.nameEn || effectiveEmp.nameEn || curr.nameEn,
                pinCode: user?.pinCode || effectiveEmp.pinCode || curr.pinCode,
                branchId: effectiveEmp.branchId || curr.branchId,
              };
              safeSetJson('attend_auth_user', JSON.stringify(updated));
              return updated;
            }
            return curr;
          });
        }
      } else if (type === 'PUNCH_ATTENDANCE' && payload) {
        const record: AttendanceRecord = payload.record || payload;
        if (!record || !record.id) return;

        if (message.senderId && message.senderId === realtimeService.getClientId()) {
          return;
        }

        setAttendanceRecords((prev) => {
          if (prev.some((r) => r.id === record.id)) return prev;
          const next = [record, ...prev];
          try {
            safeSetJson('attend_records', JSON.stringify(next));
          } catch (_) {}
          return next;
        });

        const empName = lang === 'km' ? (record.employeeNameKh || record.employeeNameEn) : (record.employeeNameEn || record.employeeNameKh);
        const actionType = record.type === 'check_in' 
          ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
          : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');
        const punchTimeMs = record.timestamp ? new Date(record.timestamp).getTime() : Date.now();
        
        addActionAlert({
          type: 'punch',
          titleKh: record.isWithinGeofence ? 'វត្តមានស្កេន GPS ថ្មី' : '⚠️ វត្តមានស្កេនខុសទីតាំង Geofence',
          titleEn: record.isWithinGeofence ? 'Real-time GPS Scan Punch' : '⚠️ Geofence Distance Warning',
          detailKh: `${empName} ${actionType} - ${record.branchNameKh || record.branchNameEn || ''} (${record.isWithinGeofence ? 'ក្នុងរង្វង់ GPS' : `ចម្ងាយ ${Math.round(record.distanceToBranch || 0)}m`})`,
          detailEn: `${empName} ${actionType} - ${record.branchNameEn || ''} (${record.isWithinGeofence ? 'Within GPS Geofence' : `${Math.round(record.distanceToBranch || 0)}m Out of Range`})`,
          actorName: empName,
          actorAvatar: record.employeeAvatar,
          branchId: record.branchId,
          branchName: record.branchNameKh || record.branchNameEn,
          rawTimestamp: punchTimeMs,
          isUnread: true,
        });

        playAlertChime('punch');
        showLiveAlert(
          lang === 'km' ? '🟢 វត្តមានស្កេន GPS ថ្មី (Live Sync)' : '🟢 Real-time GPS Punch Synced',
          `${empName} ${actionType} - ${record.branchNameEn || ''}`,
          'punch'
        );
      } else if (type === 'STAFF_LOGIN' && payload) {
        if (message.senderId && message.senderId === realtimeService.getClientId()) {
          return;
        }
        const user = payload.user || payload;
        const matchedEmp = payload.employee || employees.find((e) => e.id === user?.employeeId || e.code === user?.employeeCode);
        const branch = payload.branch || branches.find((b) => b.id === (user?.branchId || matchedEmp?.branchId));
        const empName = lang === 'km' 
          ? (user?.nameKh || matchedEmp?.nameKh || user?.nameEn || user?.username)
          : (user?.nameEn || matchedEmp?.nameEn || user?.nameKh || user?.username);
        const branchName = branch ? (lang === 'km' ? branch.nameKh : branch.nameEn) : '';
        const empCode = user?.employeeCode || matchedEmp?.code || user?.username || '';

        addActionAlert({
          type: 'login',
          titleKh: 'បុគ្គលិកបានចូលប្រើប្រព័ន្ធ',
          titleEn: 'Staff Logged In',
          detailKh: `${empName} (${empCode}) បានចូលប្រើប្រព័ន្ធជោគជ័យ${branchName ? ` - ${branchName}` : ''}`,
          detailEn: `${empName} (${empCode}) logged in successfully${branchName ? ` - ${branchName}` : ''}`,
          actorName: empName,
          actorAvatar: user?.avatar || matchedEmp?.avatar,
          branchId: branch?.id,
          branchName: branchName,
          rawTimestamp: Date.now(),
          isUnread: true,
        });

        showLiveAlert(
          lang === 'km' ? '👤 បុគ្គលិកបានចូលប្រើប្រព័ន្ធ' : '👤 Staff Logged In',
          `${empName} (${empCode})${branchName ? ` • ${branchName}` : ''}`,
          'system'
        );
      } else if (type === 'ACTION_ALERT' && payload) {
        if (payload.action === 'CLEAR_ALL') {
          const clearedTime = payload.clearedAt || Date.now();
          setAlertsClearedAt(clearedTime);
          try {
            safeSetJson('attend_alerts_cleared_at', String(clearedTime));
            safeSetJson('attend_staff_alerts', JSON.stringify([]));
          } catch {}
          setActionAlerts([]);
        } else if (payload.action === 'DISMISS_ONE' && payload.alertId) {
          setActionAlerts((prev) => {
            const next = prev.filter((a) => a.id !== payload.alertId);
            safeSetJson('attend_staff_alerts', JSON.stringify(next));
            return next;
          });
        }
      } else if ((type === 'SUBMIT_LEAVE' || type === 'SUBMIT_LEAVE_REQUEST') && payload) {
        // If message was originated by this client, skip duplicate toast and chime
        if (message.senderId && message.senderId === realtimeService.getClientId()) {
          return;
        }

        isReceivingCloudUpdate.current = true;
        setLeaveRequests((prev) => {
          if (prev.some((l) => l.id === payload.id)) return prev;
          return [payload, ...prev];
        });

        playAlertChime('leave');

        addActionAlert({
          type: 'leave_submit',
          titleKh: 'សំណើសុំច្បាប់ថ្មី',
          titleEn: 'New Staff Leave Request',
          detailKh: `${payload.employeeNameKh || payload.employeeNameEn || 'បុគ្គលិក'}: ${payload.reason || ''} (${payload.typeKh || payload.category || 'ច្បាប់'})`,
          detailEn: `${payload.employeeNameEn || 'Staff'}: ${payload.reason || ''} (${payload.startDate} → ${payload.endDate})`,
          leaveRequestId: payload.id,
          actorName: payload.employeeNameKh || payload.employeeNameEn,
          actorAvatar: payload.employeeAvatar,
        });

        showLiveAlert(
          lang === 'km' ? '📋 ស្នើសុំច្បាប់ថ្មី (Live Sync)' : '📋 New Leave Request',
          `${payload.employeeNameKh || payload.employeeNameEn || 'Staff'}: ${payload.reason || ''} (${payload.startDate} → ${payload.endDate})`,
          'leave'
        );

        setTimeout(() => {
          isReceivingCloudUpdate.current = false;
        }, 500);
      } else if (type === 'UPDATE_LEAVE_STATUS' && payload) {
        // If message was originated by this client, skip duplicate toast and chime
        if (message.senderId && message.senderId === realtimeService.getClientId()) {
          return;
        }

        isReceivingCloudUpdate.current = true;
        const { requestId, status, approvedBy, comment } = payload;
        setLeaveRequests((prev) =>
          prev.map((l) =>
            l.id === requestId
              ? {
                  ...l,
                  status,
                  approvedBy: approvedBy || l.approvedBy,
                  adminComment: comment || l.adminComment,
                }
              : l
          )
        );

        setTimeout(() => {
          isReceivingCloudUpdate.current = false;
        }, 500);

        addActionAlert({
          type: 'leave_status',
          titleKh: status === 'approved' ? 'ការអនុម័តច្បាប់ (Approved)' : 'ការបដិសេធច្បាប់ (Rejected)',
          titleEn: `Leave Request ${status.toUpperCase()}`,
          detailKh: `ពាក្យសុំច្បាប់ត្រូវបាន ${status === 'approved' ? 'អនុម័ត' : 'បដិសេធ'} ដោយ ${approvedBy || 'Admin'}${comment ? ` ("${comment}")` : ''}`,
          detailEn: `Request ${status.toUpperCase()} by ${approvedBy || 'Admin'}${comment ? ` ("${comment}")` : ''}`,
          leaveRequestId: requestId,
          actorName: approvedBy,
        });

        showLiveAlert(
          lang === 'km' ? '⚖️ ការអនុម័តច្បាប់ (Live Sync)' : '⚖️ Leave Status Updated',
          `Request status updated to "${status.toUpperCase()}"`,
          'leave'
        );
      } else if (type === 'TRANSFER_EMPLOYEE' && payload) {
        const record: BranchTransferRecord = payload;
        setTransferRecords((prev) => {
          if (prev.some((t) => t.id === record.id)) return prev;
          return [record, ...prev];
        });
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === record.employeeId
              ? {
                  ...e,
                  branchId: record.toBranchId,
                  gpsCalibratedBranchId: undefined, // Reset GPS lock so staff can calibrate for the new branch for the 1st time
                  gpsCalibratedAt: undefined,
                }
              : e
          )
        );
        showLiveAlert(
          lang === 'km' ? '🔄 ផ្ទេរបុគ្គលិក (Live Sync)' : '🔄 Staff Transfer Synced',
          `${record.employeeNameEn}: ${record.fromBranchNameEn} ➔ ${record.toBranchNameEn}`,
          'transfer'
        );
      } else if (type === 'ADD_EMPLOYEE' && payload) {
        setEmployees((prev) => {
          if (prev.some((e) => e.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      } else if (type === 'UPDATE_EMPLOYEE' && payload) {
        setEmployees((prev) => {
          const next = prev.map((e) => (e.id === payload.id ? { ...e, ...payload } : e));
          safeSetJson('attend_employees', JSON.stringify(next));
          return next;
        });
        if (payload.avatar) {
          setAttendanceRecords((prev) => {
            const next = prev.map((r) =>
              r.employeeId === payload.id
                ? {
                    ...r,
                    employeeAvatar: payload.avatar,
                    employeeNameKh: payload.nameKh || r.employeeNameKh,
                    employeeNameEn: payload.nameEn || r.employeeNameEn,
                  }
                : r
            );
            safeSetJson('attend_records', JSON.stringify(next));
            return next;
          });
        }
        setCurrentUser((curr) => {
          if (
            curr &&
            (curr.employeeId === payload.id ||
              curr.id === payload.id ||
              curr.id === `user_${payload.id}` ||
              curr.employeeCode === payload.code)
          ) {
            const updated = {
              ...curr,
              nameKh: payload.nameKh || curr.nameKh,
              nameEn: payload.nameEn || curr.nameEn,
              avatar: payload.avatar || curr.avatar,
              branchId: payload.branchId || curr.branchId,
              roleTitle: payload.role || curr.roleTitle,
            };
            safeSetJson('attend_auth_user', JSON.stringify(updated));
            return updated;
          }
          return curr;
        });
      } else if (type === 'DELETE_EMPLOYEE' && payload) {
        const idToDelete = payload.id || payload.employeeId;
        setDeletedEmployeeIds((prev) => {
          const next = new Set(prev);
          next.add(idToDelete);
          safeSetJson('attend_deleted_employee_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setEmployees((prev) => {
          const next = prev.filter((e) => e.id !== idToDelete);
          safeSetJson('attend_employees', JSON.stringify(next));
          return next;
        });
      } else if (type === 'UPDATE_BRANCH' && payload) {
        setBranches((prev) => {
          const exists = prev.some((b) => b.id === payload.id);
          if (exists) {
            return prev.map((b) => (b.id === payload.id ? payload : b));
          }
          return [...prev, payload];
        });
      } else if (type === 'DELETE_BRANCH' && payload) {
        const idToDelete = payload.id || payload.branchId;
        setDeletedBranchIds((prev) => {
          const next = new Set(prev);
          next.add(idToDelete);
          safeSetJson('attend_deleted_branch_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setBranches((prev) => prev.filter((b) => b.id !== idToDelete));
      } else if (type === 'DELETE_LEAVE' && payload) {
        const idToDelete = payload.id || payload.requestId;
        setDeletedLeaveIds((prev) => {
          const next = new Set(prev);
          next.add(idToDelete);
          safeSetJson('attend_deleted_leave_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setLeaveRequests((prev) => prev.filter((l) => l.id !== idToDelete));
        setActionAlerts((prev) => prev.filter((a) => a.leaveRequestId !== idToDelete && a.id !== `alert_leave_${idToDelete}`));
      } else if (type === 'CLEAR_LEAVES' && payload) {
        const scope = payload.scope || 'processed';
        const deletedIds: string[] = payload.deletedIds || [];
        setDeletedLeaveIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.add(id));
          safeSetJson('attend_deleted_leave_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setLeaveRequests((prev) => (scope === 'all' ? [] : prev.filter((l) => l.status === 'pending')));
        if (scope === 'all') {
          setActionAlerts((prev) => prev.filter((a) => !a.leaveRequestId && !a.id.startsWith('alert_leave_')));
        }
      } else if (type === 'UPDATE_BRANDING' && payload) {
        setBranding(payload);
      } else if (type === 'UPDATE_SETTINGS' || type === 'UPDATE_SYSTEM_SETTINGS') {
        if (payload) setSystemSettings(payload);
      } else if (type === 'SYSTEM_RESET') {
        const s = payload?.state;
        if (s) {
          if (Array.isArray(s.branches)) setBranches(s.branches);
          if (Array.isArray(s.employees)) setEmployees(s.employees);
          if (Array.isArray(s.attendanceRecords)) setAttendanceRecords(s.attendanceRecords);
          if (Array.isArray(s.leaveRequests)) setLeaveRequests(s.leaveRequests);
          if (Array.isArray(s.transferRecords)) setTransferRecords(s.transferRecords);
          if (s.branding) setBranding(s.branding);
          if (Array.isArray(s.rolePermissions)) setRolePermissions(s.rolePermissions);
          if (s.systemSettings) setSystemSettings(s.systemSettings);
          if (Array.isArray(s.auditLogs)) setAuditLogs(s.auditLogs);
        } else if (payload?.resetType === 'demo_seed') {
          // Clear activity records (attendance, leaves, transfers, audit logs) while preserving real branches & staff
          setAttendanceRecords([]);
          setLeaveRequests([]);
          setTransferRecords([]);
          setAuditLogs([]);
        } else {
          setBranches([DEFAULT_STARTER_BRANCH]);
          setEmployees([]);
          setAttendanceRecords([]);
          setLeaveRequests([]);
          setTransferRecords([]);
          setAuditLogs([]);
          setSelectedBranchId('all');
        }
        showLiveAlert(
          lang === 'km' ? '⚡ កំណត់ប្រព័ន្ធឡើងវិញ (Live Sync)' : '⚡ System Reset Executed',
          `System was reset by ${senderName || 'Admin'}`,
          'system'
        );
      } else if (type === 'SYSTEM_RESTORE' && payload?.backupData) {
        const b = payload.backupData as SystemBackupData;
        const mode = payload.restoreMode || 'overwrite';
        if (mode === 'overwrite') {
          if (b.branches) setBranches(b.branches);
          if (b.employees) setEmployees(b.employees);
          if (b.attendanceRecords) setAttendanceRecords(b.attendanceRecords);
          if (b.leaveRequests) setLeaveRequests(b.leaveRequests);
          if (b.transferRecords) setTransferRecords(b.transferRecords);
          if (b.branding) setBranding(b.branding);
          if (b.rolePermissions) setRolePermissions(b.rolePermissions);
          if (b.systemSettings) setSystemSettings(b.systemSettings);
          if (b.auditLogs) setAuditLogs(b.auditLogs);
        } else {
          if (b.branches) setBranches((prev) => mergeDatasets(prev, b.branches!));
          if (b.employees) setEmployees((prev) => mergeDatasets(prev, b.employees!));
          if (b.attendanceRecords) setAttendanceRecords((prev) => mergeDatasets(prev, b.attendanceRecords!));
          if (b.leaveRequests) setLeaveRequests((prev) => mergeDatasets(prev, b.leaveRequests!));
          if (b.transferRecords) setTransferRecords((prev) => mergeDatasets(prev, b.transferRecords!));
        }
        showLiveAlert(
          lang === 'km' ? '💾 ស្តារទិន្នន័យជោគជ័យ (Live Sync)' : '💾 System Data Restored',
          `Restored ${b.summary?.branchesCount || 0} branches & ${b.summary?.attendanceRecordsCount || 0} punches.`,
          'system'
        );
      } else if (type === 'RING_STAFF_REMINDER' && payload) {
        const reminder: StaffReminderPayload = payload;
        const isTarget =
          reminder.isBroadcastAll ||
          (currentUser &&
            (currentUser.employeeId === reminder.targetEmployeeId ||
              currentUser.employeeCode === reminder.targetEmployeeCode ||
              currentUser.id === reminder.targetEmployeeId ||
              `user_${reminder.targetEmployeeId}` === currentUser.id));

        if (isTarget) {
          playReminderRingtone(3);
          triggerBrowserReminderNotification(
            lang === 'km' ? reminder.titleKh : reminder.titleEn,
            lang === 'km' ? reminder.messageKh : reminder.messageEn
          );
          setActiveStaffReminder(reminder);
        }
      }
    });

    // 4. Handle incoming punch alert with deduplication
    const alertedPunchIds = new Set<string>();

    const triggerAdminPunchAlert = (record: AttendanceRecord) => {
      if (!record || !record.id) return;
      if (alertedPunchIds.has(record.id)) return;
      alertedPunchIds.add(record.id);

      setAttendanceRecords((prev) => {
        if (prev.some((r) => r.id === record.id)) return prev;
        const next = [record, ...prev];
        try {
          safeSetJson('attend_records', JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      const empName = lang === 'km' 
        ? (record.employeeNameKh || record.employeeNameEn) 
        : (record.employeeNameEn || record.employeeNameKh);
      const actionType = record.type === 'check_in' 
        ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
        : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');
      const punchTimeMs = record.timestamp ? new Date(record.timestamp).getTime() : Date.now();

      addActionAlert({
        type: 'punch',
        titleKh: record.isWithinGeofence ? 'វត្តមានស្កេន GPS ថ្មី' : '⚠️ វត្តមានស្កេនខុសទីតាំង Geofence',
        titleEn: record.isWithinGeofence ? 'Real-time GPS Scan Punch' : '⚠️ Geofence Distance Warning',
        detailKh: `${empName} ${actionType} - ${record.branchNameKh || record.branchNameEn || ''} (${record.isWithinGeofence ? 'ក្នុងរង្វង់ GPS' : `ចម្ងាយ ${Math.round(record.distanceToBranch || 0)}m`})`,
        detailEn: `${empName} ${actionType} - ${record.branchNameEn || ''} (${record.isWithinGeofence ? 'Within GPS Geofence' : `${Math.round(record.distanceToBranch || 0)}m Out of Range`})`,
        actorName: empName,
        actorAvatar: record.employeeAvatar,
        branchId: record.branchId,
        branchName: record.branchNameKh || record.branchNameEn,
        rawTimestamp: punchTimeMs,
        isUnread: true,
      });

      playAlertChime('punch');
      showLiveAlert(
        lang === 'km' ? '🟢 វត្តមានស្កេន GPS ថ្មី (Live Sync)' : '🟢 Real-time GPS Punch Synced',
        `${empName} ${actionType} - ${record.branchNameEn || ''}`,
        'punch'
      );
    };

    // Subscribe to Supabase Realtime (Instant push across devices on Vercel)
    const unsubSupabase = subscribeToSupabaseRealtime((event, payload) => {
      if (event === 'PUNCH_ATTENDANCE' && payload?.record) {
        triggerAdminPunchAlert(payload.record);
      } else if (event === 'ACTION_ALERT' && payload?.alert) {
        addActionAlert(payload.alert);
      } else if (event === 'UPDATE_EMPLOYEE' && payload) {
        const updatedEmp: Employee = payload;
        setEmployees((prev) => {
          const next = prev.map((e) => (e.id === updatedEmp.id ? { ...e, ...updatedEmp } : e));
          safeSetJson('attend_employees', JSON.stringify(next));
          return next;
        });
        if (updatedEmp.avatar) {
          setAttendanceRecords((prev) => {
            const next = prev.map((r) =>
              r.employeeId === updatedEmp.id
                ? {
                    ...r,
                    employeeAvatar: updatedEmp.avatar,
                    employeeNameKh: updatedEmp.nameKh || r.employeeNameKh,
                    employeeNameEn: updatedEmp.nameEn || r.employeeNameEn,
                  }
                : r
            );
            safeSetJson('attend_records', JSON.stringify(next));
            return next;
          });
        }
      } else if ((event === 'SUBMIT_LEAVE' || event === 'SUBMIT_LEAVE_REQUEST') && payload) {
        const cleanRequest = payload;
        setLeaveRequests((prev) => {
          if (prev.some((l) => l.id === cleanRequest.id)) return prev;
          return [cleanRequest, ...prev];
        });
        playAlertChime('leave');
        addActionAlert({
          type: 'leave_submit',
          titleKh: 'សំណើសុំច្បាប់ថ្មី',
          titleEn: 'New Staff Leave Request',
          detailKh: `${cleanRequest.employeeNameKh || cleanRequest.employeeNameEn || 'បុគ្គលិក'}: ${cleanRequest.reason || ''} (${cleanRequest.typeKh || cleanRequest.category || 'ច្បាប់'})`,
          detailEn: `${cleanRequest.employeeNameEn || 'Staff'}: ${cleanRequest.reason || ''} (${cleanRequest.startDate} → ${cleanRequest.endDate})`,
          leaveRequestId: cleanRequest.id,
          actorName: cleanRequest.employeeNameKh || cleanRequest.employeeNameEn,
          actorAvatar: cleanRequest.employeeAvatar,
        });
      } else if (event === 'ADD_EMPLOYEE' && payload) {
        const newEmp: Employee = payload;
        setEmployees((prev) => {
          if (prev.some((e) => e.id === newEmp.id || e.code === newEmp.code)) {
            return prev.map((e) => (e.id === newEmp.id ? { ...e, ...newEmp } : e));
          }
          const next = [newEmp, ...prev];
          safeSetJson('attend_employees', JSON.stringify(next));
          return next;
        });
      } else if (event === 'DELETE_EMPLOYEE' && payload?.id) {
        const delId = payload.id;
        setDeletedEmployeeIds((prev) => {
          const next = new Set(prev);
          next.add(delId);
          safeSetJson('attend_deleted_employee_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setEmployees((prev) => {
          const next = prev.filter((e) => e.id !== delId);
          safeSetJson('attend_employees', JSON.stringify(next));
          return next;
        });
      } else if (event === 'UPDATE_EMPLOYEES_BATCH' && Array.isArray(payload)) {
        setEmployees((prev) => {
          const tombstones = new Set([
            ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
            ...KNOWN_DELETED_EMPLOYEE_IDS,
          ]);
          const next = deduplicateAndFilterEmployees(mergeDatasets(prev, payload), tombstones);
          // Prevent unnecessary state change and re-render loop if employees are identical
          if (
            next.length === prev.length &&
            next.every((e, idx) => e.id === prev[idx]?.id && e.avatar === prev[idx]?.avatar && e.role === prev[idx]?.role && e.branchId === prev[idx]?.branchId)
          ) {
            return prev;
          }
          safeSetJson('attend_employees', JSON.stringify(next));
          return next;
        });
      } else if (event === 'REQUEST_EMPLOYEES') {
        const localEmps = safeGetJson<Employee[]>('attend_employees', employees);
        if (Array.isArray(localEmps) && localEmps.length > 0) {
          console.info('[Supabase Realtime] Inbound REQUEST_EMPLOYEES: broadcasting current roster of', localEmps.length);
          broadcastSupabaseEvent('UPDATE_EMPLOYEES_BATCH', localEmps);
        }
      } else if (event === 'UPDATE_BRANCH' && payload) {
        setBranches((prev) => {
          const tombstones = new Set([
            ...safeGetJson<string[]>('attend_deleted_branch_ids', []),
            ...KNOWN_DELETED_BRANCH_IDS,
          ]);
          if (tombstones.has(payload.id)) return prev;
          const next = mergeDatasets(prev, [payload]);
          safeSetJson('attend_branches', JSON.stringify(next));
          return next;
        });
      } else if (event === 'DELETE_BRANCH' && payload?.id) {
        const delId = payload.id;
        setDeletedBranchIds((prev) => {
          const next = new Set(prev);
          next.add(delId);
          safeSetJson('attend_deleted_branch_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setBranches((prev) => {
          const next = prev.filter((b) => b.id !== delId);
          safeSetJson('attend_branches', JSON.stringify(next));
          return next;
        });
      } else if (event === 'DELETE_LEAVE' && payload?.id) {
        const delId = payload.id;
        setDeletedLeaveIds((prev) => {
          const next = new Set(prev);
          next.add(delId);
          safeSetJson('attend_deleted_leave_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setLeaveRequests((prev) => {
          const next = prev.filter((l) => l.id !== delId);
          safeSetJson('attend_leaves', JSON.stringify(next));
          return next;
        });
        setActionAlerts((prev) => prev.filter((a) => a.leaveRequestId !== delId && a.id !== `alert_leave_${delId}`));
      } else if (event === 'CLEAR_LEAVES' && payload) {
        const scope = payload.scope || 'processed';
        const deletedIds: string[] = payload.deletedIds || [];
        setDeletedLeaveIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.add(id));
          safeSetJson('attend_deleted_leave_ids', JSON.stringify(Array.from(next)));
          return next;
        });
        setLeaveRequests((prev) => {
          const next = scope === 'all' ? [] : prev.filter((l) => l.status === 'pending');
          safeSetJson('attend_leaves', JSON.stringify(next));
          return next;
        });
        if (scope === 'all') {
          setActionAlerts((prev) => prev.filter((a) => !a.leaveRequestId && !a.id.startsWith('alert_leave_')));
        }
      } else if (event === 'ACTION_ALERT' && payload) {
        if (payload.action === 'CLEAR_ALL') {
          const clearedTime = payload.clearedAt || Date.now();
          setAlertsClearedAt(clearedTime);
          try {
            safeSetJson('attend_alerts_cleared_at', String(clearedTime));
            safeSetJson('attend_staff_alerts', JSON.stringify([]));
          } catch {}
          setActionAlerts([]);
        } else if (payload.action === 'DISMISS_ONE' && payload.alertId) {
          setActionAlerts((prev) => {
            const next = prev.filter((a) => a.id !== payload.alertId);
            safeSetJson('attend_staff_alerts', JSON.stringify(next));
            return next;
          });
        } else if (payload.alert) {
          addActionAlert(payload.alert);
        }
      } else if (event === 'UPDATE_LEAVE_STATUS' && payload?.requestId) {
        setLeaveRequests((prev) =>
          prev.map((r) =>
            r.id === payload.requestId
              ? {
                  ...r,
                  status: payload.status,
                  approvedBy: payload.approvedBy,
                  adminComment: payload.comment || r.adminComment,
                }
              : r
          )
        );
      } else if (event === 'STAFF_LOGIN' && payload?.alert) {
        addActionAlert(payload.alert);
      } else if (event === 'RING_STAFF_REMINDER' && payload) {
        const reminder: StaffReminderPayload = payload;
        const isTarget =
          reminder.isBroadcastAll ||
          (currentUser &&
            (currentUser.employeeId === reminder.targetEmployeeId ||
              currentUser.employeeCode === reminder.targetEmployeeCode ||
              currentUser.id === reminder.targetEmployeeId ||
              `user_${reminder.targetEmployeeId}` === currentUser.id));

        if (isTarget) {
          playReminderRingtone(3);
          triggerBrowserReminderNotification(
            lang === 'km' ? reminder.titleKh : reminder.titleEn,
            lang === 'km' ? reminder.messageKh : reminder.messageEn
          );
          setActiveStaffReminder(reminder);
        }
      }
    });

    // 5. Start background Supabase Polling Sync as fallback (guarantees alert even if socket sleeps)
    const unsubPolling = startSupabasePollingSync(
      (newPunch) => triggerAdminPunchAlert(newPunch),
      (newAlert) => addActionAlert(newAlert),
      (records) => {
        setAttendanceRecords((prev) => {
          const prevMap = new Map(prev.map((r) => [r.id, r]));
          const hasChange = records.some((r) => {
            const existing = prevMap.get(r.id);
            return !existing || existing.timestamp !== r.timestamp || existing.status !== r.status;
          });
          if (!hasChange) return prev;
          const merged = mergeDatasets(prev, records);
          try { safeSetJson('attend_records', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      }
    );

    // 6. Start resilient attendance & employee sync service (flushes mobile outbox & reconciles records and employees)
    const unsubAttendanceSync = startAttendanceSyncService(
      (syncedRecords) => {
        if (Array.isArray(syncedRecords) && syncedRecords.length > 0) {
          setAttendanceRecords((prev) => {
            const merged = mergeDatasets(prev, syncedRecords);
            if (merged.length !== prev.length || (prev.length > 0 && merged[0]?.id !== prev[0]?.id)) {
              try { safeSetJson('attend_records', JSON.stringify(merged)); } catch (_) {}
              return merged;
            }
            return prev;
          });
        }
      },
      (syncedEmployees) => {
        if (Array.isArray(syncedEmployees) && syncedEmployees.length > 0) {
          setEmployees((prev) => {
            const currentTombstones = new Set([
              ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
              ...KNOWN_DELETED_EMPLOYEE_IDS,
            ]);
            const merged = mergeDatasets(prev, syncedEmployees);
            const cleaned = deduplicateAndFilterEmployees(merged, currentTombstones);
            if (cleaned.length !== prev.length || cleaned.some((e, i) => prev[i]?.id !== e.id)) {
              try { safeSetJson('attend_employees', JSON.stringify(cleaned)); } catch (_) {}
              return cleaned;
            }
            return prev;
          });
        }
      }
    );

    return () => {
      unsubCloud();
      unsubConnection();
      unsubPresence();
      unsubSync();
      unsubSupabase();
      unsubPolling();
      unsubAttendanceSync();
    };
  }, [lang]);

  // Proactive Tab Visibility & Focus Sync
  // When Admin unlocks mobile device, wakes PC, or switches back to tab after being offline overnight,
  // immediately pulls canonical records, leaves, employees, and branches from Turso SQLite Cloud & Supabase.
  useEffect(() => {
    let isFetching = false;
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && !isFetching) {
        isFetching = true;
        try {
          const [tState, suState] = await Promise.all([
            fetchInitialTursoData().catch(() => null),
            fetchInitialSupabaseData().catch(() => null),
          ]);
          const canonicalState = tState || suState;
          if (canonicalState) {
            const incomingRecords = mergeDatasets(
              tState?.attendanceRecords || [],
              suState?.attendanceRecords || []
            );
            if (incomingRecords.length > 0) {
              setAttendanceRecords((prev) => {
                const prevMap = new Map(prev.map((r) => [r.id, r]));
                const hasChange = incomingRecords.some((r) => {
                  const existing = prevMap.get(r.id);
                  return !existing || existing.timestamp !== r.timestamp || existing.status !== r.status;
                });
                if (!hasChange) return prev;
                const merged = mergeDatasets(prev, incomingRecords);
                try { safeSetJson('attend_records', JSON.stringify(merged)); } catch (_) {}
                return merged;
              });
            }
            const incomingEmps = (tState?.employees && tState.employees.length > 0)
              ? tState.employees
              : (suState?.employees || []);
            if (incomingEmps.length > 0) {
              setEmployees((prev) => {
                const currentTombstones = new Set([
                  ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
                  ...KNOWN_DELETED_EMPLOYEE_IDS,
                  ...(Array.isArray((tState as any)?.deletedEmployeeIds) ? (tState as any).deletedEmployeeIds : []),
                  ...(Array.isArray((suState as any)?.deletedEmployeeIds) ? (suState as any).deletedEmployeeIds : []),
                ]);
                const merged = mergeDatasets(prev, incomingEmps);
                const cleaned = deduplicateAndFilterEmployees(merged, currentTombstones);
                if (cleaned.length === prev.length && cleaned.every((e, idx) => e.id === prev[idx]?.id && e.avatar === prev[idx]?.avatar)) {
                  return prev;
                }
                try { safeSetJson('attend_employees', JSON.stringify(cleaned)); } catch (_) {}
                return cleaned;
              });
            }
            const incomingBranches = (tState?.branches && tState.branches.length > 0)
              ? tState.branches
              : (suState?.branches || []);
            if (incomingBranches.length > 0) {
              setBranches((prev) => {
                const tombstones = new Set([
                  ...safeGetJson<string[]>('attend_deleted_branch_ids', []),
                  ...KNOWN_DELETED_BRANCH_IDS,
                  ...(Array.isArray((tState as any)?.deletedBranchIds) ? (tState as any).deletedBranchIds : []),
                  ...(Array.isArray((suState as any)?.deletedBranchIds) ? (suState as any).deletedBranchIds : []),
                ]);
                const merged = mergeDatasets(prev, incomingBranches).filter((b: Branch) => !tombstones.has(b.id));
                if (merged.length === prev.length && merged.every((b, idx) => b.id === prev[idx]?.id && b.lat === prev[idx]?.lat && b.lng === prev[idx]?.lng)) {
                  return prev;
                }
                try { safeSetJson('attend_branches', JSON.stringify(merged)); } catch (_) {}
                return merged;
              });
            }
            const incomingLeaves = (tState?.leaveRequests && tState.leaveRequests.length > 0)
              ? tState.leaveRequests
              : (suState?.leaveRequests || []);
            if (incomingLeaves.length > 0) {
              setLeaveRequests((prev) => {
                const tombstones = new Set([
                  ...safeGetJson<string[]>('attend_deleted_leave_ids', []),
                  ...(Array.isArray((tState as any)?.deletedLeaveIds) ? (tState as any).deletedLeaveIds : []),
                  ...(Array.isArray((suState as any)?.deletedLeaveIds) ? (suState as any).deletedLeaveIds : []),
                ]);
                const merged = mergeDatasets(prev, incomingLeaves).filter((l: LeaveRequest) => !tombstones.has(l.id));
                try { safeSetJson('attend_leaves', JSON.stringify(merged)); } catch (_) {}
                return merged;
              });
            }
            const remoteClearedAt = Math.max(
              Number((tState as any)?.alertsClearedAt || 0),
              Number((suState as any)?.alertsClearedAt || 0)
            );
            if (remoteClearedAt > 0) {
              const localClearedAt = Number(localStorage.getItem('attend_alerts_cleared_at') || 0);
              if (remoteClearedAt > localClearedAt) {
                setAlertsClearedAt(remoteClearedAt);
                try { safeSetJson('attend_alerts_cleared_at', String(remoteClearedAt)); } catch (_) {}
                setActionAlerts((prev) => prev.filter((a) => (a.rawTimestamp || 0) > remoteClearedAt));
              }
            }
          }
        } catch (e) {
          console.warn('[FocusSync] Error syncing on focus:', e);
        } finally {
          isFetching = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  // Sync with Firebase Cloud Firestore Database in real-time
  useEffect(() => {
    let isInitialCloudLoad = true;

    const unsubscribe = subscribeToCloudDatabase(
      (cloudData) => {
        if (!cloudData) return;
        isReceivingCloudUpdate.current = true;

        if (Array.isArray(cloudData.branches) && (cloudData.branches.length > 0 || cloudData.isReset)) {
          setBranches((prev) => {
            const tombstones = new Set([
              ...safeGetJson<string[]>('attend_deleted_branch_ids', []),
              ...KNOWN_DELETED_BRANCH_IDS,
            ]);
            const raw = cloudData.isReset ? cloudData.branches! : mergeDatasets(prev, cloudData.branches!);
            const next = raw.filter((b: Branch) => !tombstones.has(b.id));
            safeSetJson('attend_branches', JSON.stringify(next));
            return next;
          });
        }
        if (Array.isArray(cloudData.employees) && (cloudData.employees.length > 0 || cloudData.isReset)) {
          setEmployees((prev) => {
            const tombstones = new Set([
              ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
              ...KNOWN_DELETED_EMPLOYEE_IDS,
            ]);
            const candidate = cloudData.isReset
              ? cloudData.employees!
              : (prev.length > 0 ? prev : cloudData.employees!);
            const next = deduplicateAndFilterEmployees(candidate, tombstones);
            safeSetJson('attend_employees', JSON.stringify(next));
            return next;
          });
          setCurrentUser((curr) => {
            if (curr) {
              const liveEmp = cloudData.employees!.find(
                (e) =>
                  e.id === curr.employeeId ||
                  e.code === curr.employeeCode ||
                  e.id === curr.id ||
                  `user_${e.id}` === curr.id ||
                  (curr.email && e.email && e.email.toLowerCase() === curr.email.toLowerCase())
              );
              if (liveEmp) {
                const updated = {
                  ...curr,
                  avatar: liveEmp.avatar || curr.avatar,
                  branchId: liveEmp.branchId || curr.branchId,
                  nameKh: liveEmp.nameKh || curr.nameKh,
                  nameEn: liveEmp.nameEn || curr.nameEn,
                  roleTitle: liveEmp.role || curr.roleTitle,
                };
                safeSetJson('attend_auth_user', JSON.stringify(updated));
                return updated;
              }
            }
            return curr;
          });
        }
        if (Array.isArray(cloudData.attendanceRecords) && (cloudData.attendanceRecords.length > 0 || cloudData.isReset)) {
          setAttendanceRecords((prevRecords) => {
            const prevIds = new Set(prevRecords.map((r) => r.id));
            const newPunches = cloudData.attendanceRecords!.filter((r) => !prevIds.has(r.id));

            if (newPunches.length > 0 && !isInitialCloudLoad) {
              playAlertChime('punch');
              newPunches.forEach((record) => {
                const empName = lang === 'km' ? (record.employeeNameKh || record.employeeNameEn) : (record.employeeNameEn || record.employeeNameKh);
                const actionType = record.type === 'check_in' 
                  ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
                  : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');

                addActionAlert({
                  type: 'punch',
                  titleKh: record.isWithinGeofence ? 'វត្តមានស្កេន GPS ថ្មី' : '⚠️ វត្តមានស្កេនខុសទីតាំង Geofence',
                  titleEn: record.isWithinGeofence ? 'Real-time GPS Scan Punch' : '⚠️ Geofence Distance Warning',
                  detailKh: `${empName} ${actionType} - ${record.branchNameKh || record.branchNameEn || ''} (${record.isWithinGeofence ? 'ក្នុងរង្វង់ GPS' : `ចម្ងាយ ${Math.round(record.distanceToBranch || 0)}m`})`,
                  detailEn: `${empName} ${actionType} - ${record.branchNameEn || ''} (${record.isWithinGeofence ? 'Within GPS Geofence' : `${Math.round(record.distanceToBranch || 0)}m Out of Range`})`,
                  actorName: empName,
                  actorAvatar: record.employeeAvatar,
                });

                showLiveAlert(
                  lang === 'km' ? '🟢 វត្តមានស្កេន GPS ថ្មី (Cloud Sync)' : '🟢 Real-time GPS Punch Synced',
                  `${empName} ${actionType} - ${record.branchNameEn || ''}`,
                  'punch'
                );
              });
            }
            const merged = cloudData.isReset
              ? cloudData.attendanceRecords!
              : mergeDatasets(prevRecords, cloudData.attendanceRecords!);
            safeSetJson('attend_records', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(cloudData.leaveRequests)) {
          setLeaveRequests((prevLeaves) => {
            const prevIds = new Set(prevLeaves.map((l) => l.id));
            const newPending = cloudData.leaveRequests!.filter(
              (l) => !prevIds.has(l.id) && l.status === 'pending'
            );
            if (newPending.length > 0 && !isInitialCloudLoad) {
              playAlertChime('leave');
              newPending.forEach((req) => {
                addActionAlert({
                  type: 'leave_submit',
                  titleKh: 'សំណើសុំច្បាប់ថ្មី',
                  titleEn: 'New Staff Leave Request',
                  detailKh: `${req.employeeNameKh || req.employeeNameEn || 'បុគ្គលិក'}: ${req.reason || ''} (${req.typeKh || req.category || 'ច្បាប់'})`,
                  detailEn: `${req.employeeNameEn || 'Staff'}: ${req.reason || ''} (${req.startDate} → ${req.endDate})`,
                  leaveRequestId: req.id,
                  actorName: req.employeeNameKh || req.employeeNameEn,
                  actorAvatar: req.employeeAvatar,
                });
                showLiveAlert(
                  lang === 'km' ? '📋 ស្នើសុំច្បាប់ថ្មី (Cloud Sync)' : '📋 New Leave Request Submitted',
                  `${req.employeeNameKh || req.employeeNameEn || 'Staff'}: ${req.reason || ''} (${req.startDate} → ${req.endDate})`,
                  'leave'
                );
              });
            }
            const leaveTombstones = new Set(safeGetJson<string[]>('attend_deleted_leave_ids', []));
            const raw = cloudData.isReset
              ? cloudData.leaveRequests!
              : mergeDatasets(prevLeaves, cloudData.leaveRequests!);
            const merged = raw.filter((l: LeaveRequest) => !leaveTombstones.has(l.id));
            safeSetJson('attend_leaves', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(cloudData.transferRecords)) {
          setTransferRecords(cloudData.transferRecords);
          safeSetJson('attend_transfers', JSON.stringify(cloudData.transferRecords));
        }
        if (Array.isArray(cloudData.branchTypes)) {
          setBranchTypes(cloudData.branchTypes);
          safeSetJson('attend_branch_types', JSON.stringify(cloudData.branchTypes));
        }
        if (cloudData.branding) {
          setBranding(cloudData.branding);
          safeSetJson('attend_branding', JSON.stringify(cloudData.branding));
        }
        if (Array.isArray(cloudData.rolePermissions)) {
          setRolePermissions(cloudData.rolePermissions);
          safeSetJson('attend_role_permissions', JSON.stringify(cloudData.rolePermissions));
        }
        if (cloudData.systemSettings) {
          setSystemSettings(cloudData.systemSettings);
          safeSetJson('attend_system_settings', JSON.stringify(cloudData.systemSettings));
        }
        if (cloudData.adminProfile) {
          setAdminProfile(cloudData.adminProfile);
          safeSetJson('attend_admin_profile', JSON.stringify(cloudData.adminProfile));
          setCurrentUser((curr) => {
            if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
              const updated = { ...curr, ...cloudData.adminProfile };
              safeSetJson('attend_auth_user', JSON.stringify(updated));
              return updated;
            }
            return curr;
          });
        }
        if (Array.isArray(cloudData.auditLogs)) {
          setAuditLogs(cloudData.auditLogs);
          safeSetJson('attend_audit_logs', JSON.stringify(cloudData.auditLogs));
        }
        if (Array.isArray(cloudData.shifts) && cloudData.shifts.length > 0) {
          setShifts(cloudData.shifts);
          safeSetJson('attend_shifts', JSON.stringify(cloudData.shifts));
        }
        if (Array.isArray(cloudData.staffAlerts) && cloudData.staffAlerts.length > 0) {
          const clearedTime = alertsClearedAt || Number(localStorage.getItem('attend_alerts_cleared_at') || 0);
          setActionAlerts((prev) => {
            const prevIds = new Set(prev.map((a) => a.id));
            const newAlerts = cloudData.staffAlerts!.filter(
              (a: any) => !prevIds.has(a.id) && (a.rawTimestamp || 0) > clearedTime
            );
            if (newAlerts.length > 0) {
              const merged = [...newAlerts, ...prev];
              merged.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
              return merged.slice(0, 50);
            }
            return prev;
          });
        }

        if (!isInitialCloudLoad) {
          setLiveToast({
            title: lang === 'km' ? '☁️ ទិន្នន័យបានធ្វើសមកាលកម្ម' : '☁️ Cloud Database Synced',
            message: lang === 'km' ? 'ទិន្នន័យចុងក្រោយត្រូវបានធ្វើបច្ចុប្បន្នភាពពី Cloud' : 'Latest data synced from cloud database.',
            type: 'system'
          });
          setTimeout(() => setLiveToast(null), 3000);
        }
        isInitialCloudLoad = false;

        setTimeout(() => {
          isReceivingCloudUpdate.current = false;
        }, 800);
      },
      () => {
        // Only seed if Firestore is truly empty and this device has genuine local cache (not defaulted on empty browser)
        if (hasLocalCache && (branches.length > 0 || employees.length > 0)) {
          syncStateToCloudImmediate({
            branches,
            employees,
            attendanceRecords,
            leaveRequests,
            transferRecords,
            branchTypes,
            branding,
            rolePermissions,
            systemSettings,
            adminProfile,
            auditLogs,
            shifts,
          });
        }
        isCloudInitializedRef.current = true;
        setIsCloudSyncLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [lang]);

  // Periodic background Turso SQLite Cloud reconciliation (every 15s) for Admins & Supervisors
  // For regular staff on mobile devices, skip heavy full-database polling to conserve mobile CPU, RAM and battery
  const isTursoSyncRunningRef = useRef(false);
  useEffect(() => {
    if (currentUser?.role === 'employee') return;

    const pollInterval = setInterval(() => {
      if (isTursoSyncRunningRef.current) return;
      isTursoSyncRunningRef.current = true;

      fetchInitialTursoData()
        .then((tursoState) => {
          if (!tursoState) return;

          // 1. Reconcile attendance records
          if (Array.isArray(tursoState.attendanceRecords) && tursoState.attendanceRecords.length > 0) {
            setAttendanceRecords((prevRecords) => {
              const prevIds = new Set(prevRecords.map((r) => r.id));
              const newPunches = tursoState.attendanceRecords.filter((r: AttendanceRecord) => !prevIds.has(r.id));
              if (newPunches.length === 0) return prevRecords;

              const merged = mergeDatasets(prevRecords, tursoState.attendanceRecords);
              safeSetJson('attend_records', JSON.stringify(merged));
              return merged;
            });
          }

          // 2. Reconcile staff alerts
          if (Array.isArray(tursoState.staffAlerts) && tursoState.staffAlerts.length > 0) {
            const clearedTime = alertsClearedAt || Number(localStorage.getItem('attend_alerts_cleared_at') || 0);
            setActionAlerts((prev) => {
              const prevIds = new Set(prev.map((a) => a.id));
              const newAlerts = tursoState.staffAlerts.filter(
                (a: any) => !prevIds.has(a.id) && (a.rawTimestamp || 0) > clearedTime
              );
              if (newAlerts.length === 0) return prev;
              const merged = [...newAlerts, ...prev];
              merged.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
              return merged.slice(0, 50);
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          isTursoSyncRunningRef.current = false;
        });
    }, 12000);

    return () => clearInterval(pollInterval);
  }, [lang, alertsClearedAt]);

  // Sync to local storage and Cloud Databases
  useEffect(() => {
    safeSetJson('attend_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (currentUser) {
      safeSetJson('attend_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('attend_auth_user');
    }
  }, [currentUser]);

  useEffect(() => {
    safeSetJson('attend_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetJson('attend_employees', JSON.stringify(employees));
    }, 600);
    return () => clearTimeout(timer);
  }, [employees]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetJson('attend_records', JSON.stringify(attendanceRecords));
    }, 600);
    return () => clearTimeout(timer);
  }, [attendanceRecords]);

  useEffect(() => {
    safeSetJson('attend_leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    safeSetJson('attend_transfers', JSON.stringify(transferRecords));
  }, [transferRecords]);

  useEffect(() => {
    safeSetJson('attend_branding', JSON.stringify(branding));
    updateDynamicAppBranding(branding, lang);
    applyKhmerTypography(branding.typography, lang);
  }, [branding, lang]);

  useEffect(() => {
    safeSetJson('attend_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    safeSetJson('attend_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    safeSetJson('attend_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    safeSetJson('attend_admin_profile', JSON.stringify(adminProfile));
  }, [adminProfile]);

  useEffect(() => {
    safeSetJson('attend_shifts', JSON.stringify(shifts));
  }, [shifts]);

  // Automatically sync any local modifications to Turso SQLite Cloud, Supabase, and Cloud Firestore (debounced)
  useEffect(() => {
    // Only push to cloud if:
    // 1. Initial cloud fetch has finished
    // 2. We are not currently receiving an update from the cloud
    // 3. This is not the first component render
    if (!isCloudInitializedRef.current) return;
    if (isReceivingCloudUpdate.current) return;
    if (!initialMountSkipped.current) {
      initialMountSkipped.current = true;
      return;
    }

    // Safety guard: Never push to cloud if branches or employees are unexpectedly empty
    if (branches.length === 0 || employees.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      syncStateToTurso({
        branches,
        employees,
        leaveRequests,
        transferRecords,
        branchTypes,
        branding,
        rolePermissions,
        systemSettings,
        adminProfile,
        auditLogs,
        shifts,
      });

      syncStateToCloudDatabase({
        branches,
        employees,
        leaveRequests,
        transferRecords,
        branchTypes,
        branding,
        rolePermissions,
        systemSettings,
        adminProfile,
        auditLogs,
      });

      syncStateToSupabase({
        branches,
        employees,
        leaveRequests,
        transferRecords,
        branchTypes,
        branding,
        rolePermissions,
        systemSettings,
        adminProfile,
        auditLogs,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    branches,
    employees,
    leaveRequests,
    transferRecords,
    branchTypes,
    branding,
    rolePermissions,
    systemSettings,
    adminProfile,
    auditLogs,
    shifts,
  ]);

  // Handlers with Real-time synchronization
  const handleAddAttendanceRecord = (newRecord: AttendanceRecord) => {
    // Safety verification: Reject punch on Sunday rest, weekly Day Off, or Leave
    const emp = employees.find((e) => e.id === newRecord.employeeId || e.code === newRecord.employeeCode);
    if (emp) {
      const punchDate = newRecord.timestamp ? new Date(newRecord.timestamp) : new Date();
      const allowance = validatePunchAllowance(emp, leaveRequests, punchDate);
      if (!allowance.allowed) {
        playAlertChime('security_alert');
        setLiveToast({
          title: lang === 'km' ? '⛔ មិនអនុញ្ញាតឱ្យកត់ត្រាវត្តមាន' : '⛔ Attendance Punch Not Allowed',
          message: lang === 'km' ? (allowance.reasonKh || 'ថ្ងៃនេះជាថ្ងៃសម្រាក ឬច្បាប់') : (allowance.reason || 'Rest day or scheduled leave'),
          type: 'punch',
        });
        setTimeout(() => setLiveToast(null), 5000);
        return;
      }
    }

    // 0. Queue punch in persistent outbox so mobile offline never loses records
    queuePunchForSync(newRecord);

    const newRecordsList = [newRecord, ...attendanceRecords.filter((r) => r.id !== newRecord.id)];
    setAttendanceRecords(newRecordsList);
    safeSetJson('attend_records', JSON.stringify(newRecordsList));

    const empName = lang === 'km' ? (newRecord.employeeNameKh || newRecord.employeeNameEn) : (newRecord.employeeNameEn || newRecord.employeeNameKh);
    const actionType = newRecord.type === 'check_in' 
      ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
      : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');

    const punchTimeMs = newRecord.timestamp ? new Date(newRecord.timestamp).getTime() : Date.now();

    const punchAlert: ActionAlertItem = {
      id: `alert_att_${newRecord.id}`,
      type: 'punch',
      titleKh: newRecord.isWithinGeofence ? 'វត្តមានស្កេន GPS ថ្មី' : '⚠️ វត្តមានស្កេនខុសទីតាំង Geofence',
      titleEn: newRecord.isWithinGeofence ? 'Real-time GPS Scan Punch' : '⚠️ Geofence Distance Warning',
      detailKh: `${empName} ${actionType} - ${newRecord.branchNameKh || newRecord.branchNameEn || ''} (${newRecord.isWithinGeofence ? 'ក្នុងរង្វង់ GPS' : `ចម្ងាយ ${Math.round(newRecord.distanceToBranch || 0)}m`})`,
      detailEn: `${empName} ${actionType} - ${newRecord.branchNameEn || ''} (${newRecord.isWithinGeofence ? 'Within GPS Geofence' : `${Math.round(newRecord.distanceToBranch || 0)}m Out of Range`})`,
      actorName: empName,
      actorAvatar: newRecord.employeeAvatar,
      branchId: newRecord.branchId,
      branchName: newRecord.branchNameKh || newRecord.branchNameEn,
      rawTimestamp: punchTimeMs,
      timestamp: new Date(punchTimeMs).toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isUnread: true,
    };
    addActionAlert(punchAlert);

    showLiveAlert(
      lang === 'km' ? '🟢 វត្តមានស្កេន GPS ជោគជ័យ' : '🟢 GPS Punch Recorded',
      `${empName} ${actionType} - ${newRecord.branchNameEn || ''}`,
      'punch'
    );

    // 0. Instantly save individual punch record & alert to Turso SQLite Cloud (Always-on)
    saveAttendancePunchToTurso(newRecord).then((ok) => {
      if (ok) {
        markPunchAsSynced(newRecord.id);
      }
    });
    saveStaffAlertToTurso(punchAlert);

    // 1. Instantly save individual punch record directly to Supabase & broadcast in real-time
    saveAttendancePunchToSupabase(newRecord).then((res) => {
      if (res) {
        markPunchAsSynced(newRecord.id);
      }
    });
    saveStaffAlertToSupabase(punchAlert);

    // 2. Also save individual punch record directly to Firestore
    saveAttendanceRecordToCloud(newRecord).then((ok) => {
      if (ok) {
        markPunchAsSynced(newRecord.id);
      }
    });
    saveStaffAlertToCloud(punchAlert);

    // 3. Broadcast to all WebSocket connected peers and BroadcastChannel
    realtimeService.emit('PUNCH_ATTENDANCE', { record: newRecord });

    // 4. Background batch sync
    syncStateToCloudDatabase({ attendanceRecords: newRecordsList });
  };

  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      // 1. Flush any pending unsynced punches from outbox
      await syncPendingPunches();

      // 2. Comprehensive fetch from Turso SQLite Cloud and Supabase
      const comprehensiveRecords = await fetchComprehensiveAttendance(500);

      if (comprehensiveRecords.length > 0) {
        setAttendanceRecords((prev) => {
          const merged = mergeDatasets(prev, comprehensiveRecords);
          try { safeSetJson('attend_records', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      }

      // 3. Also refresh initial data from Turso SQLite Cloud
      const [tState, suState] = await Promise.all([
        fetchInitialTursoData().catch(() => null),
        fetchInitialSupabaseData().catch(() => null),
      ]);
      const extraRecords = mergeDatasets(
        tState?.attendanceRecords || [],
        suState?.attendanceRecords || []
      );
      if (extraRecords.length > 0) {
        setAttendanceRecords((prev) => {
          const merged = mergeDatasets(prev, extraRecords);
          try { safeSetJson('attend_records', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      }

      showLiveAlert(
        lang === 'km' ? '✅ សមកាលកម្មវត្តមានជោគជ័យ' : '✅ Punches Synced Successfully',
        lang === 'km' 
          ? `បានទាញយក និងផ្គូផ្គងកំណត់ត្រាវត្តមានចុងក្រោយបង្អស់ពីប្រព័ន្ធ Turso Cloud ${comprehensiveRecords.length > 0 ? `(${comprehensiveRecords.length} កំណត់ត្រា)` : ''}`
          : `Fetched and reconciled the latest attendance punches from Turso Cloud database.`,
        'system'
      );
    } catch (err) {
      console.error('Manual sync error:', err);
    } finally {
      setIsManualSyncing(false);
    }
  }, [lang]);

  const handleApproveLocationException = (recordId: string, action: 'approve' | 'reject') => {
    let targetRecord: AttendanceRecord | undefined;
    const nextRecords = attendanceRecords.map((r) => {
      if (r.id !== recordId) return r;
      const isApproved = action === 'approve';
      targetRecord = {
        ...r,
        status: isApproved ? 'on_time' : 'geofence_violation',
        isWithinGeofence: isApproved,
        locationExceptionStatus: isApproved ? 'approved' : 'rejected',
        locationExceptionReviewedBy: currentUser?.nameEn || currentUser?.nameKh || 'Admin',
        locationExceptionReviewedAt: new Date().toISOString(),
        notes: isApproved
          ? `${r.notes || ''} [បានអនុម័តករណីលើកលែង GPS ដោយ ${currentUser?.nameKh || 'Admin'}]`
          : `${r.notes || ''} [បានបដិសេធករណីលើកលែងដោយ ${currentUser?.nameKh || 'Admin'}]`,
      };
      return targetRecord;
    });

    setAttendanceRecords(nextRecords);
    safeSetJson('attend_records', JSON.stringify(nextRecords));

    if (targetRecord) {
      saveAttendancePunchToTurso(targetRecord);
      saveAttendanceRecordToCloud(targetRecord);
      saveAttendancePunchToSupabase(targetRecord);
    }
    syncStateToCloudDatabase({ attendanceRecords: nextRecords });

    realtimeService.emit('UPDATE_ATTENDANCE_RECORD', {
      recordId,
      action,
      record: targetRecord,
    });

    showLiveAlert(
      action === 'approve'
        ? (lang === 'km' ? '✅ បានអនុម័តវត្តមានលើកលែង' : '✅ Exception Punch Approved')
        : (lang === 'km' ? '❌ បានបដិសេធសំណើលើកលែង' : '❌ Exception Punch Rejected'),
      action === 'approve'
        ? (lang === 'km' ? 'វត្តមានរបស់បុគ្គលិកត្រូវបានគិតជាវត្តមានត្រឹមត្រូវ' : 'Attendance record marked as valid')
        : (lang === 'km' ? 'វត្តមានត្រូវបានបដិសេធជាខុសទីតាំង' : 'Attendance record marked as violation'),
      action === 'approve' ? 'punch' : 'system'
    );
  };

  const handleAddEmployee = (newEmp: Employee) => {
    const preparedEmp: Employee = {
      ...newEmp,
      annualLeaveQuota: newEmp.annualLeaveQuota !== undefined ? newEmp.annualLeaveQuota : 18,
      annualLeaveUsed: newEmp.annualLeaveUsed !== undefined ? newEmp.annualLeaveUsed : 0,
      sickLeaveQuota: newEmp.sickLeaveQuota !== undefined ? newEmp.sickLeaveQuota : 7,
      sickLeaveUsed: newEmp.sickLeaveUsed !== undefined ? newEmp.sickLeaveUsed : 0,
    };

    // Calculate synchronously so nextEmployees is guaranteed non-empty and has the new employee
    const nextEmployees = [preparedEmp, ...employees.filter((e) => e.id !== preparedEmp.id)];
    setEmployees(nextEmployees);
    safeSetJson('attend_employees', JSON.stringify(nextEmployees));

    // 1. Turso SQLite Cloud (Always-on 24/7 persistent storage)
    saveEmployeeToTurso(preparedEmp, nextEmployees);
    syncStateToTurso({ employees: nextEmployees });

    // 2. Supabase Persistence & Instant Realtime Broadcast
    saveEmployeeToSupabase(preparedEmp, nextEmployees);
    syncStateToSupabase({ employees: nextEmployees });
    broadcastSupabaseEvent('ADD_EMPLOYEE', preparedEmp);
    broadcastSupabaseEvent('UPDATE_EMPLOYEES_BATCH', nextEmployees);

    // 3. Firebase Cloud Firestore
    saveEmployeeToCloud(preparedEmp);
    syncStateToCloudImmediate({ employees: sanitizeForFirestore(nextEmployees) });

    // 4. Realtime socket
    realtimeService.emit('ADD_EMPLOYEE', preparedEmp);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    // 1. Synchronously update in-memory and localStorage
    const nextEmployees = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
    setEmployees(nextEmployees);
    safeSetJson('attend_employees', JSON.stringify(nextEmployees));

    const nextRecords = attendanceRecords.map((r) =>
      r.employeeId === updatedEmp.id
        ? {
            ...r,
            employeeNameKh: updatedEmp.nameKh,
            employeeNameEn: updatedEmp.nameEn,
            employeeAvatar: updatedEmp.avatar,
          }
        : r
    );
    setAttendanceRecords(nextRecords);
    safeSetJson('attend_records', JSON.stringify(nextRecords));

    // Also sync currentUser if current session belongs to this employee
    setCurrentUser((curr) => {
      if (
        curr &&
        (curr.employeeId === updatedEmp.id ||
          curr.employeeCode === updatedEmp.code ||
          curr.id === updatedEmp.id ||
          curr.id === `user_${updatedEmp.id}`)
      ) {
        const syncedUser: AuthUser = {
          ...curr,
          nameKh: updatedEmp.nameKh,
          nameEn: updatedEmp.nameEn,
          avatar: updatedEmp.avatar,
          branchId: updatedEmp.branchId,
          roleTitle: updatedEmp.role,
        };
        safeSetJson('attend_auth_user', JSON.stringify(syncedUser));
        return syncedUser;
      }
      return curr;
    });

    // 1. Turso SQLite Cloud
    saveEmployeeToTurso(updatedEmp, nextEmployees);
    syncStateToTurso({ employees: nextEmployees });

    // 2. Supabase Persistence & Instant Broadcast
    saveEmployeeToSupabase(updatedEmp, nextEmployees);
    syncStateToSupabase({ employees: nextEmployees });
    broadcastSupabaseEvent('UPDATE_EMPLOYEE', updatedEmp);
    broadcastSupabaseEvent('UPDATE_EMPLOYEES_BATCH', nextEmployees);

    // 3. Direct single-item Cloud write: immediately persists avatar & info to Firestore!
    saveEmployeeToCloud(updatedEmp);

    // 4. Realtime event emit
    realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);

    // 5. Background cloud batch sync
    syncStateToCloudDatabase({
      employees: sanitizeForFirestore(nextEmployees),
      attendanceRecords: sanitizeForFirestore(nextRecords),
    });
  };

  const handleBatchUpdateEmployees = useCallback((newEmployeesList: Employee[]) => {
    if (!Array.isArray(newEmployeesList) || newEmployeesList.length === 0) return;
    setEmployees((prev) => {
      const tombstones = new Set([
        ...safeGetJson<string[]>('attend_deleted_employee_ids', []),
        ...KNOWN_DELETED_EMPLOYEE_IDS,
      ]);
      const merged = mergeDatasets(prev, newEmployeesList);
      const cleaned = deduplicateAndFilterEmployees(merged, tombstones);
      try { safeSetJson('attend_employees', JSON.stringify(cleaned)); } catch (_) {}
      return cleaned;
    });
  }, []);

  const handleDeleteEmployee = (id: string) => {
    const nextDeleted = new Set(deletedEmployeeIds);
    nextDeleted.add(id);
    setDeletedEmployeeIds(nextDeleted);
    const deletedArr = Array.from(nextDeleted);
    safeSetJson('attend_deleted_employee_ids', JSON.stringify(deletedArr));

    let nextEmployees: Employee[] = [];
    setEmployees((prev) => {
      nextEmployees = deduplicateAndFilterEmployees(prev.filter((e) => e.id !== id), nextDeleted);
      safeSetJson('attend_employees', JSON.stringify(nextEmployees));
      return nextEmployees;
    });

    // 1. Turso SQLite Cloud
    deleteEmployeeFromTurso(id, nextEmployees);
    syncStateToTurso({ employees: nextEmployees, deletedEmployeeIds: deletedArr });

    // 2. Supabase Sync & Broadcast
    syncStateToSupabase({ employees: nextEmployees, deletedEmployeeIds: deletedArr } as any);
    broadcastSupabaseEvent('DELETE_EMPLOYEE', { id });

    realtimeService.emit('DELETE_EMPLOYEE', { id });
    syncStateToCloudImmediate({ employees: sanitizeForFirestore(nextEmployees) });
  };

  const handleUpdateEmployeesList = (nextEmployees: Employee[]) => {
    const cleaned = deduplicateAndFilterEmployees(nextEmployees, deletedEmployeeIds);
    setEmployees(cleaned);
    safeSetJson('attend_employees', JSON.stringify(cleaned));

    // Turso SQLite Cloud
    syncStateToTurso({ employees: cleaned });

    // Supabase Sync & Broadcast
    syncStateToSupabase({ employees: cleaned });
    broadcastSupabaseEvent('UPDATE_EMPLOYEES_BATCH', cleaned);

    realtimeService.emit('UPDATE_EMPLOYEES_BATCH', cleaned);
    syncStateToCloudImmediate({ employees: sanitizeForFirestore(cleaned) });
  };

  const handleUpdateBranch = (updatedBranch: Branch) => {
    let nextBranches: Branch[] = [];
    setBranches((prev) => {
      nextBranches = prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b));
      safeSetJson('attend_branches', JSON.stringify(nextBranches));
      return nextBranches;
    });

    // Turso SQLite Cloud
    syncStateToTurso({ branches: nextBranches });

    // Supabase Sync & Broadcast
    syncStateToSupabase({ branches: nextBranches });
    broadcastSupabaseEvent('UPDATE_BRANCH', updatedBranch);

    realtimeService.emit('UPDATE_BRANCH', updatedBranch);
    syncStateToCloudImmediate({ branches: sanitizeForFirestore(nextBranches) });
  };

  const handleUpdateBranchLocation = (
    branchId: string, 
    lat: number, 
    lng: number, 
    employeeId?: string
  ): { success: boolean; message: string } => {
    // Check if acting user is a staff member or has employee ID
    const isStaffRole = currentUser?.role === 'employee';
    const actingEmpId = employeeId || (isStaffRole ? (currentUser?.employeeId || employees.find(e => e.code === currentUser?.employeeCode)?.id) : undefined);

    if (actingEmpId) {
      const emp = employees.find((e) => e.id === actingEmpId);
      if (emp) {
        // Enforce rule: Staff can set branch to GPS for only the 1st time and cannot change to others until transferred to another branch
        if (emp.gpsCalibratedBranchId === branchId) {
          const lockedMsg = lang === 'km'
            ? `🔒 ទីតាំង GPS សាខាត្រូវបានកំណត់រួចរាល់ហើយ! ប្រសិនបើទីតាំងនេះនៅឆ្ងាយពីសាខាពិត សូមទាក់ទង Admin ឱ្យចុចកំណត់ទីតាំង GPS ដំបូងឡើងវិញ (Reset 1st GPS) ដើម្បីឱ្យអ្នកអាចចុចកំណត់ទីតាំង GPS ឡើងវិញបាន។`
            : `🔒 Branch GPS is already locked! If your GPS is still far from the branch, ask your Admin to Reset your 1st-time GPS calibration lock so you can calibrate it again.`;
          return { success: false, message: lockedMsg };
        }

        // First time setting GPS for this branch:
        // 1. Update employee record with calibrated branch ID & timestamp
        const updatedEmp: Employee = {
          ...emp,
          gpsCalibratedBranchId: branchId,
          gpsCalibratedAt: new Date().toISOString(),
        };

        setEmployees((prev) =>
          prev.map((e) => (e.id === actingEmpId ? updatedEmp : e))
        );
        saveEmployeeToTurso(updatedEmp);
        realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);

        // 2. Update branch coordinates
        let branchName = '';
        setBranches((prev) => {
          const next = prev.map((b) => {
            if (b.id === branchId) {
              branchName = lang === 'km' ? b.nameKh : b.nameEn;
              const updated: Branch = { 
                ...b, 
                lat, 
                lng,
                gpsSetByEmployeeId: actingEmpId,
                gpsSetAt: new Date().toISOString()
              };
              realtimeService.emit('UPDATE_BRANCH', updated);
              return updated;
            }
            return b;
          });
          syncStateToTurso({ branches: next });
          return next;
        });

        // 3. Add Audit Log
        handleAddAuditLog({
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actorName: (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : emp.nameEn) || 'Staff',
          actorRole: currentUser?.role || 'employee',
          action: 'Staff Branch GPS Calibrated (1st-Time Lock)',
          actionKh: 'បុគ្គលិកកំណត់ទីតាំង GPS សាខាលើកដំបូង (ចាក់សោ)',
          module: 'branches',
          details: `Staff ${emp.nameEn} set initial branch GPS for ${branchName || branchId} to (${lat.toFixed(5)}, ${lng.toFixed(5)}). Locked until transfer.`,
          detailsKh: `បុគ្គលិក ${emp.nameKh} បានកំណត់កូអរដោនេ GPS ដំបូងសម្រាប់សាខា ${branchName || branchId} (${lat.toFixed(5)}, ${lng.toFixed(5)})។ បានចាក់សោរហូតដល់មានការផ្ទេរសាខា។`,
          status: 'success',
        });

        const successMsg = lang === 'km'
          ? `✅ បានកំណត់កូអរដោនេសាខា "${branchName}" ទៅកាន់ទីតាំង GPS ជាក់ស្តែងរបស់អ្នក (${lat.toFixed(5)}, ${lng.toFixed(5)}) ជាលើកដំបូងជោគជ័យ! ទីតាំងនេះត្រូវបានចាក់សោរហូតដល់មានការផ្ទេរសាខាថ្មី។`
          : `✅ Branch "${branchName}" coordinates set to your GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}) for the 1st time! Location is locked until transferred to another branch.`;

        return { success: true, message: successMsg };
      }
    }

    // Admin / Manager / Generic Update
    let updatedBranchName = '';
    setBranches((prev) => {
      const next = prev.map((b) => {
        if (b.id === branchId) {
          updatedBranchName = lang === 'km' ? b.nameKh : b.nameEn;
          const updated = { ...b, lat, lng };
          realtimeService.emit('UPDATE_BRANCH', updated);
          return updated;
        }
        return b;
      });
      syncStateToTurso({ branches: next });
      return next;
    });

    return {
      success: true,
      message: lang === 'km'
        ? `បានកែសម្រួលកូអរដោនេសាខា "${updatedBranchName}" ជោគជ័យ!`
        : `Branch "${updatedBranchName}" coordinates updated successfully!`,
    };
  };

  const handleAddBranch = (newBranch: Branch) => {
    let nextBranches: Branch[] = [];
    setBranches((prev) => {
      nextBranches = [...prev, newBranch];
      safeSetJson('attend_branches', JSON.stringify(nextBranches));
      return nextBranches;
    });

    // Turso SQLite Cloud
    syncStateToTurso({ branches: nextBranches });

    // Supabase Sync & Broadcast
    syncStateToSupabase({ branches: nextBranches });
    broadcastSupabaseEvent('UPDATE_BRANCH', newBranch);

    realtimeService.emit('UPDATE_BRANCH', newBranch);
    syncStateToCloudImmediate({ branches: sanitizeForFirestore(nextBranches) });
  };

  const handleDeleteBranch = (branchId: string) => {
    const nextDeleted = new Set(deletedBranchIds);
    nextDeleted.add(branchId);
    setDeletedBranchIds(nextDeleted);
    const deletedArr = Array.from(nextDeleted);
    safeSetJson('attend_deleted_branch_ids', JSON.stringify(deletedArr));

    let nextBranches: Branch[] = [];
    setBranches((prev) => {
      nextBranches = prev.filter((b) => b.id !== branchId);
      safeSetJson('attend_branches', JSON.stringify(nextBranches));
      return nextBranches;
    });

    // Turso SQLite Cloud
    deleteBranchFromTurso(branchId, nextBranches);
    syncStateToTurso({ branches: nextBranches, deletedBranchIds: deletedArr });

    // Supabase Sync & Broadcast
    syncStateToSupabase({ branches: nextBranches, deletedBranchIds: deletedArr } as any);
    broadcastSupabaseEvent('DELETE_BRANCH', { id: branchId });

    realtimeService.emit('DELETE_BRANCH', { id: branchId });
    syncStateToCloudImmediate({ branches: sanitizeForFirestore(nextBranches) });
  };

  const handleAddBranchType = (typeConfig: BranchTypeConfig) => {
    setBranchTypes((prev) => {
      const updated = [...prev, typeConfig];
      safeSetJson('attend_branch_types', JSON.stringify(updated));
      syncStateToTurso({ branchTypes: updated });
      return updated;
    });
  };

  const handleUpdateBranchType = (typeConfig: BranchTypeConfig) => {
    setBranchTypes((prev) => {
      const updated = prev.map((t) => (t.id === typeConfig.id ? typeConfig : t));
      safeSetJson('attend_branch_types', JSON.stringify(updated));
      syncStateToTurso({ branchTypes: updated });
      return updated;
    });
  };

  const handleDeleteBranchType = (typeId: string) => {
    setBranchTypes((prev) => {
      const updated = prev.filter((t) => t.id !== typeId);
      safeSetJson('attend_branch_types', JSON.stringify(updated));
      syncStateToTurso({ branchTypes: updated });
      return updated;
    });
  };

  const handleUpdateBranding = (newBranding: CompanyBranding) => {
    setBranding(newBranding);
    syncStateToTurso({ branding: newBranding });
    realtimeService.emit('UPDATE_BRANDING', newBranding);
  };

  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    syncStateToTurso({ systemSettings: newSettings });
    realtimeService.emit('UPDATE_SETTINGS', newSettings);
  };

  const handleUpdateRolePermissions = (newRoles: RolePermission[]) => {
    setRolePermissions(newRoles);
    syncStateToTurso({ rolePermissions: newRoles });
    realtimeService.emit('UPDATE_ROLE_PERMISSIONS', newRoles);
  };

  const handleSubmitLeaveRequest = (newRequest: LeaveRequest) => {
    const cleanRequest = sanitizeForFirestore(newRequest);
    const nextLeaves = [cleanRequest, ...leaveRequests.filter((l) => l.id !== cleanRequest.id)];
    setLeaveRequests(nextLeaves);
    realtimeService.emit('SUBMIT_LEAVE', cleanRequest);
    realtimeService.emit('SUBMIT_LEAVE_REQUEST', cleanRequest);
    playAlertChime('leave');

    // Add instant visual action alert
    addActionAlert({
      type: 'leave_submit',
      titleKh: 'សំណើសុំច្បាប់ថ្មី',
      titleEn: 'New Staff Leave Request',
      detailKh: `${cleanRequest.employeeNameKh || cleanRequest.employeeNameEn || 'បុគ្គលិក'}: ${cleanRequest.reason} (${cleanRequest.typeKh || cleanRequest.category})`,
      detailEn: `${cleanRequest.employeeNameEn || 'Staff'}: ${cleanRequest.reason} (${cleanRequest.startDate} → ${cleanRequest.endDate})`,
      leaveRequestId: cleanRequest.id,
      actorName: cleanRequest.employeeNameKh || cleanRequest.employeeNameEn,
      actorAvatar: cleanRequest.employeeAvatar,
    });

    // High visibility instant toast
    setLiveToast({
      title: lang === 'km' ? '📋 សំណើសុំច្បាប់ថ្មី (New Leave Request)' : '📋 New Leave Request Submitted',
      message: `${cleanRequest.employeeNameKh || cleanRequest.employeeNameEn || 'Staff'}: ${cleanRequest.reason} (${cleanRequest.startDate} → ${cleanRequest.endDate})`,
      type: 'leave',
    });
    setTimeout(() => setLiveToast(null), 5000);

    // Audit Log Entry
    const logEntry: AuditLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: cleanRequest.employeeNameKh || cleanRequest.employeeNameEn || 'Staff',
      actorRole: 'employee',
      action: `Submitted ${cleanRequest.category} request: ${cleanRequest.reason}`,
      actionKh: `បានដាក់ពាក្យស្នើសុំ ${cleanRequest.typeKh || cleanRequest.category}: ${cleanRequest.reason}`,
      module: 'system',
      details: `${cleanRequest.startDate} to ${cleanRequest.endDate}`,
      detailsKh: `${cleanRequest.startDate} ដល់ ${cleanRequest.endDate}`,
      status: 'warning',
    };
    handleAddAuditLog(logEntry);

    // Sync to Cloud Firestore Universal DB immediately
    syncStateToCloudImmediate({
      leaveRequests: sanitizeForFirestore(nextLeaves),
      auditLogs: sanitizeForFirestore([logEntry, ...auditLogs]),
    });

    // Sync to Turso SQLite Cloud
    saveLeaveRequestToTurso(cleanRequest);
    syncStateToTurso({ leaveRequests: nextLeaves, auditLogs: [logEntry, ...auditLogs] });

    syncStateToSupabase({ leaveRequests: nextLeaves });
    broadcastSupabaseEvent('SUBMIT_LEAVE', cleanRequest);
  };

  const handleUpdateLeaveStatus = (requestId: string, newStatus: 'approved' | 'rejected', comment?: string) => {
    const approver = (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : 'Administrator') || 'Administrator';
    const targetReq = leaveRequests.find((r) => r.id === requestId);

    const nextLeaves = leaveRequests.map((r) =>
      r.id === requestId
        ? sanitizeForFirestore({
            ...r,
            status: newStatus,
            approvedBy: approver,
            ...(comment ? { adminComment: comment } : (r.adminComment ? { adminComment: r.adminComment } : {})),
          })
        : r
    );

    setLeaveRequests(nextLeaves);
    playAlertChime(newStatus === 'approved' ? 'approval' : 'rejection');

    // Add real-time action alert
    addActionAlert({
      type: 'leave_status',
      titleKh: newStatus === 'approved' ? 'ការអនុម័តច្បាប់ (Approved)' : 'ការបដិសេធច្បាប់ (Rejected)',
      titleEn: `Leave Request ${newStatus.toUpperCase()}`,
      detailKh: `${targetReq?.employeeNameKh || targetReq?.employeeNameEn || 'បុគ្គលិក'}: ${newStatus === 'approved' ? 'ត្រូវបានអនុម័ត' : 'ត្រូវបានបដិសេធ'} ដោយ ${approver}${comment ? ` ("${comment}")` : ''}`,
      detailEn: `${targetReq?.employeeNameEn || 'Staff'}: ${newStatus.toUpperCase()} by ${approver}${comment ? ` ("${comment}")` : ''}`,
      leaveRequestId: requestId,
      actorName: approver,
    });

    // High visibility instant toast
    setLiveToast({
      title: newStatus === 'approved'
        ? (lang === 'km' ? '✅ បានអនុម័តច្បាប់ជោគជ័យ' : '✅ Leave Request Approved')
        : (lang === 'km' ? '❌ បានបដិសេធពាក្យសុំច្បាប់' : '❌ Leave Request Rejected'),
      message: `${targetReq?.employeeNameKh || targetReq?.employeeNameEn || 'Staff'}: ${newStatus === 'approved' ? 'Approved' : 'Rejected'} by ${approver}`,
      type: 'leave',
    });
    setTimeout(() => setLiveToast(null), 5000);

    // Audit Log Entry
    const logEntry: AuditLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: approver,
      actorRole: 'admin',
      action: `${newStatus === 'approved' ? 'Approved' : 'Rejected'} leave request for ${targetReq?.employeeNameEn || 'employee'}`,
      actionKh: `${newStatus === 'approved' ? 'បានអនុម័ត' : 'បានបដិសេធ'} ពាក្យស្នើសុំច្បាប់របស់ ${targetReq?.employeeNameKh || targetReq?.employeeNameEn}`,
      module: 'system',
      details: comment ? `Comment: ${comment}` : `Status: ${newStatus}`,
      detailsKh: comment ? `កំណត់សម្គាល់: ${comment}` : `ស្ថានភាព: ${newStatus}`,
      status: newStatus === 'approved' ? 'success' : 'warning',
    };
    handleAddAuditLog(logEntry);

    // Adjust employee leave used balance when status transitions
    let nextEmployees = employees;
    if (targetReq && targetReq.status !== newStatus) {
      const calculateDays = (start?: string, end?: string): number => {
        if (!start || !end) return 1;
        try {
          const s = new Date(start);
          const e = new Date(end);
          const diffTime = e.getTime() - s.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
        } catch {
          return 1;
        }
      };

      const days = calculateDays(targetReq.startDate, targetReq.endDate);
      const isAnnual = targetReq.category === 'leave' || targetReq.type === 'annual';
      const isSick = targetReq.category === 'sick' || targetReq.type === 'sick';

      if (isAnnual || isSick) {
        nextEmployees = employees.map((emp) => {
          if (emp.id === targetReq.employeeId || emp.code === targetReq.employeeCode) {
            const currentAnnualUsed = emp.annualLeaveUsed ?? 0;
            const currentSickUsed = emp.sickLeaveUsed ?? 0;
            let nextAnnualUsed = currentAnnualUsed;
            let nextSickUsed = currentSickUsed;

            if (newStatus === 'approved') {
              if (isAnnual) nextAnnualUsed += days;
              if (isSick) nextSickUsed += days;
            } else if (targetReq.status === 'approved' && newStatus === 'rejected') {
              if (isAnnual) nextAnnualUsed = Math.max(0, nextAnnualUsed - days);
              if (isSick) nextSickUsed = Math.max(0, nextSickUsed - days);
            }

            const updatedEmp: Employee = {
              ...emp,
              annualLeaveUsed: nextAnnualUsed,
              sickLeaveUsed: nextSickUsed,
            };

            saveEmployeeToTurso(updatedEmp);
            realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);
            return updatedEmp;
          }
          return emp;
        });
        setEmployees(nextEmployees);
      }
    }

    // Immediate Firestore synchronization
    syncStateToCloudImmediate({
      leaveRequests: sanitizeForFirestore(nextLeaves),
      employees: sanitizeForFirestore(nextEmployees),
      auditLogs: sanitizeForFirestore([logEntry, ...auditLogs]),
    });

    // Sync to Turso SQLite Cloud
    syncStateToTurso({ leaveRequests: nextLeaves, employees: nextEmployees, auditLogs: [logEntry, ...auditLogs] });

    syncStateToSupabase({ leaveRequests: nextLeaves, employees: nextEmployees });
    broadcastSupabaseEvent('UPDATE_LEAVE_STATUS', { requestId, status: newStatus, approvedBy: approver, comment });

    realtimeService.emit('UPDATE_LEAVE_STATUS', { requestId, status: newStatus, approvedBy: approver, comment });
  };

  const handleDeleteLeaveRequest = (requestId: string) => {
    const nextDeleted = new Set(deletedLeaveIds);
    nextDeleted.add(requestId);
    setDeletedLeaveIds(nextDeleted);
    const deletedArr = Array.from(nextDeleted);
    safeSetJson('attend_deleted_leave_ids', JSON.stringify(deletedArr));

    let nextLeaves: LeaveRequest[] = [];
    setLeaveRequests((prev) => {
      nextLeaves = prev.filter((l) => l.id !== requestId);
      safeSetJson('attend_leaves', JSON.stringify(nextLeaves));
      return nextLeaves;
    });

    // Remove any alert referencing this leave request
    setActionAlerts((prev) => {
      const nextAlerts = prev.filter((a) => a.leaveRequestId !== requestId && a.id !== `alert_leave_${requestId}`);
      safeSetJson('attend_staff_alerts', JSON.stringify(nextAlerts));
      return nextAlerts;
    });

    // Turso SQLite Cloud
    deleteLeaveRequestsFromTurso([requestId], nextLeaves);
    syncStateToTurso({ leaveRequests: nextLeaves, deletedLeaveIds: deletedArr });

    // Supabase Sync & Broadcast
    syncStateToSupabase({ leaveRequests: nextLeaves, deletedLeaveIds: deletedArr } as any);
    broadcastSupabaseEvent('DELETE_LEAVE', { id: requestId });

    realtimeService.emit('DELETE_LEAVE', { id: requestId });
    syncStateToCloudImmediate({ leaveRequests: sanitizeForFirestore(nextLeaves) });
  };

  const handleClearLeaveApprovals = (scope: 'processed' | 'all' = 'processed') => {
    let idsToDelete: string[] = [];
    let nextLeaves: LeaveRequest[] = [];

    setLeaveRequests((prev) => {
      if (scope === 'all') {
        idsToDelete = prev.map((l) => l.id);
        nextLeaves = [];
      } else {
        idsToDelete = prev.filter((l) => l.status === 'approved' || l.status === 'rejected').map((l) => l.id);
        nextLeaves = prev.filter((l) => l.status === 'pending');
      }
      safeSetJson('attend_leaves', JSON.stringify(nextLeaves));
      return nextLeaves;
    });

    if (idsToDelete.length === 0) return;

    const nextDeleted = new Set(deletedLeaveIds);
    idsToDelete.forEach((id) => nextDeleted.add(id));
    setDeletedLeaveIds(nextDeleted);
    const deletedArr = Array.from(nextDeleted);
    safeSetJson('attend_deleted_leave_ids', JSON.stringify(deletedArr));

    if (scope === 'all') {
      setActionAlerts((prev) => {
        const nextAlerts = prev.filter((a) => !a.leaveRequestId && !a.id.startsWith('alert_leave_'));
        safeSetJson('attend_staff_alerts', JSON.stringify(nextAlerts));
        return nextAlerts;
      });
    }

    // Turso SQLite Cloud
    deleteLeaveRequestsFromTurso(idsToDelete, nextLeaves);
    syncStateToTurso({ leaveRequests: nextLeaves, deletedLeaveIds: deletedArr });

    // Supabase Sync & Broadcast
    syncStateToSupabase({ leaveRequests: nextLeaves, deletedLeaveIds: deletedArr } as any);
    broadcastSupabaseEvent('CLEAR_LEAVES', { scope, deletedIds: idsToDelete });

    realtimeService.emit('CLEAR_LEAVES', { scope, deletedIds: idsToDelete });
    syncStateToCloudImmediate({ leaveRequests: sanitizeForFirestore(nextLeaves) });
  };

  const handleAddAuditLog = (log: AuditLogEntry) => {
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Open transfer modal for specific employee
  const handleOpenTransferModal = (emp?: Employee) => {
    setTransferTargetEmp(emp || null);
    setIsTransferModalOpen(true);
  };

  // Confirm official transfer
  const handleTransferEmployee = (
    employeeId: string,
    toBranchId: string,
    reason: string,
    effectiveDate: string
  ) => {
    const emp = employees.find((e) => e.id === employeeId);
    const fromBranch = branches.find((b) => b.id === emp?.branchId);
    const toBranch = branches.find((b) => b.id === toBranchId);

    const record: BranchTransferRecord = {
      id: `tr_${Date.now()}`,
      employeeId,
      employeeNameKh: emp?.nameKh || '',
      employeeNameEn: emp?.nameEn || '',
      employeeCode: emp?.code || '',
      employeeAvatar: emp?.avatar || '',
      fromBranchId: fromBranch?.id || '',
      fromBranchNameKh: fromBranch?.nameKh || '',
      fromBranchNameEn: fromBranch?.nameEn || '',
      toBranchId,
      toBranchNameKh: toBranch?.nameKh || '',
      toBranchNameEn: toBranch?.nameEn || '',
      effectiveDate,
      reason,
      transferredBy: currentUser?.nameKh || currentUser?.nameEn || 'Administrator',
      timestamp: new Date().toLocaleString(),
    };

    let nextTransfers: BranchTransferRecord[] = [];
    setTransferRecords((prev) => {
      nextTransfers = [record, ...prev];
      safeSetJson('attend_transfers', JSON.stringify(nextTransfers));
      return nextTransfers;
    });

    let nextEmployees: Employee[] = [];
    setEmployees((prev) => {
      nextEmployees = prev.map((e) => {
        if (e.id === employeeId) {
          return {
            ...e,
            branchId: toBranchId,
            gpsCalibratedBranchId: undefined, // Reset GPS lock so staff can calibrate for the new branch for the 1st time
            gpsCalibratedAt: undefined,
          };
        }
        return e;
      });
      safeSetJson('attend_employees', JSON.stringify(nextEmployees));
      return nextEmployees;
    });

    if (
      currentUser?.employeeId === employeeId ||
      currentUser?.employeeCode === emp?.code ||
      currentUser?.id === employeeId ||
      currentUser?.id === `user_${employeeId}`
    ) {
      setCurrentUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, branchId: toBranchId };
        safeSetJson('attend_auth_user', JSON.stringify(updated));
        return updated;
      });
    }

    syncStateToTurso({
      employees: nextEmployees,
      transferRecords: nextTransfers,
    });
    realtimeService.emit('TRANSFER_EMPLOYEE', record);
    syncStateToCloudImmediate({
      employees: sanitizeForFirestore(nextEmployees),
      transferRecords: sanitizeForFirestore(nextTransfers),
    });

    handleAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : 'Administrator') || 'Administrator',
      actorRole: currentUser?.role || 'admin',
      action: 'Authorized Staff Transfer',
      actionKh: 'អនុម័តការផ្ទេរសាខាបុគ្គលិក',
      module: 'employees',
      details: `Transferred ${emp?.nameEn || ''} from ${fromBranch?.nameEn || ''} to ${toBranch?.nameEn || ''}. Reason: ${reason}`,
      detailsKh: `បានផ្ទេរបុគ្គលិក ${emp?.nameKh || ''} ពី ${fromBranch?.nameKh || ''} ទៅកាន់ ${toBranch?.nameKh || ''}។`,
      status: 'success',
    });
  };

  // Automatic device schedule reminder for logged-in employees (Forgot Check-In & Forgot Check-Out)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee') return;

    const matchedEmp = employees.find(
      (e) =>
        e.id === currentUser.employeeId ||
        e.code === currentUser.employeeCode ||
        e.id === currentUser.id ||
        `user_${e.id}` === currentUser.id
    );
    if (!matchedEmp) return;

    const checkSchedule = () => {
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA');
      const dayOff = isEmployeeDayOff(matchedEmp, now);
      if (dayOff) return; // Do not nag staff on their regular Day Off

      // Check if on approved leave
      const hasApprovedLeave = leaveRequests.some(
        (l) =>
          (l.employeeId === matchedEmp.id || l.employeeCode === matchedEmp.code) &&
          l.status === 'approved' &&
          todayStr >= l.startDate &&
          todayStr <= l.endDate
      );
      if (hasApprovedLeave) return;

      const empBranch = branches.find((b) => b.id === matchedEmp.branchId);
      const empShift = resolveEmployeeShift(matchedEmp, shifts, empBranch);
      const startTime = matchedEmp.shiftStartTime || empShift?.startTime || '08:00';
      const endTime = matchedEmp.shiftEndTime || empShift?.endTime || '17:30';

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const shiftStartMinutes = startH * 60 + startM;
      const shiftEndMinutes = endH * 60 + endM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Today's records for this employee
      const myPunchesToday = attendanceRecords.filter(
        (r) =>
          (r.employeeId === matchedEmp.id || r.employeeCode === matchedEmp.code) &&
          r.timestamp &&
          new Date(r.timestamp).toLocaleDateString('en-CA') === todayStr
      );

      const hasCheckedIn = myPunchesToday.some((r) => r.type === 'check_in') || myPunchesToday.length > 0;
      const hasCheckedOut = myPunchesToday.some((r) => r.type === 'check_out');

      // 1. Forgot Check-In: Shift started > 10 mins ago and hasn't checked in
      if (!hasCheckedIn && currentMinutes >= shiftStartMinutes + 10 && currentMinutes < shiftEndMinutes) {
        if (autoRemindedCheckInRef.current !== todayStr && !activeStaffReminder) {
          autoRemindedCheckInRef.current = todayStr;
          const reminderPayload: StaffReminderPayload = {
            reminderId: `auto_in_${todayStr}_${matchedEmp.id}`,
            targetEmployeeId: matchedEmp.id,
            targetEmployeeCode: matchedEmp.code,
            targetBranchId: matchedEmp.branchId,
            reminderType: 'forgot_checkin',
            titleKh: '🔔 រំលឹក៖ ដល់ម៉ោងចូលធ្វើការហើយ! សូមស្កេនវត្តមាន (Check-In)',
            titleEn: '🔔 Reminder: Shift Started — Please Scan Check-In',
            messageKh: `ជំរាបសួរ ${matchedEmp.nameKh || matchedEmp.nameEn}! វេនការងាររបស់អ្នក (${empShift?.nameKh || 'វេនធម្មតា'} ${startTime} - ${endTime}) បានចាប់ផ្តើមហើយ ប៉ុន្តែប្រព័ន្ធមិនទាន់ឃើញកំណត់ត្រាស្កេនចូលរបស់អ្នកនៅឡើយទេ។ សូមចុចស្កេនវត្តមានឥឡូវនេះ។`,
            messageEn: `Hello ${matchedEmp.nameEn || 'Staff'}! Your scheduled shift (${startTime} - ${endTime}) has started, but no Check-In was recorded yet today. Please scan your attendance now.`,
            sentBy: lang === 'km' ? 'ប្រព័ន្ធស្វ័យប្រវត្ត (Auto-Reminder)' : 'System Auto-Reminder',
            timestamp: new Date().toISOString(),
            shiftName: lang === 'km' ? empShift?.nameKh : empShift?.nameEn,
            shiftHours: `${startTime} - ${endTime}`,
          };
          triggerBrowserReminderNotification(reminderPayload.titleKh, reminderPayload.messageKh);
          playReminderRingtone(3);
          setActiveStaffReminder(reminderPayload);
        }
      }

      // 2. Forgot Check-Out: Shift ended > 5 mins ago, checked in, but hasn't checked out
      if (hasCheckedIn && !hasCheckedOut && currentMinutes >= shiftEndMinutes + 5) {
        if (autoRemindedCheckOutRef.current !== todayStr && !activeStaffReminder) {
          autoRemindedCheckOutRef.current = todayStr;
          const reminderPayload: StaffReminderPayload = {
            reminderId: `auto_out_${todayStr}_${matchedEmp.id}`,
            targetEmployeeId: matchedEmp.id,
            targetEmployeeCode: matchedEmp.code,
            targetBranchId: matchedEmp.branchId,
            reminderType: 'forgot_checkout',
            titleKh: '🔔 រំលឹក៖ ផុតម៉ោងចេញវេនហើយ! សូមកុំភ្លេចស្កេនចេញ (Check-Out)',
            titleEn: '🔔 Reminder: Shift Ended — Please Scan Check-Out',
            messageKh: `ជំរាបសួរ ${matchedEmp.nameKh || matchedEmp.nameEn}! វេនការងាររបស់អ្នក (${empShift?.nameKh || 'វេនធម្មតា'}) បានផុតម៉ោងកំណត់ (${endTime}) ហើយ។ ប្រសិនបើអ្នកចប់ការងារហើយ សូមកុំភ្លេចស្កេនចេញ (Check-Out) ដើម្បីកត់ត្រាម៉ោងការងារបានត្រឹមត្រូវ។`,
            messageEn: `Hello ${matchedEmp.nameEn || 'Staff'}! Your scheduled shift ended at ${endTime}. Please scan Check-Out now to ensure your working hours and timesheet are accurately recorded.`,
            sentBy: lang === 'km' ? 'ប្រព័ន្ធស្វ័យប្រវត្ត (Auto-Reminder)' : 'System Auto-Reminder',
            timestamp: new Date().toISOString(),
            shiftName: lang === 'km' ? empShift?.nameKh : empShift?.nameEn,
            shiftHours: `${startTime} - ${endTime}`,
          };
          triggerBrowserReminderNotification(reminderPayload.titleKh, reminderPayload.messageKh);
          playReminderRingtone(3);
          setActiveStaffReminder(reminderPayload);
        }
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 45000);
    return () => clearInterval(interval);
  }, [currentUser, employees, shifts, attendanceRecords, leaveRequests, lang, activeStaffReminder]);

  // Admin Manual Remote Ring to Staff Device
  const handleSendStaffReminder = (
    targetEmp: Employee,
    reminderType: 'forgot_checkin' | 'forgot_checkout' | 'emergency_roll_call' | 'custom' = 'forgot_checkout',
    customMsg?: string
  ) => {
    const reminderId = `remind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const shiftInfo = shifts.find((s) => s.id === targetEmp.shiftId);
    const senderName = (currentUser ? (lang === 'km' ? currentUser.nameKh || currentUser.nameEn : currentUser.nameEn) : 'Administrator') || 'Administrator';

    const titleKh = reminderType === 'emergency_roll_call'
      ? '🚨 ការប្រកាសបន្ទាន់ (Emergency Roll Call)'
      : reminderType === 'forgot_checkin'
      ? '🔔 រំលឹក៖ ដល់ម៉ោងចូលធ្វើការហើយ! សូមស្កេនវត្តមាន (Check-In)'
      : '🔔 រំលឹក៖ ផុតម៉ោងចេញវេនហើយ! សូមកុំភ្លេចស្កេនចេញ (Check-Out)';
    const titleEn = reminderType === 'emergency_roll_call'
      ? '🚨 Emergency Safety Roll Call'
      : reminderType === 'forgot_checkin'
      ? '🔔 Reminder: Shift Started — Please Scan Check-In'
      : '🔔 Reminder: Shift Ended — Please Scan Check-Out';

    const messageKh = customMsg || (
      reminderType === 'emergency_roll_call'
        ? `ការហៅឈ្មោះបន្ទាន់ដើម្បីសុវត្ថិភាព! សូមបញ្ជាក់វត្តមានជាក់ស្តែងរបស់អ្នកជាបន្ទាន់។`
        : reminderType === 'forgot_checkin'
        ? `លោក/លោកស្រី ${targetEmp.nameKh || targetEmp.nameEn} មិនទាន់បានស្កេនចូលធ្វើការនៅឡើយទេ។ សូមស្កេនវត្តមាន (Check-In) ឥឡូវនេះ។`
        : `លោក/លោកស្រី ${targetEmp.nameKh || targetEmp.nameEn} បានផុតម៉ោងចេញវេនហើយ ប៉ុន្តែមិនទាន់បានស្កេនចេញ (Check-Out) នៅឡើយទេ។ សូមស្កេនចេញឥឡូវនេះ។`
    );
    const messageEn = customMsg || (
      reminderType === 'emergency_roll_call'
        ? `Emergency Roll Call in progress. Please verify your presence and safety immediately!`
        : reminderType === 'forgot_checkin'
        ? `Hello ${targetEmp.nameEn || 'Staff'}, your shift has started but you haven't checked in yet. Please scan Check-In now.`
        : `Hello ${targetEmp.nameEn || 'Staff'}, your shift has ended but you haven't checked out yet. Please scan Check-Out now.`
    );

    const reminderPayload: StaffReminderPayload = {
      reminderId,
      targetEmployeeId: targetEmp.id,
      targetEmployeeCode: targetEmp.code,
      targetBranchId: targetEmp.branchId,
      reminderType,
      titleKh,
      titleEn,
      messageKh,
      messageEn,
      sentBy: senderName,
      timestamp: new Date().toISOString(),
      shiftName: shiftInfo ? (lang === 'km' ? shiftInfo.nameKh : shiftInfo.nameEn) : undefined,
      shiftHours: shiftInfo ? `${shiftInfo.startTime} - ${shiftInfo.endTime}` : undefined,
    };

    // 1. Emit via Supabase Realtime
    broadcastSupabaseEvent('RING_STAFF_REMINDER', reminderPayload);

    // 2. Emit via realtimeService
    realtimeService.emit('RING_STAFF_REMINDER', reminderPayload);

    // 3. Save to Turso & Supabase staff_alerts
    const alertRecord: ActionAlertItem = {
      id: `alert_${reminderId}`,
      type: 'reminder',
      titleKh,
      titleEn,
      detailKh: `${targetEmp.nameKh || targetEmp.nameEn} (${targetEmp.code}): ${messageKh}`,
      detailEn: `${targetEmp.nameEn} (${targetEmp.code}): ${messageEn}`,
      actorName: senderName,
      actorAvatar: targetEmp.avatar,
      branchId: targetEmp.branchId,
      branchName: branches.find((b) => b.id === targetEmp.branchId)?.nameEn,
      timestamp: new Date().toLocaleTimeString(),
      rawTimestamp: Date.now(),
      isUnread: true,
    };
    saveStaffAlertToTurso(alertRecord);
    saveStaffAlertToSupabase(alertRecord);
    addActionAlert(alertRecord);

    // If current user is on this device, trigger local alert immediately
    if (
      currentUser &&
      (currentUser.employeeId === targetEmp.id ||
        currentUser.employeeCode === targetEmp.code ||
        currentUser.id === targetEmp.id)
    ) {
      playReminderRingtone(3);
      setActiveStaffReminder(reminderPayload);
    }

    setLiveToast({
      title: lang === 'km' ? '🔔 បានផ្ញើសំឡេងរោទិ៍រំលឹកជោគជ័យ' : '🔔 Staff Device Alert Sent',
      message: `${lang === 'km' ? 'បានបញ្ជូនសំឡេងរោទិ៍ទៅកាន់ឧបករណ៍របស់' : 'Alert ringing triggered for'} ${targetEmp.nameKh || targetEmp.nameEn} (${targetEmp.code})`,
      type: 'punch',
    });
  };

  const handleSendBulkStaffReminders = (
    targetEmps: Employee[],
    reminderType: 'forgot_checkin' | 'forgot_checkout' | 'emergency_roll_call' = 'forgot_checkout'
  ) => {
    if (!targetEmps || targetEmps.length === 0) return;
    targetEmps.forEach((emp) => handleSendStaffReminder(emp, reminderType));
    setLiveToast({
      title: lang === 'km' ? '🔔 បានផ្ញើសំឡេងរោទិ៍រំលឹកជាក្រុមជោគជ័យ' : '🔔 Bulk Alerts Dispatched',
      message: `${lang === 'km' ? `បានផ្ញើទៅកាន់បុគ្គលិកចំនួន ${targetEmps.length} នាក់` : `Sent ringing reminder alerts to ${targetEmps.length} staff members`}`,
      type: 'punch',
    });
  };

  // RESTORE BACKUP DATA
  const handleRestoreBackup = (backupData: SystemBackupData, mode: 'merge' | 'overwrite') => {
    let nextBranches = branches;
    let nextEmployees = employees;
    let nextRecords = attendanceRecords;
    let nextLeaves = leaveRequests;
    let nextTransfers = transferRecords;

    const incomingProfile: AuthUser | undefined = 
      backupData.adminProfile || 
      (backupData as any).profile || 
      (backupData as any).adminUser ||
      (backupData as any).userProfile;

    let nextAdminProfile = adminProfile;
    if (incomingProfile) {
      nextAdminProfile = incomingProfile;
      setAdminProfile(incomingProfile);
      safeSetJson('attend_admin_profile', JSON.stringify(incomingProfile));
      setCurrentUser((curr) => {
        if (!curr || curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin' || curr.id === incomingProfile.id) {
          const updated = { ...(curr || {}), ...incomingProfile };
          safeSetJson('attend_auth_user', JSON.stringify(updated));
          return updated;
        }
        return curr;
      });
    }

    if (mode === 'overwrite') {
      if (backupData.branches) { setBranches(backupData.branches); nextBranches = backupData.branches; }
      if (backupData.employees) { setEmployees(backupData.employees); nextEmployees = backupData.employees; }
      if (backupData.attendanceRecords) { setAttendanceRecords(backupData.attendanceRecords); nextRecords = backupData.attendanceRecords; }
      if (backupData.leaveRequests) { setLeaveRequests(backupData.leaveRequests); nextLeaves = backupData.leaveRequests; }
      if (backupData.transferRecords) { setTransferRecords(backupData.transferRecords); nextTransfers = backupData.transferRecords; }
      if (backupData.branding) setBranding(backupData.branding);
      if (backupData.rolePermissions) setRolePermissions(backupData.rolePermissions);
      if (backupData.systemSettings) setSystemSettings(backupData.systemSettings);
      if (backupData.auditLogs) setAuditLogs(backupData.auditLogs);
    } else {
      if (backupData.branches) setBranches((prev) => { nextBranches = mergeDatasets(prev, backupData.branches!); return nextBranches; });
      if (backupData.employees) setEmployees((prev) => { nextEmployees = mergeDatasets(prev, backupData.employees!); return nextEmployees; });
      if (backupData.attendanceRecords) setAttendanceRecords((prev) => { nextRecords = mergeDatasets(prev, backupData.attendanceRecords!); return nextRecords; });
      if (backupData.leaveRequests) setLeaveRequests((prev) => { nextLeaves = mergeDatasets(prev, backupData.leaveRequests!); return nextLeaves; });
      if (backupData.transferRecords) setTransferRecords((prev) => { nextTransfers = mergeDatasets(prev, backupData.transferRecords!); return nextTransfers; });
    }

    const restorePayload = {
      branches: nextBranches,
      employees: nextEmployees,
      attendanceRecords: nextRecords,
      leaveRequests: nextLeaves,
      transferRecords: nextTransfers,
      branding: backupData.branding || branding,
      rolePermissions: backupData.rolePermissions || rolePermissions,
      systemSettings: backupData.systemSettings || systemSettings,
      adminProfile: nextAdminProfile,
      auditLogs: backupData.auditLogs || auditLogs,
    };

    // Persist immediately to Turso SQLite Cloud & Cloud Firestore
    syncStateToTurso(restorePayload);
    syncStateToCloudImmediate(restorePayload);

    realtimeService.emit('SYSTEM_RESTORE', { backupData, restoreMode: mode });

    handleAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : 'Administrator') || 'Administrator',
      actorRole: currentUser?.role || 'admin',
      action: 'Restored System Database',
      actionKh: 'ស្តារទិន្នន័យប្រព័ន្ធឡើងវិញ (Database Restore)',
      module: 'backup',
      details: `Restored ${backupData.summary?.branchesCount || 0} branches, ${backupData.summary?.employeesCount || 0} staff via ${mode.toUpperCase()} mode to Turso Cloud.`,
      detailsKh: `បានស្តារទិន្នន័យប្រព័ន្ធ (${mode === 'overwrite' ? 'ជំនួសទាំងស្រុង' : 'បញ្ចូលបន្ថែម'}) ចំនួន ${backupData.summary?.branchesCount || 0} សាខាទៅកាន់ Cloud។`,
      status: 'success',
    });
  };

  // RESET SYSTEM DATA
  const handleResetSystem = (type: 'demo_seed' | 'clean_fresh') => {
    let freshBranches: Branch[] = [];
    let freshEmployees: Employee[] = [];
    let freshRecords: AttendanceRecord[] = [];
    let freshLeaves: LeaveRequest[] = [];
    let freshTransfers: BranchTransferRecord[] = [];

    if (type === 'demo_seed') {
      // Clear activity records (attendance records, leaves, transfers, audit logs) while preserving real branches & staff
      freshBranches = branches;
      freshEmployees = employees;
      freshRecords = [];
      freshLeaves = [];
      freshTransfers = [];

      setAttendanceRecords([]);
      setLeaveRequests([]);
      setTransferRecords([]);
      setAuditLogs([]);

      safeSetJson('attend_records', JSON.stringify([]));
      safeSetJson('attend_leaves', JSON.stringify([]));
      safeSetJson('attend_transfers', JSON.stringify([]));
      safeSetJson('attend_audit_logs', JSON.stringify([]));
    } else {
      // 100% Blank Brand New Start
      freshBranches = [DEFAULT_STARTER_BRANCH];
      setBranches(freshBranches);
      setEmployees([]);
      setAttendanceRecords([]);
      setLeaveRequests([]);
      setTransferRecords([]);
      setAuditLogs([]);
      setSelectedBranchId('all');

      safeSetJson('attend_branches', JSON.stringify(freshBranches));
      safeSetJson('attend_employees', JSON.stringify([]));
      safeSetJson('attend_records', JSON.stringify([]));
      safeSetJson('attend_leaves', JSON.stringify([]));
      safeSetJson('attend_transfers', JSON.stringify([]));
      safeSetJson('attend_audit_logs', JSON.stringify([]));
    }

    const resetPayload = {
      branches: freshBranches,
      employees: freshEmployees,
      attendanceRecords: freshRecords,
      leaveRequests: freshLeaves,
      transferRecords: freshTransfers,
      branding: type === 'demo_seed' ? INITIAL_BRANDING : branding,
      rolePermissions: type === 'demo_seed' ? INITIAL_ROLE_PERMISSIONS : rolePermissions,
      systemSettings: type === 'demo_seed' ? INITIAL_SYSTEM_SETTINGS : systemSettings,
    };

    // Sync reset to Turso SQLite Cloud & Cloud Firestore
    syncStateToTurso(resetPayload);
    syncStateToCloudDatabase(resetPayload);

    realtimeService.emit('SYSTEM_RESET', { resetType: type });

    handleAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : 'Administrator') || 'Administrator',
      actorRole: currentUser?.role || 'admin',
      action: 'System Factory Reset',
      actionKh: 'កំណត់ប្រព័ន្ធឡើងវិញ (Factory Reset)',
      module: 'system',
      details: `Reinitialized system state to: ${type === 'demo_seed' ? 'Clean Production State (Punches & History Cleared)' : 'Brand New Blank Start'}.`,
      detailsKh: `បានកំណត់ប្រព័ន្ធឡើងវិញទៅកាន់ ${type === 'demo_seed' ? 'ទិន្នន័យជាក់ស្តែងស្អាត (សម្អាតប្រវត្តិវត្តមាន)' : 'ទិន្នន័យទទេរស្អាត (Brand New)'}។`,
      status: 'warning',
    });
  };

  const handleUpdateUserProfile = (updatedUser: AuthUser, updatedEmp?: Employee) => {
    setCurrentUser(updatedUser);
    safeSetJson('attend_auth_user', JSON.stringify(updatedUser));

    if (updatedUser.role === 'admin' || updatedUser.id === 'user_admin' || updatedUser.username === 'admin') {
      setAdminProfile(updatedUser);
      safeSetJson('attend_admin_profile', JSON.stringify(updatedUser));
      syncStateToTurso({ adminProfile: updatedUser });
      syncStateToCloudImmediate({ adminProfile: updatedUser });
    }

    // Flexible employee matching so staff profile change ALWAYS updates their directory avatar & info
    const matchedEmployee = updatedEmp || employees.find((e) =>
      e.id === updatedUser.employeeId ||
      (updatedUser.employeeId && e.id === updatedUser.employeeId.replace('user_', '')) ||
      e.code === updatedUser.employeeCode ||
      e.id === updatedUser.id ||
      (`user_${e.id}` === updatedUser.id) ||
      (updatedUser.username && e.code.toLowerCase() === updatedUser.username.toLowerCase()) ||
      (updatedUser.email && e.email && e.email.toLowerCase() === updatedUser.email.toLowerCase()) ||
      (updatedUser.nameEn && e.nameEn.toLowerCase() === updatedUser.nameEn.toLowerCase())
    );

    let finalMergedEmp: Employee | undefined = undefined;
    if (matchedEmployee) {
      finalMergedEmp = {
        ...matchedEmployee,
        avatar: updatedUser.avatar || matchedEmployee.avatar,
        nameKh: updatedUser.nameKh || matchedEmployee.nameKh,
        nameEn: updatedUser.nameEn || matchedEmployee.nameEn,
        pinCode: updatedUser.pinCode || matchedEmployee.pinCode,
        phone: (updatedEmp && updatedEmp.phone) || updatedUser.phone || matchedEmployee.phone,
        email: (updatedEmp && updatedEmp.email) || updatedUser.email || matchedEmployee.email,
        address: (updatedEmp && updatedEmp.address) || updatedUser.address || matchedEmployee.address || '',
      };
      handleUpdateEmployee(finalMergedEmp);
    }

    realtimeService.emit('UPDATE_USER_PROFILE', { user: updatedUser, employee: finalMergedEmp || matchedEmployee });
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    safeSetJson('attend_auth_user', JSON.stringify(user));
    setShowLoginModal(false);
    if (user.role === 'employee') {
      setActiveTab('portal');
    } else {
      setActiveTab('dashboard');
    }

    // Match employee and branch
    const matchedEmp = employees.find(
      (e) => e.id === user.employeeId || e.code === user.employeeCode || e.id === user.id
    );
    const empBranch = branches.find((b) => b.id === (user.branchId || matchedEmp?.branchId));
    const empName = lang === 'km' 
      ? (user.nameKh || matchedEmp?.nameKh || user.nameEn || user.username)
      : (user.nameEn || matchedEmp?.nameEn || user.nameKh || user.username);
    const branchName = empBranch ? (lang === 'km' ? empBranch.nameKh : empBranch.nameEn) : '';
    const empCode = user.employeeCode || matchedEmp?.code || user.username;

    // Create staff login alert
    const loginAlert: Omit<ActionAlertItem, 'id' | 'timestamp'> & { id?: string; rawTimestamp?: number } = {
      id: `alert_login_${user.id}_${Date.now()}`,
      type: 'login',
      titleKh: 'បុគ្គលិកបានចូលប្រើប្រព័ន្ធ',
      titleEn: 'Staff Logged In',
      detailKh: `${empName} (${empCode}) បានចូលប្រើប្រព័ន្ធជោគជ័យ${branchName ? ` - ${branchName}` : ''}`,
      detailEn: `${empName} (${empCode}) logged in successfully${branchName ? ` - ${branchName}` : ''}`,
      actorName: empName,
      actorAvatar: user.avatar || matchedEmp?.avatar,
      branchId: empBranch?.id,
      branchName: branchName,
      rawTimestamp: Date.now(),
      isUnread: true,
    };

    addActionAlert(loginAlert);

    // Record Audit Log
    const auditLog: AuditLogEntry = {
      id: `audit_login_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actorName: `${empName} (${empCode})`,
      actorRole: user.role || 'employee',
      action: 'Staff Logged In',
      actionKh: 'បុគ្គលិកចូលប្រើប្រព័ន្ធ',
      module: 'security',
      details: `User ${user.username} (${user.role}) logged in at ${branchName || 'System'}`,
      detailsKh: `អ្នកប្រើប្រាស់ ${empName} (${user.role}) បានចូលប្រើប្រព័ន្ធនៅ ${branchName || 'ប្រព័ន្ធ'}`,
      status: 'success',
    };
    handleAddAuditLog(auditLog);

    // Persist to Turso SQLite Cloud & Broadcast to Supabase Realtime
    saveStaffAlertToTurso(loginAlert as ActionAlertItem);
    saveStaffAlertToSupabase(loginAlert as ActionAlertItem);
    broadcastSupabaseEvent('STAFF_LOGIN', {
      user,
      employee: matchedEmp,
      branch: empBranch,
      alert: loginAlert,
      auditLog,
    });

    // Broadcast to WebSocket and cross-tab BroadcastChannel
    realtimeService.emit('STAFF_LOGIN', {
      user,
      employee: matchedEmp,
      branch: empBranch,
      alert: loginAlert,
      auditLog,
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('attend_auth_user');
    setShowLoginModal(true);
    setActiveTab('dashboard');
  };

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-['Kantumruy_Pro','Plus_Jakarta_Sans',sans-serif] w-full max-w-full overflow-x-hidden">
      {/* Cloud Sync Overlay for Fresh Devices / Browsers */}
      {isCloudSyncLoading && (
        <div 
          onClick={() => setIsCloudSyncLoading(false)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/95 text-white px-4 text-center cursor-pointer select-none"
        >
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mb-5 shadow-xl shadow-indigo-600/30 animate-pulse">
            <Cloud className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="flex items-center space-x-2.5 text-lg font-bold text-slate-100 mb-1">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>{lang === 'km' ? 'កំពុងទាញយកទិន្នន័យពី Cloud Firestore...' : 'Loading Data from Cloud Firestore...'}</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            {lang === 'km'
              ? 'កំពុងធ្វើសមកាលកម្មទិន្នន័យសាខា បុគ្គលិក និងវត្តមានឆ្លងឧបករណ៍...'
              : 'Synchronizing multi-branch database, staff directory, and attendance records...'}
          </p>
        </div>
      )}

      {/* 1. Collapsible Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        branding={branding}
        currentUser={currentUser}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        branches={branches}
        currentGeo={currentGeo}
        lang={lang}
        pendingLeavesCount={pendingLeavesCount}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
        onOpenInstallModal={() => setShowInstallModal(true)}
      />

      {/* Main Content Layout with dynamic left margin for Sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 w-full max-w-full overflow-x-clip ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        {/* 2. Top Navigation Header Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
          branches={branches}
          currentGeo={currentGeo}
          lang={lang}
          setLang={setLang}
          onOpenQuickScan={() => setActiveTab('scan')}
          currentUser={currentUser}
          onOpenLoginModal={() => setShowLoginModal(true)}
          onLogout={handleLogout}
          employees={employees}
          pendingLeavesCount={pendingLeavesCount}
          actionAlerts={actionAlerts}
          onClearAlerts={handleClearAlerts}
          branding={branding}
          onUpdateBranding={(partial) => handleUpdateBranding({ ...branding, ...partial })}
          onNavigateToSettingsTypography={() => setActiveTab('settings')}
          broadcastNoticeKh={systemSettings.broadcastNoticeKh}
          broadcastNoticeEn={systemSettings.broadcastNoticeEn}
          broadcastActive={systemSettings.broadcastActive}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isLiveSyncConnected={isLiveSyncConnected}
          onlinePeersCount={onlinePeersCount}
          onOpenInstallModal={() => setShowInstallModal(true)}
        />

        {/* 3. Main Views Dynamic Router */}
        <main className="flex-1 pb-16">
          <ErrorBoundary fallbackTitleKh="កំពុងស្ដារផ្ទាំងទិដ្ឋភាពឡើងវិញ" fallbackTitleEn="Auto-Recovering View Container">
            <React.Suspense fallback={<ViewLoadingFallback />}>
            {activeTab === 'dashboard' && currentUser && (
            <DashboardView
              branches={branches}
              employees={employees}
              shifts={shifts}
              attendanceRecords={attendanceRecords}
              transferRecords={transferRecords}
              leaveRequests={leaveRequests}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
              onDeleteLeaveRequest={handleDeleteLeaveRequest}
              onClearLeaveRequests={handleClearLeaveApprovals}
              actionAlerts={actionAlerts}
              onClearAlerts={handleClearAlerts}
              onDismissAlert={handleDismissAlert}
              onApproveLocationException={handleApproveLocationException}
              currentUser={currentUser}
              selectedBranchId={selectedBranchId}
              setSelectedBranchId={setSelectedBranchId}
              onNavigateTab={setActiveTab}
              onOpenTransferModal={handleOpenTransferModal}
              onRingStaffReminder={handleSendStaffReminder}
              onRingBulkStaffReminders={handleSendBulkStaffReminders}
              onUpdateEmployee={handleUpdateEmployee}
              lang={lang}
              onManualSync={handleManualSync}
              isSyncing={isManualSyncing}
            />
          )}

          {activeTab === 'portal' && (
            <EmployeePortalView
              currentUser={currentUser || DEFAULT_AUTH_USER}
              employees={employees}
              branches={branches}
              leaveRequests={leaveRequests}
              attendanceRecords={attendanceRecords}
              shifts={shifts}
              onSubmitLeaveRequest={handleSubmitLeaveRequest}
              onOpenScan={() => setActiveTab('scan')}
              lang={lang}
              branding={branding}
              currentGeo={currentGeo}
              onUpdateBranchLocation={handleUpdateBranchLocation}
              onUpdateEmployee={handleUpdateEmployee}
              onUpdateUserProfile={handleUpdateUserProfile}
            />
          )}

          {activeTab === 'scan' && (
            <QrAttendanceView
              branches={branches}
              employees={employees}
              attendanceRecords={attendanceRecords}
              onAddAttendanceRecord={handleAddAttendanceRecord}
              currentGeo={currentGeo}
              setCurrentGeo={setCurrentGeo}
              currentUser={currentUser}
              lang={lang}
              onUpdateBranchLocation={handleUpdateBranchLocation}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              systemSettings={systemSettings}
              onUpdateSystemSettings={handleUpdateSystemSettings}
              onUpdateEmployee={handleUpdateEmployee}
              onAddAuditLog={handleAddAuditLog}
              leaveRequests={leaveRequests}
              shifts={shifts}
            />
          )}

          {activeTab === 'kiosk' && (
            <BranchKioskView
              branches={branches}
              employees={employees}
              attendanceRecords={attendanceRecords}
              onAddAttendanceRecord={handleAddAttendanceRecord}
              lang={lang}
              leaveRequests={leaveRequests}
            />
          )}

          {activeTab === 'gps_radar' && (
            <GpsRadarMap
              branches={branches}
              employees={employees}
              currentUser={currentUser}
              currentGeo={currentGeo}
              setCurrentGeo={setCurrentGeo}
              lang={lang}
              onUpdateBranchLocation={handleUpdateBranchLocation}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeeDirectoryView
              employees={employees}
              branches={branches}
              attendanceRecords={attendanceRecords}
              shifts={shifts}
              onUpdateShifts={setShifts}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onOpenTransferModal={handleOpenTransferModal}
              lang={lang}
              branding={branding}
            />
          )}

          {activeTab === 'branches' && (
            <BranchManagementView
              branches={branches}
              branchTypes={branchTypes}
              employees={employees}
              transferRecords={transferRecords}
              onUpdateBranch={handleUpdateBranch}
              onAddBranch={handleAddBranch}
              onDeleteBranch={handleDeleteBranch}
              onAddBranchType={handleAddBranchType}
              onUpdateBranchType={handleUpdateBranchType}
              onDeleteBranchType={handleDeleteBranchType}
              lang={lang}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              attendanceRecords={attendanceRecords}
              branches={branches}
              employees={employees}
              shifts={shifts}
              leaveRequests={leaveRequests}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
              onDeleteLeaveRequest={handleDeleteLeaveRequest}
              onClearLeaveRequests={handleClearLeaveApprovals}
              lang={lang}
              branding={branding}
              onManualSync={handleManualSync}
              isSyncing={isManualSyncing}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileSettingsView
              currentUser={currentUser || DEFAULT_AUTH_USER}
              employees={employees}
              branches={branches}
              onUpdateUserProfile={handleUpdateUserProfile}
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsView
              branches={branches}
              onUpdateBranch={handleUpdateBranch}
              onAddBranch={handleAddBranch}
              onDeleteBranch={handleDeleteBranch}
              branding={branding}
              onUpdateBranding={handleUpdateBranding}
              onOpenInstallModal={() => setShowInstallModal(true)}
              rolePermissions={rolePermissions}
              onUpdateRolePermissions={handleUpdateRolePermissions}
              systemSettings={systemSettings}
              onUpdateSystemSettings={handleUpdateSystemSettings}
              auditLogs={auditLogs}
              onAddAuditLog={handleAddAuditLog}
              employees={employees}
              currentUser={currentUser}
              adminProfile={adminProfile}
              attendanceRecords={attendanceRecords}
              leaveRequests={leaveRequests}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
              transferRecords={transferRecords}
              shifts={shifts}
              onUpdateShifts={setShifts}
              onRestoreBackup={handleRestoreBackup}
              onResetSystem={handleResetSystem}
              onUpdateLeaveRequests={setLeaveRequests}
              onUpdateEmployeesList={handleUpdateEmployeesList}
              onUpdateEmployee={handleUpdateEmployee}
              isLiveSyncConnected={isLiveSyncConnected}
              onlinePeersCount={onlinePeersCount}
              connectedPeers={connectedPeers}
              lang={lang}
            />
          )}

          {/* Safe Fallback Router if unexpected tab id is provided */}
          {!['dashboard', 'portal', 'scan', 'kiosk', 'gps_radar', 'employees', 'branches', 'leaves', 'reports', 'settings', 'profile'].includes(activeTab) && (
            currentUser?.role === 'employee' ? (
              <EmployeePortalView
                currentUser={currentUser || DEFAULT_AUTH_USER}
                employees={employees}
                branches={branches}
                leaveRequests={leaveRequests}
                attendanceRecords={attendanceRecords}
                shifts={shifts}
                onSubmitLeaveRequest={handleSubmitLeaveRequest}
                onOpenScan={() => setActiveTab('scan')}
                lang={lang}
                branding={branding}
                currentGeo={currentGeo}
                onUpdateBranchLocation={handleUpdateBranchLocation}
                onUpdateEmployee={handleUpdateEmployee}
                onUpdateUserProfile={handleUpdateUserProfile}
              />
            ) : currentUser ? (
              <DashboardView
                branches={branches}
                employees={employees}
                shifts={shifts}
                attendanceRecords={attendanceRecords}
                transferRecords={transferRecords}
                leaveRequests={leaveRequests}
                onUpdateLeaveStatus={handleUpdateLeaveStatus}
                actionAlerts={actionAlerts}
                onClearAlerts={handleClearAlerts}
                currentUser={currentUser}
                selectedBranchId={selectedBranchId}
                setSelectedBranchId={setSelectedBranchId}
                onNavigateTab={setActiveTab}
                onOpenTransferModal={handleOpenTransferModal}
                onUpdateEmployee={handleUpdateEmployee}
                lang={lang}
              />
            ) : null
          )}
          </React.Suspense>
          </ErrorBoundary>
        </main>

        {/* 4. Bottom Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-8 text-xs text-slate-500 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="w-6 h-6 rounded-lg object-cover border border-slate-200"
              />
              <p className="font-semibold text-slate-700">
                {lang === 'km'
                  ? `© ២០២៦ ${branding.companyNameKh} • ${branding.sloganKh}`
                  : `© 2026 ${branding.companyNameEn} • ${branding.sloganEn}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {lang === 'km' ? `៧ សាខាដំណើរការ & Sync Real-Time (${onlinePeersCount} គ្រឿង)` : `7 Branches Active & Real-Time Synced (${onlinePeersCount} nodes)`}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-mono text-[11px] text-slate-600">
                📞 {branding.supportPhone}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Real-time Floating Sync Notification Toast */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900/95 text-white p-4 rounded-2xl border border-indigo-500/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-indigo-400">{liveToast.title}</h4>
              <p className="text-xs text-slate-200 font-medium mt-1 leading-snug">{liveToast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Official Branch Transfer Modal */}
      <React.Suspense fallback={null}>
        {isTransferModalOpen && (
          <BranchTransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            employee={transferTargetEmp}
            branches={branches}
            onConfirmTransfer={handleTransferEmployee}
            lang={lang}
          />
        )}
      </React.Suspense>

      {/* Authentication & Role Switcher Modal (Bypassed if public visitor is viewing an online digital card) */}
      <LoginModal
        isOpen={(showLoginModal || !currentUser) && !onlineCardEmp}
        onClose={() => {
          if (currentUser) {
            setShowLoginModal(false);
          }
        }}
        currentUser={currentUser}
        adminProfile={adminProfile}
        onLogin={handleLogin}
        onLogout={handleLogout}
        employees={employees}
        lang={lang}
        branding={branding}
        onUpdateBranding={handleUpdateBranding}
        onUpdateEmployees={handleBatchUpdateEmployees}
      />

      {/* PWA & Home Screen Device Installation Modal */}
      <React.Suspense fallback={null}>
        {showInstallModal && (
          <InstallAppModal
            isOpen={showInstallModal}
            onClose={() => setShowInstallModal(false)}
            branding={branding}
            onUpdateBranding={handleUpdateBranding}
            lang={lang}
          />
        )}
      </React.Suspense>

      {/* Online Verified Digital ID Card Scanned/Direct View Modal */}
      <React.Suspense fallback={null}>
        {onlineCardEmp && (
          <DigitalIdCardModal
            employee={onlineCardEmp}
            branch={branches.find((b) => b.id === onlineCardEmp.branchId)}
            branding={branding}
            lang={lang}
            isOnlineVerificationView={true}
            onClose={() => {
              setOnlineCardEmp(null);
              if (typeof window !== 'undefined' && window.history) {
                const url = new URL(window.location.href);
                url.searchParams.delete('viewCard');
                url.searchParams.delete('verify');
                url.searchParams.delete('badge');
                url.searchParams.delete('card');
                window.history.replaceState({}, '', url.pathname + (url.search || ''));
              }
            }}
            onUpdatePhoto={(empId, newUrl) => {
              setEmployees((prev) =>
                prev.map((e) => (e.id === empId ? { ...e, avatar: newUrl } : e))
              );
              if (onlineCardEmp.id === empId) {
                setOnlineCardEmp((prev) => prev ? { ...prev, avatar: newUrl } : null);
              }
            }}
          />
        )}
      </React.Suspense>

      {/* Staff Device Ringing Attendance Reminder Modal (Auto-Reminder & Admin Trigger) */}
      {activeStaffReminder && (
        <StaffReminderAlertModal
          reminder={activeStaffReminder}
          lang={lang}
          onClose={() => setActiveStaffReminder(null)}
          onNavigateToScan={() => {
            setActiveStaffReminder(null);
            setActiveTab('scan');
          }}
          onSnooze={(mins) => {
            setActiveStaffReminder(null);
            setTimeout(() => {
              setActiveStaffReminder(activeStaffReminder);
            }, mins * 60 * 1000);
          }}
        />
      )}
    </div>
  );
}
