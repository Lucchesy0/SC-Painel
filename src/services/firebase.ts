import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
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
import { SC, Equipment, CloudSyncStatus, UserProfile, UserPermissions, ResponsibilityTerm } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with force long polling enabled to prevent WebSocket connection drops in iframes/sandboxes
export const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    )
  : initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });

export const auth = getAuth(app);

// Firestore Collection Names
export const SCS_COLLECTION = 'scs';
export const EQUIPMENTS_COLLECTION = 'equipments';
export const SETTINGS_COLLECTION = 'system_settings';
export const USERS_COLLECTION = 'users';
export const RESPONSIBILITY_TERMS_COLLECTION = 'responsibility_terms';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Deeply sanitizes an object/array removing any `undefined` values so Firestore setDoc never fails
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const sanitized = sanitizeForFirestore(value);
      if (sanitized !== undefined) {
        cleanObj[key] = sanitized;
      }
    }
  }
  return cleanObj as T;
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
 * Validate connection to Firestore using getDoc with timeout and graceful offline fallback
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    setCloudSyncStatus('syncing');
    await Promise.race([
      getDoc(doc(db, 'system_settings', 'healthcheck')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('connection_timeout')), 6000)),
    ]);
    setCloudSyncStatus('connected');
    return true;
  } catch (error: any) {
    const isOfflineOrUnavailable =
      error?.code === 'unavailable' ||
      (error instanceof Error &&
        (error.message.includes('unavailable') ||
          error.message.includes('offline') ||
          error.message.includes('could not be completed') ||
          error.message.includes('connection_timeout')));

    if (isOfflineOrUnavailable) {
      console.warn('Firestore em modo de sincronização/cache local enquanto conecta ao backend.');
      setCloudSyncStatus('offline');
      return false;
    }
    // Any permission or existing document response still proves endpoint connectivity
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
        const seenIds = new Set<string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SC;
          const id = docSnap.id || data.id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            list.push({ ...data, id });
          }
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
    const seenIds = new Set<string>();
    snap.forEach((docSnap) => {
      const data = docSnap.data() as SC;
      const id = docSnap.id || data.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        list.push({ ...data, id });
      }
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
    const cleanData = sanitizeForFirestore(sc);
    await setDoc(docRef, cleanData, { merge: true });
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
        batch.set(docRef, sanitizeForFirestore(sc), { merge: true });
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
    await setDoc(docRef, sanitizeForFirestore(eq), { merge: true });
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
      batch.set(docRef, sanitizeForFirestore(eq), { merge: true });
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
    await setDoc(docRef, sanitizeForFirestore({ key, value, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${key}`);
  }
}

/**
 * Normaliza e protege o perfil do usuário lido do Firestore para garantir integridade
 */
function normalizeFirestoreUserProfile(raw: any, docId: string): UserProfile {
  const nomeRaw = raw?.nome || raw?.name || raw?.displayName || (raw?.email ? raw.email.split('@')[0] : '');
  const nome = (typeof nomeRaw === 'string' && nomeRaw.trim().length > 0) ? nomeRaw.trim() : (docId === 'usr-admin' ? 'Luchesy (Admin)' : 'Colaborador');
  const email = (raw?.email && typeof raw.email === 'string') ? raw.email.trim() : `${docId}@mcm.com.br`;
  const departamento = (raw?.departamento && typeof raw.departamento === 'string') ? raw.departamento : 'Geral';
  const role = (raw?.role && typeof raw.role === 'string') ? raw.role : (docId === 'usr-admin' ? 'admin' : 'colaborador');
  const cargo = (raw?.cargo && typeof raw.cargo === 'string') ? raw.cargo : (role === 'admin' ? 'Administrador Geral' : 'Colaborador');

  const rawPerms = raw?.permissions || {};
  const isAdmin = (role === 'admin' || docId === 'usr-admin');
  const isKiosk = (role === 'kiosk' || raw?.isKiosk === true || docId === 'usr-quiosque');

  const canAccessSC = rawPerms.canAccessSC !== undefined ? Boolean(rawPerms.canAccessSC) : (raw?.canAccessSC !== undefined ? Boolean(raw.canAccessSC) : true);
  const canAccessInventario = rawPerms.canAccessInventario !== undefined ? Boolean(rawPerms.canAccessInventario) : (raw?.canAccessInventario !== undefined ? Boolean(raw.canAccessInventario) : (isKiosk ? false : isAdmin));
  const canAccessTermos = rawPerms.canAccessTermos !== undefined ? Boolean(rawPerms.canAccessTermos) : (raw?.canAccessTermos !== undefined ? Boolean(raw.canAccessTermos) : (isKiosk ? false : isAdmin));
  const canManageTermos = rawPerms.canManageTermos !== undefined ? Boolean(rawPerms.canManageTermos) : (raw?.canManageTermos !== undefined ? Boolean(raw.canManageTermos) : isAdmin);
  const canAccessAnalytics = rawPerms.canAccessAnalytics !== undefined ? Boolean(rawPerms.canAccessAnalytics) : (raw?.canAccessAnalytics !== undefined ? Boolean(raw.canAccessAnalytics) : isAdmin);
  const canAccessAdmin = rawPerms.canAccessAdmin !== undefined ? Boolean(rawPerms.canAccessAdmin) : (raw?.canAccessAdmin !== undefined ? Boolean(raw.canAccessAdmin) : isAdmin);
  const canManageUsers = rawPerms.canManageUsers !== undefined ? Boolean(rawPerms.canManageUsers) : (raw?.canManageUsers !== undefined ? Boolean(raw.canManageUsers) : isAdmin);

  const permissions: UserPermissions = {
    canAccessSC,
    canAccessInventario,
    canAccessTermos,
    canManageTermos,
    canAccessAnalytics,
    canAccessAdmin,
    canManageUsers,
    canCreateSC: rawPerms.canCreateSC !== undefined ? Boolean(rawPerms.canCreateSC) : !isKiosk,
    canEditSC: rawPerms.canEditSC !== undefined ? Boolean(rawPerms.canEditSC) : !isKiosk,
    canDeleteSC: rawPerms.canDeleteSC !== undefined ? Boolean(rawPerms.canDeleteSC) : isAdmin,
    canManageEquipments: rawPerms.canManageEquipments !== undefined ? Boolean(rawPerms.canManageEquipments) : isAdmin,
    canExportReports: rawPerms.canExportReports !== undefined ? Boolean(rawPerms.canExportReports) : !isKiosk,
    canImportData: rawPerms.canImportData !== undefined ? Boolean(rawPerms.canImportData) : isAdmin,
  };

  return {
    ...raw,
    id: docId,
    nome,
    email,
    cargo,
    role,
    departamento,
    avatarColor: raw?.avatarColor || 'bg-slate-700',
    permissions,
    canAccessSC,
    canAccessInventario,
    canAccessTermos,
    canManageTermos,
    canAccessAnalytics,
    canAccessAdmin,
    canManageUsers,
  };
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
          list.push(normalizeFirestoreUserProfile(docSnap.data(), docSnap.id));
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
      list.push(normalizeFirestoreUserProfile(docSnap.data(), docSnap.id));
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
    await setDoc(docRef, sanitizeForFirestore(user), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COLLECTION}/${user.id}`);
    throw err;
  }
}

/**
 * Atualiza o status de presença (online/offline) e lastSeen sem sobrescrever os demais campos do usuário
 */
export async function updateUserPresenceInFirestore(userId: string, isOnline: boolean): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(
      docRef,
      {
        isOnline,
        lastSeen: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Silencioso em caso de oscilação transitória de rede
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
      batch.set(docRef, sanitizeForFirestore(u));
    });
    await batch.commit();
    return defaultUsers;
  } catch (err) {
    console.warn('Erro ao popular usuários iniciais no Firestore:', err);
    return defaultUsers;
  }
}

/**
 * Fetch all Responsibility Terms from Firestore
 */
export async function fetchAllTermsFromFirestore(): Promise<ResponsibilityTerm[]> {
  try {
    const termsRef = collection(db, RESPONSIBILITY_TERMS_COLLECTION);
    const snap = await getDocs(termsRef);
    const list: ResponsibilityTerm[] = [];
    snap.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as ResponsibilityTerm), id: docSnap.id });
    });
    // Sort descending by date
    list.sort((a, b) => new Date(b.dataEmissao || '').getTime() - new Date(a.dataEmissao || '').getTime());
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, RESPONSIBILITY_TERMS_COLLECTION);
    return [];
  }
}

/**
 * Save or update a Responsibility Term in Firestore
 */
export async function saveTermToFirestore(term: ResponsibilityTerm): Promise<void> {
  try {
    const docRef = doc(db, RESPONSIBILITY_TERMS_COLLECTION, term.id);
    await setDoc(docRef, sanitizeForFirestore(term), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${RESPONSIBILITY_TERMS_COLLECTION}/${term.id}`);
    throw err;
  }
}

/**
 * Delete a Responsibility Term from Firestore
 */
export async function deleteTermFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, RESPONSIBILITY_TERMS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${RESPONSIBILITY_TERMS_COLLECTION}/${id}`);
    throw err;
  }
}

/**
 * Real-time listener for Responsibility Terms collection
 */
export function subscribeToFirestoreTerms(
  onTermsUpdated: (terms: ResponsibilityTerm[]) => void
): Unsubscribe {
  try {
    const termsRef = collection(db, RESPONSIBILITY_TERMS_COLLECTION);
    return onSnapshot(
      termsRef,
      (snapshot) => {
        const list: ResponsibilityTerm[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as ResponsibilityTerm), id: docSnap.id });
        });
        list.sort((a, b) => new Date(b.dataEmissao || '').getTime() - new Date(a.dataEmissao || '').getTime());
        onTermsUpdated(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, RESPONSIBILITY_TERMS_COLLECTION);
      }
    );
  } catch (err) {
    console.error('Falha ao assinar termos de responsabilidade no Firestore:', err);
    return () => {};
  }
}


