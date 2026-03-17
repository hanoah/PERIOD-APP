/**
 * History — list of period entries, tap to edit, delete with confirm.
 */

import { getPeriods, savePeriod, deletePeriod, getAllDailySymptoms, saveDailySymptoms } from '../db.js';
import { formatDateShort, showToast } from '../utils.js';
import { icon } from '../icons.js';
import { renderSymptomGrid } from './symptom-grid.js';

const SYMPTOM_LABELS = {
  cramps: 'Cramps',
  headache: 'Headache',
  fatigue: 'Fatigue',
  bloating: 'Bloating',
  mood: 'Mood',
  backPain: 'Back pain',
  breastTenderness: 'Breast tenderness',
  nausea: 'Nausea',
  acne: 'Acne',
  cravings: 'Cravings',
  insomnia: 'Insomnia',
  flowHeavy: 'Heavy flow',
};

export async function renderHistory(container) {
  const periods = await getPeriods();
  const dailySymptoms = (await getAllDailySymptoms()).filter((d) => d.symptoms?.length > 0);
  const hasAny = periods.length > 0 || dailySymptoms.length > 0;

  const html = `
    <h1 class="page-title">History</h1>

    <div class="history-add-wrap">
      <button type="button" class="btn btn-secondary" id="history-add-btn">Add period</button>
      <div class="card history-add-form" id="history-add-form" hidden>
        <h3>Log a missed period</h3>
        <p class="settings-hint">Use this when you forgot to log a period that already started.</p>
        <label>Start date</label>
        <input type="date" id="history-add-start" class="history-start-input">
        <label>End date (leave empty if ongoing)</label>
        <input type="date" id="history-add-end" class="history-end-input" placeholder="Ongoing">
        <button type="button" class="btn btn-primary" id="history-add-save">Save</button>
        <button type="button" class="btn btn-ghost" id="history-add-cancel">Cancel</button>
      </div>
    </div>

    ${!hasAny ? `
      <div class="card card-empty">
        <p>No periods logged yet.</p>
        <a href="#/" class="btn btn-primary">Go to Home</a>
      </div>
    ` : `
      <div class="history-list" id="history-list"></div>
      ${dailySymptoms.length > 0 ? `
        <h2 class="page-subtitle">Symptoms (non-period days)</h2>
        <div class="history-list" id="daily-symptom-list"></div>
      ` : ''}
    `}
  `;

  container.innerHTML = html;

  const addBtn = document.getElementById('history-add-btn');
  const addForm = document.getElementById('history-add-form');
  const addStart = document.getElementById('history-add-start');
  const addEnd = document.getElementById('history-add-end');
  const addSave = document.getElementById('history-add-save');
  const addCancel = document.getElementById('history-add-cancel');

  addBtn.addEventListener('click', () => {
    const today = new Date();
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);
    addStart.value = fourDaysAgo.toISOString().slice(0, 10);
    addEnd.value = '';
    addForm.hidden = false;
    addBtn.hidden = true;
  });

  addCancel.addEventListener('click', () => {
    addForm.hidden = true;
    addBtn.hidden = false;
  });

  addSave.addEventListener('click', async () => {
    const newStart = addStart.value?.trim();
    const newEnd = addEnd.value?.trim() || null;
    if (!newStart) {
      showToast('Start date is required');
      return;
    }
    const dStart = new Date(newStart);
    if (isNaN(dStart.getTime())) {
      showToast('Invalid start date');
      return;
    }
    if (dStart > new Date()) {
      showToast("Can't log a period in the future");
      return;
    }
    if (newEnd) {
      const dEnd = new Date(newEnd);
      if (isNaN(dEnd.getTime())) {
        showToast('Invalid end date');
        return;
      }
      if (dEnd > new Date()) {
        showToast("End date can't be in the future");
        return;
      }
      if (dEnd < dStart) {
        showToast('End date must be after start date');
        return;
      }
    }
    const hasOpen = periods.some((p) => !p.endDate);
    if (!newEnd && hasOpen) {
      showToast('You already have an ongoing period. End it first.');
      return;
    }
    addSave.disabled = true;
    try {
      await savePeriod({ startDate: newStart, endDate: newEnd, symptoms: [] });
      showToast('Period added');
      addForm.hidden = true;
      addBtn.hidden = false;
      if (window.__app?.route) window.__app.route();
    } catch {
      showToast('Could not save');
    } finally {
      addSave.disabled = false;
    }
  });

  const listEl = document.getElementById('history-list');
  if (listEl) {
    for (const p of periods) {
      const card = await renderHistoryEntry(listEl, p);
      listEl.appendChild(card);
    }
  }

  const dailyEl = document.getElementById('daily-symptom-list');
  if (dailyEl) {
    for (const d of dailySymptoms) {
      dailyEl.appendChild(renderDailySymptomEntry(d));
    }
  }
}

function renderHistoryEntry(parent, entry) {
  const start = entry.startDate;
  const end = entry.endDate;
  const duration = end
    ? Math.round((new Date(end) - new Date(start)) / (24 * 60 * 60 * 1000))
    : null;
  const isOpen = !end;
  const openDays = isOpen
    ? Math.floor((Date.now() - new Date(start).getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const forgotIndicator = isOpen && openDays >= 10;

  const card = document.createElement('div');
  card.className = 'card history-entry';
  card.dataset.id = entry.id;

  const symptomsText = (entry.symptoms || []).map((s) => SYMPTOM_LABELS[s] || s).join(', ');

  card.innerHTML = `
    <div class="history-entry-header">
      <div>
        <strong>${formatDateShort(start)}</strong>
        ${end ? ` → ${formatDateShort(end)}` : ' (ongoing)'}
        ${forgotIndicator ? '<span class="history-forgot"> — Consider ending?</span>' : ''}
      </div>
      <div class="history-entry-actions">
        <button type="button" class="btn btn-ghost history-edit-btn" aria-label="Edit">${icon('pen')}</button>
        <button type="button" class="btn btn-ghost history-delete-btn" aria-label="Delete">${icon('trash')}</button>
      </div>
    </div>
    ${duration != null ? `<p class="history-duration">${duration} day${duration !== 1 ? 's' : ''}</p>` : ''}
    ${symptomsText ? `<p class="history-symptoms">${symptomsText}</p>` : ''}
    <div class="history-edit-form" hidden>
      <label>Start date</label>
      <input type="date" class="history-start-input" value="${start}">
      <label>End date (leave empty if ongoing)</label>
      <input type="date" class="history-end-input" value="${end || ''}" placeholder="Ongoing">
      <div class="history-symptom-edit" id="symptom-edit-${entry.id}"></div>
      <button type="button" class="btn btn-primary history-save-btn">Save</button>
    </div>
  `;

  const editBtn = card.querySelector('.history-edit-btn');
  const deleteBtn = card.querySelector('.history-delete-btn');
  const form = card.querySelector('.history-edit-form');
  const saveBtn = card.querySelector('.history-save-btn');
  const startInput = card.querySelector('.history-start-input');
  const endInput = card.querySelector('.history-end-input');
  const symptomEdit = card.querySelector('.history-symptom-edit');

  editBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden && symptomEdit) {
      renderSymptomGrid(symptomEdit, entry.startDate, entry.id);
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete this period entry?')) return;
    await deletePeriod(entry.id);
    showToast('Entry deleted');
    const main = document.getElementById('main');
    if (window.__app?.route) window.__app.route();
  });

  saveBtn.addEventListener('click', async () => {
    const newStart = startInput.value?.trim();
    const newEnd = endInput.value?.trim() || null;
    if (!newStart) {
      showToast('Start date is required');
      return;
    }
    const dStart = new Date(newStart);
    if (isNaN(dStart.getTime())) {
      showToast('Invalid start date');
      return;
    }
    if (dStart > new Date()) {
      showToast("Can't log a period in the future");
      return;
    }
    if (newEnd) {
      const dEnd = new Date(newEnd);
      if (isNaN(dEnd.getTime())) {
        showToast('Invalid end date');
        return;
      }
      if (dEnd > new Date()) {
        showToast("End date can't be in the future");
        return;
      }
      if (dEnd < dStart) {
        showToast('End date must be after start date');
        return;
      }
    }
    entry.startDate = newStart;
    entry.endDate = newEnd;
    saveBtn.disabled = true;
    try {
      await savePeriod(entry);
      showToast('Saved');
      form.hidden = true;
      if (window.__app?.route) window.__app.route();
    } catch {
      showToast('Could not save');
    } finally {
      saveBtn.disabled = false;
    }
  });

  return card;
}

function renderDailySymptomEntry(entry) {
  const symptomsText = entry.symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(', ');

  const card = document.createElement('div');
  card.className = 'card history-entry history-daily';

  card.innerHTML = `
    <div class="history-entry-header">
      <div>
        <strong>${formatDateShort(entry.date)}</strong>
      </div>
      <div class="history-entry-actions">
        <button type="button" class="btn btn-ghost history-edit-btn" aria-label="Edit symptoms">${icon('pen')}</button>
        <button type="button" class="btn btn-ghost history-delete-btn" aria-label="Delete">${icon('trash')}</button>
      </div>
    </div>
    <p class="history-symptoms">${symptomsText}</p>
    <div class="history-edit-form" hidden>
      <div class="history-symptom-edit" id="daily-symptom-edit-${entry.date}"></div>
    </div>
  `;

  const editBtn = card.querySelector('.history-edit-btn');
  const deleteBtn = card.querySelector('.history-delete-btn');
  const form = card.querySelector('.history-edit-form');
  const symptomEdit = card.querySelector('.history-symptom-edit');

  editBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden && symptomEdit) {
      renderSymptomGrid(symptomEdit, entry.date, null);
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete symptoms for this day?')) return;
    await saveDailySymptoms(entry.date, []);
    showToast('Symptoms cleared');
    if (window.__app?.route) window.__app.route();
  });

  return card;
}
