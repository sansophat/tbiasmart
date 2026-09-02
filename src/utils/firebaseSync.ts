import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
export const firebaseApp = !getApps().length 
  ? initializeApp(firebaseConfig) 
  : getApp();

// Initialize Firestore
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');

const APP_DATA_DOC = 'app_state_v1';
const MAIN_COLLECTION = 'attendance_system';

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

/**
 * Subscribe to real-time database state across all users and devices
 */
export function subscribeToCloudDatabase(onUpdate: (data: CloudSystemState) => void) {
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as CloudSystemState);
      }
    }, (error) => {
      console.warn('Firestore real-time sync subscription error:', error);
    });
  } catch (error) {
    console.warn('Failed to subscribe to Firestore:', error);
    return () => {};
  }
}

/**
 * Push updated system data to Firestore Cloud Database
 */
export async function syncStateToCloudDatabase(data: Partial<CloudSystemState>) {
  try {
    const docRef = doc(db, MAIN_COLLECTION, APP_DATA_DOC);
    await setDoc(docRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving state to Firestore cloud:', error);
    return false;
  }
}

/**
 * Fetch initial cloud state once
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
