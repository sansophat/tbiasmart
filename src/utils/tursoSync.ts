import { createClient } from '@libsql/client/web';
import { AttendanceRecord, Employee, LeaveRequest, Branch, Shift, CompanyBranding } from '../types';
import { ActionAlertItem } from '../components/RealtimeActionAlertCenter';
import { INITIAL_EMPLOYEES, INITIAL_BRANCHES, INITIAL_SHIFTS, INITIAL_BRANDING } from '../data/initialData';

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
 * Automatically create required tables in Turso SQLite Cloud on startup
 */
export async function initializeTursoSchema(): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || isInitialized) return true;
  try {
    await turso.batch([
      `CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        date TEXT,
        record TEXT NOT NULL,
        created_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS staff_alerts (
        id TEXT PRIMARY KEY,
        alert TEXT NOT NULL,
        created_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        request TEXT NOT NULL,
        created_at TEXT
      );`,
    ]);
    isInitialized = true;
    console.info('[Turso] SQLite schema initialized successfully.');
    return true;
  } catch (err) {
    console.warn('[Turso] Schema initialization warning:', err);
    return false;
  }
}

/**
 * Fetch all system state keys from Turso SQLite Cloud
 */
export async function fetchInitialTursoData(): Promise<any | null> {
  if (!TURSO_AUTH_TOKEN) return null;
  try {
    await initializeTursoSchema();
    const result: any = {};

    const [stateRows, punchRows, alertRows, leaveRows] = await Promise.all([
      turso.execute('SELECT key, value FROM app_state'),
      turso.execute('SELECT record FROM attendance_records ORDER BY created_at DESC LIMIT 200'),
      turso.execute('SELECT alert FROM staff_alerts ORDER BY created_at DESC LIMIT 50'),
      turso.execute('SELECT request FROM leave_requests ORDER BY created_at DESC LIMIT 100'),
    ]);

    if (stateRows?.rows) {
      stateRows.rows.forEach((row: any) => {
        try {
          const key = String(row.key);
          const val = JSON.parse(String(row.value));
          result[key] = val;
        } catch (_) {}
      });
    }

    if (punchRows?.rows) {
      result.attendanceRecords = punchRows.rows
        .map((r: any) => {
          try {
            return JSON.parse(String(r.record));
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean);
    }

    if (alertRows?.rows) {
      result.staffAlerts = alertRows.rows
        .map((r: any) => {
          try {
            return JSON.parse(String(r.alert));
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean);
    }

    if (leaveRows?.rows) {
      result.leaveRequests = leaveRows.rows
        .map((r: any) => {
          try {
            return JSON.parse(String(r.request));
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean);
    }

    return result;
  } catch (err) {
    console.warn('[Turso] Fetch initial data error:', err);
    return null;
  }
}

/**
 * Fetch canonical employees from Turso
 */
export async function fetchTursoEmployees(): Promise<Employee[]> {
  if (!TURSO_AUTH_TOKEN) return [];
  try {
    await initializeTursoSchema();
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
 * Save an employee to Turso SQLite Cloud
 */
export async function saveEmployeeToTurso(employee: Employee, allEmployees?: Employee[]): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !employee?.id) return false;
  try {
    await initializeTursoSchema();
    if (Array.isArray(allEmployees) && allEmployees.length > 0) {
      await turso.execute({
        sql: `INSERT INTO app_state (key, value, updated_at) 
              VALUES (?, ?, ?) 
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: ['employees', JSON.stringify(allEmployees), new Date().toISOString()],
      });
    }
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving employee:', err);
    return false;
  }
}

/**
 * Save a punch attendance record to Turso
 */
export async function saveAttendancePunchToTurso(record: AttendanceRecord): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !record?.id) return false;
  try {
    await initializeTursoSchema();
    await turso.execute({
      sql: `INSERT INTO attendance_records (id, employee_id, date, record, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET record = excluded.record`,
      args: [
        record.id,
        record.employeeId || '',
        record.date || new Date().toISOString().split('T')[0],
        JSON.stringify(record),
        record.timestamp ? new Date(record.timestamp).toISOString() : new Date().toISOString(),
      ],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving punch to Turso:', err);
    return false;
  }
}

/**
 * Save staff alert to Turso
 */
export async function saveStaffAlertToTurso(alert: ActionAlertItem): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !alert?.id) return false;
  try {
    await initializeTursoSchema();
    await turso.execute({
      sql: `INSERT INTO staff_alerts (id, alert, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET alert = excluded.alert`,
      args: [alert.id, JSON.stringify(alert), new Date().toISOString()],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving alert:', err);
    return false;
  }
}

/**
 * Save leave request to Turso
 */
export async function saveLeaveRequestToTurso(req: LeaveRequest): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN || !req?.id) return false;
  try {
    await initializeTursoSchema();
    await turso.execute({
      sql: `INSERT INTO leave_requests (id, request, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET request = excluded.request`,
      args: [req.id, JSON.stringify(req), new Date().toISOString()],
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error saving leave request:', err);
    return false;
  }
}

/**
 * Sync entire state object (branches, branding, shifts, settings, etc.) to Turso
 */
export async function syncStateToTurso(stateData: Record<string, any>): Promise<boolean> {
  if (!TURSO_AUTH_TOKEN) return false;
  try {
    await initializeTursoSchema();
    const statements: any[] = [];
    const now = new Date().toISOString();

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

    if (statements.length > 0) {
      await turso.batch(statements);
    }
    return true;
  } catch (err) {
    console.warn('[Turso] Error syncing state to Turso:', err);
    return false;
  }
}
