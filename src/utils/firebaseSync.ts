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
  lastUpdated?: string;
  updatedBy?: string;
}

type StatusListener = (status: CloudSyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: CloudSyncStatus = 'connecting';
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

  // If status is 'error' or 'connecting', schedule an auto-recovery check to avoid getting permanently stuck
  if (status === 'error') {
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(async () => {
      try {
        const isOnline = await testFirestoreConnection();
        if (isOnline) {
          notifyStatus('connected');
        }
      } catch {
        // Retry silently later
      }
    }, 2500);
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
    await getDocFromServer(docRef);
    notifyStatus('connected');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline.');
      notifyStatus('error');
      return false;
    }
    // If permission or server reachable but other non-offline error
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
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      notifyStatus('connected');
      return snap.data() as CloudSystemState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
    notifyStatus('error');
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
    notifyStatus('connecting');
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
        notifyStatus('error');
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Failed to subscribe to Firestore:', error);
    notifyStatus('error');
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
        
        // Safety guard: if pendingState branches is empty or missing, don't accidentally wipe existing branches
        if (pendingState.branches !== undefined && pendingState.branches.length === 0) {
          const currentDoc = await getDoc(docRef);
          if (currentDoc.exists()) {
            const currentBranches = currentDoc.data()?.branches;
            if (Array.isArray(currentBranches) && currentBranches.length > 0) {
              console.warn('Cloud sync guard: Protected cloud branches from accidental empty wipe.');
              delete pendingState.branches;
            }
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
        notifyStatus('error');
        resolve(false);
      }
    }, 500);
  });
}

/**
 * Immediate sync without debounce (for manual click or critical events)
 */
export async function syncStateToCloudImmediate(data: Partial<CloudSystemState>): Promise<boolean> {
  notifyStatus('syncing');
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    const sanitizedPayload = sanitizeForFirestore({
      ...data,
      lastUpdated: new Date().toISOString()
    });
    await setDoc(docRef, sanitizedPayload, { merge: true });
    notifyStatus('connected');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MAIN_COLLECTION}/${APP_DATA_DOC}`);
    notifyStatus('error');
    return false;
  }
}
