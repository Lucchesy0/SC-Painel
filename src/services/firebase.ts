import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SC, Equipment, CloudSyncStatus, UserProfile } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (using custom databaseId if configured)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Firestore Collection Names
export const SCS_COLLECTION = 'scs';
export const EQUIPMENTS_COLLECTION = 'equipments';
export const SETTINGS_COLLECTION = 'system_settings';
export const USERS_COLLECTION = 'users';

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

let syncStatusListeners: ((status: CloudSyncStatus) => void)[] = [];
let currentCloudStatus: CloudSyncStatus = 'offline';

export function setCloudSyncStatus(status: CloudSyncStatus) {
  currentCloudStatus = status;
  syncStatusListeners.forEach((fn) => fn(status));
}

export function subscribeToSyncStatus(listener: (status: CloudSyncStatus) => void): () => void {
  syncStatusListeners.push(listener);
  listener(currentCloudStatus);
  return () => {
    syncStatusListeners = syncStatusListeners.filter((fn) => fn !== listener);
  };
}

/**
 * Validate connection to Firestore using getDocFromServer as mandated by Firebase skill
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    setCloudSyncStatus('syncing');
    await getDocFromServer(doc(db, 'system_settings', 'healthcheck'));
    setCloudSyncStatus('connected');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore está offline ou sem conexão no momento.');
      setCloudSyncStatus('offline');
      return false;
    }
    // Any permission or other response still proves endpoint connectivity
    setCloudSyncStatus('connected');
    return true;
  }
}

/**
 * Real-time listener for all SCs in Firestore
 */
export function subscribeToFirestoreSCs(
  onData: (scs: SC[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    setCloudSyncStatus('syncing');
    const scsRef = collection(db, SCS_COLLECTION);
    const unsubscribe = onSnapshot(
      scsRef,
      (snapshot) => {
        const list: SC[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SC;
          list.push({ ...data, id: docSnap.id });
        });
        setCloudSyncStatus('connected');
        onData(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, SCS_COLLECTION);
        setCloudSyncStatus('error');
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SCS_COLLECTION);
    setCloudSyncStatus('error');
    return () => {};
  }
}

/**
 * Real-time listener for Equipments in Firestore
 */
export function subscribeToFirestoreEquipments(
  onData: (eqs: Equipment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const eqRef = collection(db, EQUIPMENTS_COLLECTION);
    const unsubscribe = onSnapshot(
      eqRef,
      (snapshot) => {
        const list: Equipment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Equipment;
          list.push({ ...data, id: docSnap.id });
        });
        onData(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, EQUIPMENTS_COLLECTION);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, EQUIPMENTS_COLLECTION);
    return () => {};
  }
}

/**
 * Real-time listener for System Settings in Firestore
 */
export function subscribeToFirestoreSettings(
  onData: (settings: Record<string, any>) => void
): Unsubscribe {
  try {
    const settingsRef = collection(db, SETTINGS_COLLECTION);
    return onSnapshot(
      settingsRef,
      (snapshot) => {
        const settings: Record<string, any> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          settings[docSnap.id] = data?.value ?? data;
        });
        onData(settings);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, SETTINGS_COLLECTION);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SETTINGS_COLLECTION);
    return () => {};
  }
}

/**
 * Fetch all SCs once from Firestore
 */
export async function fetchAllSCsFromFirestore(): Promise<SC[]> {
  try {
    setCloudSyncStatus('syncing');
    const scsRef = collection(db, SCS_COLLECTION);
    const snap = await getDocs(scsRef);
    const list: SC[] = [];
    snap.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as SC), id: docSnap.id });
    });
    setCloudSyncStatus('connected');
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, SCS_COLLECTION);
    setCloudSyncStatus('error');
    return [];
  }
}

/**
 * Get single SC from Firestore by ID
 */
export async function getSCFromFirestore(id: string): Promise<SC | null> {
  try {
    const docRef = doc(db, SCS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...(snap.data() as SC), id: snap.id };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SCS_COLLECTION}/${id}`);
    return null;
  }
}

/**
 * Save / Update a single SC in Firestore
 */
export async function saveSCToFirestore(sc: SC): Promise<void> {
  try {
    setCloudSyncStatus('syncing');
    const docRef = doc(db, SCS_COLLECTION, sc.id);
    await setDoc(docRef, sc, { merge: true });
    setCloudSyncStatus('connected');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SCS_COLLECTION}/${sc.id}`);
    setCloudSyncStatus('error');
    throw err;
  }
}

/**
 * Delete a single SC from Firestore
 */
export async function deleteSCFromFirestore(id: string): Promise<void> {
  try {
    setCloudSyncStatus('syncing');
    const docRef = doc(db, SCS_COLLECTION, id);
    await deleteDoc(docRef);
    setCloudSyncStatus('connected');
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${SCS_COLLECTION}/${id}`);
    setCloudSyncStatus('error');
    throw err;
  }
}

/**
 * Bulk upload SCs to Firestore using batches (handles chunks of 500)
 */
export async function bulkUploadSCsToFirestore(scs: SC[]): Promise<void> {
  if (!scs || scs.length === 0) return;
  try {
    setCloudSyncStatus('syncing');
    const chunkSize = 450;
    for (let i = 0; i < scs.length; i += chunkSize) {
      const chunk = scs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((sc) => {
        const docRef = doc(db, SCS_COLLECTION, sc.id);
        batch.set(docRef, sc, { merge: true });
      });
      await batch.commit();
    }
    setCloudSyncStatus('connected');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, SCS_COLLECTION);
    setCloudSyncStatus('error');
    throw err;
  }
}

/**
 * Clear all SCs from Firestore
 */
export async function clearSCsInFirestore(): Promise<void> {
  try {
    setCloudSyncStatus('syncing');
    const snap = await getDocs(collection(db, SCS_COLLECTION));
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    setCloudSyncStatus('connected');
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, SCS_COLLECTION);
    setCloudSyncStatus('error');
    throw err;
  }
}

/**
 * Fetch all Equipments from Firestore
 */
export async function fetchAllEquipmentsFromFirestore(): Promise<Equipment[]> {
  try {
    const eqRef = collection(db, EQUIPMENTS_COLLECTION);
    const snap = await getDocs(eqRef);
    const list: Equipment[] = [];
    snap.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as Equipment), id: docSnap.id });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, EQUIPMENTS_COLLECTION);
    return [];
  }
}

/**
 * Save / Update an equipment in Firestore
 */
export async function saveEquipmentToFirestore(eq: Equipment): Promise<void> {
  try {
    const docRef = doc(db, EQUIPMENTS_COLLECTION, eq.id);
    await setDoc(docRef, eq, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${EQUIPMENTS_COLLECTION}/${eq.id}`);
    throw err;
  }
}

/**
 * Delete an equipment from Firestore
 */
export async function deleteEquipmentFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, EQUIPMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${EQUIPMENTS_COLLECTION}/${id}`);
    throw err;
  }
}

/**
 * Bulk upload Equipments to Firestore
 */
export async function bulkUploadEquipmentsToFirestore(equipments: Equipment[]): Promise<void> {
  if (!equipments || equipments.length === 0) return;
  try {
    const batch = writeBatch(db);
    equipments.forEach((eq) => {
      const docRef = doc(db, EQUIPMENTS_COLLECTION, eq.id);
      batch.set(docRef, eq, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, EQUIPMENTS_COLLECTION);
    throw err;
  }
}

/**
 * Clear all Equipments from Firestore
 */
export async function clearEquipmentsInFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, EQUIPMENTS_COLLECTION));
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, EQUIPMENTS_COLLECTION);
    throw err;
  }
}

/**
 * Fetch setting from Firestore
 */
export async function fetchSettingFromFirestore<T>(key: string): Promise<T | null> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.value as T) ?? (data as T);
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/${key}`);
    return null;
  }
}

/**
 * Save setting to Firestore
 */
export async function saveSettingToFirestore<T>(key: string, value: T): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, key);
    await setDoc(docRef, { key, value, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${key}`);
  }
}

/**
 * Real-time listener for Team Users in Firestore
 */
export function subscribeToFirestoreUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      usersRef,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          list.push({ ...data, id: docSnap.id });
        });
        onData(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
    return () => {};
  }
}

/**
 * Fetch all Users from Firestore
 */
export async function fetchAllUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersRef);
    const list: UserProfile[] = [];
    snap.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as UserProfile), id: docSnap.id });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, USERS_COLLECTION);
    return [];
  }
}

/**
 * Save / Update a user in Firestore
 */
export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COLLECTION}/${user.id}`);
    throw err;
  }
}

/**
 * Delete a user from Firestore
 */
export async function deleteUserFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${USERS_COLLECTION}/${id}`);
    throw err;
  }
}

/**
 * Seed initial users if Firestore collection is empty
 */
export async function seedInitialUsersToFirestore(defaultUsers: UserProfile[]): Promise<UserProfile[]> {
  try {
    const existing = await fetchAllUsersFromFirestore();
    if (existing.length > 0) {
      return existing;
    }
    const batch = writeBatch(db);
    defaultUsers.forEach((u) => {
      const docRef = doc(db, USERS_COLLECTION, u.id);
      batch.set(docRef, u);
    });
    await batch.commit();
    return defaultUsers;
  } catch (err) {
    console.warn('Erro ao popular usuários iniciais no Firestore:', err);
    return defaultUsers;
  }
}

