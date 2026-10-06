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
  SyncMessage
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { QrAttendanceView } from './components/QrAttendanceView';
import { BranchKioskView } from './components/BranchKioskView';
import { GpsRadarMap } from './components/GpsRadarMap';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView';
import { BranchManagementView } from './components/BranchManagementView';
import { ReportsView } from './components/ReportsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { EmployeePortalView } from './components/EmployeePortalView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { BranchTransferModal } from './components/BranchTransferModal';
import { LoginModal } from './components/LoginModal';
import { InstallAppModal } from './components/InstallAppModal';
import { DigitalIdCardModal } from './components/DigitalIdCardModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { updateDynamicAppBranding } from './utils/pwaBrandUtils';
import { applyKhmerTypography } from './utils/typographyUtils';
import { realtimeService } from './utils/realtimeService';
import { mergeDatasets } from './utils/backupRestoreUtils';
import { playAlertChime } from './utils/soundUtils';
import { validatePunchAllowance } from './utils/dayOffUtils';
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
  CloudSystemState 
} from './utils/firebaseSync';

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

function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
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
    } catch (_) {}
    return fallback;
  }
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

  // Failsafe: Never let loading overlay block the user for more than 1.2s under any network condition
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCloudSyncLoading(false);
      isCloudInitializedRef.current = true;
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Persistent Core Data
  const [branches, setBranches] = useState<Branch[]>(() => {
    return safeGetJson('attend_branches', INITIAL_BRANCHES);
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    return safeGetJson('attend_employees', INITIAL_EMPLOYEES);
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    return safeGetJson('attend_records', INITIAL_ATTENDANCE_RECORDS);
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    return safeGetJson('attend_leaves', INITIAL_LEAVE_REQUESTS);
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
  const [actionAlerts, setActionAlerts] = useState<ActionAlertItem[]>(() => {
    return safeGetJson('attend_staff_alerts', []);
  });

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
        localStorage.setItem('attend_staff_alerts', JSON.stringify(nextAlerts));
      } catch {}
      return nextAlerts;
    });
  };

  const handleClearAlerts = () => {
    setActionAlerts([]);
    localStorage.removeItem('attend_staff_alerts');
    fetch('/api/staff/alerts', { method: 'DELETE' }).catch(() => {});
    realtimeService.emit('ACTION_ALERT', { action: 'CLEAR_ALL' });
  };

  const showLiveAlert = (title: string, message: string, type: 'punch' | 'leave' | 'transfer' | 'system') => {
    setLiveToast({ title, message, type });
    setTimeout(() => setLiveToast(null), 5000);
    playAlertChime(type === 'leave' ? 'leave' : type === 'punch' ? 'punch' : 'alert');
  };

  // Keep actionAlerts populated with pending leave requests and recent staff attendance punches, sorted chronologically
  useEffect(() => {
    const recentPunches: ActionAlertItem[] = attendanceRecords.slice(0, 30).map((r) => {
      const empName = lang === 'km' ? (r.employeeNameKh || r.employeeNameEn) : (r.employeeNameEn || r.employeeNameKh);
      const actionType = r.type === 'check_in' 
        ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
        : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');
      const timeMs = r.timestamp ? new Date(r.timestamp).getTime() : Date.now();
      const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

      return {
        id: `alert_att_${r.id}`,
        type: 'punch' as const,
        titleKh: r.isWithinGeofence ? 'វត្តមានស្កេន GPS ជោគជ័យ' : '⚠️ វត្តមានស្កេនខុសទីតាំង Geofence',
        titleEn: r.isWithinGeofence ? 'GPS Scan Punch Verified' : '⚠️ Geofence Distance Warning',
        detailKh: `${empName} ${actionType} - ${r.branchNameKh || r.branchNameEn || ''} (${r.isWithinGeofence ? 'ត្រឹមត្រូវតាម GPS' : `លើសដែនកំណត់ ${Math.round(r.distanceToBranch || 0)}m`})`,
        detailEn: `${empName} ${actionType} - ${r.branchNameEn || ''} (${r.isWithinGeofence ? 'Within GPS Geofence' : `${Math.round(r.distanceToBranch || 0)}m Out of Range`})`,
        timestamp: timeStr || r.timestamp || '',
        rawTimestamp: timeMs,
        actorName: empName,
        actorAvatar: r.employeeAvatar,
        branchId: r.branchId,
        branchName: r.branchNameKh || r.branchNameEn,
        isUnread: false,
      };
    });

    const pendingLeaves: ActionAlertItem[] = leaveRequests
      .filter((r) => r.status === 'pending')
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
      // Retain live alerts (such as staff logins and recent active punches) that were pushed live
      const liveCustomAlerts = prev.filter(
        (a) => !a.id.startsWith('alert_leave_')
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
  }, [leaveRequests, attendanceRecords, lang]);

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

  // Live GPS state: initial coordinates
  const [currentGeo, setCurrentGeo] = useState<UserGeoLocation>({
    lat: 11.55802,
    lng: 104.92804,
    accuracy: 5,
    timestamp: Date.now(),
    isReal: false,
    label: 'Initial Location',
  });

  // Automatically acquire real browser GPS coordinates on app load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentGeo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
            isReal: true,
            label: `Live GPS Device (±${Math.round(pos.coords.accuracy)}m)`,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
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
        // Fetch both Cloud Firestore and Local Server state concurrently to guarantee complete data
        const [cloudStateRes, serverRes] = await Promise.allSettled([
          getCloudDatabaseState(),
          fetch('/api/system/state').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        const cState = cloudStateRes.status === 'fulfilled' ? cloudStateRes.value : null;
        const sState = (serverRes.status === 'fulfilled' && serverRes.value?.success && serverRes.value?.state)
          ? serverRes.value.state
          : null;

        if (!isMounted) return;

        // Prioritize populated datasets to ensure no empty overwrites
        const bestBranches = (cState && Array.isArray(cState.branches) && cState.branches.length > 0)
          ? cState.branches
          : (sState && Array.isArray(sState.branches) && sState.branches.length > 0)
            ? sState.branches
            : null;

        const bestEmployees = (cState && Array.isArray(cState.employees) && cState.employees.length > 0)
          ? cState.employees
          : (sState && Array.isArray(sState.employees) && sState.employees.length > 0)
            ? sState.employees
            : null;

        const bestRecords = mergeDatasets(
          (cState?.attendanceRecords || []),
          (sState?.attendanceRecords || [])
        );

        const bestLeaves = (cState && Array.isArray(cState.leaveRequests) && cState.leaveRequests.length > 0)
          ? cState.leaveRequests
          : (sState?.leaveRequests || []);

        const bestTransfers = (cState && Array.isArray(cState.transferRecords) && cState.transferRecords.length > 0)
          ? cState.transferRecords
          : (sState?.transferRecords || []);

        const bestBranchTypes = (cState && Array.isArray(cState.branchTypes) && cState.branchTypes.length > 0)
          ? cState.branchTypes
          : (sState?.branchTypes || []);

        const bestBranding = cState?.branding || sState?.branding;
        const bestRolePerms = (cState && Array.isArray(cState.rolePermissions) && cState.rolePermissions.length > 0)
          ? cState.rolePermissions
          : (sState?.rolePermissions || []);
        const bestSettings = cState?.systemSettings || sState?.systemSettings;
        const bestAdmin = cState?.adminProfile || sState?.adminProfile;
        const bestAudit = (cState && Array.isArray(cState.auditLogs) && cState.auditLogs.length > 0)
          ? cState.auditLogs
          : (sState?.auditLogs || []);
        const bestShifts = (cState && Array.isArray(cState.shifts) && cState.shifts.length > 0)
          ? cState.shifts
          : (sState?.shifts || []);
        const bestAlerts = (cState && Array.isArray(cState.staffAlerts) && cState.staffAlerts.length > 0)
          ? cState.staffAlerts
          : (sState?.staffAlerts || []);

        isReceivingCloudUpdate.current = true;

        if (bestBranches && bestBranches.length > 0) {
          setBranches(bestBranches);
          localStorage.setItem('attend_branches', JSON.stringify(bestBranches));
        }

        if (bestEmployees && bestEmployees.length > 0) {
          setEmployees(bestEmployees);
          localStorage.setItem('attend_employees', JSON.stringify(bestEmployees));
        }

        if (bestRecords.length > 0) {
          setAttendanceRecords((prev) => {
            const merged = mergeDatasets(prev, bestRecords);
            try { localStorage.setItem('attend_records', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
        }

        if (bestLeaves.length > 0) {
          setLeaveRequests(bestLeaves);
          localStorage.setItem('attend_leaves', JSON.stringify(bestLeaves));
        }

        if (bestTransfers.length > 0) {
          setTransferRecords(bestTransfers);
          localStorage.setItem('attend_transfers', JSON.stringify(bestTransfers));
        }

        if (bestBranchTypes.length > 0) {
          setBranchTypes(bestBranchTypes);
          localStorage.setItem('attend_branch_types', JSON.stringify(bestBranchTypes));
        }

        if (bestBranding) {
          setBranding(bestBranding);
          localStorage.setItem('attend_branding', JSON.stringify(bestBranding));
        }

        if (bestRolePerms.length > 0) {
          setRolePermissions(bestRolePerms);
          localStorage.setItem('attend_role_permissions', JSON.stringify(bestRolePerms));
        }

        if (bestSettings && Object.keys(bestSettings).length > 0) {
          setSystemSettings(bestSettings);
          localStorage.setItem('attend_system_settings', JSON.stringify(bestSettings));
        }

        if (bestAdmin) {
          setAdminProfile(bestAdmin);
          localStorage.setItem('attend_admin_profile', JSON.stringify(bestAdmin));
          setCurrentUser((curr) => {
            if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
              const updated = { ...curr, ...bestAdmin };
              localStorage.setItem('attend_auth_user', JSON.stringify(updated));
              return updated;
            }
            return curr;
          });
        }

        if (bestAudit.length > 0) {
          setAuditLogs(bestAudit);
          localStorage.setItem('attend_audit_logs', JSON.stringify(bestAudit));
        }

        if (bestShifts.length > 0) {
          setShifts(bestShifts);
          localStorage.setItem('attend_shifts', JSON.stringify(bestShifts));
        }

        if (bestAlerts.length > 0) {
          setActionAlerts((prev) => {
            const prevIds = new Set(prev.map((a) => a.id));
            const newIncoming = bestAlerts.filter((a: any) => !prevIds.has(a.id));
            const merged = [...newIncoming, ...prev];
            merged.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
            return merged.slice(0, 50);
          });
        }

        // Auto-heal any store that had missing/empty data
        if (bestEmployees && bestEmployees.length > 0 && bestBranches && bestBranches.length > 0) {
          const reconciledPayload = {
            branches: bestBranches,
            employees: bestEmployees,
            attendanceRecords: bestRecords,
            leaveRequests: bestLeaves,
            transferRecords: bestTransfers,
            branchTypes: bestBranchTypes,
            branding: bestBranding,
            rolePermissions: bestRolePerms,
            systemSettings: bestSettings,
            adminProfile: bestAdmin,
            auditLogs: bestAudit,
            shifts: bestShifts,
          };

          // Re-sync server if server had 0 emps
          if (!sState || !Array.isArray(sState.employees) || sState.employees.length === 0) {
            fetch('/api/system/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: reconciledPayload, senderId: 'client_reconcile' }),
            }).catch(() => {});
          }

          // Re-sync Firestore if Firestore had 0 emps
          if (!cState || !Array.isArray(cState.employees) || cState.employees.length === 0) {
            syncStateToCloudImmediate(reconciledPayload);
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
            localStorage.setItem('attend_branches', JSON.stringify(s.branches));
          }
          if (Array.isArray(s.employees)) {
            setEmployees(s.employees);
            localStorage.setItem('attend_employees', JSON.stringify(s.employees));
          }
          if (Array.isArray(s.attendanceRecords)) {
            setAttendanceRecords(s.attendanceRecords);
            localStorage.setItem('attend_records', JSON.stringify(s.attendanceRecords));
          }
          if (Array.isArray(s.leaveRequests)) {
            setLeaveRequests(s.leaveRequests);
            localStorage.setItem('attend_leaves', JSON.stringify(s.leaveRequests));
          }
          if (Array.isArray(s.transferRecords)) {
            setTransferRecords(s.transferRecords);
            localStorage.setItem('attend_transfers', JSON.stringify(s.transferRecords));
          }
          if (s.branding) {
            setBranding(s.branding);
            localStorage.setItem('attend_branding', JSON.stringify(s.branding));
          }
          if (Array.isArray(s.rolePermissions)) {
            setRolePermissions(s.rolePermissions);
            localStorage.setItem('attend_role_permissions', JSON.stringify(s.rolePermissions));
          }
          if (s.systemSettings) {
            setSystemSettings(s.systemSettings);
            localStorage.setItem('attend_system_settings', JSON.stringify(s.systemSettings));
          }
          if (s.adminProfile) {
            setAdminProfile(s.adminProfile);
            localStorage.setItem('attend_admin_profile', JSON.stringify(s.adminProfile));
            setCurrentUser((curr) => {
              if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
                const updated = { ...curr, ...s.adminProfile };
                localStorage.setItem('attend_auth_user', JSON.stringify(updated));
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
          localStorage.setItem('attend_admin_profile', JSON.stringify(user));
          setCurrentUser((curr) => {
            if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
              const updated = { ...curr, ...user };
              localStorage.setItem('attend_auth_user', JSON.stringify(updated));
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
            localStorage.setItem('attend_employees', JSON.stringify(next));
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
              localStorage.setItem('attend_records', JSON.stringify(next));
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
              localStorage.setItem('attend_auth_user', JSON.stringify(updated));
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
            localStorage.setItem('attend_records', JSON.stringify(next));
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
          setActionAlerts([]);
          localStorage.removeItem('attend_staff_alerts');
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
          localStorage.setItem('attend_employees', JSON.stringify(next));
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
            localStorage.setItem('attend_records', JSON.stringify(next));
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
            localStorage.setItem('attend_auth_user', JSON.stringify(updated));
            return updated;
          }
          return curr;
        });
      } else if (type === 'DELETE_EMPLOYEE' && payload) {
        const idToDelete = payload.id || payload.employeeId;
        setEmployees((prev) => prev.filter((e) => e.id !== idToDelete));
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
        setBranches((prev) => prev.filter((b) => b.id !== idToDelete));
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
      }
    });

    return () => {
      unsubConnection();
      unsubPresence();
      unsubSync();
    };
  }, [lang]);

  // Sync with Firebase Cloud Firestore Database in real-time
  useEffect(() => {
    let isInitialCloudLoad = true;

    const unsubscribe = subscribeToCloudDatabase(
      (cloudData) => {
        if (!cloudData) return;
        isReceivingCloudUpdate.current = true;

        if (Array.isArray(cloudData.branches) && (cloudData.branches.length > 0 || cloudData.isReset)) {
          setBranches(cloudData.branches);
          localStorage.setItem('attend_branches', JSON.stringify(cloudData.branches));
        }
        if (Array.isArray(cloudData.employees) && (cloudData.employees.length > 0 || cloudData.isReset)) {
          setEmployees(cloudData.employees);
          localStorage.setItem('attend_employees', JSON.stringify(cloudData.employees));
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
                localStorage.setItem('attend_auth_user', JSON.stringify(updated));
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
            return cloudData.attendanceRecords!;
          });
          localStorage.setItem('attend_records', JSON.stringify(cloudData.attendanceRecords));
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
            return cloudData.leaveRequests!;
          });
          localStorage.setItem('attend_leaves', JSON.stringify(cloudData.leaveRequests));
        }
        if (Array.isArray(cloudData.transferRecords)) {
          setTransferRecords(cloudData.transferRecords);
          localStorage.setItem('attend_transfers', JSON.stringify(cloudData.transferRecords));
        }
        if (Array.isArray(cloudData.branchTypes)) {
          setBranchTypes(cloudData.branchTypes);
          localStorage.setItem('attend_branch_types', JSON.stringify(cloudData.branchTypes));
        }
        if (cloudData.branding) {
          setBranding(cloudData.branding);
          localStorage.setItem('attend_branding', JSON.stringify(cloudData.branding));
        }
        if (Array.isArray(cloudData.rolePermissions)) {
          setRolePermissions(cloudData.rolePermissions);
          localStorage.setItem('attend_role_permissions', JSON.stringify(cloudData.rolePermissions));
        }
        if (cloudData.systemSettings) {
          setSystemSettings(cloudData.systemSettings);
          localStorage.setItem('attend_system_settings', JSON.stringify(cloudData.systemSettings));
        }
        if (cloudData.adminProfile) {
          setAdminProfile(cloudData.adminProfile);
          localStorage.setItem('attend_admin_profile', JSON.stringify(cloudData.adminProfile));
          setCurrentUser((curr) => {
            if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
              const updated = { ...curr, ...cloudData.adminProfile };
              localStorage.setItem('attend_auth_user', JSON.stringify(updated));
              return updated;
            }
            return curr;
          });
        }
        if (Array.isArray(cloudData.auditLogs)) {
          setAuditLogs(cloudData.auditLogs);
          localStorage.setItem('attend_audit_logs', JSON.stringify(cloudData.auditLogs));
        }
        if (Array.isArray(cloudData.shifts) && cloudData.shifts.length > 0) {
          setShifts(cloudData.shifts);
          localStorage.setItem('attend_shifts', JSON.stringify(cloudData.shifts));
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

  // Periodic background fallback sync (every 4 seconds) to guarantee real-time staff alerts across all devices
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetch('/api/system/state')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.state) {
            const serverState = data.state;
            if (Array.isArray(serverState.attendanceRecords)) {
              setAttendanceRecords((prevRecords) => {
                const prevIds = new Set(prevRecords.map((r) => r.id));
                const newPunches = serverState.attendanceRecords.filter((r: AttendanceRecord) => !prevIds.has(r.id));
                if (newPunches.length > 0) {
                  playAlertChime('punch');
                  newPunches.forEach((record: AttendanceRecord) => {
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
                      lang === 'km' ? '🟢 វត្តមានស្កេន GPS ថ្មី (Live Sync)' : '🟢 Real-time GPS Punch Synced',
                      `${empName} ${actionType} - ${record.branchNameEn || ''}`,
                      'punch'
                    );
                  });
                  localStorage.setItem('attend_records', JSON.stringify(serverState.attendanceRecords));
                  return serverState.attendanceRecords;
                }
                return prevRecords;
              });
            }
            // Auto-heal: If local employees is unexpectedly empty but server has employees, restore them immediately!
            if (Array.isArray(serverState.employees) && serverState.employees.length > 0) {
              setEmployees((currentEmps) => {
                if (!currentEmps || currentEmps.length === 0) {
                  localStorage.setItem('attend_employees', JSON.stringify(serverState.employees));
                  return serverState.employees;
                }
                return currentEmps;
              });
            }
            if (Array.isArray(serverState.branches) && serverState.branches.length > 0) {
              setBranches((currentBranches) => {
                if (!currentBranches || currentBranches.length === 0) {
                  localStorage.setItem('attend_branches', JSON.stringify(serverState.branches));
                  return serverState.branches;
                }
                return currentBranches;
              });
            }
            if (Array.isArray(serverState.staffAlerts) && serverState.staffAlerts.length > 0) {
              setActionAlerts((prev) => {
                const prevIds = new Set(prev.map((a) => a.id));
                const newAlerts = serverState.staffAlerts.filter((a: any) => !prevIds.has(a.id));
                if (newAlerts.length > 0) {
                  const merged = [...newAlerts, ...prev];
                  merged.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
                  return merged.slice(0, 50);
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [lang]);

  // Sync to local storage and Cloud Firestore
  useEffect(() => {
    localStorage.setItem('attend_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('attend_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('attend_auth_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('attend_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('attend_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('attend_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('attend_leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('attend_transfers', JSON.stringify(transferRecords));
  }, [transferRecords]);

  useEffect(() => {
    localStorage.setItem('attend_branding', JSON.stringify(branding));
    updateDynamicAppBranding(branding, lang);
    applyKhmerTypography(branding.typography, lang);
  }, [branding, lang]);

  useEffect(() => {
    localStorage.setItem('attend_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    localStorage.setItem('attend_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem('attend_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('attend_admin_profile', JSON.stringify(adminProfile));
  }, [adminProfile]);

  useEffect(() => {
    localStorage.setItem('attend_shifts', JSON.stringify(shifts));
  }, [shifts]);

  // Automatically sync any local modifications to Firebase Cloud Firestore
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

    syncStateToCloudDatabase({
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
    });
  }, [
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

    let nextRecords: AttendanceRecord[] = [];
    setAttendanceRecords((prev) => {
      nextRecords = [newRecord, ...prev.filter((r) => r.id !== newRecord.id)];
      localStorage.setItem('attend_records', JSON.stringify(nextRecords));
      return nextRecords;
    });

    const empName = lang === 'km' ? (newRecord.employeeNameKh || newRecord.employeeNameEn) : (newRecord.employeeNameEn || newRecord.employeeNameKh);
    const actionType = newRecord.type === 'check_in' 
      ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
      : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');

    const punchTimeMs = newRecord.timestamp ? new Date(newRecord.timestamp).getTime() : Date.now();

    addActionAlert({
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
      isUnread: true,
    });

    showLiveAlert(
      lang === 'km' ? '🟢 វត្តមានស្កេន GPS ជោគជ័យ' : '🟢 GPS Punch Recorded',
      `${empName} ${actionType} - ${newRecord.branchNameEn || ''}`,
      'punch'
    );

    // 1. Broadcast to all WebSocket connected peers and BroadcastChannel
    realtimeService.emit('PUNCH_ATTENDANCE', { record: newRecord });

    // 2. Immediately push to Firestore Cloud Database
    syncStateToCloudImmediate({ attendanceRecords: sanitizeForFirestore([newRecord, ...attendanceRecords]) });

    // 3. Persist to server system_database.json
    fetch('/api/attendance/punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: newRecord, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleAddEmployee = (newEmp: Employee) => {
    const preparedEmp: Employee = {
      ...newEmp,
      annualLeaveQuota: newEmp.annualLeaveQuota !== undefined ? newEmp.annualLeaveQuota : 18,
      annualLeaveUsed: newEmp.annualLeaveUsed !== undefined ? newEmp.annualLeaveUsed : 0,
      sickLeaveQuota: newEmp.sickLeaveQuota !== undefined ? newEmp.sickLeaveQuota : 7,
      sickLeaveUsed: newEmp.sickLeaveUsed !== undefined ? newEmp.sickLeaveUsed : 0,
    };
    let nextEmployees: Employee[] = [];
    setEmployees((prev) => {
      nextEmployees = [preparedEmp, ...prev];
      localStorage.setItem('attend_employees', JSON.stringify(nextEmployees));
      return nextEmployees;
    });
    realtimeService.emit('ADD_EMPLOYEE', preparedEmp);
    syncStateToCloudImmediate({ employees: sanitizeForFirestore(nextEmployees) });
    fetch('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: preparedEmp, isNew: true, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    let nextEmployees: Employee[] = [];
    setEmployees((prev) => {
      nextEmployees = prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
      localStorage.setItem('attend_employees', JSON.stringify(nextEmployees));
      return nextEmployees;
    });
    let nextRecords: AttendanceRecord[] = [];
    setAttendanceRecords((prev) => {
      nextRecords = prev.map((r) =>
        r.employeeId === updatedEmp.id
          ? {
              ...r,
              employeeNameKh: updatedEmp.nameKh,
              employeeNameEn: updatedEmp.nameEn,
              employeeAvatar: updatedEmp.avatar,
            }
          : r
      );
      localStorage.setItem('attend_records', JSON.stringify(nextRecords));
      return nextRecords;
    });

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
        localStorage.setItem('attend_auth_user', JSON.stringify(syncedUser));
        return syncedUser;
      }
      return curr;
    });

    realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);
    syncStateToCloudImmediate({
      employees: sanitizeForFirestore(nextEmployees),
      attendanceRecords: sanitizeForFirestore(nextRecords),
    });
    fetch('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: updatedEmp, isNew: false, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleDeleteEmployee = (id: string) => {
    let nextEmployees: Employee[] = [];
    setEmployees((prev) => {
      nextEmployees = prev.filter((e) => e.id !== id);
      localStorage.setItem('attend_employees', JSON.stringify(nextEmployees));
      return nextEmployees;
    });
    realtimeService.emit('DELETE_EMPLOYEE', { id });
    syncStateToCloudImmediate({ employees: sanitizeForFirestore(nextEmployees) });
    fetch('/api/employees/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: id, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateBranch = (updatedBranch: Branch) => {
    let nextBranches: Branch[] = [];
    setBranches((prev) => {
      nextBranches = prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b));
      localStorage.setItem('attend_branches', JSON.stringify(nextBranches));
      return nextBranches;
    });
    realtimeService.emit('UPDATE_BRANCH', updatedBranch);
    syncStateToCloudImmediate({ branches: sanitizeForFirestore(nextBranches) });
    fetch('/api/branches/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: updatedBranch, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
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
            ? `🔒 ទីតាំង GPS សាខាត្រូវបានកំណត់រួចរាល់ហើយ! បុគ្គលិកអាចកំណត់ទីតាំង GPS បានតែ ១ ដងប៉ុណ្ណោះក្នុងសាខាមួយ។ មិនអាចផ្លាស់ប្តូរទៅកាន់ទីតាំងផ្សេងទៀតបានទេ លុះត្រាតែមានការផ្ទេរទៅកាន់សាខាថ្មី ទើបអាចកំណត់ឡើងវិញបាន។`
            : `🔒 Branch GPS is already locked! Staff "${emp.nameEn}" can only set branch GPS once for this branch. You cannot change it until you are officially transferred to another branch.`;
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
        realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);
        fetch('/api/employees/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee: updatedEmp, senderId: realtimeService.getClientId() }),
        }).catch(() => {});

        // 2. Update branch coordinates
        let branchName = '';
        setBranches((prev) =>
          prev.map((b) => {
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
              fetch('/api/branches/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: updated, senderId: realtimeService.getClientId() }),
              }).catch(() => {});
              return updated;
            }
            return b;
          })
        );

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
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === branchId) {
          updatedBranchName = lang === 'km' ? b.nameKh : b.nameEn;
          const updated = { ...b, lat, lng };
          realtimeService.emit('UPDATE_BRANCH', updated);
          fetch('/api/branches/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch: updated, senderId: realtimeService.getClientId() }),
          }).catch(() => {});
          return updated;
        }
        return b;
      })
    );

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
      localStorage.setItem('attend_branches', JSON.stringify(nextBranches));
      return nextBranches;
    });
    realtimeService.emit('UPDATE_BRANCH', newBranch);
    syncStateToCloudImmediate({ branches: sanitizeForFirestore(nextBranches) });
    fetch('/api/branches/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: newBranch, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleDeleteBranch = (branchId: string) => {
    let nextBranches: Branch[] = [];
    setBranches((prev) => {
      nextBranches = prev.filter((b) => b.id !== branchId);
      localStorage.setItem('attend_branches', JSON.stringify(nextBranches));
      return nextBranches;
    });
    realtimeService.emit('DELETE_BRANCH', { id: branchId });
    syncStateToCloudImmediate({ branches: sanitizeForFirestore(nextBranches) });
    fetch('/api/branches/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleAddBranchType = (typeConfig: BranchTypeConfig) => {
    setBranchTypes((prev) => {
      const updated = [...prev, typeConfig];
      localStorage.setItem('attend_branch_types', JSON.stringify(updated));
      return updated;
    });
    fetch('/api/branch-types/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchType: typeConfig, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateBranchType = (typeConfig: BranchTypeConfig) => {
    setBranchTypes((prev) => {
      const updated = prev.map((t) => (t.id === typeConfig.id ? typeConfig : t));
      localStorage.setItem('attend_branch_types', JSON.stringify(updated));
      return updated;
    });
    fetch('/api/branch-types/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchType: typeConfig, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleDeleteBranchType = (typeId: string) => {
    setBranchTypes((prev) => {
      const updated = prev.filter((t) => t.id !== typeId);
      localStorage.setItem('attend_branch_types', JSON.stringify(updated));
      return updated;
    });
    fetch('/api/branch-types/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeId, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateBranding = (newBranding: CompanyBranding) => {
    setBranding(newBranding);
    realtimeService.emit('UPDATE_BRANDING', newBranding);
    fetch('/api/system/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branding: newBranding, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    realtimeService.emit('UPDATE_SETTINGS', newSettings);
    fetch('/api/system/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: newSettings, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateRolePermissions = (newRoles: RolePermission[]) => {
    setRolePermissions(newRoles);
    realtimeService.emit('UPDATE_ROLE_PERMISSIONS', newRoles);
    fetch('/api/system/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { rolePermissions: newRoles }, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
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

    fetch('/api/leaves/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: cleanRequest, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
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

            realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);
            fetch('/api/employees/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employee: updatedEmp, isNew: false, senderId: realtimeService.getClientId() }),
            }).catch(() => {});

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

    realtimeService.emit('UPDATE_LEAVE_STATUS', { requestId, status: newStatus, approvedBy: approver, comment });

    fetch('/api/leaves/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status: newStatus, approvedBy: approver, comment, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
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
      localStorage.setItem('attend_transfers', JSON.stringify(nextTransfers));
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
      localStorage.setItem('attend_employees', JSON.stringify(nextEmployees));
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
        localStorage.setItem('attend_auth_user', JSON.stringify(updated));
        return updated;
      });
    }

    realtimeService.emit('TRANSFER_EMPLOYEE', record);
    syncStateToCloudImmediate({
      employees: sanitizeForFirestore(nextEmployees),
      transferRecords: sanitizeForFirestore(nextTransfers),
    });
    fetch('/api/employees/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record }),
    }).catch(() => {});

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
      localStorage.setItem('attend_admin_profile', JSON.stringify(incomingProfile));
      setCurrentUser((curr) => {
        if (!curr || curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin' || curr.id === incomingProfile.id) {
          const updated = { ...(curr || {}), ...incomingProfile };
          localStorage.setItem('attend_auth_user', JSON.stringify(updated));
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

    // Persist immediately to Firebase Cloud Firestore for all devices & incognito
    syncStateToCloudImmediate({
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
    });

    realtimeService.emit('SYSTEM_RESTORE', { backupData, restoreMode: mode });
    fetch('/api/system/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData, restoreMode: mode }),
    }).catch(() => {});

    handleAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : 'Administrator') || 'Administrator',
      actorRole: currentUser?.role || 'admin',
      action: 'Restored System Database',
      actionKh: 'ស្តារទិន្នន័យប្រព័ន្ធឡើងវិញ (Database Restore)',
      module: 'backup',
      details: `Restored ${backupData.summary?.branchesCount || 0} branches, ${backupData.summary?.employeesCount || 0} staff via ${mode.toUpperCase()} mode to Cloud Firestore.`,
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

      localStorage.setItem('attend_records', JSON.stringify([]));
      localStorage.setItem('attend_leaves', JSON.stringify([]));
      localStorage.setItem('attend_transfers', JSON.stringify([]));
      localStorage.setItem('attend_audit_logs', JSON.stringify([]));
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

      localStorage.setItem('attend_branches', JSON.stringify(freshBranches));
      localStorage.setItem('attend_employees', JSON.stringify([]));
      localStorage.setItem('attend_records', JSON.stringify([]));
      localStorage.setItem('attend_leaves', JSON.stringify([]));
      localStorage.setItem('attend_transfers', JSON.stringify([]));
      localStorage.setItem('attend_audit_logs', JSON.stringify([]));
    }

    // Sync reset to Cloud Firestore
    syncStateToCloudDatabase({
      branches: freshBranches,
      employees: freshEmployees,
      attendanceRecords: freshRecords,
      leaveRequests: freshLeaves,
      transferRecords: freshTransfers,
      branding: type === 'demo_seed' ? INITIAL_BRANDING : branding,
      rolePermissions: type === 'demo_seed' ? INITIAL_ROLE_PERMISSIONS : rolePermissions,
      systemSettings: type === 'demo_seed' ? INITIAL_SYSTEM_SETTINGS : systemSettings,
    });

    realtimeService.emit('SYSTEM_RESET', { resetType: type });
    fetch('/api/system/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetType: type }),
    }).catch(() => {});

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
    localStorage.setItem('attend_auth_user', JSON.stringify(updatedUser));

    if (updatedUser.role === 'admin' || updatedUser.id === 'user_admin' || updatedUser.username === 'admin') {
      setAdminProfile(updatedUser);
      localStorage.setItem('attend_admin_profile', JSON.stringify(updatedUser));
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

    if (matchedEmployee) {
      const mergedEmp: Employee = {
        ...matchedEmployee,
        avatar: updatedUser.avatar || matchedEmployee.avatar,
        nameKh: updatedUser.nameKh || matchedEmployee.nameKh,
        nameEn: updatedUser.nameEn || matchedEmployee.nameEn,
        pinCode: updatedUser.pinCode || matchedEmployee.pinCode,
        phone: (updatedEmp && updatedEmp.phone) || matchedEmployee.phone,
      };
      handleUpdateEmployee(mergedEmp);
    }

    realtimeService.emit('UPDATE_USER_PROFILE', { user: updatedUser, employee: matchedEmployee });

    fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: updatedUser,
        employee: matchedEmployee,
        senderId: realtimeService.getClientId(),
      }),
    }).catch(() => {});
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('attend_auth_user', JSON.stringify(user));
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

    // Broadcast to WebSocket and cross-tab BroadcastChannel
    realtimeService.emit('STAFF_LOGIN', {
      user,
      employee: matchedEmp,
      branch: empBranch,
      alert: loginAlert,
      auditLog,
    });

    // Notify server endpoint to store in serverDb.staffAlerts and auditLogs
    fetch('/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user,
        employee: matchedEmp,
        branch: empBranch,
        alert: loginAlert,
        auditLog,
        senderId: realtimeService.getClientId(),
      }),
    }).catch(() => {});
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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md text-white px-4 text-center">
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
          {activeTab === 'dashboard' && (
            <DashboardView
              branches={branches}
              employees={employees}
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
              lang={lang}
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
              onUpdateEmployee={handleUpdateEmployee}
              onAddAuditLog={handleAddAuditLog}
              leaveRequests={leaveRequests}
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
              leaveRequests={leaveRequests}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
              lang={lang}
              branding={branding}
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
              onUpdateEmployeesList={setEmployees}
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
              />
            ) : (
              <DashboardView
                branches={branches}
                employees={employees}
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
                lang={lang}
              />
            )
          )}
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
      <BranchTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        employee={transferTargetEmp}
        branches={branches}
        onConfirmTransfer={handleTransferEmployee}
        lang={lang}
      />

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
      />

      {/* PWA & Home Screen Device Installation Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        branding={branding}
        onUpdateBranding={handleUpdateBranding}
        lang={lang}
      />

      {/* Online Verified Digital ID Card Scanned/Direct View Modal */}
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
    </div>
  );
}
