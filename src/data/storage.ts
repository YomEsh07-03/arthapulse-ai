import { AppDataset, AppSettings } from '../types';
import { generateDemoDataset } from './demoData';

const DB_NAME = 'ArthaPulseDB';
const DB_VERSION = 1;
const STORE_DATASET = 'dataset';
const STORE_SETTINGS = 'settings';

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Kaveri Agro & FMCG Distributors',
  currency: 'INR',
  slowMovingDays: 30,
  leadTimeDays: 7
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DATASET)) {
        db.createObjectStore(STORE_DATASET);
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadStoredDataset(): Promise<AppDataset> {
  try {
    const db = await openDatabase();
    return await new Promise<AppDataset>((resolve, reject) => {
      const tx = db.transaction(STORE_DATASET, 'readonly');
      const store = tx.objectStore(STORE_DATASET);
      const req = store.get('active');
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as AppDataset);
        } else {
          const demo = generateDemoDataset();
          resolve(demo);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return generateDemoDataset();
  }
}

export async function saveStoredDataset(dataset: AppDataset): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DATASET, 'readwrite');
      const store = tx.objectStore(STORE_DATASET);
      const req = store.put(dataset, 'active');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    return;
  }
}

export async function clearStoredDataset(): Promise<AppDataset> {
  const freshDemo = generateDemoDataset();
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DATASET, 'readwrite');
      const store = tx.objectStore(STORE_DATASET);
      const req = store.delete('active');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    return freshDemo;
  }
  return freshDemo;
}

export async function loadStoredSettings(): Promise<AppSettings> {
  try {
    const db = await openDatabase();
    return await new Promise<AppSettings>((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('config');
      req.onsuccess = () => {
        if (req.result) {
          resolve({ ...DEFAULT_SETTINGS, ...(req.result as Partial<AppSettings>) });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoredSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put(settings, 'config');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    return;
  }
}