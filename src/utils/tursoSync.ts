import { createClient } from '@libsql/client/web';
import {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  Branch,
  Shift,
  CompanyBranding,
  BranchTransferRecord,
  RolePermission,
  AuditLogEntry,
} from '../types';
import { ActionAlertItem } from '../components/RealtimeActionAlertCenter';
import { INITIAL_SHIFTS } from '../data/initialData';

// ======================================================================
// Turso SQLite Cloud Configuration (9 GB Free Forever, Never Sleeps)
// ======================================================================
export const TURSO_DATABASE_URL =
  (import.meta as any).env?.VITE_TURSO_DATABASE_URL ||
  'libsql://tbiasmart-sansophat.aws-ap-northeast-1.turso.io';
export const TURSO_AUTH_TOKEN =
  (import.meta as any).env?.VITE_TURSO_AUTH_TOKEN ||
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwNTgxNzIsImlkIjoiMDFhMTNlZmQtNWIwMS03NzdkLTgxOWUtOWIzNzFkZmQ2MjRmIiwia2lkIjoicHRSQk5aRWxyWVZzdlpXUzhOZS1XelczMUk3d1pkVGFMS0tFM3c0VzZ3ayIsInJpZCI6ImQxMWRmZWNjLWIwMmUtNDZhNy1hNmJjLTllMTEyNzdjMTg3MiJ9.OElfSOYKd5lbwQ-L_z5UPCeC3tzasR-cBVTr6SePxYfKj77G_pPBXVEQmSkX53zB6l0kKOi7M-IqYhYu0kALCQ';

export const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

let isInitialized = false;

/**
 * Helper to format timestamp into Cambodia local YYYY-MM-DD date string
 */
function toCambodiaDateStr(ts?: string | number | Date): string {
  try {
    const d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' });
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Automatically create all structured relational tables in Turso SQLite Cloud
 */
export async function initializeTursoSchema(): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || isInitialized) return true;
  try {
    await turso.batch([
      // 1. Employees Table
      `CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        code TEXT,
        name_kh TEXT,
        name_en TEXT,
        role TEXT,
        role_type TEXT,
        department TEXT,
        department_kh TEXT,
        branch_id TEXT,
        shift_id TEXT,
        shift_start_time TEXT,
        shift_end_time TEXT,
        weekly_day_off INTEGER,
        phone TEXT,
        pin_code TEXT,
        status TEXT,
        trusted_device_id TEXT,
        trusted_device_name TEXT,
        avatar TEXT,
        record TEXT NOT NULL,
        updated_at TEXT
      );`,
      // 2. Branches Table
      `CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name_kh TEXT,
        name_en TEXT,
        type TEXT,
        lat REAL,
        lng REAL,
        radius_meters INTEGER,
        open_time TEXT,
        close_time TEXT,
        manager_name TEXT,
        contact_phone TEXT,
        address_kh TEXT,
        address_en TEXT,
        record TEXT NOT NULL,
        updated_at TEXT
      );`,
      // 3. Workshifts Table
      `CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        name_kh TEXT,
        name_en TEXT,
        start_time TEXT,
        end_time TEXT,
        work_hours REAL,
        grace_period_mins INTEGER,
        record TEXT NOT NULL,
        updated_at TEXT
      );`,
      // 4. Attendance Records Table
      `CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        employee_code TEXT,
        employee_name_kh TEXT,
        employee_name_en TEXT,
        branch_id TEXT,
        branch_name TEXT,
        type TEXT,
        status TEXT,
        timestamp TEXT,
        date TEXT,
        distance_to_branch REAL,
        is_within_geofence INTEGER,
        method TEXT,
        record TEXT NOT NULL,
        created_at TEXT
      );`,
      // 5. Leave & Overtime Requests Table
      `CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        employee_code TEXT,
        employee_name_kh TEXT,
        employee_name_en TEXT,
        branch_id TEXT,
        type TEXT,
        category TEXT,
        start_date TEXT,
        end_date TEXT,
        hours REAL,
        status TEXT,
        reason TEXT,
        approved_by TEXT,
        request TEXT NOT NULL,
        created_at TEXT
      );`,
      // 6. Branch Transfer Records Table
      `CREATE TABLE IF NOT EXISTS transfer_records (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        employee_code TEXT,
        employee_name_kh TEXT,
        employee_name_en TEXT,
        from_branch_id TEXT,
        from_branch_name TEXT,
        to_branch_id TEXT,
        to_branch_name TEXT,
        effective_date TEXT,
        reason TEXT,
        record TEXT NOT NULL,
        created_at TEXT
      );`,
      // 7. Staff Action Alerts Table
      `CREATE TABLE IF NOT EXISTS staff_alerts (
        id TEXT PRIMARY KEY,
        type TEXT,
        title_kh TEXT,
        title_en TEXT,
        employee_name TEXT,
        branch_name TEXT,
        timestamp TEXT,
        alert TEXT NOT NULL,
        created_at TEXT
      );`,
      // 8. Security & System Audit Logs Table
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        actor_name TEXT,
        actor_role TEXT,
        action TEXT,
        module TEXT,
        details TEXT,
        status TEXT,
        record TEXT NOT NULL,
        created_at TEXT
      );`,
      // 9. Role Permissions Table
      `CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT PRIMARY KEY,
        label_kh TEXT,
        label_en TEXT,
        record TEXT NOT NULL,
        updated_at TEXT
      );`,
      // 10. Company Branding Table
      `CREATE TABLE IF NOT EXISTS company_branding (
        id TEXT PRIMARY KEY,
        company_name_kh TEXT,
        company_name_en TEXT,
        slogan_kh TEXT,
        slogan_en TEXT,
        support_phone TEXT,
        support_email TEXT,
        record TEXT NOT NULL,
        updated_at TEXT
      );`,
      // 11. System Settings & Admin Profile Table
      `CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        category TEXT,
        description TEXT,
        record TEXT NOT NULL,
        updated_at TEXT
      );`,
      // 12. Master App State Table (Backward compatibility)
      `CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT
      );`,
    ]);
    isInitialized = true;
    console.info('[Turso] All 12 SQLite tables initialized successfully.');
    return true;
  } catch (err) {
    console.warn('[Turso] Schema initialization warning:', err);
    return false;
  }
}

/**
 * Fetch all system data from dedicated Turso SQLite tables (with fallback to app_state)
 */
export async function fetchInitialTursoData(): Promise<any | null> {
  if (!TURSO_AUTH_TOKEN) return null;
  try {
    await initializeTursoSchema();
    const result: any = {};

    const [
      empRows,
      branchRows,
      shiftRows,
      punchRows,
      leaveRows,
      transferRows,
      alertRows,
      auditRows,
      roleRows,
      brandingRows,
      settingsRows,
      stateRows,
    ] = await Promise.all([
      turso.execute('SELECT record FROM employees ORDER BY code ASC').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM branches ORDER BY id ASC').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM shifts ORDER BY id ASC').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM attendance_records ORDER BY created_at DESC LIMIT 80').catch(() => ({ rows: [] })),
      turso.execute('SELECT request FROM leave_requests ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM transfer_records ORDER BY created_at DESC LIMIT 50').catch(() => ({ rows: [] })),
      turso.execute('SELECT alert FROM staff_alerts ORDER BY created_at DESC LIMIT 50').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM audit_logs ORDER BY created_at DESC LIMIT 50').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM role_permissions').catch(() => ({ rows: [] })),
      turso.execute('SELECT record FROM company_branding LIMIT 1').catch(() => ({ rows: [] })),
      turso.execute('SELECT id, record FROM system_settings').catch(() => ({ rows: [] })),
      turso.execute('SELECT key, value FROM app_state').catch(() => ({ rows: [] })),
    ]);

    // 1. Load baseline from app_state first
    if (stateRows?.rows) {
      stateRows.rows.forEach((row: any) => {
        try {
          const key = String(row.key);
          const val = JSON.parse(String(row.value));
          result[key] = val;
        } catch (_) {}
      });
    }

    // 2. Override / merge with structured tables
    const parseRecords = (rows: any[], colName: string = 'record') =>
      (rows || [])
        .map((r: any) => {
          try {
            return JSON.parse(String(r[colName]));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

    const parsedEmps = parseRecords(empRows?.rows);
    if (parsedEmps.length > 0) result.employees = parsedEmps;

    const parsedBranches = parseRecords(branchRows?.rows);
    if (parsedBranches.length > 0) result.branches = parsedBranches;

    const parsedShifts = parseRecords(shiftRows?.rows);
    if (parsedShifts.length > 0) result.shifts = parsedShifts;

    const parsedPunches = parseRecords(punchRows?.rows).filter((r: any) => r && r.id && r.timestamp);
    if (parsedPunches.length > 0) result.attendanceRecords = parsedPunches;

    const parsedLeaves = parseRecords(leaveRows?.rows, 'request');
    if (parsedLeaves.length > 0) result.leaveRequests = parsedLeaves;

    const parsedTransfers = parseRecords(transferRows?.rows);
    if (parsedTransfers.length > 0) result.transferRecords = parsedTransfers;

    const parsedAlerts = parseRecords(alertRows?.rows, 'alert');
    if (parsedAlerts.length > 0) result.staffAlerts = parsedAlerts;

    const parsedAudits = parseRecords(auditRows?.rows);
    if (parsedAudits.length > 0) result.auditLogs = parsedAudits;

    const parsedRoles = parseRecords(roleRows?.rows);
    if (parsedRoles.length > 0) result.rolePermissions = parsedRoles;

    const parsedBranding = parseRecords(brandingRows?.rows);
    if (parsedBranding.length > 0) result.branding = parsedBranding[0];

    if (settingsRows?.rows && settingsRows.rows.length > 0) {
      settingsRows.rows.forEach((r: any) => {
        try {
          const parsed = JSON.parse(String(r.record));
          if (r.id === 'system_settings') result.systemSettings = parsed;
          if (r.id === 'admin_profile') result.adminProfile = parsed;
        } catch {}
      });
    }

    return result;
  } catch (err) {
    console.warn('[Turso] Fetch initial data error:', err);
    return null;
  }
}

/**
 * Fetch canonical employees from Turso `employees` table (with fallback to `app_state`)
 */
export async function fetchTursoEmployees(): Promise<Employee[]> {
  if (!TURSO_AUTH_TOKEN) return [];
  try {
    await initializeTursoSchema();
    const tableRes = await turso.execute('SELECT record FROM employees ORDER BY code ASC').catch(() => null);
    if (tableRes?.rows && tableRes.rows.length > 0) {
      const list = tableRes.rows
        .map((r: any) => {
          try {
            return JSON.parse(String(r.record));
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (list.length > 0) return list;
    }

    const res = await turso.execute({
      sql: 'SELECT value FROM app_state WHERE key = ?',
      args: ['employees'],
    });

    if (res?.rows && res.rows.length > 0) {
      const parsed = JSON.parse(String(res.rows[0].value));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Turso] Fetch employees error:', err);
  }
  return [];
}

/**
 * Helper to build SQL upsert statement for an Employee row
 */
function buildEmployeeUpsertStmt(emp: Employee, now: string) {
  return {
    sql: `INSERT INTO employees (
      id, code, name_kh, name_en, role, role_type, department, department_kh,
      branch_id, shift_id, shift_start_time, shift_end_time, weekly_day_off,
      phone, pin_code, status, trusted_device_id, trusted_device_name, avatar,
      record, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      name_kh = excluded.name_kh,
      name_en = excluded.name_en,
      role = excluded.role,
      role_type = excluded.role_type,
      department = excluded.department,
      department_kh = excluded.department_kh,
      branch_id = excluded.branch_id,
      shift_id = excluded.shift_id,
      shift_start_time = excluded.shift_start_time,
      shift_end_time = excluded.shift_end_time,
      weekly_day_off = excluded.weekly_day_off,
      phone = excluded.phone,
      pin_code = excluded.pin_code,
      status = excluded.status,
      trusted_device_id = excluded.trusted_device_id,
      trusted_device_name = excluded.trusted_device_name,
      avatar = excluded.avatar,
      record = excluded.record,
      updated_at = excluded.updated_at`,
    args: [
      emp.id,
      emp.code || '',
      emp.nameKh || '',
      emp.nameEn || '',
      emp.role || emp.roleKh || '',
      emp.roleType || 'employee',
      emp.department || '',
      emp.departmentKh || '',
      emp.branchId || '',
      emp.shiftId || '',
      emp.shiftStartTime || emp.customStartTime || '',
      emp.shiftEndTime || emp.customEndTime || '',
      emp.weeklyDayOff ?? 0,
      emp.phone || '',
      emp.pinCode || '1234',
      emp.status || 'active',
      emp.trustedDeviceId || '',
      emp.trustedDeviceName || '',
      emp.avatar && emp.avatar.length < 500 ? emp.avatar : '[base64_avatar]',
      JSON.stringify(emp),
      now,
    ],
  };
}

/**
 * Save an employee to Turso `employees` table AND `app_state`
 */
export async function saveEmployeeToTurso(employee: Employee, allEmployees?: Employee[]): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !employee?.id) return false;
  try {
    await initializeTursoSchema();
    const now = new Date().toISOString();
    const stmts: any[] = [buildEmployeeUpsertStmt(employee, now)];

    if (Array.isArray(allEmployees) && allEmployees.length > 0) {
      stmts.push({
        sql: `INSERT INTO app_state (key, value, updated_at) 
              VALUES (?, ?, ?) 
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: ['employees', JSON.stringify(allEmployees), now],
      });
    }
    await turso.batch(stmts);
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving employee:', err);
    return false;
  }
}

/**
 * Delete an employee from Turso `employees` table
 */
export async function deleteEmployeeFromTurso(employeeId: string, remainingEmployees?: Employee[]): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !employeeId) return false;
  try {
    await initializeTursoSchema();
    const now = new Date().toISOString();
    const stmts: any[] = [
      {
        sql: 'DELETE FROM employees WHERE id = ?',
        args: [employeeId],
      },
    ];
    if (Array.isArray(remainingEmployees)) {
      stmts.push({
        sql: `INSERT INTO app_state (key, value, updated_at) 
              VALUES (?, ?, ?) 
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: ['employees', JSON.stringify(remainingEmployees), now],
      });
    }
    await turso.batch(stmts);
    return true;
  } catch (err) {
    console.warn('[Turso] Error deleting employee:', err);
    return false;
  }
}

/**
 * Save a punch attendance record to Turso `attendance_records` table with full structured columns
 */
export async function saveAttendancePunchToTurso(record: AttendanceRecord): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !record?.id) return false;
  try {
    await initializeTursoSchema();
    const createdAt = record.timestamp ? new Date(record.timestamp).toISOString() : new Date().toISOString();
    const cambodiaDate = toCambodiaDateStr(record.timestamp || createdAt);

    await turso.execute({
      sql: `INSERT INTO attendance_records (
              id, employee_id, employee_code, employee_name_kh, employee_name_en,
              branch_id, branch_name, type, status, timestamp, date,
              distance_to_branch, is_within_geofence, method, record, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              employee_id = excluded.employee_id,
              employee_code = excluded.employee_code,
              employee_name_kh = excluded.employee_name_kh,
              employee_name_en = excluded.employee_name_en,
              branch_id = excluded.branch_id,
              branch_name = excluded.branch_name,
              type = excluded.type,
              status = excluded.status,
              timestamp = excluded.timestamp,
              date = excluded.date,
              distance_to_branch = excluded.distance_to_branch,
              is_within_geofence = excluded.is_within_geofence,
              method = excluded.method,
              record = excluded.record,
              created_at = excluded.created_at`,
      args: [
        record.id,
        record.employeeId || '',
        record.employeeCode || '',
        record.employeeNameKh || '',
        record.employeeNameEn || '',
        record.branchId || '',
        record.branchNameEn || record.branchNameKh || '',
        record.type || 'check_in',
        record.status || 'on_time',
        record.timestamp || createdAt,
        cambodiaDate,
        Number(record.distanceToBranch || 0),
        record.isWithinGeofence ? 1 : 0,
        record.method || 'qr_mobile',
        JSON.stringify(record),
        createdAt,
      ],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving punch to Turso:', err);
    return false;
  }
}

/**
 * Save staff alert to Turso `staff_alerts` table with structured columns
 */
export async function saveStaffAlertToTurso(alert: ActionAlertItem): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !alert?.id) return false;
  try {
    await initializeTursoSchema();
    const now = new Date().toISOString();
    await turso.execute({
      sql: `INSERT INTO staff_alerts (
              id, type, title_kh, title_en, employee_name, branch_name, timestamp, alert, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              title_kh = excluded.title_kh,
              title_en = excluded.title_en,
              employee_name = excluded.employee_name,
              branch_name = excluded.branch_name,
              timestamp = excluded.timestamp,
              alert = excluded.alert`,
      args: [
        alert.id,
        alert.type || 'punch',
        alert.titleKh || '',
        alert.titleEn || '',
        alert.actorName || (alert as any).employeeNameEn || (alert as any).employeeNameKh || '',
        alert.branchName || '',
        alert.timestamp || now,
        JSON.stringify(alert),
        now,
      ],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving alert:', err);
    return false;
  }
}

/**
 * Clear all staff alerts from Turso `staff_alerts` table
 */
export async function clearStaffAlertsFromTurso(clearedAtMs?: number): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN) return false;
  try {
    await initializeTursoSchema();
    const now = new Date().toISOString();
    const stmts: any[] = [{ sql: 'DELETE FROM staff_alerts', args: [] }];
    if (clearedAtMs) {
      stmts.push({
        sql: `INSERT INTO app_state (key, value, updated_at)
              VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: ['alertsClearedAt', JSON.stringify(clearedAtMs), now],
      });
    }
    await turso.batch(stmts);
    return true;
  } catch (err) {
    console.warn('[Turso] Error clearing alerts:', err);
    return false;
  }
}

/**
 * Delete a single staff alert from Turso `staff_alerts` table
 */
export async function deleteSingleStaffAlertFromTurso(alertId: string): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !alertId) return false;
  try {
    await initializeTursoSchema();
    await turso.execute({
      sql: 'DELETE FROM staff_alerts WHERE id = ?',
      args: [alertId],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error deleting single alert:', err);
    return false;
  }
}

/**
 * Delete a branch from Turso `branches` table
 */
export async function deleteBranchFromTurso(branchId: string, remainingBranches?: Branch[]): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !branchId) return false;
  try {
    await initializeTursoSchema();
    const now = new Date().toISOString();
    const stmts: any[] = [{ sql: 'DELETE FROM branches WHERE id = ?', args: [branchId] }];
    if (Array.isArray(remainingBranches)) {
      stmts.push({
        sql: `INSERT INTO app_state (key, value, updated_at)
              VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: ['branches', JSON.stringify(remainingBranches), now],
      });
    }
    await turso.batch(stmts);
    return true;
  } catch (err) {
    console.warn('[Turso] Error deleting branch:', err);
    return false;
  }
}

/**
 * Delete leave request(s) from Turso `leave_requests` table
 */
export async function deleteLeaveRequestsFromTurso(ids: string[], remainingLeaves?: LeaveRequest[]): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !Array.isArray(ids) || ids.length === 0) return false;
  try {
    await initializeTursoSchema();
    const now = new Date().toISOString();
    const stmts: any[] = ids.map((id) => ({
      sql: 'DELETE FROM leave_requests WHERE id = ?',
      args: [id],
    }));
    if (Array.isArray(remainingLeaves)) {
      stmts.push({
        sql: `INSERT INTO app_state (key, value, updated_at)
              VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: ['leaveRequests', JSON.stringify(remainingLeaves), now],
      });
    }
    await turso.batch(stmts);
    return true;
  } catch (err) {
    console.warn('[Turso] Error deleting leave requests:', err);
    return false;
  }
}

/**
 * Save leave request to Turso `leave_requests` table with structured columns
 */
export async function saveLeaveRequestToTurso(req: LeaveRequest): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !req?.id) return false;
  try {
    await initializeTursoSchema();
    const createdAt = req.createdAt ? new Date(req.createdAt).toISOString() : new Date().toISOString();
    await turso.execute({
      sql: `INSERT INTO leave_requests (
              id, employee_id, employee_code, employee_name_kh, employee_name_en,
              branch_id, type, category, start_date, end_date, hours,
              status, reason, approved_by, request, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              status = excluded.status,
              approved_by = excluded.approved_by,
              hours = excluded.hours,
              reason = excluded.reason,
              request = excluded.request`,
      args: [
        req.id,
        req.employeeId || '',
        req.employeeCode || '',
        req.employeeNameKh || '',
        req.employeeNameEn || '',
        req.branchId || '',
        req.type || 'annual',
        req.category || req.type || 'leave',
        req.startDate || '',
        req.endDate || req.startDate || '',
        Number(req.hours || 0),
        req.status || 'pending',
        req.reason || '',
        req.approvedBy || '',
        JSON.stringify(req),
        createdAt,
      ],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving leave request:', err);
    return false;
  }
}

/**
 * Sync entire state object to dedicated Turso SQLite tables (`employees`, `branches`, `shifts`, `leave_requests`, `transfer_records`, `audit_logs`, `role_permissions`, `company_branding`, `system_settings`, and `app_state`)
 */
export async function syncStateToTurso(stateData: Record<string, any>): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN) return false;
  try {
    await initializeTursoSchema();
    const statements: any[] = [];
    const now = new Date().toISOString();

    // 1. Sync to app_state for any provided keys
    for (const [key, val] of Object.entries(stateData)) {
      if (val !== undefined && key !== 'attendanceRecords' && key !== 'staffAlerts') {
        statements.push({
          sql: `INSERT INTO app_state (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          args: [key, JSON.stringify(val), now],
        });
      }
    }

    // 2. Sync employees table
    if (Array.isArray(stateData.employees)) {
      stateData.employees.forEach((emp: Employee) => {
        if (emp && emp.id) {
          statements.push(buildEmployeeUpsertStmt(emp, now));
        }
      });
    }

    // 3. Sync branches table
    if (Array.isArray(stateData.branches)) {
      stateData.branches.forEach((br: Branch) => {
        if (br && br.id) {
          statements.push({
            sql: `INSERT INTO branches (
              id, name_kh, name_en, type, lat, lng, radius_meters,
              open_time, close_time, manager_name, contact_phone,
              address_kh, address_en, record, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name_kh = excluded.name_kh,
              name_en = excluded.name_en,
              type = excluded.type,
              lat = excluded.lat,
              lng = excluded.lng,
              radius_meters = excluded.radius_meters,
              open_time = excluded.open_time,
              close_time = excluded.close_time,
              manager_name = excluded.manager_name,
              contact_phone = excluded.contact_phone,
              address_kh = excluded.address_kh,
              address_en = excluded.address_en,
              record = excluded.record,
              updated_at = excluded.updated_at`,
            args: [
              br.id,
              br.nameKh || '',
              br.nameEn || '',
              br.type || 'cafe',
              Number(br.lat || 0),
              Number(br.lng || 0),
              Number(br.radiusMeters || 100),
              br.openTime || '06:00',
              br.closeTime || '22:00',
              br.managerName || '',
              br.contactPhone || '',
              br.addressKh || '',
              br.addressEn || '',
              JSON.stringify(br),
              now,
            ],
          });
        }
      });
    }

    // 4. Sync shifts table
    const shiftsToSync: Shift[] = Array.isArray(stateData.shifts) ? stateData.shifts : [];
    shiftsToSync.forEach((sh: Shift) => {
      if (sh && sh.id) {
        statements.push({
          sql: `INSERT INTO shifts (
            id, name_kh, name_en, start_time, end_time, work_hours, grace_period_mins, record, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name_kh = excluded.name_kh,
            name_en = excluded.name_en,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            work_hours = excluded.work_hours,
            grace_period_mins = excluded.grace_period_mins,
            record = excluded.record,
            updated_at = excluded.updated_at`,
          args: [
            sh.id,
            sh.nameKh || '',
            sh.nameEn || '',
            sh.startTime || '06:00',
            sh.endTime || '14:00',
            Number(sh.workHours || 8),
            Number(sh.gracePeriodMins || 15),
            JSON.stringify(sh),
            now,
          ],
        });
      }
    });

    // 5. Sync leave_requests table
    if (Array.isArray(stateData.leaveRequests)) {
      stateData.leaveRequests.forEach((req: LeaveRequest) => {
        if (req && req.id) {
          const createdAt = req.createdAt ? new Date(req.createdAt).toISOString() : now;
          statements.push({
            sql: `INSERT INTO leave_requests (
              id, employee_id, employee_code, employee_name_kh, employee_name_en,
              branch_id, type, category, start_date, end_date, hours,
              status, reason, approved_by, request, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              status = excluded.status,
              approved_by = excluded.approved_by,
              hours = excluded.hours,
              reason = excluded.reason,
              request = excluded.request`,
            args: [
              req.id,
              req.employeeId || '',
              req.employeeCode || '',
              req.employeeNameKh || '',
              req.employeeNameEn || '',
              req.branchId || '',
              req.type || 'annual',
              req.category || req.type || 'leave',
              req.startDate || '',
              req.endDate || req.startDate || '',
              Number(req.hours || 0),
              req.status || 'pending',
              req.reason || '',
              req.approvedBy || '',
              JSON.stringify(req),
              createdAt,
            ],
          });
        }
      });
    }

    // 6. Sync transfer_records table
    if (Array.isArray(stateData.transferRecords)) {
      stateData.transferRecords.forEach((tr: BranchTransferRecord) => {
        if (tr && tr.id) {
          statements.push({
            sql: `INSERT INTO transfer_records (
              id, employee_id, employee_code, employee_name_kh, employee_name_en,
              from_branch_id, from_branch_name, to_branch_id, to_branch_name,
              effective_date, reason, record, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              to_branch_id = excluded.to_branch_id,
              to_branch_name = excluded.to_branch_name,
              effective_date = excluded.effective_date,
              reason = excluded.reason,
              record = excluded.record`,
            args: [
              tr.id,
              tr.employeeId || '',
              tr.employeeCode || '',
              tr.employeeNameKh || '',
              tr.employeeNameEn || '',
              tr.fromBranchId || '',
              tr.fromBranchNameEn || tr.fromBranchNameKh || '',
              tr.toBranchId || '',
              tr.toBranchNameEn || tr.toBranchNameKh || '',
              tr.effectiveDate || tr.transferDate || '',
              tr.reason || '',
              JSON.stringify(tr),
              now,
            ],
          });
        }
      });
    }

    // 7. Sync audit_logs table (latest 100 to keep batches fast)
    if (Array.isArray(stateData.auditLogs)) {
      stateData.auditLogs.slice(0, 100).forEach((log: AuditLogEntry) => {
        if (log && log.id) {
          statements.push({
            sql: `INSERT INTO audit_logs (
              id, timestamp, actor_name, actor_role, action, module, details, status, record, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET record = excluded.record`,
            args: [
              log.id,
              log.timestamp || now,
              log.actorName || '',
              log.actorRole || '',
              log.action || log.actionKh || '',
              log.module || 'system',
              log.details || log.detailsKh || '',
              log.status || 'success',
              JSON.stringify(log),
              now,
            ],
          });
        }
      });
    }

    // 8. Sync role_permissions table
    if (Array.isArray(stateData.rolePermissions)) {
      stateData.rolePermissions.forEach((rp: any, idx: number) => {
        if (rp) {
          const roleKey = String(rp.role || rp.roleId || rp.id || `role_${idx}`);
          statements.push({
            sql: `INSERT INTO role_permissions (
              role, label_kh, label_en, record, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(role) DO UPDATE SET
              label_kh = excluded.label_kh,
              label_en = excluded.label_en,
              record = excluded.record,
              updated_at = excluded.updated_at`,
            args: [
              roleKey,
              String(rp.labelKh || rp.nameKh || rp.roleNameKh || ''),
              String(rp.labelEn || rp.nameEn || rp.roleNameEn || ''),
              JSON.stringify(rp),
              now,
            ],
          });
        }
      });
    }

    // 9. Sync company_branding table
    if (stateData.branding && typeof stateData.branding === 'object') {
      const b: CompanyBranding = stateData.branding;
      statements.push({
        sql: `INSERT INTO company_branding (
          id, company_name_kh, company_name_en, slogan_kh, slogan_en,
          support_phone, support_email, record, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          company_name_kh = excluded.company_name_kh,
          company_name_en = excluded.company_name_en,
          slogan_kh = excluded.slogan_kh,
          slogan_en = excluded.slogan_en,
          support_phone = excluded.support_phone,
          support_email = excluded.support_email,
          record = excluded.record,
          updated_at = excluded.updated_at`,
        args: [
          'default_branding',
          b.companyNameKh || '',
          b.companyNameEn || '',
          b.sloganKh || '',
          b.sloganEn || '',
          b.supportPhone || '',
          b.supportEmail || '',
          JSON.stringify(b),
          now,
        ],
      });
    }

    // 10. Sync system_settings & adminProfile
    if (stateData.systemSettings && typeof stateData.systemSettings === 'object') {
      statements.push({
        sql: `INSERT INTO system_settings (id, category, description, record, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET record = excluded.record, updated_at = excluded.updated_at`,
        args: [
          'system_settings',
          'configuration',
          'Global Geofence, Attendance & Broadcast Settings',
          JSON.stringify(stateData.systemSettings),
          now,
        ],
      });
    }
    if (stateData.adminProfile && typeof stateData.adminProfile === 'object') {
      statements.push({
        sql: `INSERT INTO system_settings (id, category, description, record, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET record = excluded.record, updated_at = excluded.updated_at`,
        args: [
          'admin_profile',
          'admin_account',
          'Primary System Administrator Profile',
          JSON.stringify(stateData.adminProfile),
          now,
        ],
      });
    }

    if (statements.length > 0) {
      await turso.batch(statements);
    }
    return true;
  } catch (err) {
    console.warn('[Turso] Error syncing state to Turso:', err);
    return false;
  }
}
