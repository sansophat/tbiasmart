import { 
  Branch, 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  BranchTransferRecord, 
  CompanyBranding, 
  RolePermission, 
  SystemSettings, 
  AuditLogEntry, 
  SystemBackupData 
} from '../types';

export interface LocalSnapshot {
  id: string;
  name: string;
  timestamp: string;
  note?: string;
  data: SystemBackupData;
}

const SNAPSHOTS_KEY = 'attend_snapshots_v1';

export interface BackupSelectionOptions {
  branches: boolean;
  employees: boolean;
  attendanceRecords: boolean;
  leaveRequests: boolean;
  transferRecords: boolean;
  branding: boolean;
  rolePermissions: boolean;
  systemSettings: boolean;
  auditLogs: boolean;
}

export const DEFAULT_BACKUP_SELECTION: BackupSelectionOptions = {
  branches: true,
  employees: true,
  attendanceRecords: true,
  leaveRequests: true,
  transferRecords: true,
  branding: true,
  rolePermissions: true,
  systemSettings: true,
  auditLogs: true,
};

/**
 * Generate a complete or customized system backup package
 */
export function generateSystemBackup(
  branches: Branch[],
  employees: Employee[],
  attendanceRecords: AttendanceRecord[],
  leaveRequests: LeaveRequest[],
  transferRecords: BranchTransferRecord[],
  branding: CompanyBranding,
  rolePermissions: RolePermission[],
  systemSettings: SystemSettings,
  auditLogs: AuditLogEntry[],
  selectedModules: BackupSelectionOptions = DEFAULT_BACKUP_SELECTION
): SystemBackupData {
  const exportDate = new Date().toISOString();

  const finalBranches = selectedModules.branches ? branches : [];
  const finalEmployees = selectedModules.employees ? employees : [];
  const finalAttendance = selectedModules.attendanceRecords ? attendanceRecords : [];
  const finalLeaves = selectedModules.leaveRequests ? leaveRequests : [];
  const finalTransfers = selectedModules.transferRecords ? transferRecords : [];
  const finalBranding = selectedModules.branding ? branding : ({} as CompanyBranding);
  const finalRolePerms = selectedModules.rolePermissions ? rolePermissions : [];
  const finalSysSettings = selectedModules.systemSettings ? systemSettings : ({} as SystemSettings);
  const finalLogs = selectedModules.auditLogs ? auditLogs : [];
  
  const summary = {
    branchesCount: finalBranches.length,
    employeesCount: finalEmployees.length,
    attendanceRecordsCount: finalAttendance.length,
    leaveRequestsCount: finalLeaves.length,
    transferRecordsCount: finalTransfers.length,
    auditLogsCount: finalLogs.length,
  };

  // Simple integrity checksum
  const rawDataString = `${finalBranches.length}-${finalEmployees.length}-${finalAttendance.length}-${finalLeaves.length}-${exportDate}`;
  let hash = 0;
  for (let i = 0; i < rawDataString.length; i++) {
    hash = (hash << 5) - hash + rawDataString.charCodeAt(i);
    hash |= 0;
  }
  const checksum = `CRC32_${Math.abs(hash).toString(16).toUpperCase()}`;

  return {
    version: '2.4.0',
    exportDate,
    systemName: branding.companyNameEn || 'QR & GPS Attendance System',
    checksum,
    summary,
    branches: finalBranches,
    employees: finalEmployees,
    attendanceRecords: finalAttendance,
    leaveRequests: finalLeaves,
    transferRecords: finalTransfers,
    branding: finalBranding,
    rolePermissions: finalRolePerms,
    systemSettings: finalSysSettings,
    auditLogs: finalLogs,
  };
}

/**
 * Download backup package as a formatted JSON file
 */
export function downloadBackupFile(backupData: SystemBackupData, filenamePrefix = 'Attendance_Backup') {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${filenamePrefix}_${dateStr}.json`;
  
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse uploaded backup file content
 */
export function validateAndParseBackupJSON(jsonString: string): {
  valid: boolean;
  data?: SystemBackupData;
  error?: string;
  summary?: SystemBackupData['summary'];
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'File content is not a valid JSON object.' };
    }

    if (!Array.isArray(parsed.branches)) {
      return { valid: false, error: 'Invalid backup: missing branches data array.' };
    }

    if (!Array.isArray(parsed.employees)) {
      return { valid: false, error: 'Invalid backup: missing employees data array.' };
    }

    if (!Array.isArray(parsed.attendanceRecords)) {
      return { valid: false, error: 'Invalid backup: missing attendance records array.' };
    }

    const summary = {
      branchesCount: parsed.branches.length,
      employeesCount: parsed.employees.length,
      attendanceRecordsCount: (parsed.attendanceRecords || []).length,
      leaveRequestsCount: (parsed.leaveRequests || []).length,
      transferRecordsCount: (parsed.transferRecords || []).length,
      auditLogsCount: (parsed.auditLogs || []).length,
    };

    const validatedData: SystemBackupData = {
      version: parsed.version || '1.0.0',
      exportDate: parsed.exportDate || new Date().toISOString(),
      systemName: parsed.systemName || 'Attendance System',
      checksum: parsed.checksum || 'N/A',
      summary: parsed.summary || summary,
      branches: parsed.branches,
      employees: parsed.employees,
      attendanceRecords: parsed.attendanceRecords || [],
      leaveRequests: parsed.leaveRequests || [],
      transferRecords: parsed.transferRecords || [],
      branding: parsed.branding || {},
      rolePermissions: parsed.rolePermissions || [],
      systemSettings: parsed.systemSettings || {},
      auditLogs: parsed.auditLogs || [],
    };

    return { valid: true, data: validatedData, summary };
  } catch (err: any) {
    return { valid: false, error: `JSON Parse error: ${err.message || 'Corrupt file structure'}` };
  }
}

/**
 * Merge new backup data into existing state
 */
export function mergeDatasets<T extends { id: string }>(currentList: T[], incomingList: T[]): T[] {
  const map = new Map<string, T>();
  currentList.forEach((item) => map.set(item.id, item));
  incomingList.forEach((item) => map.set(item.id, item)); // Incoming takes precedence on ID match
  return Array.from(map.values());
}

/**
 * Local In-Browser Snapshot Management
 */
export function saveLocalSnapshot(
  name: string,
  backupData: SystemBackupData,
  note?: string
): LocalSnapshot[] {
  const currentSnapshots = getLocalSnapshots();
  const newSnapshot: LocalSnapshot = {
    id: `snap_${Date.now()}`,
    name,
    timestamp: new Date().toLocaleString(),
    note,
    data: backupData,
  };

  const updated = [newSnapshot, ...currentSnapshots.slice(0, 9)]; // Keep max 10 snapshots
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage limit reached for snapshots:', err);
  }
  return updated;
}

export function getLocalSnapshots(): LocalSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteLocalSnapshot(snapshotId: string): LocalSnapshot[] {
  const current = getLocalSnapshots();
  const filtered = current.filter((s) => s.id !== snapshotId);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(filtered));
  } catch (_) {}
  return filtered;
}
