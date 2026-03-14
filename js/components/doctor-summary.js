/**
 * Doctor summary — clean, printable view for sharing with doctor.
 */

import { getPeriods } from '../db.js';
import { computeMetrics } from '../metrics.js';
import { getSettings } from '../db.js';
import { formatDate } from '../utils.js';
import { icon } from '../icons.js';

export async function renderDoctor(container) {
  const periods = await getPeriods();
  const settings = await getSettings();
  const m = computeMetrics(periods);

  const html = `
    <h1 class="page-title doctor-title">Period Summary</h1>

    ${periods.length === 0 ? `
      <div class="card card-empty">
        <p>Nothing to export yet. Log periods to build your summary.</p>
        <a href="#/" class="btn btn-primary">Go to Home</a>
      </div>
    ` : `
      <div class="doctor-summary" id="doctor-summary">
        <div class="doctor-meta">
          <p>Generated ${formatDate(new Date().toISOString().slice(0, 10))}</p>
        </div>
        <div class="doctor-stats">
          <p><strong>Average cycle length:</strong> ${m.avgCycleLength ?? '—'} days</p>
          <p><strong>Average period duration:</strong> ${m.avgPeriodDuration ?? '—'} days</p>
          ${m.longestCycle != null ? `<p><strong>Cycle range:</strong> ${m.shortestCycle}–${m.longestCycle} days</p>` : ''}
          <p><strong>Periods logged:</strong> ${periods.length}</p>
        </div>
        <table class="doctor-table">
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Symptoms</th>
            </tr>
          </thead>
          <tbody>
            ${periods
              .slice()
              .reverse()
              .map(
                (p) => {
                  const dur = p.endDate
                    ? Math.round((new Date(p.endDate) - new Date(p.startDate)) / (24 * 60 * 60 * 1000))
                    : '—';
                  const syms = (p.symptoms || []).join(', ') || '—';
                  return `
                    <tr>
                      <td>${formatDate(p.startDate)}</td>
                      <td>${p.endDate ? formatDate(p.endDate) : 'Ongoing'}</td>
                      <td>${dur}</td>
                      <td>${syms}</td>
                    </tr>
                  `;
                }
              )
              .join('')}
          </tbody>
        </table>
      </div>
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
