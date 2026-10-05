import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  Firestore 
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

/**
 * Explicit one-shot fetch of the latest Cloud Database state
 */
export async function getCloudDatabaseState(): Promise<CloudSystemState | null> {
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
    
    const snap = await Promise.race([fetchPromise, timeoutPromise]);
    if (snap && 'exists' in snap && snap.exists()) {
      notifyStatus('connected');
      return snap.data() as CloudSystemState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
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
  try {
    notifyStatus('connected');
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        notifyStatus('connected');
        if (docSnap.exists()) {
          const data = docSnap.data() as CloudSystemState;
          onUpdate(data);
        } else {
          console.info('Firestore app_state_v1 is empty.');
          if (onEmptyDatabase) {
            onEmptyDatabase();
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
        notifyStatus('connected');
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Failed to subscribe to Firestore:', error);
    notifyStatus('connected');
    return () => {};
  }
}

let syncTimeout: any = null;
let pendingState: Partial<CloudSystemState> = {};

/**
 * Push updated system data to Firestore Cloud Database (with debounce to avoid quota limits)
 */
export async function syncStateToCloudDatabase(data: Partial<CloudSystemState>): Promise<boolean> {
  notifyStatus('syncing');
  const sanitizedInput = sanitizeForFirestore(data);
  pendingState = { ...pendingState, ...sanitizedInput };

  return new Promise((resolve) => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
      try {
        const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
        
        // Safety guard: Never wipe populated data arrays unless explicitly marked as isReset
        if (!pendingState.isReset) {
          if (pendingState.branches !== undefined && Array.isArray(pendingState.branches) && pendingState.branches.length === 0) {
            delete pendingState.branches;
          }
          if (pendingState.employees !== undefined && Array.isArray(pendingState.employees) && pendingState.employees.length === 0) {
            delete pendingState.employees;
          }
          if (pendingState.attendanceRecords !== undefined && Array.isArray(pendingState.attendanceRecords) && pendingState.attendanceRecords.length === 0) {
            delete pendingState.attendanceRecords;
          }
          if (pendingState.branchTypes !== undefined && Array.isArray(pendingState.branchTypes) && pendingState.branchTypes.length === 0) {
            delete pendingState.branchTypes;
          }
          if (pendingState.shifts !== undefined && Array.isArray(pendingState.shifts) && pendingState.shifts.length === 0) {
            delete pendingState.shifts;
          }
        }

        const payload = sanitizeForFirestore({
          ...pendingState,
          lastUpdated: new Date().toISOString()
        });
        pendingState = {};
        await setDoc(docRef, payload, { merge: true });
        notifyStatus('connected');
        resolve(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
        notifyStatus('connected');
        resolve(false);
      }
    }, 500);
  });
}

/**
 * Immediate sync without debounce (for manual click or critical events)
 */
export async function syncStateToCloudImmediate(data: Partial<CloudSystemState>): Promise<boolean> {
  notifyStatus('connected');
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    const cleanData = { ...data };

    // Safety guard: Never wipe populated data arrays unless explicitly marked as isReset
    if (!cleanData.isReset) {
      if (cleanData.branches !== undefined && Array.isArray(cleanData.branches) && cleanData.branches.length === 0) {
        delete cleanData.branches;
      }
      if (cleanData.employees !== undefined && Array.isArray(cleanData.employees) && cleanData.employees.length === 0) {
        delete cleanData.employees;
      }
      if (cleanData.attendanceRecords !== undefined && Array.isArray(cleanData.attendanceRecords) && cleanData.attendanceRecords.length === 0) {
        delete cleanData.attendanceRecords;
      }
      if (cleanData.branchTypes !== undefined && Array.isArray(cleanData.branchTypes) && cleanData.branchTypes.length === 0) {
        delete cleanData.branchTypes;
      }
      if (cleanData.shifts !== undefined && Array.isArray(cleanData.shifts) && cleanData.shifts.length === 0) {
        delete cleanData.shifts;
      }
    }

    const sanitizedPayload = sanitizeForFirestore({
      ...cleanData,
      lastUpdated: new Date().toISOString()
    });
    await setDoc(docRef, sanitizedPayload, { merge: true });
    notifyStatus('connected');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
    notifyStatus('connected');
    return false;
  }
}
