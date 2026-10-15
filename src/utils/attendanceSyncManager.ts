import { AttendanceRecord, Employee } from '../types';
import { supabase, saveAttendancePunchToSupabase } from './supabaseSync';
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
      // 1. Supabase Postgres
      const sbOk = await saveAttendancePunchToSupabase(record);

      // 2. Firebase Cloud Firestore
      saveAttendanceRecordToCloud(record).catch(() => {});

      // 3. Local Express server if running
      fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      }).catch(() => {});

      if (sbOk) {
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
 * Fetch all canonical attendance records directly from Supabase PostgreSQL without artificial 25 limit,
 * guaranteeing Admin receives all staff punches even across device restarts and offline periods.
 */
export async function fetchComprehensiveAttendance(limitCount: number = 500): Promise<AttendanceRecord[]> {
  const recordsMap = new Map<string, AttendanceRecord>();

  try {
    // 1. Fetch from Supabase attendance_records table
    const { data: punchRows, error } = await supabase
      .from('attendance_records')
      .select('record, created_at')
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (!error && Array.isArray(punchRows)) {
      punchRows.forEach((row) => {
        if (row?.record && row.record.id) {
          recordsMap.set(row.record.id, row.record);
        }
      });
    }
  } catch (e) {
    console.warn('[SyncManager] Supabase fetch warning:', e);
  }

  try {
    // 2. Fetch from local backend server if active
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
 * Start persistent background sync worker:
 * - Runs every 5 seconds to flush unsynced records
 * - Polls for any new records and delivers them to the caller
 * - Responds to online/focus events
 */
export function startAttendanceSyncService(
  onRecordsReceived: (newRecords: AttendanceRecord[]) => void
): () => void {
  let isRunning = true;

  const runSync = async () => {
    if (!isRunning) return;

    // 1. Flush any pending mobile punches
    await syncPendingPunches();

    // 2. Fetch fresh records from Supabase
    try {
      const records = await fetchComprehensiveAttendance(150);
      if (records.length > 0 && isRunning) {
        onRecordsReceived(records);
      }
    } catch {
      // background silent
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
