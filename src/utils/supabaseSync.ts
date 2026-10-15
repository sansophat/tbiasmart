import { createClient } from '@supabase/supabase-js';
import {
  AttendanceRecord,
  Employee,
  Branch,
  LeaveRequest,
  BranchTransferRecord,
  AuthUser,
  SystemSettings,
  CompanyBranding,
  RolePermission,
  AuditLogEntry,
  Shift,
} from '../types';
import { ActionAlertItem } from '../components/RealtimeActionAlertCenter';

export const SUPABASE_URL = 'https://zurvopjghgeaadjojrwc.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cnZvcGpnaGdlYWFkam9qcndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzE4MDMsImV4cCI6MjEwNjkwNzgwM30.dc-JfyRhmTa8Zm4jxb00ytoSiZwQkZw4Nkvgc44Lc6A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Robust timeout wrapper to guarantee Supabase PostgREST queries never freeze the UI
 */
export function withTimeout<T>(p: Promise<T>, ms: number = 3500, fallback: T): Promise<T> {
  let timer: any;
  const timeoutP = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    p
      .then((val) => {
        clearTimeout(timer);
        return val;
      })
      .catch(() => {
        clearTimeout(timer);
        return fallback;
      }),
    timeoutP,
  ]);
}

export interface SupabaseSystemData {
  branches?: Branch[];
  employees?: Employee[];
  attendanceRecords?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  transferRecords?: BranchTransferRecord[];
  branchTypes?: any[];
  branding?: CompanyBranding;
  rolePermissions?: RolePermission[];
  systemSettings?: SystemSettings;
  adminProfile?: AuthUser;
  auditLogs?: AuditLogEntry[];
  staffAlerts?: ActionAlertItem[];
  shifts?: Shift[];
  deletedEmployeeIds?: string[];
  deletedBranchIds?: string[];
  deletedLeaveIds?: string[];
  alertsClearedAt?: number;
}

/**
 * Fetch initial full snapshot from Supabase PostgreSQL (with 3.5s timeout protection)
 */
export async function fetchInitialSupabaseData(): Promise<SupabaseSystemData | null> {
  try {
    const result: SupabaseSystemData = {};

    const [stateRes, punchRes, alertRes] = await Promise.all([
      withTimeout(
        supabase.from('app_state').select('key, value') as unknown as Promise<{ data: any; error: any }>,
        3500,
        { data: null, error: null }
      ),
      withTimeout(
        supabase.from('attendance_records').select('record').order('created_at', { ascending: false }).limit(200) as unknown as Promise<{ data: any; error: any }>,
        3500,
        { data: null, error: null }
      ),
      withTimeout(
        supabase.from('staff_alerts').select('alert').order('created_at', { ascending: false }).limit(50) as unknown as Promise<{ data: any; error: any }>,
        3500,
        { data: null, error: null }
      ),
    ]);

    if (stateRes?.data && Array.isArray(stateRes.data)) {
      stateRes.data.forEach((row: any) => {
        if (row && row.key && row.value !== undefined) {
          (result as any)[row.key] = row.value;
        }
      });
    }

    if (punchRes?.data && Array.isArray(punchRes.data)) {
      result.attendanceRecords = punchRes.data
        .map((r: any) => r.record)
        .filter((r: any) => r && r.id);
    }

    if (alertRes?.data && Array.isArray(alertRes.data)) {
      result.staffAlerts = alertRes.data
        .map((a: any) => a.alert)
        .filter((a: any) => a && a.id);
    }

    return result;
  } catch (err) {
    console.warn('[Supabase] Failed to fetch initial data:', err);
    return null;
  }
}

/**
 * Direct save for an individual attendance punch with instant Realtime broadcast (0ms delay)
 */
export async function saveAttendancePunchToSupabase(record: AttendanceRecord): Promise<boolean> {
  try {
    if (!record || !record.id) return false;

    // 1. Broadcast immediately over Realtime channel (always active and instantaneous)
    broadcastSupabaseEvent('PUNCH_ATTENDANCE', { record });

    // 2. Persist to Postgres in background with strict 3.5s timeout
    withTimeout(
      supabase.from('attendance_records').upsert({
        id: record.id,
        record: record,
        created_at: record.timestamp ? new Date(record.timestamp).toISOString() : new Date().toISOString(),
      }) as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});

    return true;
  } catch (err) {
    console.warn('[Supabase] Error saving punch:', err);
    return false;
  }
}

/**
 * Direct save for an action alert with instant Realtime broadcast
 */
export async function saveStaffAlertToSupabase(alert: ActionAlertItem): Promise<boolean> {
  try {
    if (!alert || !alert.id) return false;

    // 1. Broadcast immediately over Realtime channel
    broadcastSupabaseEvent('ACTION_ALERT', { alert });

    // 2. Persist to Postgres with 3.5s timeout
    withTimeout(
      supabase.from('staff_alerts').upsert({
        id: alert.id,
        alert: alert,
        created_at: new Date(alert.rawTimestamp || Date.now()).toISOString(),
      }) as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});

    return true;
  } catch (err) {
    console.warn('[Supabase] Error saving alert:', err);
    return false;
  }
}

/**
 * Permanently clear all alerts from Supabase PostgreSQL and broadcast instantly
 */
export async function clearStaffAlertsInSupabase(clearedTimestamp: number = Date.now()): Promise<boolean> {
  try {
    // 1. Instantly broadcast CLEAR_ALERTS event
    broadcastSupabaseEvent('CLEAR_ALERTS', { clearedAt: clearedTimestamp });

    // 2. Persist to Postgres
    withTimeout(
      supabase.from('app_state').upsert({
        key: 'alertsClearedAt',
        value: clearedTimestamp,
        updated_at: new Date().toISOString(),
      }) as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});

    withTimeout(
      supabase.from('staff_alerts').delete().neq('id', '___non_existent___') as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});

    try {
      localStorage.setItem('attend_alerts_cleared_at', String(clearedTimestamp));
    } catch (_) {}

    return true;
  } catch (err) {
    console.warn('[Supabase] Error clearing alerts in Supabase:', err);
    return false;
  }
}

export const clearStaffAlertsFromSupabase = clearStaffAlertsInSupabase;

export async function deleteSingleStaffAlertFromSupabase(alertId: string): Promise<boolean> {
  try {
    withTimeout(
      supabase.from('staff_alerts').delete().eq('id', alertId) as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Permanently delete processed or all leave requests from Supabase PostgreSQL and broadcast
 */
export async function clearLeaveRequestsInSupabase(
  scope: 'processed' | 'all',
  remainingLeaves: LeaveRequest[] = [],
  deletedIds: string[] = []
): Promise<boolean> {
  try {
    // 1. Broadcast immediately
    broadcastSupabaseEvent('CLEAR_LEAVES', { scope, remainingLeaves, deletedIds });

    // 2. Update app_state leaves collection
    withTimeout(
      supabase.from('app_state').upsert({
        key: 'leaveRequests',
        value: remainingLeaves,
        updated_at: new Date().toISOString(),
      }) as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});

    if (deletedIds.length > 0) {
      withTimeout(
        supabase.from('app_state').upsert({
          key: 'deletedLeaveIds',
          value: deletedIds,
          updated_at: new Date().toISOString(),
        }) as unknown as Promise<any>,
        3500,
        null
      ).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('[Supabase] Error clearing leave requests in Supabase:', err);
    return false;
  }
}

/**
 * Permanently delete a single leave request in Supabase
 */
export async function deleteLeaveRequestInSupabase(
  leaveId: string,
  remainingLeaves: LeaveRequest[] = []
): Promise<boolean> {
  try {
    // 1. Broadcast immediately
    broadcastSupabaseEvent('DELETE_LEAVE', { leaveId, remainingLeaves });

    // 2. Update app_state in background
    withTimeout(
      supabase.from('app_state').upsert({
        key: 'leaveRequests',
        value: remainingLeaves,
        updated_at: new Date().toISOString(),
      }) as unknown as Promise<any>,
      3500,
      null
    ).catch(() => {});

    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleting leave in Supabase:', err);
    return false;
  }
}

/**
 * Direct save for an individual employee record (e.g. photo update, registration)
 */
export async function saveEmployeeToSupabase(employee: Employee, allEmployees?: Employee[]): Promise<boolean> {
  try {
    if (!employee || !employee.id) return false;

    // 1. Broadcast immediately over Realtime channel
    broadcastSupabaseEvent('ADD_EMPLOYEE', employee);
    broadcastSupabaseEvent('UPDATE_EMPLOYEE', employee);
    if (Array.isArray(allEmployees) && allEmployees.length > 0) {
      broadcastSupabaseEvent('UPDATE_EMPLOYEES_BATCH', allEmployees);
    }

    // 2. Update employees collection in background
    let employeesList = allEmployees;
    if (Array.isArray(employeesList) && employeesList.length > 0) {
      withTimeout(
        supabase.from('app_state').upsert({
          key: 'employees',
          value: employeesList,
          updated_at: new Date().toISOString(),
        }) as unknown as Promise<any>,
        3500,
        null
      ).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('[Supabase] Error saving employee:', err);
    return false;
  }
}

/**
 * Save updated system state keys (branches, employees, settings, etc.)
 */
export async function syncStateToSupabase(stateData: Partial<SupabaseSystemData>): Promise<boolean> {
  try {
    const keys = Object.keys(stateData) as (keyof SupabaseSystemData)[];
    for (const k of keys) {
      const val = stateData[k];
      if (val !== undefined && k !== 'attendanceRecords' && k !== 'staffAlerts') {
        if (Array.isArray(val) && val.length === 0) {
          continue;
        }
        withTimeout(
          supabase.from('app_state').upsert({
            key: k,
            value: val,
            updated_at: new Date().toISOString(),
          }) as unknown as Promise<any>,
          3500,
          null
        ).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing state:', err);
    return false;
  }
}

// ==========================================
// Realtime Broadcast Channel & PostgreSQL Polling Sync
// ==========================================
let liveChannel: any = null;
const liveListeners = new Set<(event: string, payload: any) => void>();

export function getOrCreateChannel() {
  if (!liveChannel) {
    liveChannel = supabase.channel('ams_live_feed', {
      config: { broadcast: { ack: true } },
    });

    liveChannel
      .on('broadcast', { event: '*' }, ({ event, payload }: any) => {
        console.info('[Supabase Realtime] Inbound broadcast:', event, payload);
        liveListeners.forEach((fn) => {
          try {
            fn(event, payload);
          } catch (e) {
            console.warn('[Supabase] Listener error:', e);
          }
        });
      })
      .subscribe((status: string) => {
        console.info('[Supabase Realtime] Channel status:', status);
      });
  }
  return liveChannel;
}

export async function broadcastSupabaseEvent(event: string, payload: any): Promise<boolean> {
  try {
    const ch = getOrCreateChannel();
    const res = await ch.send({
      type: 'broadcast',
      event,
      payload,
    });
    console.info(`[Supabase Broadcast] Sent ${event}:`, res);
    return res === 'ok';
  } catch (err) {
    console.warn('[Supabase] Broadcast send error:', err);
    return false;
  }
}

export function subscribeToSupabaseRealtime(callback: (event: string, payload: any) => void): () => void {
  getOrCreateChannel();
  liveListeners.add(callback);
  return () => {
    liveListeners.delete(callback);
  };
}

/**
 * Real-time Peer Request: Asks all connected devices (especially Admin) for their latest employee roster.
 * Resolves as soon as any peer responds with a valid array, or falls back to empty array if timeout.
 */
export async function requestEmployeesFromPeers(timeoutMs: number = 2200): Promise<Employee[]> {
  return new Promise((resolve) => {
    let resolved = false;

    const unsub = subscribeToSupabaseRealtime((event, payload) => {
      if (
        (event === 'UPDATE_EMPLOYEES_BATCH' || event === 'SYNC_EMPLOYEES_RESPONSE') &&
        Array.isArray(payload) &&
        payload.length > 0
      ) {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(payload);
        }
      }
    });

    // Broadcast the request to all online peers (Admin, supervisors, other active tablets/phones)
    broadcastSupabaseEvent('REQUEST_EMPLOYEES', {
      senderId: 'device_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsub();
        resolve([]);
      }
    }, timeoutMs);
  });
}

/**
 * Bulletproof Background Polling Sync (Runs every 3.5 seconds):
 * Ensures Admin receives new punches and alerts from Supabase PostgreSQL,
 * with timeout guards to prevent hanging.
 */
export function startSupabasePollingSync(
  onNewPunch: (record: AttendanceRecord) => void,
  onNewAlert: (alert: ActionAlertItem) => void,
  onBatchSync?: (records: AttendanceRecord[]) => void
): () => void {
  let isMounted = true;
  let lastSeenTimestamp = Date.now() - 120000;

  const pollInterval = setInterval(async () => {
    if (!isMounted) return;
    try {
      const punchPromise = supabase
        .from('attendance_records')
        .select('record, created_at')
        .order('created_at', { ascending: false })
        .limit(25) as unknown as Promise<{ data: any; error: any }>;

      const punchRes = await withTimeout(punchPromise, 3000, { data: null, error: null });

      if (punchRes?.data && Array.isArray(punchRes.data)) {
        const batch: AttendanceRecord[] = [];
        punchRes.data.forEach((row: any) => {
          if (row?.record && row.record.id) {
            batch.push(row.record);
            const rowTime = row.created_at ? new Date(row.created_at).getTime() : 0;
            if (rowTime > lastSeenTimestamp) {
              onNewPunch(row.record);
            }
          }
        });
        if (onBatchSync && batch.length > 0) {
          onBatchSync(batch);
        }
      }

      const alertPromise = supabase
        .from('staff_alerts')
        .select('alert, created_at')
        .order('created_at', { ascending: false })
        .limit(10) as unknown as Promise<{ data: any; error: any }>;

      const alertRes = await withTimeout(alertPromise, 3000, { data: null, error: null });

      if (alertRes?.data && Array.isArray(alertRes.data)) {
        alertRes.data.forEach((row: any) => {
          if (row?.alert && row.alert.id) {
            const rowTime = row.created_at ? new Date(row.created_at).getTime() : 0;
            const clearedCutoff = Number(localStorage.getItem('attend_alerts_cleared_at') || 0);
            if (rowTime > lastSeenTimestamp && rowTime > clearedCutoff) {
              onNewAlert(row.alert);
            }
          }
        });
      }

      lastSeenTimestamp = Math.max(lastSeenTimestamp, Date.now() - 2000);
    } catch (e) {
      // silent background ignore
    }
  }, 4000);

  return () => {
    isMounted = false;
    clearInterval(pollInterval);
  };
}
