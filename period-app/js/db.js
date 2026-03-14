/**
 * IndexedDB wrapper for period tracker.
 * Single module owns all database access.
 */

const DB_NAME = 'period-tracker';
const DB_VERSION = 1;
const STORE_PERIODS = 'periods';
const STORE_SETTINGS = 'settings';

let db = null;

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Open the database. Call once at app init.
 * @returns {Promise<IDBDatabase>}
 */
export async function open() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_PERIODS)) {
          const ps = database.createObjectStore(STORE_PERIODS, { keyPath: 'id' });
          ps.createIndex('startDate', 'startDate', { unique: false });
          ps.createIndex('syncedAt', 'syncedAt', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORE_SETTINGS)) {
          database.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Check if IndexedDB is available (excludes Safari private mode).
 * @returns {Promise<boolean>}
 */
export async function isAvailable() {
  try {
    const d = await open();
    return !!d;
  } catch {
    return false;
  }
}

/**
 * Get all period entries, sorted by startDate descending.
 * @returns {Promise<Array>}
 */
export async function getPeriods() {
  const database = await open();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PERIODS, 'readonly');
    const store = tx.objectStore(STORE_PERIODS);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const periods = request.result || [];
      periods.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      resolve(periods);
    };
  });
}

/**
 * Save or update a period entry.
 * @param {Object} entry
 * @returns {Promise<void>}
 */
export async function savePeriod(entry) {
  const full = {
    id: entry.id || generateId(),
    startDate: entry.startDate,
    endDate: entry.endDate ?? null,
    symptoms: Array.isArray(entry.symptoms) ? entry.symptoms : [],
    createdAt: entry.createdAt || Date.now(),
    updatedAt: Date.now(),
    syncedAt: entry.syncedAt ?? null,
  };
  const database = await open();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PERIODS, 'readwrite');
    const store = tx.objectStore(STORE_PERIODS);
    store.put(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a period entry by id.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePeriod(id) {
  const database = await open();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PERIODS, 'readwrite');
    tx.objectStore(STORE_PERIODS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get entries that need syncing (syncedAt < updatedAt or syncedAt is null).
 * @returns {Promise<Array>}
 */
export async function getUnsyncedPeriods() {
  const periods = await getPeriods();
  return periods.filter((p) => !p.syncedAt || (p.updatedAt && p.syncedAt < p.updatedAt));
}

/**
 * Mark an entry as synced.
 * @param {string} id
 * @param {number} syncedAt
 * @returns {Promise<void>}
 */
export async function markSynced(id, syncedAt) {
  const periods = await getPeriods();
  const entry = periods.find((p) => p.id === id);
  if (!entry) return;
  entry.syncedAt = syncedAt;
  await savePeriod(entry);
}

/**
 * Get settings.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  const database = await open();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(STORE_SETTINGS);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const rows = request.result || [];
      const out = {
        theme: 'neutral',
        palette: 'neutral',
        sheetUrl: null,
        notifyEnabled: false,
        notifyDays: 2,
        darkMode: 'auto',
      };
      for (const row of rows) {
        if (row.key && row.value !== undefined) out[row.key] = row.value;
      }
      resolve(out);
    };
  });
}

/**
 * Save a single setting.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function saveSetting(key, value) {
  const database = await open();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_SETTINGS, 'readwrite');
    tx.objectStore(STORE_SETTINGS).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save multiple settings.
 * @param {Object} obj
 * @returns {Promise<void>}
 */
export async function saveSettings(obj) {
  const database = await open();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    for (const [key, value] of Object.entries(obj)) {
      store.put({ key, value });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Export all data (for debugging / restore).
 * @returns {Promise<{ periods: Array, settings: Object }>}
 */
export async function exportAll() {
  const database = await open();
  const [periods, settingsRows] = await Promise.all([
    getPeriods(),
    new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_SETTINGS, 'readonly');
      const request = tx.objectStore(STORE_SETTINGS).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    }),
  ]);
  const settings = {};
  for (const row of settingsRows) {
    if (row?.key) settings[row.key] = row.value;
  }
  return { periods, settings };
}
