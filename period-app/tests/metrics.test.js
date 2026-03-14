/**
 * Unit tests for metrics.js
 * Run: node --test tests/metrics.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeMetrics, SYMPTOM_KEYS } from '../js/metrics.js';

function entry(start, end = null, symptoms = []) {
  return { startDate: start, endDate: end, symptoms };
}

describe('computeMetrics', () => {
  it('avgCycleLength with 0 periods returns null', () => {
    const m = computeMetrics([]);
    assert.strictEqual(m.avgCycleLength, null);
  });

  it('avgCycleLength with 1 period returns null', () => {
    const m = computeMetrics([entry('2026-01-01', '2026-01-05')]);
    assert.strictEqual(m.avgCycleLength, null);
  });

  it('avgCycleLength with 2 periods returns correct value', () => {
    const m = computeMetrics([
      entry('2026-01-01', '2026-01-05'),
      entry('2026-01-29', '2026-02-02'),
    ]);
    assert.strictEqual(m.avgCycleLength, 28);
  });

  it('avgDuration with missing endDate excludes from average', () => {
    const m = computeMetrics([
      entry('2026-01-01', '2026-01-05'),
      entry('2026-01-29', null),
    ]);
    assert.strictEqual(m.avgPeriodDuration, 4);
  });

  it('currentCycleDay on day of start returns 1 when period is open', () => {
    const today = '2026-03-13';
    const m = computeMetrics([entry(today, null)], today);
    assert.strictEqual(m.currentCycleDay, 1);
  });

  it('predictedNextStart uses last start + avg cycle', () => {
    const m = computeMetrics([
      entry('2026-01-01', '2026-01-05'),
      entry('2026-01-29', '2026-02-02'),
    ]);
    assert.strictEqual(m.predictedNextStart, '2026-02-26');
  });

  it('longestCycle and shortestCycle', () => {
    const m = computeMetrics([
      entry('2026-01-01', '2026-01-05'),
      entry('2026-01-28', '2026-02-01'),
      entry('2026-02-25', '2026-03-01'),
    ]);
    assert.strictEqual(m.longestCycle, 28);
    assert.strictEqual(m.shortestCycle, 27);
  });

  it('symptomFrequency counts correctly', () => {
    const m = computeMetrics([
      entry('2026-01-01', '2026-01-05', ['cramps', 'headache']),
      entry('2026-01-29', '2026-02-02', ['cramps']),
    ]);
    assert.strictEqual(m.symptomFrequency.cramps, 2);
    assert.strictEqual(m.symptomFrequency.headache, 1);
  });
});
