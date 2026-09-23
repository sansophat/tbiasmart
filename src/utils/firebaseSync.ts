import { initializeApp, getApps, getApp } from 'firebase/app';
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
  auditLogs?: any[];
  lastUpdated?: string;
  updatedBy?: string;
}

type StatusListener = (status: CloudSyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: CloudSyncStatus = 'connecting';

function notifyStatus(status: CloudSyncStatus) {
  currentStatus = status;
  statusListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.warn('Status listener error:', e);
    }
  });
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
    const testDoc = doc(db, MAIN_COLLECTION, 'connection_test');
    await getDocFromServer(testDoc);
    notifyStatus('connected');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline.');
      notifyStatus('error');
      return false;
    }
    // Any response from server (even "not found") means server is reachable
    notifyStatus('connected');
    return true;
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
          // Document does not exist in Cloud yet
          console.info('Firestore app_state_v1 is empty, ready for initial seed.');
          if (onEmptyDatabase) {
            onEmptyDatabase();
          }
        }
      },
      (error) => {
        console.error('Firestore real-time sync subscription error:', error);
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
  pendingState = { ...pendingState, ...data };

  return new Promise((resolve) => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
      try {
        const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
        const payload = {
          ...pendingState,
          lastUpdated: new Date().toISOString()
        };
        pendingState = {};
        await setDoc(docRef, payload, { merge: true });
        notifyStatus('connected');
        resolve(true);
      } catch (error) {
        console.error('Error saving state to Firestore cloud:', error);
        notifyStatus('error');
        resolve(false);
      }
    }, 400);
  });
}

/**
 * Immediate sync without debounce (for manual click or important events)
 */
export async function syncStateToCloudImmediate(data: Partial<CloudSystemState>): Promise<boolean> {
  notifyStatus('syncing');
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    await setDoc(docRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    notifyStatus('connected');
    return true;
  } catch (error) {
    console.error('Error in syncStateToCloudImmediate:', error);
    notifyStatus('error');
    return false;
  }
}

/**
 * Fetch cloud state once
 */
export async function getCloudDatabaseState(): Promise<CloudSystemState | null> {
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CloudSystemState;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching Firestore state:', error);
    return null;
  }
}
