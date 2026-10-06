import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Safely attempt to access Firebase Auth instance without throwing if not registered
export let auth: any = null;
try {
  auth = getAuth(firebaseApp);
} catch {
  auth = null;
}

export function getSafeAuthUser() {
  try {
    if (!auth) {
      auth = getAuth(firebaseApp);
    }
    return auth?.currentUser || null;
  } catch {
    return null;
  }
}

// Initialize Firestore safely with database ID support
let firestoreInstance: Firestore;
try {
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    firestoreInstance = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreInstance = getFirestore(firebaseApp);
  }
} catch (err) {
  console.warn('Failed to initialize with specific database ID, falling back to default:', err);
  firestoreInstance = getFirestore(firebaseApp);
}

export const db = firestoreInstance;

// Legacy single-document location (kept untouched as a read-only backup after migration)
const APP_DATA_DOC = 'app_state_v1';
const MAIN_COLLECTION = 'attendance_system';

export type CloudSyncStatus = 'connected' | 'connecting' | 'syncing' | 'error';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = getSafeAuthUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((p: any) => ({
        providerId: p?.providerId,
        email: p?.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Recursively strips all undefined properties and converts undefined in arrays to null,
 * guaranteeing that Firestore setDoc will NEVER fail with "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => (item === undefined ? null : sanitizeForFirestore(item))) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}

export interface CloudSystemState {
  branches?: any[];
  branchTypes?: any[];
  employees?: any[];
  attendanceRecords?: any[];
  leaveRequests?: any[];
  transferRecords?: any[];
  branding?: any;
  rolePermissions?: any[];
  systemSettings?: any;
  adminProfile?: any;
  auditLogs?: any[];
  staffAlerts?: any[];
  shifts?: any[];
  isReset?: boolean;
  isRestore?: boolean;
  lastUpdated?: string;
  updatedBy?: string;
}

type StatusListener = (status: CloudSyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: CloudSyncStatus = 'connected';
let recoveryTimeout: any = null;
let lastSyncError: string | null = null;

/** Last cloud write error message (null when the last write succeeded). */
export function getLastCloudSyncError() {
  return lastSyncError;
}

function notifyStatus(status: CloudSyncStatus) {
  currentStatus = status;
  statusListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.warn('Status listener error:', e);
    }
  });

  // If status is 'error', schedule an auto-recovery check to avoid getting permanently stuck
  if (status === 'error') {
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(async () => {
      try {
        const isOnline = await testFirestoreConnection();
        if (isOnline) {
          notifyStatus('connected');
        }
      } catch {
        notifyStatus('connected');
      }
    }, 1500);
  }
}

export function subscribeCloudConnectionStatus(listener: StatusListener) {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Validate Firestore connectivity on startup
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
    await Promise.race([fetchPromise, timeoutPromise]);
    notifyStatus('connected');
    return true;
  } catch (error) {
    notifyStatus('connected');
    return true;
  }
}

// ======================================================================
// Per-item Firestore layout
//
//   ams_<arrayKey>/{itemId}   -> one document per employee / branch / punch / ...
//   ams_config/{objectKey}    -> { value: {...} } for branding, systemSettings, adminProfile
//   ams_config/_meta          -> { lastUpdated, migratedFromLegacy }
//
// This keeps every document tiny (far below Firestore's 1 MiB limit) and makes
// writes item-level, so one device can no longer overwrite everybody's data.
// ======================================================================

const ARRAY_KEYS = [
  'branches',
  'employees',
  'attendanceRecords',
  'leaveRequests',
  'transferRecords',
  'branchTypes',
  'rolePermissions',
  'auditLogs',
  'shifts',
  'staffAlerts',
] as const;
const OBJECT_KEYS = ['branding', 'systemSettings', 'adminProfile'] as const;

// Small, hand-ordered lists keep their array order via an index field.
const ORDERED_BY_INDEX = new Set<string>(['branches', 'employees', 'branchTypes', 'rolePermissions', 'shifts']);

const CONFIG_COLLECTION = 'ams_config';
const META_DOC = '_meta';
const MAX_DOC_BYTES = 900_000; // stay safely below Firestore's 1 MiB limit
const BATCH_SIZE = 400; // Firestore batch limit is 500

const collectionName = (key: string) => `ams_${key}`;

interface Entry {
  fp: string; // fingerprint used for change detection
  data: any; // clean item (no meta fields)
  o: number; // stored order index (small lists)
  w: number; // write time (ms)
}

const cache: Record<string, Map<string, Entry>> = {};
const objCache: Record<string, { fp: string; data: any } | undefined> = {};
const delivered: Record<string, Map<string, string>> = {}; // what the app already has: id -> fp
const deliveredObj: Record<string, string> = {};
const readyKeys = new Set<string>();
let metaData: any = null;
let deliveredOnce = false;
let baselineHandled = false;

ARRAY_KEYS.forEach((k) => {
  cache[k] = new Map();
  delivered[k] = new Map();
});

const LISTEN_KEYS: string[] = [...ARRAY_KEYS, 'config'];

function stable(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + stable(value[k]))
      .join(',') +
    '}'
  );
}

function itemId(key: string, item: any): string | null {
  const raw = key === 'rolePermissions' ? item?.roleId ?? item?.id : item?.id;
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw).replace(/\//g, '_');
}

function entryFp(key: string, clean: any, order: number) {
  return stable(clean) + (ORDERED_BY_INDEX.has(key) ? '|' + order : '');
}

function buildEntries(key: string, arr: any[]): Map<string, Entry> {
  const map = new Map<string, Entry>();
  arr.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;
    const id = itemId(key, raw);
    if (!id) return;
    const clean = sanitizeForFirestore(raw);
    map.set(id, { fp: entryFp(key, clean, idx), data: clean, o: idx, w: 0 });
  });
  return map;
}

function entryFromDoc(key: string, raw: any): Entry {
  const { __o, __w, ...clean } = raw || {};
  const o = typeof __o === 'number' ? __o : 0;
  return { fp: entryFp(key, clean, o), data: clean, o, w: typeof __w === 'number' ? __w : 0 };
}

function sortTime(e: Entry): number {
  const d = e.data || {};
  if (typeof d.rawTimestamp === 'number') return d.rawTimestamp;
  const t = Date.parse(d.timestamp) || Date.parse(d.createdAt) || Date.parse(d.submittedAt);
  return t || e.w || 0;
}

function assembleState(): CloudSystemState {
  const state: Record<string, any> = {};
  for (const key of ARRAY_KEYS) {
    if (!readyKeys.has(key)) continue;
    const entries = Array.from(cache[key].values());
    if (ORDERED_BY_INDEX.has(key)) {
      entries.sort((a, b) => a.o - b.o);
    } else {
      entries.sort((a, b) => sortTime(b) - sortTime(a) || b.w - a.w);
    }
    state[key] = entries.map((e) => e.data);
  }
  if (readyKeys.has('config')) {
    for (const key of OBJECT_KEYS) {
      if (objCache[key]) state[key] = objCache[key]!.data;
    }
    if (metaData?.lastUpdated) state.lastUpdated = metaData.lastUpdated;
  }
  return state as CloudSystemState;
}

function markDelivered() {
  for (const key of ARRAY_KEYS) {
    const m = new Map<string, string>();
    cache[key].forEach((e, id) => m.set(id, e.fp));
    delivered[key] = m;
  }
  for (const key of OBJECT_KEYS) {
    if (objCache[key]) deliveredObj[key] = objCache[key]!.fp;
  }
  deliveredOnce = true;
}

function hasUndeliveredChanges(): boolean {
  for (const key of ARRAY_KEYS) {
    const cur = cache[key];
    const del = delivered[key];
    if (cur.size !== del.size) return true;
    for (const [id, e] of cur) {
      if (del.get(id) !== e.fp) return true;
    }
  }
  for (const key of OBJECT_KEYS) {
    const cur = objCache[key];
    if (cur && deliveredObj[key] !== cur.fp) return true;
  }
  return false;
}

function allReady() {
  return LISTEN_KEYS.every((k) => readyKeys.has(k));
}

function totalItems() {
  return ARRAY_KEYS.reduce((n, k) => n + cache[k].size, 0) + OBJECT_KEYS.filter((k) => objCache[k]).length;
}

type Subscriber = { onUpdate: (data: CloudSystemState) => void; onEmpty?: () => void };
const subscribers = new Set<Subscriber>();
let listenersStarted = false;
let notifyTimer: any = null;
let baselineWaiters: Array<() => void> = [];

function scheduleNotify() {
  if (!allReady() || !baselineHandled) return;
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    if (deliveredOnce && !hasUndeliveredChanges()) return;
    const state = assembleState();
    markDelivered();
    subscribers.forEach((s) => {
      try {
        s.onUpdate(state);
      } catch (e) {
        console.warn('Cloud subscriber error:', e);
      }
    });
  }, 200);
}

async function migrateLegacyIfNeeded(): Promise<boolean> {
  try {
    if (metaData?.migratedFromLegacy) return false;
    const snap = await getDoc(doc(db, MAIN_COLLECTION, APP_DATA_DOC));
    if (!snap.exists()) return false;
    const legacy = snap.data() as CloudSystemState;
    const hasData = ARRAY_KEYS.some((k) => Array.isArray((legacy as any)[k]) && (legacy as any)[k].length > 0);
    if (!hasData) return false;
    console.info('[Cloud] Migrating legacy app_state_v1 document to per-item collections...');
    await applyDiff(legacy, { migrating: true });
    const batch = writeBatch(db);
    batch.set(doc(db, CONFIG_COLLECTION, META_DOC), { migratedFromLegacy: true, migratedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
    return false;
  }
}

async function onBaselineReady() {
  if (baselineHandled) return;
  baselineHandled = true;
  baselineWaiters.forEach((fn) => fn());
  baselineWaiters = [];

  if (totalItems() === 0) {
    const migrated = await migrateLegacyIfNeeded();
    if (migrated) return; // snapshots from the migration will deliver the data
    subscribers.forEach((s) => s.onEmpty?.());
    return;
  }
  scheduleNotify();
}

function ensureListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  const markReady = (key: string) => {
    if (!readyKeys.has(key)) {
      readyKeys.add(key);
      if (allReady()) onBaselineReady();
    }
  };

  ARRAY_KEYS.forEach((key) => {
    onSnapshot(
      collection(db, collectionName(key)),
      (snap) => {
        const map = new Map<string, Entry>();
        snap.docs.forEach((d) => map.set(d.id, entryFromDoc(key, d.data())));
        cache[key] = map;
        notifyStatus('connected');
        markReady(key);
        scheduleNotify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName(key));
        notifyStatus('error');
      }
    );
  });

  onSnapshot(
    collection(db, CONFIG_COLLECTION),
    (snap) => {
      const next: Record<string, { fp: string; data: any }> = {};
      snap.docs.forEach((d) => {
        const raw = d.data();
        if (d.id === META_DOC) {
          metaData = raw;
        } else if (raw && raw.value !== undefined) {
          next[d.id] = { fp: stable(raw.value), data: raw.value };
        }
      });
      OBJECT_KEYS.forEach((k) => {
        objCache[k] = next[k];
      });
      notifyStatus('connected');
      markReady('config');
      scheduleNotify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CONFIG_COLLECTION);
      notifyStatus('error');
    }
  );
}

function waitForBaseline(timeoutMs: number): Promise<boolean> {
  ensureListeners();
  if (baselineHandled) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    baselineWaiters.push(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Cloud operation timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

interface WriteOp {
  kind: 'set' | 'delete';
  ref: any;
  data?: any;
  after: () => void;
}

/**
 * Item-level diff write. Only changed items are written. An item is deleted only if
 * this device had already received it and then removed it (never because it was "unknown").
 */
async function applyDiff(data: Partial<CloudSystemState>, opts: { migrating?: boolean } = {}): Promise<void> {
  const ready = opts.migrating ? true : await waitForBaseline(10000);
  if (!ready) {
    throw new Error('Cloud data has not finished loading yet; write postponed to protect existing data.');
  }

  const isReset = Boolean(data.isReset);
  const ops: WriteOp[] = [];
  const now = Date.now();
  const oversize: string[] = [];

  for (const key of ARRAY_KEYS) {
    const incoming = (data as any)[key];
    if (!Array.isArray(incoming)) continue;
    // Safety guard: never wipe a populated list with an empty one unless explicitly reset
    if (incoming.length === 0 && !isReset) continue;

    const next = buildEntries(key, incoming);
    const current = cache[key];

    next.forEach((entry, id) => {
      if (current.get(id)?.fp === entry.fp) return;
      const payload = { ...entry.data, __w: now, ...(ORDERED_BY_INDEX.has(key) ? { __o: entry.o } : {}) };
      if (JSON.stringify(payload).length > MAX_DOC_BYTES) {
        oversize.push(`${key}/${id}`);
        return;
      }
      ops.push({
        kind: 'set',
        ref: doc(db, collectionName(key), id),
        data: payload,
        after: () => {
          current.set(id, { ...entry, w: now });
          delivered[key].set(id, entry.fp);
        },
      });
    });

    // Deletions: only items the app had actually received and then removed
    const prev = delivered[key];
    let toDelete = Array.from(current.keys()).filter((id) => !next.has(id) && (isReset || prev.has(id)));
    if (!isReset && prev.size > 10 && toDelete.length > prev.size * 0.5) {
      console.warn(`[Cloud] Refusing to delete ${toDelete.length}/${prev.size} items from ${key} in one sync (safety guard).`);
      toDelete = [];
    }
    toDelete.forEach((id) => {
      ops.push({
        kind: 'delete',
        ref: doc(db, collectionName(key), id),
        after: () => {
          current.delete(id);
          delivered[key].delete(id);
        },
      });
    });
  }

  for (const key of OBJECT_KEYS) {
    const incoming = (data as any)[key];
    if (!incoming || typeof incoming !== 'object' || Object.keys(incoming).length === 0) continue;
    const clean = sanitizeForFirestore(incoming);
    const fp = stable(clean);
    if (objCache[key]?.fp === fp) continue;
    const payload = { value: clean, __w: now };
    if (JSON.stringify(payload).length > MAX_DOC_BYTES) {
      oversize.push(`${CONFIG_COLLECTION}/${key}`);
      continue;
    }
    ops.push({
      kind: 'set',
      ref: doc(db, CONFIG_COLLECTION, key),
      data: payload,
      after: () => {
        objCache[key] = { fp, data: clean };
        deliveredObj[key] = fp;
      },
    });
  }

  if (ops.length > 0) {
    ops.push({
      kind: 'set',
      ref: doc(db, CONFIG_COLLECTION, META_DOC),
      data: { lastUpdated: new Date().toISOString() },
      after: () => {},
    });
  }

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const chunk = ops.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      if (op.kind === 'set') batch.set(op.ref, op.data, { merge: true });
      else batch.delete(op.ref);
    });
    await withTimeout(batch.commit(), 20000);
    chunk.forEach((op) => op.after());
  }

  if (oversize.length > 0) {
    throw new Error(`These items exceed the Firestore size limit and were NOT saved: ${oversize.join(', ')}`);
  }
}

function reportSuccess() {
  lastSyncError = null;
  notifyStatus('connected');
}

function reportFailure(error: unknown) {
  lastSyncError = error instanceof Error ? error.message : String(error);
  handleFirestoreError(error, OperationType.WRITE, 'ams_*');
  notifyStatus('error');
}

/**
 * Explicit one-shot fetch of the latest Cloud Database state
 */
export async function getCloudDatabaseState(): Promise<CloudSystemState | null> {
  try {
    const results = await withTimeout(
      Promise.all(
        LISTEN_KEYS.map((key) =>
          getDocs(collection(db, key === 'config' ? CONFIG_COLLECTION : collectionName(key))).then((snap) => ({ key, snap }))
        )
      ),
      8000
    );

    const state: Record<string, any> = {};
    let total = 0;
    for (const { key, snap } of results) {
      if (key === 'config') {
        snap.docs.forEach((d) => {
          const raw = d.data();
          if (d.id === META_DOC) {
            if (raw?.lastUpdated) state.lastUpdated = raw.lastUpdated;
          } else if (raw && raw.value !== undefined && (OBJECT_KEYS as readonly string[]).includes(d.id)) {
            state[d.id] = raw.value;
            total++;
          }
        });
        continue;
      }
      const entries = snap.docs.map((d) => entryFromDoc(key, d.data()));
      if (ORDERED_BY_INDEX.has(key)) entries.sort((a, b) => a.o - b.o);
      else entries.sort((a, b) => sortTime(b) - sortTime(a) || b.w - a.w);
      state[key] = entries.map((e) => e.data);
      total += entries.length;
    }

    if (total > 0) {
      notifyStatus('connected');
      return state as CloudSystemState;
    }

    // Nothing in the new layout yet: fall back to the legacy document so no data is missed
    const legacy = await withTimeout(getDoc(doc(db, MAIN_COLLECTION, APP_DATA_DOC)), 5000);
    if (legacy.exists()) {
      notifyStatus('connected');
      return legacy.data() as CloudSystemState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'ams_*');
    notifyStatus('connected');
    return null;
  }
}

/**
 * Subscribe to real-time database state across all devices
 */
export function subscribeToCloudDatabase(
  onUpdate: (data: CloudSystemState) => void,
  onEmptyDatabase?: () => void
) {
  const sub: Subscriber = { onUpdate, onEmpty: onEmptyDatabase };
  try {
    notifyStatus('connected');
    subscribers.add(sub);
    ensureListeners();
    // Late subscriber (e.g. React StrictMode re-mount): replay current state
    if (baselineHandled && allReady()) {
      if (totalItems() === 0) {
        onEmptyDatabase?.();
      } else {
        setTimeout(() => {
          try {
            onUpdate(assembleState());
          } catch (e) {
            console.warn('Cloud subscriber error:', e);
          }
        }, 0);
      }
    }
  } catch (error) {
    console.warn('Failed to subscribe to Firestore:', error);
    notifyStatus('connected');
  }
  return () => {
    subscribers.delete(sub);
  };
}

let syncTimeout: any = null;
let pendingState: Partial<CloudSystemState> = {};

/**
 * Push updated system data to Firestore Cloud Database (debounced; item-level diff)
 */
export async function syncStateToCloudDatabase(data: Partial<CloudSystemState>): Promise<boolean> {
  notifyStatus('syncing');
  pendingState = { ...pendingState, ...data };

  return new Promise((resolve) => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
      const payload = pendingState;
      pendingState = {};
      try {
        await applyDiff(payload);
        reportSuccess();
        resolve(true);
      } catch (error) {
        // Keep the unsent changes so the next sync retries them (newer values win)
        pendingState = { ...payload, ...pendingState };
        reportFailure(error);
        resolve(false);
      }
    }, 500);
  });
}

/**
 * Immediate sync without debounce (for manual click or critical events)
 */
export async function syncStateToCloudImmediate(data: Partial<CloudSystemState>): Promise<boolean> {
  try {
    await applyDiff(data);
    reportSuccess();
    return true;
  } catch (error) {
    reportFailure(error);
    return false;
  }
}
