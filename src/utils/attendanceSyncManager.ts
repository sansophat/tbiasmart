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
    const recCode = record.employeeCode.trim().toLowerCase();
    const empCode = employee.code.trim().toLowerCase();
    if (recCode && empCode && recCode === empCode) {
      return true;
    }
  }

  // 4. Exact Khmer Name match
  if (record.employeeNameKh && employee.nameKh) {
    const recKh = record.employeeNameKh.trim();
    const empKh = employee.nameKh.trim();
    if (recKh && empKh && recKh === empKh) {
      return true;
    }
  }

  // 5. English Name match (case-insensitive, trimmed)
  if (record.employeeNameEn && employee.nameEn) {
    const recEn = record.employeeNameEn.trim().toLowerCase();
    const empEn = employee.nameEn.trim().toLowerCase();
    if (recEn && empEn && recEn === empEn) {
      return true;
    }
  }

  return false;
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

      // 4. Local Express server if running
      fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      }).catch(() => {});

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

  try {
    // 3. Fetch from local backend server if active
    const res = await fetch('/api/system/state').then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (res?.success && Array.isArray(res?.state?.attendanceRecords)) {
      res.state.attendanceRecords.forEach((r: AttendanceRecord) => {
        if (r && r.id && !recordsMap.has(r.id)) {
          recordsMap.set(r.id, r);
        }
      });
    }
  } catch (e) {
    // ignore
  }

  return Array.from(recordsMap.values());
}

/**
 * Fetch all canonical employees directly from Turso SQLite Cloud, Supabase, and Server,
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

  // 4. Fourth attempt: Local server endpoint if available
  try {
    const res = await fetch('/api/system/state').then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (res?.success && Array.isArray(res?.state?.employees) && res.state.employees.length > 0) {
      return res.state.employees;
    }
  } catch (_) {}

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
  let cycleCount = 0;

  const runSync = async () => {
    if (!isRunning) return;

    // 1. Flush any pending mobile punches (broadcasts directly to Admin!)
    await syncPendingPunches();

    // 2. Fetch fresh records from Supabase / server
    try {
      const records = await fetchComprehensiveAttendance(150);
      if (records.length > 0 && isRunning) {
        onRecordsReceived(records);
      }
    } catch {
      // background silent
    }

    // 3. Periodically sync employees every ~10s so new staff instantly propagate to all devices
    cycleCount++;
    if (onEmployeesReceived && cycleCount % 2 === 0) {
      try {
        const freshEmps = await fetchComprehensiveEmployees();
        if (freshEmps.length > 0 && isRunning) {
          onEmployeesReceived(freshEmps);
        }
      } catch {
        // silent
      }
    }
  };

  const intervalId = setInterval(runSync, 5000);

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
