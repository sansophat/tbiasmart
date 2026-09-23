export type BranchType = 'club' | 'warehouse' | 'cafe' | 'office' | string;

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
  roleType?: UserRole;
  password?: string;
  shiftId: string;
  avatar: string;
  phone: string;
  email: string;
  status: 'active' | 'on_leave' | 'inactive';
  pinCode?: string;
  hourlyRate?: number;
  annualLeaveQuota?: number; // default 18
  annualLeaveUsed?: number;
  sickLeaveQuota?: number;   // default 7
  sickLeaveUsed?: number;
  gpsCalibratedBranchId?: string; // Tracks the branch where staff calibrated GPS for the 1st time
  gpsCalibratedAt?: string;       // Timestamp when staff calibrated GPS
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
  deviceName?: string;
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
}

export type SyncEventType =
  | 'INIT_STATE'
  | 'INIT_ACK'
  | 'SYSTEM_STATE_SYNC'
  | 'REQUEST_CANONICAL_STATE'
  | 'CANONICAL_STATE_RESPONSE'
  | 'PUNCH_ATTENDANCE'
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

