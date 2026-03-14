/**
 * Google Sheets sync engine.
 * One-way push: device → Sheet. Runs in background when online.
 */

import { getSettings } from './db.js';
import { getUnsyncedPeriods, markSynced } from './db.js';
import { showToast } from './utils.js';

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 4000, 16000];

let isSyncing = false;

/**
 * Sync unsynced entries to Google Sheet.
 * @returns {{ ok: boolean, error?: string }}
 */
export async function sync() {
  if (isSyncing) return { ok: false, error: 'Already syncing' };

  const settings = await getSettings();
  const url = settings?.sheetUrl?.trim();
  if (!url) return { ok: true };

  const unsynced = await getUnsyncedPeriods();
  if (unsynced.length === 0) return { ok: true };

  isSyncing = true;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: unsynced.slice(0, 50) }),
      });

      if (res.ok) {
        const now = Date.now();
        for (const e of unsynced.slice(0, 50)) {
          await markSynced(e.id, now);
        }
        isSyncing = false;
        return { ok: true };
      }

      if (res.status === 429) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }

      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err.message || 'Network error';
    }

    if (attempt < MAX_RETRIES - 1) {
      await sleep(BACKOFF_MS[attempt]);
    }
  }

  isSyncing = false;
  return { ok: false, error: lastError };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run sync when app opens (if online).
 */
export function syncOnLoad() {
  if (navigator.onLine) {
    sync().then((res) => {
      if (!res.ok && res.error) showToast('Could not sync. Check connection.');
    }).catch(() => {
      showToast('Could not sync. Check connection.');
    });
  }
}
