/**
 * Symptom icon grid — tap to toggle for a given date.
 * Symptoms are stored per-period when on a period, or per-date via dailySymptoms
 * when not on a period.
 */

import { getPeriods, savePeriod, getDailySymptoms, saveDailySymptoms } from '../db.js';
import { SYMPTOM_KEYS } from '../metrics.js';
import { SYMPTOM_SVGS } from '../symptom-icons.js';

const LABELS = {
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

/**
 * Render symptom grid for a given date.
 * @param {HTMLElement} container
 * @param {string} date - ISO date (YYYY-MM-DD)
 * @param {string|null} periodId - If provided, we're editing a specific period's symptoms
 */
export async function renderSymptomGrid(container, date, periodId) {
  const periods = await getPeriods();
  let entry = periodId ? periods.find((p) => p.id === periodId) : null;

  if (!entry) {
    const d = new Date(date).getTime();
    for (const p of periods) {
      const start = new Date(p.startDate).getTime();
      const end = p.endDate ? new Date(p.endDate).getTime() : Infinity;
      if (d >= start && d <= end) {
        entry = p;
        break;
      }
    }
  }

  const useDaily = !entry;
  const symptoms = useDaily
    ? await getDailySymptoms(date)
    : (entry?.symptoms || []);
  const activeSet = new Set(Array.isArray(symptoms) ? symptoms : []);

  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'symptom-grid-inner';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Symptom tracking');

  for (const key of SYMPTOM_KEYS) {
    const isActive = activeSet.has(key);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `symptom-icon ${isActive ? 'active' : ''}`;
    btn.setAttribute('aria-pressed', isActive);
    btn.setAttribute('aria-label', `${LABELS[key]}, ${isActive ? 'selected' : 'not selected'}`);
    btn.dataset.symptom = key;
    btn.innerHTML = `<span class="symptom-icon-svg" aria-hidden="true">${SYMPTOM_SVGS[key] || ''}</span><span class="symptom-label">${LABELS[key]}</span>`;

    btn.addEventListener('click', async () => {
      const next = new Set(activeSet);
      if (next.has(key)) next.delete(key);
      else next.add(key);

      if (useDaily) {
        await saveDailySymptoms(date, Array.from(next));
      } else {
        entry.symptoms = Array.from(next);
        await savePeriod(entry);
      }
      await renderSymptomGrid(container, date, periodId);
    });

    grid.appendChild(btn);
  }

  container.appendChild(grid);
}
