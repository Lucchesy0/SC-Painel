import { SC, Equipment } from '../types';

const DB_NAME = 'MCM_Industrial_DB';
const DB_VERSION = 3;
const STORE_NAME = 'solicitacoes';
const SETTINGS_STORE = 'settings';
const EQUIPMENT_STORE = 'equipamentos';
const CLEAN_RESET_KEY = 'mcm_db_clean_reset_v5';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('numero', 'numero', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('data', 'data', { unique: false });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(EQUIPMENT_STORE)) {
        const eqStore = db.createObjectStore(EQUIPMENT_STORE, { keyPath: 'id' });
        eqStore.createIndex('codigoPatrimonio', 'codigoPatrimonio', { unique: true });
        eqStore.createIndex('categoria', 'categoria', { unique: false });
        eqStore.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Garante que o banco seja iniciado totalmente limpo (sem dados de exemplo/treinamento)
let isCleanChecked = false;
async function ensureCleanOnce(db: IDBDatabase): Promise<void> {
  if (isCleanChecked) return;
  isCleanChecked = true;

  try {
    const isCleaned = localStorage.getItem(CLEAN_RESET_KEY);
    if (!isCleaned) {
      // Limpa os registros de teste/treino anteriores para entregar o banco 100% limpo
      const tx = db.transaction([STORE_NAME, EQUIPMENT_STORE], 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore(EQUIPMENT_STORE).clear();
      localStorage.setItem(CLEAN_RESET_KEY, 'true');
      localStorage.removeItem('mcm_sc_rm_seeded_v1');
      localStorage.removeItem('mcm_sc_data_v2');
      localStorage.removeItem('mcm_db_clean_reset_v4');
    }
  } catch (e) {
    console.error('Erro ao verificar/limpar banco:', e);
  }
}

export async function getAllSCsFromIDB(): Promise<SC[]> {
  try {
    const db = await openDB();
    await ensureCleanOnce(db);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as SC[];
        resolve(results || []);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Erro ao abrir IndexedDB:', err);
    return [];
  }
}

export async function saveSCToIDB(sc: SC): Promise<SC> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(sc);

    request.onsuccess = () => resolve(sc);
    request.onerror = () => reject(request.error);
  });
}

export async function bulkSaveSCsToIDB(scs: SC[]): Promise<number> {
  if (!scs || scs.length === 0) return 0;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const sc of scs) {
      store.put(sc);
    }

    tx.oncomplete = () => resolve(scs.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function replaceSCsInIDB(scs: SC[]): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.clear();
    for (const sc of scs) {
      store.put(sc);
    }

    tx.oncomplete = () => resolve(scs.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSCsFromIDB(): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSCFromIDB(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function clearIDB(): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, EQUIPMENT_STORE], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(EQUIPMENT_STORE).clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSettingFromIDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? (result.value as T) : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Erro ao buscar ${key} do IndexedDB:`, err);
    return null;
  }
}

export async function saveSettingToIDB<T>(key: string, value: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Erro ao salvar ${key} no IndexedDB:`, err);
    return value;
  }
}

export async function getAllEquipmentsFromIDB(): Promise<Equipment[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EQUIPMENT_STORE, 'readonly');
      const store = tx.objectStore(EQUIPMENT_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as Equipment[];
        resolve(results || []);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Erro ao buscar equipamentos do IndexedDB:', err);
    return [];
  }
}

export async function saveEquipmentToIDB(eq: Equipment): Promise<Equipment> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EQUIPMENT_STORE, 'readwrite');
    const store = tx.objectStore(EQUIPMENT_STORE);
    const request = store.put(eq);

    request.onsuccess = () => resolve(eq);
    request.onerror = () => reject(request.error);
  });
}

export async function replaceEquipmentsInIDB(equipments: Equipment[]): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EQUIPMENT_STORE, 'readwrite');
    const store = tx.objectStore(EQUIPMENT_STORE);

    store.clear();
    for (const eq of equipments) {
      store.put(eq);
    }

    tx.oncomplete = () => resolve(equipments.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function bulkSaveEquipmentsToIDB(equipments: Equipment[]): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EQUIPMENT_STORE, 'readwrite');
    const store = tx.objectStore(EQUIPMENT_STORE);

    for (const eq of equipments) {
      store.put(eq);
    }

    tx.oncomplete = () => resolve(equipments.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearEquipmentsFromIDB(): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EQUIPMENT_STORE, 'readwrite');
    const store = tx.objectStore(EQUIPMENT_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteEquipmentFromIDB(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EQUIPMENT_STORE, 'readwrite');
    const store = tx.objectStore(EQUIPMENT_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
