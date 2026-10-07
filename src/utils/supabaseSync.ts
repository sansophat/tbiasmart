import { createClient } from '@supabase/supabase-js';
import {
  AttendanceRecord,
  Employee,
  Branch,
  LeaveRequest,
  BranchTransferRecord,
  ActionAlertItem,
  AuthUser,
  SystemSettings,
  AppBranding,
  RolePermission,
  AuditLogEntry,
  ShiftConfig,
} from '../types';

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

export interface SupabaseSystemData {
  branches?: Branch[];
  employees?: Employee[];
  attendanceRecords?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  transferRecords?: BranchTransferRecord[];
  branchTypes?: any[];
  branding?: AppBranding;
  rolePermissions?: RolePermission[];
  systemSettings?: SystemSettings;
  adminProfile?: AuthUser;
  auditLogs?: AuditLogEntry[];
  staffAlerts?: ActionAlertItem[];
  shifts?: ShiftConfig[];
}

/**
 * Fetch initial full snapshot from Supabase PostgreSQL
 */
export async function fetchInitialSupabaseData(): Promise<SupabaseSystemData | null> {
  try {
    const result: SupabaseSystemData = {};

    // 1. Fetch app_state items
    const { data: stateRows, error: stateErr } = await supabase
      .from('app_state')
      .select('key, value');

    if (!stateErr && Array.isArray(stateRows)) {
      stateRows.forEach((row) => {
        if (row && row.key && row.value !== undefined) {
          (result as any)[row.key] = row.value;
        }
      });
    }

    // 2. Fetch latest attendance records (up to 200)
    const { data: punchRows, error: punchErr } = await supabase
      .from('attendance_records')
      .select('record')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!punchErr && Array.isArray(punchRows)) {
      result.attendanceRecords = punchRows
        .map((r) => r.record)
        .filter((r) => r && r.id);
    }

    // 3. Fetch latest staff alerts (up to 50)
    const { data: alertRows, error: alertErr } = await supabase
      .from('staff_alerts')
      .select('alert')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!alertErr && Array.isArray(alertRows)) {
      result.staffAlerts = alertRows
        .map((a) => a.alert)
        .filter((a) => a && a.id);
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

    // 1. Persist to Postgres
    const { error } = await supabase.from('attendance_records').upsert({
      id: record.id,
      record: record,
      created_at: record.timestamp ? new Date(record.timestamp).toISOString() : new Date().toISOString(),
    });

    if (error) {
      console.warn('[Supabase] Punch insert warning:', error.message);
    }

    // 2. Broadcast immediately over Realtime channel
    broadcastSupabaseEvent('PUNCH_ATTENDANCE', { record });
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

    const { error } = await supabase.from('staff_alerts').upsert({
      id: alert.id,
      alert: alert,
      created_at: new Date(alert.rawTimestamp || Date.now()).toISOString(),
    });

    if (error) {
      console.warn('[Supabase] Alert insert warning:', error.message);
    }

    broadcastSupabaseEvent('ACTION_ALERT', { alert });
    return true;
  } catch (err) {
    console.warn('[Supabase] Error saving alert:', err);
    return false;
  }
}

/**
 * Direct save for updated employee (e.g. profile edit, avatar upload)
 */
export async function saveEmployeeToSupabase(employee: Employee, allEmployees?: Employee[]): Promise<boolean> {
  try {
    if (!employee || !employee.id) return false;

    if (allEmployees && Array.isArray(allEmployees)) {
      await supabase.from('app_state').upsert({
        key: 'employees',
        value: allEmployees,
        updated_at: new Date().toISOString(),
      });
    }

    broadcastSupabaseEvent('UPDATE_EMPLOYEE', employee);
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
        await supabase.from('app_state').upsert({
          key: k,
          value: val,
          updated_at: new Date().toISOString(),
        });
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing state:', err);
    return false;
  }
}

// ==========================================
// Realtime Broadcast Channel (Sub-50ms latency across any device on Vercel)
// ==========================================
let liveChannel: any = null;
const liveListeners = new Set<(event: string, payload: any) => void>();

function getOrCreateChannel() {
  if (!liveChannel) {
    liveChannel = supabase.channel('ams_live_feed', {
      config: { broadcast: { ack: false } },
    });

    liveChannel
      .on('broadcast', { event: '*' }, ({ event, payload }: any) => {
        liveListeners.forEach((fn) => {
          try {
            fn(event, payload);
          } catch (e) {
            console.warn('[Supabase] Listener error:', e);
          }
        });
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Supabase Realtime] Connected and listening on channel "ams_live_feed"');
        }
      });
  }
  return liveChannel;
}

export function broadcastSupabaseEvent(event: string, payload: any) {
  try {
    const ch = getOrCreateChannel();
    ch.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch (err) {
    console.warn('[Supabase] Broadcast send error:', err);
  }
}

export function subscribeToSupabaseRealtime(callback: (event: string, payload: any) => void): () => void {
  getOrCreateChannel();
  liveListeners.add(callback);
  return () => {
    liveListeners.delete(callback);
  };
}
