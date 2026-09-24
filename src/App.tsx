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
  INITIAL_AUDIT_LOGS
} from './data/initialData';
import { DEFAULT_AUTH_USER } from './data/authUsers';
import { 
  Branch, 
  BranchTypeConfig,
  Employee, 
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
import { updateDynamicAppBranding } from './utils/pwaBrandUtils';
import { applyKhmerTypography } from './utils/typographyUtils';
import { realtimeService } from './utils/realtimeService';
import { mergeDatasets } from './utils/backupRestoreUtils';
import { playAlertChime } from './utils/soundUtils';
import { ActionAlertItem } from './components/RealtimeActionAlertCenter';
import { Cloud, Loader2 } from 'lucide-react';
import { 
  subscribeToCloudDatabase, 
  syncStateToCloudDatabase, 
  syncStateToCloudImmediate,
  subscribeCloudConnectionStatus,
  testFirestoreConnection,
  getCloudDatabaseState,
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

export default function App() {
  // Language State
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('attend_lang') as Language) || 'km';
  });

  // Persistent Admin Profile (Synced from server & localStorage)
  const [adminProfile, setAdminProfile] = useState<AuthUser>(() => {
    const saved = localStorage.getItem('attend_admin_profile');
    return saved ? JSON.parse(saved) : DEFAULT_AUTH_USER;
  });

  // Current Logged-in User State (Requires Login on initial open if not already signed in)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('attend_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(() => {
    const saved = localStorage.getItem('attend_auth_user');
    return !saved;
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

  // Persistent Core Data
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('attend_branches');
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('attend_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attend_records');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_RECORDS;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('attend_leaves');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [transferRecords, setTransferRecords] = useState<BranchTransferRecord[]>(() => {
    const saved = localStorage.getItem('attend_transfers');
    return saved ? JSON.parse(saved) : INITIAL_TRANSFER_RECORDS;
  });

  const [branchTypes, setBranchTypes] = useState<BranchTypeConfig[]>(() => {
    const saved = localStorage.getItem('attend_branch_types');
    return saved ? JSON.parse(saved) : INITIAL_BRANCH_TYPES;
  });

  // Company Branding State
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    const saved = localStorage.getItem('attend_branding');
    return saved ? JSON.parse(saved) : INITIAL_BRANDING;
  });

  // Role Permissions (RBAC) State
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(() => {
    const saved = localStorage.getItem('attend_role_permissions');
    return saved ? JSON.parse(saved) : INITIAL_ROLE_PERMISSIONS;
  });

  // System Settings & Broadcast State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('attend_system_settings');
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_SETTINGS;
  });

  // Administrative Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('attend_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Real-time Action Alerts State (instant feedback for all staff activities)
  const [actionAlerts, setActionAlerts] = useState<ActionAlertItem[]>(() => {
    return [];
  });

  const addActionAlert = (alert: Omit<ActionAlertItem, 'id' | 'timestamp'>) => {
    const newAlert: ActionAlertItem = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isUnread: true,
    };
    setActionAlerts((prev) => [newAlert, ...prev.slice(0, 30)]);
  };

  const showLiveAlert = (title: string, message: string, type: 'punch' | 'leave' | 'transfer' | 'system') => {
    setLiveToast({ title, message, type });
    setTimeout(() => setLiveToast(null), 5000);
    playAlertChime(type === 'leave' ? 'leave' : type === 'punch' ? 'punch' : 'alert');
  };

  // Keep actionAlerts populated with pending leave requests
  useEffect(() => {
    const pending = leaveRequests.filter((r) => r.status === 'pending');
    if (pending.length > 0) {
      setActionAlerts((prev) => {
        const existingReqIds = new Set(prev.filter((a) => a.leaveRequestId).map((a) => a.leaveRequestId));
        const newItems: ActionAlertItem[] = pending
          .filter((r) => !existingReqIds.has(r.id))
          .map((r) => ({
            id: `alert_leave_${r.id}`,
            type: 'leave_submit',
            titleKh: 'សំណើសុំច្បាប់រង់ចាំអនុម័ត',
            titleEn: 'Pending Leave Approval',
            detailKh: `${r.employeeNameKh || r.employeeNameEn}: ${r.reason} (${r.typeKh})`,
            detailEn: `${r.employeeNameEn || 'Staff'}: ${r.reason} (${r.startDate} → ${r.endDate})`,
            timestamp: r.appliedAt || new Date().toISOString().split('T')[0],
            isUnread: true,
            leaveRequestId: r.id,
            actorName: r.employeeNameKh || r.employeeNameEn,
            actorAvatar: r.employeeAvatar,
          }));
        if (newItems.length === 0) return prev;
        return [...newItems, ...prev].slice(0, 30);
      });
    }
  }, [leaveRequests]);

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
        // 1. Prioritize Cloud Firestore first (universal source of truth across all devices)
        const cloudState = await getCloudDatabaseState();
        if (isMounted && cloudState && Array.isArray(cloudState.branches) && cloudState.branches.length > 0) {
          isReceivingCloudUpdate.current = true;
          setBranches(cloudState.branches);
          localStorage.setItem('attend_branches', JSON.stringify(cloudState.branches));

          if (Array.isArray(cloudState.employees)) {
            setEmployees(cloudState.employees);
            localStorage.setItem('attend_employees', JSON.stringify(cloudState.employees));
          }
          if (Array.isArray(cloudState.attendanceRecords)) {
            setAttendanceRecords(cloudState.attendanceRecords);
            localStorage.setItem('attend_records', JSON.stringify(cloudState.attendanceRecords));
          }
          if (Array.isArray(cloudState.leaveRequests)) {
            setLeaveRequests(cloudState.leaveRequests);
            localStorage.setItem('attend_leaves', JSON.stringify(cloudState.leaveRequests));
          }
          if (Array.isArray(cloudState.transferRecords)) {
            setTransferRecords(cloudState.transferRecords);
            localStorage.setItem('attend_transfers', JSON.stringify(cloudState.transferRecords));
          }
          if (Array.isArray(cloudState.branchTypes)) {
            setBranchTypes(cloudState.branchTypes);
            localStorage.setItem('attend_branch_types', JSON.stringify(cloudState.branchTypes));
          }
          if (cloudState.branding) {
            setBranding(cloudState.branding);
            localStorage.setItem('attend_branding', JSON.stringify(cloudState.branding));
          }
          if (Array.isArray(cloudState.rolePermissions)) {
            setRolePermissions(cloudState.rolePermissions);
            localStorage.setItem('attend_role_permissions', JSON.stringify(cloudState.rolePermissions));
          }
          if (cloudState.systemSettings) {
            setSystemSettings(cloudState.systemSettings);
            localStorage.setItem('attend_system_settings', JSON.stringify(cloudState.systemSettings));
          }
          if (cloudState.adminProfile) {
            setAdminProfile(cloudState.adminProfile);
            localStorage.setItem('attend_admin_profile', JSON.stringify(cloudState.adminProfile));
            setCurrentUser((curr) => {
              if (curr && (curr.role === 'admin' || curr.id === 'user_admin' || curr.username === 'admin')) {
                const updated = { ...curr, ...cloudState.adminProfile };
                localStorage.setItem('attend_auth_user', JSON.stringify(updated));
                return updated;
              }
              return curr;
            });
          }
          if (Array.isArray(cloudState.auditLogs)) {
            setAuditLogs(cloudState.auditLogs);
            localStorage.setItem('attend_audit_logs', JSON.stringify(cloudState.auditLogs));
          }

          setTimeout(() => {
            isReceivingCloudUpdate.current = false;
          }, 400);

          isCloudInitializedRef.current = true;
          setIsCloudSyncLoading(false);

          // Update server memory state with true cloud data
          fetch('/api/system/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: cloudState, senderId: 'cloud_sync_client' }),
          }).catch(() => {});

          return;
        }

        // 2. Fallback to local server API ONLY if this device has no local cache
        if (!hasLocalCache) {
          try {
            const res = await fetch('/api/system/state');
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.state && isMounted) {
                const s = data.state;
              if (Array.isArray(s.branches) && s.branches.length > 0) {
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
              if (Array.isArray(s.auditLogs)) {
                setAuditLogs(s.auditLogs);
                localStorage.setItem('attend_audit_logs', JSON.stringify(s.auditLogs));
              }
            }
          }
        } catch (err) {
          // Expected on static environments like Vercel
        }
      }
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
      if (status === 'connected' || status === 'syncing') {
        setIsLiveSyncConnected(true);
      } else if (status === 'error') {
        setIsLiveSyncConnected(false);
      }
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
        if (employee && employee.id) {
          setEmployees((prev) => prev.map((e) => (e.id === employee.id ? { ...e, ...employee } : e)));
          setCurrentUser((curr) => {
            if (curr && curr.employeeId === employee.id) {
              const updated = {
                ...curr,
                avatar: employee.avatar || curr.avatar,
                nameKh: employee.nameKh || curr.nameKh,
                nameEn: employee.nameEn || curr.nameEn,
                pinCode: employee.pinCode,
                password: employee.password,
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

        setAttendanceRecords((prev) => {
          if (prev.some((r) => r.id === record.id)) return prev;
          return [record, ...prev];
        });

        const empName = lang === 'km' ? (record.employeeNameKh || record.employeeNameEn) : (record.employeeNameEn || record.employeeNameKh);
        const actionType = record.type === 'check_in' 
          ? (lang === 'km' ? 'បានចូលធ្វើការ (Check-In)' : 'Checked In') 
          : (lang === 'km' ? 'បានចេញពីការងារ (Check-Out)' : 'Checked Out');
        
        addActionAlert({
          type: 'punch',
          titleKh: 'វត្តមានស្កេនថ្មី',
          titleEn: 'Attendance Punch',
          detailKh: `${empName} ${actionType} - ${record.branchNameKh || record.branchNameEn || ''}`,
          detailEn: `${empName} ${actionType} - ${record.branchNameEn || ''}`,
          actorName: empName,
          actorAvatar: record.employeeAvatar,
        });

        showLiveAlert(
          lang === 'km' ? '🟢 វត្តមានថ្មី (Live Sync)' : '🟢 Real-time Attendance Sync',
          `${empName} ${actionType} - ${record.branchNameEn || ''}`,
          'punch'
        );
      } else if ((type === 'SUBMIT_LEAVE' || type === 'SUBMIT_LEAVE_REQUEST') && payload) {
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
        setEmployees((prev) => prev.map((e) => (e.id === payload.id ? payload : e)));
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
          setBranches(INITIAL_BRANCHES);
          setEmployees(INITIAL_EMPLOYEES);
          setAttendanceRecords(INITIAL_ATTENDANCE_RECORDS);
          setLeaveRequests(INITIAL_LEAVE_REQUESTS);
          setTransferRecords(INITIAL_TRANSFER_RECORDS);
          setBranding(INITIAL_BRANDING);
          setRolePermissions(INITIAL_ROLE_PERMISSIONS);
          setSystemSettings(INITIAL_SYSTEM_SETTINGS);
          setAuditLogs(INITIAL_AUDIT_LOGS);
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
          `System was reset to ${payload?.resetType === 'demo_seed' ? 'Demo Seed' : 'Blank Fresh State'} by ${senderName || 'Admin'}`,
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

        if (Array.isArray(cloudData.branches) && cloudData.branches.length > 0) {
          setBranches(cloudData.branches);
          localStorage.setItem('attend_branches', JSON.stringify(cloudData.branches));
        }
        if (Array.isArray(cloudData.employees)) {
          setEmployees(cloudData.employees);
          localStorage.setItem('attend_employees', JSON.stringify(cloudData.employees));
        }
        if (Array.isArray(cloudData.attendanceRecords)) {
          setAttendanceRecords(cloudData.attendanceRecords);
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
    setAttendanceRecords((prev) => [newRecord, ...prev]);

    // Broadcast to all WebSocket connected peers and REST API
    realtimeService.emit('PUNCH_ATTENDANCE', { record: newRecord });

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
    setEmployees((prev) => [preparedEmp, ...prev]);
    realtimeService.emit('ADD_EMPLOYEE', preparedEmp);
    fetch('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: preparedEmp, isNew: true, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.employeeId === updatedEmp.id
          ? {
              ...r,
              employeeNameKh: updatedEmp.nameKh,
              employeeNameEn: updatedEmp.nameEn,
              employeeAvatar: updatedEmp.avatar,
            }
          : r
      )
    );
    realtimeService.emit('UPDATE_EMPLOYEE', updatedEmp);
    fetch('/api/employees/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: updatedEmp, isNew: false, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    realtimeService.emit('DELETE_EMPLOYEE', { id });
    fetch('/api/employees/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: id, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateBranch = (updatedBranch: Branch) => {
    setBranches((prev) => prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b)));
    realtimeService.emit('UPDATE_BRANCH', updatedBranch);
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
    setBranches((prev) => [...prev, newBranch]);
    realtimeService.emit('UPDATE_BRANCH', newBranch);
    fetch('/api/branches/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: newBranch, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleDeleteBranch = (branchId: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    realtimeService.emit('DELETE_BRANCH', { id: branchId });
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
    const nextLeaves = [newRequest, ...leaveRequests];
    setLeaveRequests(nextLeaves);
    realtimeService.emit('SUBMIT_LEAVE', newRequest);
    realtimeService.emit('SUBMIT_LEAVE_REQUEST', newRequest);
    playAlertChime('leave');

    // Add instant visual action alert
    addActionAlert({
      type: 'leave_submit',
      titleKh: 'សំណើសុំច្បាប់ថ្មី',
      titleEn: 'New Staff Leave Request',
      detailKh: `${newRequest.employeeNameKh || newRequest.employeeNameEn}: ${newRequest.reason} (${newRequest.typeKh || newRequest.category})`,
      detailEn: `${newRequest.employeeNameEn || 'Staff'}: ${newRequest.reason} (${newRequest.startDate} → ${newRequest.endDate})`,
      leaveRequestId: newRequest.id,
      actorName: newRequest.employeeNameKh || newRequest.employeeNameEn,
      actorAvatar: newRequest.employeeAvatar,
    });

    // High visibility instant toast
    setLiveToast({
      title: lang === 'km' ? '📋 សំណើសុំច្បាប់ថ្មី (New Leave Request)' : '📋 New Leave Request Submitted',
      message: `${newRequest.employeeNameKh || newRequest.employeeNameEn}: ${newRequest.reason} (${newRequest.startDate} → ${newRequest.endDate})`,
      type: 'leave',
    });
    setTimeout(() => setLiveToast(null), 5000);

    // Audit Log Entry
    const logEntry: AuditLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: newRequest.employeeNameKh || newRequest.employeeNameEn,
      actorRole: 'employee',
      action: `Submitted ${newRequest.category} request: ${newRequest.reason}`,
      actionKh: `បានដាក់ពាក្យស្នើសុំ ${newRequest.typeKh}: ${newRequest.reason}`,
      module: 'system',
      details: `${newRequest.startDate} to ${newRequest.endDate}`,
      detailsKh: `${newRequest.startDate} ដល់ ${newRequest.endDate}`,
      status: 'warning',
    };
    handleAddAuditLog(logEntry);

    // Sync to Cloud Firestore Universal DB immediately
    syncStateToCloudImmediate({
      leaveRequests: nextLeaves,
      auditLogs: [logEntry, ...auditLogs],
    });

    fetch('/api/leaves/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: newRequest, senderId: realtimeService.getClientId() }),
    }).catch(() => {});
  };

  const handleUpdateLeaveStatus = (requestId: string, newStatus: 'approved' | 'rejected', comment?: string) => {
    const approver = (currentUser ? (lang === 'km' ? currentUser.nameKh : currentUser.nameEn) : 'Administrator') || 'Administrator';
    const targetReq = leaveRequests.find((r) => r.id === requestId);

    const nextLeaves = leaveRequests.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: newStatus,
            approvedBy: approver,
            adminComment: comment || r.adminComment,
          }
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
      leaveRequests: nextLeaves,
      employees: nextEmployees,
      auditLogs: [logEntry, ...auditLogs],
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

    setTransferRecords((prev) => [record, ...prev]);

    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === employeeId) {
          return {
            ...e,
            branchId: toBranchId,
            gpsCalibratedBranchId: undefined, // Reset GPS lock so staff can calibrate for the new branch for the 1st time
            gpsCalibratedAt: undefined,
          };
        }
        return e;
      })
    );

    if (currentUser?.employeeId === employeeId || currentUser?.employeeCode === emp?.code) {
      setCurrentUser((prev) => (prev ? { ...prev, branchId: toBranchId } : null));
    }

    realtimeService.emit('TRANSFER_EMPLOYEE', record);
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
      freshBranches = INITIAL_BRANCHES;
      freshEmployees = INITIAL_EMPLOYEES;
      freshRecords = INITIAL_ATTENDANCE_RECORDS;
      freshLeaves = INITIAL_LEAVE_REQUESTS;
      freshTransfers = INITIAL_TRANSFER_RECORDS;

      setBranches(INITIAL_BRANCHES);
      setEmployees(INITIAL_EMPLOYEES);
      setAttendanceRecords(INITIAL_ATTENDANCE_RECORDS);
      setLeaveRequests(INITIAL_LEAVE_REQUESTS);
      setTransferRecords(INITIAL_TRANSFER_RECORDS);
      setBranding(INITIAL_BRANDING);
      setRolePermissions(INITIAL_ROLE_PERMISSIONS);
      setSystemSettings(INITIAL_SYSTEM_SETTINGS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setSelectedBranchId('all');

      localStorage.setItem('attend_branches', JSON.stringify(INITIAL_BRANCHES));
      localStorage.setItem('attend_employees', JSON.stringify(INITIAL_EMPLOYEES));
      localStorage.setItem('attend_records', JSON.stringify(INITIAL_ATTENDANCE_RECORDS));
      localStorage.setItem('attend_leaves', JSON.stringify(INITIAL_LEAVE_REQUESTS));
      localStorage.setItem('attend_transfers', JSON.stringify(INITIAL_TRANSFER_RECORDS));
      localStorage.setItem('attend_branding', JSON.stringify(INITIAL_BRANDING));
      localStorage.setItem('attend_role_permissions', JSON.stringify(INITIAL_ROLE_PERMISSIONS));
      localStorage.setItem('attend_system_settings', JSON.stringify(INITIAL_SYSTEM_SETTINGS));
      localStorage.setItem('attend_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
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
      details: `Reinitialized system state to: ${type === 'demo_seed' ? 'Official 7-Branch Seed Data' : 'Brand New Blank Start'}.`,
      detailsKh: `បានកំណត់ប្រព័ន្ធឡើងវិញទៅកាន់ ${type === 'demo_seed' ? 'ទិន្នន័យគំរូ ៧ សាខា' : 'ទិន្នន័យទទេរស្អាត (Brand New)'}។`,
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

    if (updatedEmp) {
      handleUpdateEmployee(updatedEmp);
    }

    realtimeService.emit('UPDATE_USER_PROFILE', { user: updatedUser, employee: updatedEmp });

    fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: updatedUser,
        employee: updatedEmp,
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
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('attend_auth_user');
    setShowLoginModal(true);
    setActiveTab('dashboard');
  };

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-['Kantumruy_Pro','Plus_Jakarta_Sans',sans-serif]">
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
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
          pendingLeavesCount={pendingLeavesCount}
          branding={branding}
          onUpdateBranding={(partial) => handleUpdateBranding({ ...branding, ...partial })}
          onNavigateToSettingsTypography={() => setActiveTab('settings')}
          broadcastNoticeKh={systemSettings.broadcastNoticeKh}
          broadcastNoticeEn={systemSettings.broadcastNoticeEn}
          broadcastActive={systemSettings.broadcastActive}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isSidebarCollapsed={isSidebarCollapsed}
          isLiveSyncConnected={isLiveSyncConnected}
          onlinePeersCount={onlinePeersCount}
          onOpenInstallModal={() => setShowInstallModal(true)}
        />

        {/* 3. Main Views Dynamic Router */}
        <main className="flex-1 pb-16">
          {activeTab === 'dashboard' && (
            <DashboardView
              branches={branches}
              employees={employees}
              attendanceRecords={attendanceRecords}
              transferRecords={transferRecords}
              leaveRequests={leaveRequests}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
              actionAlerts={actionAlerts}
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
            />
          )}

          {activeTab === 'kiosk' && (
            <BranchKioskView
              branches={branches}
              employees={employees}
              attendanceRecords={attendanceRecords}
              onAddAttendanceRecord={handleAddAttendanceRecord}
              lang={lang}
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
              onRestoreBackup={handleRestoreBackup}
              onResetSystem={handleResetSystem}
              onUpdateLeaveRequests={setLeaveRequests}
              onUpdateEmployeesList={setEmployees}
              isLiveSyncConnected={isLiveSyncConnected}
              onlinePeersCount={onlinePeersCount}
              connectedPeers={connectedPeers}
              lang={lang}
            />
          )}
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
