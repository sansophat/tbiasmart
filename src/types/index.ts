export type BranchType = 'club' | 'warehouse' | 'cafe' | 'office' | 'gas_station' | 'boutique' | 'factory' | string;

export interface BranchTypeConfig {
  id: string;
  nameKh: string;
  nameEn: string;
  iconName: string;
  themeColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  descriptionKh?: string;
  descriptionEn?: string;
}

export interface Branch {
  id: string;
  nameKh: string;
  nameEn: string;
  type: BranchType;
  addressKh: string;
  addressEn: string;
  lat: number;
  lng: number;
  radiusMeters: number; // Geofence allowed distance
  openTime: string;
  closeTime: string;
  managerName: string;
  contactPhone: string;
  themeColor: string;
  iconName: string;
  imageUrl?: string;
  activeStaffCount?: number;
  gpsSetByEmployeeId?: string;
  gpsSetAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'hr' | 'employee';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  name?: string;
  nameKh: string;
  nameEn: string;
  avatar: string;
  employeeId?: string;
  employeeCode?: string;
  branchId?: string;
  email?: string;
  phone?: string;
  address?: string;
  roleTitle?: string;
  pinCode?: string;
  password?: string;
}

export interface Employee {
  id: string;
  code: string; // e.g. EMP-101, CL1-001
  nameKh: string;
  nameEn: string;
  branchId: string;
  department: string;
  departmentKh: string;
  role: string;
  roleKh: string;
  position?: string;
  roleType?: UserRole;
  password?: string;
  shiftId: string;
  avatar: string;
  phone: string;
  email: string;
  address?: string;
  status: 'active' | 'on_leave' | 'inactive';
  pinCode?: string;
  hourlyRate?: number;
  annualLeaveQuota?: number; // default 18
  annualLeaveUsed?: number;
  sickLeaveQuota?: number;   // default 7
  sickLeaveUsed?: number;
  gpsCalibratedBranchId?: string; // Tracks the branch where staff calibrated GPS for the 1st time
  gpsCalibratedAt?: string;       // Timestamp when staff calibrated GPS
  trustedDeviceId?: string;       // Unique hardware/device fingerprint bound to this employee
  trustedDeviceName?: string;     // Friendly device name (e.g. "iPhone 15 Pro (Safari Mobile)")
  trustedDeviceBoundAt?: string;  // ISO timestamp when device was bound
  deviceBindingLocked?: boolean;  // If true, scanning is strictly locked to trustedDeviceId
  weeklyDayOff?: number;          // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, -1 = None / Rotating
  hasSundayRest?: boolean;        // Default true for standard staff; false for cafe shop / retail staff who work on Sunday
  shiftStartTime?: string;        // Optional custom start time (e.g. "06:30")
  shiftEndTime?: string;          // Optional custom end time (e.g. "14:30")
  workingHoursText?: string;      // Formatted working hours (e.g. "06:30 - 14:30 (8h)")
  scheduledDailyHours?: number;   // Daily planned work hours (e.g. 8.0, 8.5)
}

export interface Shift {
  id: string;
  nameKh: string;
  nameEn: string;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "17:00"
  gracePeriodMins: number; // e.g. 15 mins
  branchTypes: BranchType[];
  isOvernight?: boolean;
  workHours?: number; // e.g. 8 or 8.5
  shiftCategory?: 'morning' | 'afternoon' | 'full_time' | 'night' | 'office' | string;
  description?: string;
  descriptionKh?: string;
  descriptionEn?: string;
}

export type AttendanceType = 'check_in' | 'check_out';
export type AttendanceMethod = 'qr_kiosk' | 'qr_mobile' | 'badge_scan' | 'manual_admin' | 'kiosk_pin';
export type AttendanceStatus = 'on_time' | 'late' | 'early_leave' | 'overtime' | 'geofence_violation';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeNameKh: string;
  employeeNameEn: string;
  employeeCode: string;
  employeeAvatar: string;
  branchId: string;
  branchNameKh: string;
  branchNameEn: string;
  type: AttendanceType;
  timestamp: string; // ISO string
  lat: number;
  lng: number;
  distanceToBranch: number; // in meters
  isWithinGeofence: boolean;
  accuracyMeters?: number;
  method: AttendanceMethod;
  selfieUrl?: string;
  status: AttendanceStatus;
  notes?: string;
  deviceId?: string;
  deviceName?: string;
  deviceVerified?: boolean;
  ipAddress?: string;
}

export type RequestCategory = 'leave' | 'sick' | 'overtime' | 'permission' | 'urgent';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeNameKh: string;
  employeeNameEn: string;
  employeeCode?: string;
  employeeAvatar?: string;
  branchId: string;
  category: RequestCategory; // 'leave' | 'sick' | 'overtime' | 'permission' | 'urgent'
  type: 'sick' | 'annual' | 'urgent' | 'unpaid' | 'overtime' | 'half_day';
  typeKh: string;
  startDate: string;
  endDate: string;
  hours?: number; // for OT or permission
  otRateMultiplier?: number; // 1.5, 2.0
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  approvedBy?: string;
  adminComment?: string;
  attachmentUrl?: string;
}

export interface UserGeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  isReal: boolean;
  label?: string;
}

export interface BranchTransferRecord {
  id: string;
  employeeId: string;
  employeeNameKh: string;
  employeeNameEn: string;
  employeeCode: string;
  employeeAvatar?: string;
  fromBranchId: string;
  fromBranchNameEn: string;
  fromBranchNameKh: string;
  toBranchId: string;
  toBranchNameEn: string;
  toBranchNameKh: string;
  transferDate?: string;
  effectiveDate: string;
  reason: string;
  approvedBy?: string;
  transferredBy?: string;
  status?: 'completed' | 'scheduled';
  timestamp?: string;
}

export type Language = 'km' | 'en';

export type KhmerFontWeight = '400' | '500' | '600' | '700';

export interface KhmerTypographyConfig {
  fontFamily: string; // 'Kantumruy Pro' | 'Battambang' | 'Noto Sans Khmer' | 'Siemreap' | 'Hanuman' | 'Koh Santepheap'
  headingFontFamily: string; // 'Battambang' | 'Koulen' | 'Kantumruy Pro' | 'Noto Sans Khmer' | 'Hanuman'
  fontSizeScale: number; // percentage: e.g. 100, 108, 114, 122, 130
  fontWeight: KhmerFontWeight; // '400' | '500' | '600' | '700'
  lineHeight: number; // 1.5, 1.65, 1.75, 1.9
  letterSpacing: string; // '0em' | '0.01em' | '0.015em' | '0.02em'
  textContrast: 'normal' | 'high';
  enableGlobalKhmerScaling: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CompanyBranding {
  companyNameKh: string;
  companyNameEn: string;
  sloganKh: string;
  sloganEn: string;
  logoUrl: string;
  appIcon: string;
  primaryColor: string;
  accentColor: string;
  supportPhone: string;
  supportEmail: string;
  qrWatermarkEnabled: boolean;
  qrWatermarkText: string;
  qrRefreshIntervalSecs: number;
  loginStyle?: 'option_a' | 'option_b' | 'option_c';
  typography?: KhmerTypographyConfig;
}

export interface RolePermission {
  roleId: string; // 'admin' | 'manager' | 'supervisor' | 'hr' | 'employee'
  roleNameKh: string;
  roleNameEn: string;
  roleBadgeColor: string;
  descriptionKh: string;
  descriptionEn: string;
  userCount?: number;
  permissions: {
    canViewDashboard: boolean;
    canScanAttendance: boolean;
    canUseKioskPin: boolean;
    canSubmitRequests: boolean;
    canApproveRequests: boolean;
    canTransferStaff: boolean;
    canManageEmployees: boolean;
    canManageBranches: boolean;
    canManageBranding: boolean;
    canManageRoles: boolean;
    canOverrideGeofence: boolean;
    canExportReports: boolean;
    canViewFinancials: boolean;
  };
}

export interface SystemSettings {
  gracePeriodMins: number;
  overtimeThresholdHours: number;
  autoCheckoutHours: number;
  strictGeofenceEnforcement: boolean;
  enableSelfieVerification: boolean;
  strictDeviceBinding?: boolean; // Anti-proxy: 1 Employee = 1 Trusted Device
  preventDeviceSharing?: boolean; // Prevent multiple employees using the same device
  enableAuditLogs: boolean;
  defaultLanguage: Language;
  broadcastNoticeKh?: string;
  broadcastNoticeEn?: string;
  broadcastActive?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  actionKh: string;
  module: 'branches' | 'branding' | 'roles' | 'leaves' | 'employees' | 'attendance' | 'system' | 'security' | 'backup';
  details: string;
  detailsKh: string;
  status: 'success' | 'warning' | 'alert';
}

export interface SystemBackupData {
  version: string;
  exportDate: string;
  systemName: string;
  checksum?: string;
  summary: {
    branchesCount: number;
    employeesCount: number;
    attendanceRecordsCount: number;
    leaveRequestsCount: number;
    transferRecordsCount: number;
    auditLogsCount: number;
  };
  branches?: Branch[];
  employees?: Employee[];
  attendanceRecords?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  transferRecords?: BranchTransferRecord[];
  branding?: CompanyBranding;
  rolePermissions?: RolePermission[];
  systemSettings?: SystemSettings;
  adminProfile?: AuthUser;
  auditLogs?: AuditLogEntry[];
  shifts?: Shift[];
  staffAlerts?: any[];
}

export type SyncEventType =
  | 'INIT_STATE'
  | 'INIT_ACK'
  | 'SYSTEM_STATE_SYNC'
  | 'REQUEST_CANONICAL_STATE'
  | 'CANONICAL_STATE_RESPONSE'
  | 'UPDATE_SHIFTS'
  | 'PUNCH_ATTENDANCE'
  | 'STAFF_LOGIN'
  | 'ACTION_ALERT'
  | 'SUBMIT_LEAVE'
  | 'SUBMIT_LEAVE_REQUEST'
  | 'UPDATE_LEAVE_STATUS'
  | 'UPDATE_EMPLOYEE'
  | 'ADD_EMPLOYEE'
  | 'DELETE_EMPLOYEE'
  | 'TRANSFER_EMPLOYEE'
  | 'UPDATE_BRANCH'
  | 'ADD_BRANCH'
  | 'DELETE_BRANCH'
  | 'UPDATE_BRANDING'
  | 'UPDATE_SETTINGS'
  | 'UPDATE_SYSTEM_SETTINGS'
  | 'UPDATE_ROLE_PERMISSIONS'
  | 'UPDATE_USER_PROFILE'
  | 'UPDATE_EMPLOYEES_BATCH'
  | 'SYSTEM_RESET'
  | 'SYSTEM_RESTORE'
  | 'PRESENCE_PING'
  | 'PRESENCE_STATE'
  | 'QUICK_PUNCH_NOTIFY';

export interface SyncMessage<T = any> {
  type: SyncEventType;
  payload: T;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderBranchId?: string;
  timestamp: string;
}

export interface ConnectedPeer {
  id: string;
  name: string;
  role: string;
  branchId?: string;
  branchName?: string;
  connectedAt: string;
  lastPing: number;
}

