import { AttendanceRecord, Employee } from '../types';
import { supabase, saveAttendancePunchToSupabase, withTimeout, requestEmployeesFromPeers } from './supabaseSync';
import { saveAttendancePunchToTurso, fetchTursoEmployees, turso } from './tursoSync';
import { saveAttendanceRecordToCloud } from './firebaseSync';
import { mergeDatasets } from './backupRestoreUtils';

const UNSYNCED_PUNCHES_KEY = 'attend_unsynced_punches';

/**
 * Resilient multi-attribute matching between an AttendanceRecord and an Employee.
 * Handles ID variations (e.g. user_emp_ vs emp_), code matches (case-insensitive),
 * and exact name matches (Khmer and English).
 */
export function doesRecordMatchEmployee(
  record: AttendanceRecord | undefined | null,
  employee: Employee | undefined | null
): boolean {
  if (!record || !employee) return false;

  // 1. Direct ID match
  if (record.employeeId && employee.id && record.employeeId === employee.id) {
    return true;
  }

  // 2. ID match with 'user_' prefix variation
  if (record.employeeId && employee.id) {
    const cleanRecId = record.employeeId.replace(/^user_/, '');
    const cleanEmpId = employee.id.replace(/^user_/, '');
    if (cleanRecId === cleanEmpId) return true;
  }

  // 3. Employee Code match (case-insensitive, trimmed)
  if (record.employeeCode && employee.code) {
    const recCode = String(record.employeeCode).trim().toLowerCase();
    const empCode = String(employee.code).trim().toLowerCase();
    if (recCode && empCode && recCode === empCode) {
      return true;
    }
  }

  // 4. Exact Khmer Name match
  if (record.employeeNameKh && employee.nameKh) {
    const recKh = String(record.employeeNameKh).trim();
    const empKh = String(employee.nameKh).trim();
    if (recKh && empKh && recKh === empKh) {
      return true;
    }
  }

  // 5. English Name match (case-insensitive, trimmed)
  if (record.employeeNameEn && employee.nameEn) {
    const recEn = String(record.employeeNameEn).trim().toLowerCase();
    const empEn = String(employee.nameEn).trim().toLowerCase();
    if (recEn && empEn && recEn === empEn) {
      return true;
    }
  }

  return false;
}

/**
 * High-performance O(1) index map matcher for bulk record matching across thousands of attendance punches.
 */
export class EmployeeMatcher {
  private idMap = new Map<string, Employee>();
  private codeMap = new Map<string, Employee>();
  private nameEnMap = new Map<string, Employee>();
  private nameKhMap = new Map<string, Employee>();

  constructor(employees: Employee[]) {
    if (!Array.isArray(employees)) return;
    for (const emp of employees) {
      if (!emp) continue;
      if (emp.id) {
        this.idMap.set(emp.id, emp);
        this.idMap.set(emp.id.replace(/^user_/, ''), emp);
        this.idMap.set(`user_${emp.id}`, emp);
      }
      if (emp.code) {
        this.codeMap.set(String(emp.code).trim().toLowerCase(), emp);
      }
      if (emp.nameEn) {
        this.nameEnMap.set(String(emp.nameEn).trim().toLowerCase(), emp);
      }
      if (emp.nameKh) {
        this.nameKhMap.set(String(emp.nameKh).trim(), emp);
      }
    }
  }

  match(record: AttendanceRecord | undefined | null): Employee | undefined {
    if (!record) return undefined;
    if (record.employeeId) {
      const byId = this.idMap.get(record.employeeId);
      if (byId) return byId;
    }
    if (record.employeeCode) {
      const byCode = this.codeMap.get(String(record.employeeCode).trim().toLowerCase());
      if (byCode) return byCode;
    }
    if (record.employeeNameKh) {
      const byKh = this.nameKhMap.get(String(record.employeeNameKh).trim());
      if (byKh) return byKh;
    }
    if (record.employeeNameEn) {
      const byEn = this.nameEnMap.get(String(record.employeeNameEn).trim().toLowerCase());
      if (byEn) return byEn;
    }
    return undefined;
  }
}

/**
 * Get all unsynced punches currently queued in localStorage
 */
export function getQueuedUnsyncedPunches(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(UNSYNCED_PUNCHES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Queue an attendance punch for persistent background sync
 */
export function queuePunchForSync(record: AttendanceRecord): void {
  try {
    const current = getQueuedUnsyncedPunches();
    if (!current.some((r) => r.id === record.id)) {
      const next = [record, ...current];
      localStorage.setItem(UNSYNCED_PUNCHES_KEY, JSON.stringify(next));
    }
  } catch (err) {
    console.warn('[SyncManager] Failed to queue punch:', err);
  }
}

/**
 * Remove a successfully synced punch from the unsynced queue
 */
export function markPunchAsSynced(recordId: string): void {
  try {
    const current = getQueuedUnsyncedPunches();
    const next = current.filter((r) => r.id !== recordId);
    localStorage.setItem(UNSYNCED_PUNCHES_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[SyncManager] Failed to update queue:', err);
  }
}

/**
 * Flush all pending punches from the mobile queue to Supabase, Firestore, and the backend server.
 */
export async function syncPendingPunches(): Promise<{ synced: number; failed: number }> {
  const queued = getQueuedUnsyncedPunches();
  if (queued.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const record of queued) {
    try {
      // 1. Turso SQLite Cloud (Always-on 24/7, unlimited quota)
      const tursoOk = await saveAttendancePunchToTurso(record).catch(() => false);

      // 2. Supabase Postgres & instant Realtime broadcast (delivers immediately to Admin!)
      const sbOk = await saveAttendancePunchToSupabase(record).catch(() => false);

      // 3. Firebase Cloud Firestore
      saveAttendanceRecordToCloud(record).catch(() => {});

      if (tursoOk || sbOk) {
        markPunchAsSynced(record.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Fetch all canonical attendance records directly from Turso SQLite Cloud and Supabase
 */
export async function fetchComprehensiveAttendance(limitCount: number = 500): Promise<AttendanceRecord[]> {
  const recordsMap = new Map<string, AttendanceRecord>();

  // 1. Fetch from Turso SQLite Cloud (Fastest, always active)
  try {
    const res = await turso.execute({
      sql: 'SELECT record FROM attendance_records ORDER BY created_at DESC LIMIT ?',
      args: [limitCount],
    });
    if (res?.rows && Array.isArray(res.rows)) {
      res.rows.forEach((row: any) => {
        try {
          const rec = JSON.parse(String(row.record));
          if (rec?.id && !recordsMap.has(rec.id)) {
            recordsMap.set(rec.id, rec);
          }
        } catch (_) {}
      });
    }
  } catch (err) {
    console.warn('[SyncManager] Turso attendance fetch warning:', err);
  }

  try {
    // 2. Fetch from Supabase attendance_records table with 3.5s timeout
    const punchPromise = supabase
      .from('attendance_records')
      .select('record, created_at')
      .order('created_at', { ascending: false })
      .limit(limitCount) as unknown as Promise<{ data: any; error: any }>;

    const { data: punchRows, error } = await withTimeout(punchPromise, 3500, { data: null, error: null });

    if (!error && Array.isArray(punchRows)) {
      punchRows.forEach((row: any) => {
        if (row?.record && row.record.id && !recordsMap.has(row.record.id)) {
          recordsMap.set(row.record.id, row.record);
        }
      });
    }
  } catch (e) {
    console.warn('[SyncManager] Supabase fetch warning:', e);
  }

  return Array.from(recordsMap.values());
}

/**
 * Fetch all canonical employees directly from Turso SQLite Cloud and Supabase,
 * ensuring newly registered staff are immediately available on all mobile devices.
 */
export async function fetchComprehensiveEmployees(): Promise<Employee[]> {
  // 1. First attempt: Turso SQLite Cloud (Always-on 24/7, ultra-fast, 9GB storage)
  try {
    const tursoEmps = await fetchTursoEmployees();
    if (Array.isArray(tursoEmps) && tursoEmps.length > 0) {
      return tursoEmps;
    }
  } catch (err) {
    console.warn('[SyncManager] Turso employees fetch warning:', err);
  }

  // 2. Second attempt: Supabase PostgreSQL app_state table
  try {
    const empPromise = supabase
      .from('app_state')
      .select('value')
      .eq('key', 'employees')
      .single() as unknown as Promise<{ data: any; error: any }>;

    const { data, error } = await withTimeout(empPromise, 2500, { data: null, error: null });

    if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
      return data.value;
    }
  } catch (err) {
    console.warn('[SyncManager] Supabase employees fetch warning:', err);
  }

  // 3. Third attempt: On-Demand Peer-to-Peer Sync over Supabase Realtime WebSocket
  try {
    const peerEmps = await requestEmployeesFromPeers(2000);
    if (Array.isArray(peerEmps) && peerEmps.length > 0) {
      console.info('[SyncManager] Retrieved', peerEmps.length, 'employees from online peer');
      return peerEmps;
    }
  } catch (err) {
    console.warn('[SyncManager] Peer employees request warning:', err);
  }

  return [];
}

/**
 * Start persistent background sync worker:
 * - Runs every 5 seconds to flush unsynced records
 * - Polls for any new records and delivers them to the caller
 * - Polls for newly registered employees and delivers them across devices
 * - Responds to online/focus events
 */
export function startAttendanceSyncService(
  onRecordsReceived: (newRecords: AttendanceRecord[]) => void,
  onEmployeesReceived?: (newEmployees: Employee[]) => void
): () => void {
  let isRunning = true;
  let isSyncing = false;
  let cycleCount = 0;

  const runSync = async () => {
    if (!isRunning || isSyncing) return;
    isSyncing = true;

    try {
      // 1. Flush any pending mobile punches (broadcasts directly to Admin!)
      await syncPendingPunches();

      // 2. Fetch fresh records from Supabase / server
      const records = await fetchComprehensiveAttendance(150);
      if (records.length > 0 && isRunning) {
        onRecordsReceived(records);
      }

      // 3. Periodically sync employees every ~40s so new staff propagate smoothly
      cycleCount++;
      if (onEmployeesReceived && cycleCount % 2 === 0) {
        const freshEmps = await fetchComprehensiveEmployees();
        if (freshEmps.length > 0 && isRunning) {
          onEmployeesReceived(freshEmps);
        }
      }
    } catch {
      // background silent
    } finally {
      isSyncing = false;
    }
  };

  const intervalId = setInterval(runSync, 20000);

  const handleOnlineOrFocus = () => {
    runSync();
  };

  window.addEventListener('online', handleOnlineOrFocus);
  window.addEventListener('focus', handleOnlineOrFocus);

  return () => {
    isRunning = false;
    clearInterval(intervalId);
    window.removeEventListener('online', handleOnlineOrFocus);
    window.removeEventListener('focus', handleOnlineOrFocus);
  };
}
