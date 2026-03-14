/**
 * Stats / Dashboard — metrics, trend arrows, dot calendar, streak, correlations.
 */

import { getPeriods } from '../db.js';
import { computeMetrics } from '../metrics.js';
import { formatDateShort } from '../utils.js';
import { icon } from '../icons.js';

export async function renderStats(container) {
  const periods = await getPeriods();
  const m = computeMetrics(periods);

  const trendIcon = (t) => (t === 'up' ? '↑' : t === 'down' ? '↓' : '');
  const cycleTrend = m.cycleLengthTrend ? trendIcon(m.cycleLengthTrend) : '';
  const durationTrend = m.durationTrend ? trendIcon(m.durationTrend) : '';

  const html = `
    <h1 class="page-title">Stats</h1>

    ${m.periodCount === 0 ? `
      <div class="card card-empty">
        <p>Log your first period to see stats here.</p>
        <a href="#/" class="btn btn-primary">Go to Home</a>
      </div>
    ` : `
      <div class="stats-grid">
        <div class="card stat-card">
          <p class="stat-label">Avg cycle length</p>
          <p class="stat-value">${m.avgCycleLength ?? '—'} days ${cycleTrend}</p>
        </div>
        <div class="card stat-card">
          <p class="stat-label">Avg period duration</p>
          <p class="stat-value">${m.avgPeriodDuration ?? '—'} days ${durationTrend}</p>
        </div>
        ${m.longestCycle != null ? `
          <div class="card stat-card">
            <p class="stat-label">Longest cycle</p>
            <p class="stat-value">${m.longestCycle} days</p>
          </div>
        ` : ''}
        ${m.shortestCycle != null ? `
          <div class="card stat-card">
            <p class="stat-label">Shortest cycle</p>
            <p class="stat-value">${m.shortestCycle} days</p>
          </div>
        ` : ''}
      </div>

      ${m.streak > 1 ? `
        <div class="card streak-badge">
          <span class="streak-icon">${icon('fire')}</span>
          You've logged ${m.streak} consecutive cycles
        </div>
      ` : ''}

      ${m.predictedNextStart ? `
        <div class="card">
          <p class="stat-label">Predicted next period</p>
          <p class="stat-value">~${formatDateShort(m.predictedNextStart)}</p>
        </div>
      ` : ''}

      ${m.symptomCorrelations?.length > 0 ? `
        <div class="card">
          <h3>Insights</h3>
          <ul class="insight-list">
            ${m.symptomCorrelations.map((c) => `<li>${c.message}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="card">
        <h3>Cycle calendar</h3>
        <div class="dot-calendar" id="dot-calendar"></div>
      </div>
    `}
  `;

  container.innerHTML = html;

  const calEl = document.getElementById('dot-calendar');
  if (calEl) renderDotCalendar(calEl, periods, m);
}

function renderDotCalendar(container, periods, metrics) {
  const year = new Date().getFullYear();
  const monthCount = 12;
  const gap = 2;

  const periodDays = new Set();
  for (const p of periods) {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date();
    const cur = new Date(start);
    while (cur <= end) {
      periodDays.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }

  const predictedDays = new Set();
  if (metrics.predictedNextStart) {
    const pred = new Date(metrics.predictedNextStart);
    for (let i = -2; i <= 5; i++) {
      const d = new Date(pred);
      d.setDate(d.getDate() + i);
      if (d.getFullYear() === year) predictedDays.add(d.toISOString().slice(0, 10));
    }
  }

  const grid = document.createElement('div');
  grid.className = 'dot-calendar-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(31, minmax(0, 1fr))`;
  grid.style.gap = `${gap}px`;

  for (let m = 0; m < monthCount; m++) {
    for (let d = 1; d <= 31; d++) {
      const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'dot-cell';
      cell.style.borderRadius = '50%';
      cell.style.background = 'transparent';
      cell.style.aspectRatio = '1';

      const realDate = new Date(year, m, d);
      if (realDate.getMonth() !== m || realDate.getDate() !== d) {
        cell.style.visibility = 'hidden';
      } else {
        if (periodDays.has(dateStr)) {
          cell.style.background = 'var(--color-period)';
          cell.setAttribute('title', `Period: ${dateStr}`);
        } else if (predictedDays.has(dateStr)) {
          cell.style.background = 'var(--color-predicted)';
          cell.style.border = '1px solid var(--color-period)';
          cell.setAttribute('title', `Predicted: ${dateStr}`);
        } else {
          cell.style.background = 'var(--color-border)';
          cell.style.opacity = '0.3';
        }
      }
      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);
}
