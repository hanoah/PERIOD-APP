/**
 * Doctor summary — clean, printable view for sharing with doctor.
 */

import { getPeriods, getAllDailySymptoms } from '../db.js';
import { computeMetrics } from '../metrics.js';
import { getSettings } from '../db.js';
import { formatDate, formatDateShort } from '../utils.js';
import { icon } from '../icons.js';

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

export async function renderDoctor(container) {
  const periods = await getPeriods();
  const settings = await getSettings();
  const dailySymptoms = await getAllDailySymptoms();
  const filteredDaily = dailySymptoms.filter((d) => d.symptoms?.length > 0);
  const m = computeMetrics(periods);

  const html = `
    <h1 class="page-title doctor-title">Summary</h1>

    ${periods.length === 0 && filteredDaily.length === 0 ? `
      <div class="card card-empty">
        <p>Nothing to export yet. Log periods or symptoms to build your summary.</p>
        <a href="#/" class="btn btn-primary">Go to Home</a>
      </div>
    ` : `
      <div class="doctor-summary" id="doctor-summary">
        <p class="doctor-meta">Generated ${formatDateShort(new Date().toISOString().slice(0, 10))}</p>

        <div class="doctor-stats-grid">
          <div class="doctor-stat">
            <span class="doctor-stat-label">Avg cycle</span>
            <span class="doctor-stat-value">${m.avgCycleLength ?? '—'}<small> days</small></span>
          </div>
          <div class="doctor-stat">
            <span class="doctor-stat-label">Avg duration</span>
            <span class="doctor-stat-value">${m.avgPeriodDuration ?? '—'}<small> days</small></span>
          </div>
          ${m.longestCycle != null ? `
          <div class="doctor-stat">
            <span class="doctor-stat-label">Cycle range</span>
            <span class="doctor-stat-value">${m.shortestCycle}–${m.longestCycle}<small> days</small></span>
          </div>
          ` : ''}
          <div class="doctor-stat">
            <span class="doctor-stat-label">Logged</span>
            <span class="doctor-stat-value">${periods.length}<small> periods</small></span>
          </div>
        </div>

        <h3 class="doctor-section-title">Period history</h3>
        <div class="doctor-entries">
          ${periods
            .slice()
            .reverse()
            .map((p) => {
              const dur = p.endDate
                ? Math.round((new Date(p.endDate) - new Date(p.startDate)) / (24 * 60 * 60 * 1000))
                : null;
              const syms = (p.symptoms || []).map((s) => SYMPTOM_LABELS[s] || s).join(', ') || '—';
              return `
              <div class="doctor-entry">
                <div class="doctor-entry-dates">
                  <strong>${formatDateShort(p.startDate)}</strong> → ${p.endDate ? formatDateShort(p.endDate) : 'Ongoing'}
                </div>
                ${dur != null ? `<span class="doctor-entry-dur">${dur}d</span>` : ''}
                <p class="doctor-entry-symptoms">${syms}</p>
              </div>`;
            })
            .join('')}
        </div>
      </div>
      ${filteredDaily.length > 0 ? `
        <div class="doctor-daily">
          <h3 class="doctor-section-title">Daily symptom logs</h3>
          <div class="doctor-entries">
            ${filteredDaily.map((d) => `
              <div class="doctor-entry">
                <div class="doctor-entry-dates"><strong>${formatDateShort(d.date)}</strong></div>
                <p class="doctor-entry-symptoms">${d.symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(', ')}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="doctor-actions">
        <button type="button" class="btn btn-primary" id="doctor-print">${icon('printer')} Print / Save as PDF</button>
        <button type="button" class="btn btn-secondary" id="doctor-copy">${icon('duplicate')} Copy summary</button>
      </div>
    `}
  `;

  container.innerHTML = html;

  const printBtn = document.getElementById('doctor-print');
  const copyBtn = document.getElementById('doctor-copy');
  const summaryEl = document.getElementById('doctor-summary');

  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  if (copyBtn && summaryEl) {
    copyBtn.addEventListener('click', async () => {
      const text = summaryEl.innerText;
      try {
        await navigator.clipboard.writeText(text);
        if (window.__app?.showToast) window.__app.showToast('Copied to clipboard');
      } catch {
        if (window.__app?.showToast) window.__app.showToast('Could not copy');
      }
    });
  }
}
