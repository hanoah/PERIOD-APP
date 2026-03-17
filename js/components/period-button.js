/**
 * Home screen: cycle day, period button, symptom grid, prediction.
 */

import { getPeriods } from '../db.js';
import { savePeriod } from '../db.js';
import { computeMetrics } from '../metrics.js';
import { formatDate, formatDateShort, showToast, debounce } from '../utils.js';
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

export async function renderHome(container) {
  const periods = await getPeriods();
  const metrics = computeMetrics(periods);
  const hasOpen = periods.some((p) => !p.endDate);
  const today = new Date().toISOString().slice(0, 10);

  // Check "forgot to end" — open period 10+ days
  const openEntry = periods.find((p) => !p.endDate);
  const openDays = openEntry
    ? Math.floor((Date.now() - new Date(openEntry.startDate).getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  if (openDays >= 10) {
    const proceed = confirm(
      `Your period has been going for ${openDays} days. Still going, or forgot to log the end? Click OK to end it now, Cancel to dismiss.`
    );
    if (proceed) {
      await handleEndPeriod(container);
      return;
    }
  }

  const cycleDay = metrics.currentCycleDay;
  const phase = metrics.currentPhase;
  const predicted = metrics.predictedNextStart;
  const avgCycle = metrics.avgCycleLength ?? 28;

  const symptomLabel = hasOpen ? 'Period symptoms' : 'How are you feeling today?';

  const html = `
    <div class="home">
      <div class="home-header">
        <div class="home-cycle">
          <span class="home-cycle-day">${cycleDay != null ? `Day ${cycleDay}` : '—'}</span>
          <span class="home-cycle-of">of ~${avgCycle}</span>
          ${phase ? `<span class="home-phase">${phase}</span>` : ''}
        </div>
        <div class="period-btn-wrap">
          <button class="btn period-btn ${hasOpen ? 'period-btn--active' : ''}" id="period-btn" type="button" aria-label="${hasOpen ? 'End period' : 'Start period'}">
            <span class="period-btn-icon" aria-hidden="true">${hasOpen ? icon('circle') : icon('circle-filled')}</span>
            <span>${hasOpen ? 'Period Ended' : 'Period Started'}</span>
          </button>
        </div>
      </div>

      ${predicted ? `
        <p class="home-prediction">
          Next period expected <strong>~${formatDateShort(predicted)}</strong>
        </p>
      ` : ''}

      <div class="home-symptoms" id="home-symptoms">
        <p class="home-symptoms-label">${symptomLabel}</p>
        <div class="symptom-grid" id="symptom-grid"></div>
      </div>

      ${periods.length === 0 ? `
        <p class="home-empty">Tap the button when your next period starts. That's it.</p>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;

  const btn = document.getElementById('period-btn');
  if (btn) {
    btn.addEventListener('click', debounce(async () => {
      if (btn.disabled) return;
      if (hasOpen) {
        await handleEndPeriod(container, btn);
      } else {
        await handleStartPeriod(container, btn);
      }
    }, 300));
  }

  const symptomEl = document.getElementById('symptom-grid');
  if (symptomEl) {
    await renderSymptomGrid(symptomEl, today, null);
  }
}

async function handleStartPeriod(container, btn) {
  if (btn) btn.disabled = true;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const periods = await getPeriods();
    const existing = periods.find((p) => p.startDate === today);
    if (existing) {
      showToast('You already logged a period start today. Edit it in History.');
      return;
    }
    await savePeriod({ startDate: today, endDate: null, symptoms: [] });
    showToast('Period started ✓');
    await renderHome(container);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleEndPeriod(container, btn) {
  if (btn) btn.disabled = true;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const periods = await getPeriods();
    const openEntry = periods.find((p) => !p.endDate);
    if (!openEntry) {
      showToast('No active period to end.');
      return;
    }
    const start = openEntry.startDate;
    const duration = Math.round((new Date(today) - new Date(start)) / (24 * 60 * 60 * 1000));
    if (duration === 0) {
      const ok = confirm('Period lasted less than a day. Sure?');
      if (!ok) return;
    }
    if (duration > 45) {
      const ok = confirm('This is an unusually long period. Is this correct?');
      if (!ok) return;
    }
    openEntry.endDate = today;
    await savePeriod(openEntry);
    showToast(`Period ended — ${duration} day${duration !== 1 ? 's' : ''}`);
    await renderHome(container);
  } finally {
    if (btn) btn.disabled = false;
  }
}
