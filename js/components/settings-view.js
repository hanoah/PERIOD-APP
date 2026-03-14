/**
 * Settings — theme, palette, dark mode, Sheet URL, notifications, about.
 */

import { getSettings, getPeriods, saveSettings, exportAll } from '../db.js';
import { setMode, toggleDarkMode, MODES } from '../theme.js';
import { sync } from '../sync.js';
import { showToast } from '../utils.js';
const MODE_NAMES = { alien: 'Alien', girly: 'Girly', neutral: 'Neutral' };

function isValidSheetUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('script.google.com');
  } catch {
    return false;
  }
}

export async function renderSettings(container) {
  const settings = await getSettings();
  const periods = await getPeriods();
  const localCount = periods.length;

  const html = `
    <h1 class="page-title">Settings</h1>

    <div class="card">
      <h3>App vibe</h3>
      <p class="settings-hint">Icons, colors, and tone all change together.</p>
      <div class="settings-mode-grid" id="mode-grid"></div>
    </div>

    <div class="card">
      <h3>Dark mode</h3>
      <button type="button" class="btn btn-secondary" id="dark-toggle">
        ${settings.darkMode === 'dark' ? 'Dark' : settings.darkMode === 'light' ? 'Light' : 'Auto (system)'}
      </button>
    </div>

    <div class="card">
      <h3>Google Sheet</h3>
      <p class="settings-hint">Back up your data to your own Google Sheet.</p>
      <label>Apps Script URL</label>
      <input type="url" id="sheet-url" placeholder="https://script.google.com/..." value="${settings.sheetUrl || ''}">
      <p class="settings-sync-status" id="sync-status">${settings.sheetUrl ? 'Connected' : 'Not configured'}</p>
      <div class="settings-sheet-actions">
        <button type="button" class="btn btn-secondary" id="sheet-save">Save</button>
        ${settings.sheetUrl ? '<button type="button" class="btn btn-secondary" id="sheet-sync">Sync now</button>' : ''}
      </div>
    </div>

    <div class="card">
      <h3>Data</h3>
      <p>${localCount} period ${localCount === 1 ? 'entry' : 'entries'} stored locally.</p>
      <p class="settings-privacy">Your data stays on your device and in your Google Sheet. We never see it.</p>
    </div>

    <div class="card">
      <h3>Install on your phone</h3>
      <p class="settings-hint">Add the app to your home screen for quick access.</p>
      <a href="#/install" class="btn btn-secondary">How to install</a>
    </div>
    <div class="card">
      <h3>About</h3>
      <p>Period Tracker v0.1</p>
      <p id="dev-tap-count" data-count="0">Tap version 5 times to export data</p>
    </div>
  `;

  container.innerHTML = html;

  const modeGrid = document.getElementById('mode-grid');
  for (const m of MODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn settings-mode-btn ${settings.theme === m ? 'active' : ''}`;
    btn.textContent = MODE_NAMES[m];
    btn.dataset.mode = m;
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        await setMode(m);
        document.querySelectorAll('.settings-mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      } finally {
        btn.disabled = false;
      }
    });
    modeGrid.appendChild(btn);
  }

  const darkBtn = document.getElementById('dark-toggle');
  darkBtn.addEventListener('click', async () => {
    const next = await toggleDarkMode();
    darkBtn.textContent = next === 'dark' ? 'Dark' : next === 'light' ? 'Light' : 'Auto (system)';
  });

  const sheetSave = document.getElementById('sheet-save');
  const sheetInput = document.getElementById('sheet-url');
  const syncStatus = document.getElementById('sync-status');
  sheetSave.addEventListener('click', async () => {
    const url = sheetInput.value.trim();
    if (url && !isValidSheetUrl(url)) {
      showToast('Use a valid Apps Script URL (https://script.google.com/...)');
      return;
    }
    await saveSettings({ ...settings, sheetUrl: url || null });
    syncStatus.textContent = url ? 'Saved. Sync will run when online.' : 'Not configured';
    showToast('Settings saved');
    if (url && !document.getElementById('sheet-sync')) {
      const actions = document.querySelector('.settings-sheet-actions');
      if (actions) {
        const syncBtn = document.createElement('button');
        syncBtn.type = 'button';
        syncBtn.className = 'btn btn-secondary';
        syncBtn.id = 'sheet-sync';
        syncBtn.textContent = 'Sync now';
        syncBtn.addEventListener('click', handleSyncNow);
        actions.appendChild(syncBtn);
      }
    } else if (!url) {
      document.getElementById('sheet-sync')?.remove();
    }
  });

  const syncBtn = document.getElementById('sheet-sync');
  if (syncBtn) syncBtn.addEventListener('click', handleSyncNow);

  async function handleSyncNow() {
    const btn = document.getElementById('sheet-sync');
    if (btn) btn.disabled = true;
    syncStatus.textContent = 'Syncing…';
    const res = await sync();
    if (btn) btn.disabled = false;
    const s = await getSettings();
    syncStatus.textContent = res.ok ? 'Synced' : (s.sheetUrl ? 'Sync failed' : 'Not configured');
    if (!res.ok) showToast('Could not sync. Check connection.');
  }

  const devTap = document.getElementById('dev-tap-count');
  let count = 0;
  devTap.addEventListener('click', async () => {
    count++;
    if (count >= 5) {
      const data = await exportAll();
      const json = JSON.stringify(data, null, 2);
      try {
        await navigator.clipboard.writeText(json);
        if (window.__app?.showToast) window.__app.showToast('Data exported to clipboard');
      } catch {
        console.log('Export:', json);
        if (window.__app?.showToast) window.__app.showToast('Data logged to console');
      }
      count = 0;
    }
  });
}
