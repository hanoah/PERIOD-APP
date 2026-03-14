/**
 * Pure metrics computation — cycle length, duration, predictions, correlations.
 * No side effects. No DB access.
 */

const PHASE_NAMES = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Ovulatory',
  luteal: 'Luteal',
};

const SYMPTOM_KEYS = [
  'cramps', 'headache', 'fatigue', 'bloating', 'mood',
  'backPain', 'breastTenderness', 'nausea', 'acne', 'cravings',
  'insomnia', 'flowHeavy',
];

/**
 * @typedef {Object} PeriodEntry
 * @property {string} startDate - ISO date
 * @property {string|null} endDate - ISO date or null if ongoing
 * @property {string[]} symptoms
 */

/**
 * Compute all metrics from period entries.
 * @param {PeriodEntry[]} periods - Sorted by startDate desc (newest first)
 * @param {string} [todayOverride] - ISO date for "today" (for testing)
 * @returns {Object}
 */
export function computeMetrics(periods, todayOverride) {
  const sorted = [...periods].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  const cycleLengths = [];
  const periodDurations = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevStart = parseDate(prev.startDate);
    const currStart = parseDate(curr.startDate);
    if (prevStart && currStart) {
      const days = Math.round((currStart - prevStart) / (24 * 60 * 60 * 1000));
      if (days > 0 && days < 90) cycleLengths.push(days);
    }
  }

  for (const p of sorted) {
    const start = parseDate(p.startDate);
    const end = p.endDate ? parseDate(p.endDate) : null;
    if (start && end) {
      const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
      if (days >= 0 && days < 30) periodDurations.push(days);
    }
  }

  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;

  const avgPeriodDuration = periodDurations.length > 0
    ? Math.round(periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length)
    : null;

  const lastStart = sorted.length > 0 ? parseDate(sorted[sorted.length - 1].startDate) : null;
  const today = todayOverride || dateToYmd(new Date());

  let predictedNextStart = null;
  if (lastStart && avgCycleLength && !hasOpenPeriod(sorted)) {
    const lastYmd = sorted[sorted.length - 1].startDate;
    const [y, m, day] = lastYmd.split('-').map(Number);
    const d = new Date(y, m - 1, day + avgCycleLength);
    predictedNextStart = dateToYmd(d);
  }

  let currentCycleDay = null;
  if (lastStart && !hasOpenPeriod(sorted)) {
    const todayMs = new Date(today).getTime();
    currentCycleDay = Math.floor((todayMs - lastStart) / (24 * 60 * 60 * 1000));
    if (currentCycleDay < 0) currentCycleDay = null;
  } else if (hasOpenPeriod(sorted)) {
    const open = sorted.find((p) => !p.endDate);
    if (open?.startDate) {
      const daysSince = daysBetween(open.startDate, today);
      currentCycleDay = daysSince >= 0 ? daysSince + 1 : null;
    }
  }

  const currentPhase = getPhase(currentCycleDay, avgCycleLength);

  const longestCycle = cycleLengths.length > 0 ? Math.max(...cycleLengths) : null;
  const shortestCycle = cycleLengths.length > 0 ? Math.min(...cycleLengths) : null;

  const { symptomFrequency, symptomCorrelations } = computeSymptomInsights(sorted, avgCycleLength);

  const streak = computeStreak(sorted);

  const cycleLengthTrend = getTrend(cycleLengths);
  const durationTrend = getTrend(periodDurations);

  return {
    cycleLengths,
    periodDurations,
    avgCycleLength,
    avgPeriodDuration,
    predictedNextStart,
    currentCycleDay,
    currentPhase,
    longestCycle,
    shortestCycle,
    symptomFrequency,
    symptomCorrelations,
    streak,
    cycleLengthTrend,
    durationTrend,
    periodCount: sorted.length,
  };
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function dateToYmd(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(fromYmd, toYmd) {
  const [y1, m1, d1] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  return Math.floor((date2 - date1) / (24 * 60 * 60 * 1000));
}

function hasOpenPeriod(periods) {
  return periods.some((p) => !p.endDate);
}

function getPhase(cycleDay, avgCycle) {
  if (cycleDay == null || avgCycle == null) return null;
  const p = avgCycle || 28;
  const follicularEnd = Math.floor(p * 0.35);
  const ovulatoryEnd = Math.floor(p * 0.45);
  const lutealEnd = Math.floor(p * 0.95);

  if (cycleDay <= 5) return PHASE_NAMES.menstrual;
  if (cycleDay <= follicularEnd) return PHASE_NAMES.follicular;
  if (cycleDay <= ovulatoryEnd) return PHASE_NAMES.ovulatory;
  if (cycleDay <= lutealEnd) return PHASE_NAMES.luteal;
  return PHASE_NAMES.luteal;
}

function getTrend(arr) {
  if (!arr || arr.length < 2) return null;
  const mid = Math.floor(arr.length / 2);
  const recent = arr.slice(-mid);
  const older = arr.slice(0, -mid);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (Math.abs(diff) < 0.5) return null;
  return diff > 0 ? 'up' : 'down';
}

function computeStreak(periods) {
  const sorted = [...periods].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  if (sorted.length < 2) return 0;

  const cycleLengths = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = parseDate(sorted[i].startDate);
    const next = parseDate(sorted[i + 1].startDate);
    if (curr && next) {
      const days = Math.round((curr - next) / (24 * 60 * 60 * 1000));
      if (days > 0 && days < 90) cycleLengths.push(days);
    }
  }

  let streak = 1;
  const avg = cycleLengths.length > 0
    ? cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
    : 28;
  const tolerance = Math.max(3, Math.round(avg * 0.2));

  for (let i = 0; i < cycleLengths.length - 1; i++) {
    const diff = Math.abs(cycleLengths[i] - cycleLengths[i + 1]);
    if (diff <= tolerance) streak++;
    else break;
  }

  return streak;
}

/**
 * Map symptom to cycle phase based on days before/after period start.
 * Phase: "before" (luteal, 1-7 days before), "during" (menstrual), "after" (follicular, 1-5 days after).
 */
function computeSymptomInsights(periods, avgCycleLength) {
  const symptomFrequency = {};
  const symptomByPhase = { before: {}, during: {}, after: {} };

  for (const key of SYMPTOM_KEYS) {
    symptomFrequency[key] = 0;
    symptomByPhase.before[key] = 0;
    symptomByPhase.during[key] = 0;
    symptomByPhase.after[key] = 0;
  }

  for (const p of periods) {
    const start = parseDate(p.startDate);
    if (!start || !Array.isArray(p.symptoms)) continue;

    for (const sym of p.symptoms) {
      if (!SYMPTOM_KEYS.includes(sym)) continue;
      symptomFrequency[sym] = (symptomFrequency[sym] || 0) + 1;

      const end = p.endDate ? parseDate(p.endDate) : null;
      if (end) {
        const duration = (end - start) / (24 * 60 * 60 * 1000);
        symptomByPhase.during[sym] = (symptomByPhase.during[sym] || 0) + 1;
      }
    }

    // For "before" we'd need symptom entries with dates — we don't have that in v1.
    // Symptoms are stored per-period, so we only have "during" context.
    // If we add day-level symptom logging, we can compute "before" from cycle day.
  }

  const symptomCorrelations = [];
  for (const key of SYMPTOM_KEYS) {
    const total = symptomFrequency[key] || 0;
    if (total < 2) continue;

    const during = symptomByPhase.during[key] || 0;
    const before = symptomByPhase.before[key] || 0;

    if (during >= 1) {
      symptomCorrelations.push({
        symptom: key,
        phase: 'during period',
        count: during,
        message: `You report ${formatSymptomName(key)} most often during your period (${during} ${during === 1 ? 'time' : 'times'}).`,
      });
    }
  }

  return { symptomFrequency, symptomCorrelations };
}

function formatSymptomName(key) {
  const map = {
    cramps: 'cramps',
    headache: 'headaches',
    fatigue: 'fatigue',
    bloating: 'bloating',
    mood: 'mood changes',
    backPain: 'back pain',
    breastTenderness: 'breast tenderness',
    nausea: 'nausea',
    acne: 'acne',
    cravings: 'cravings',
    insomnia: 'insomnia',
    flowHeavy: 'heavy flow',
  };
  return map[key] || key;
}

export { SYMPTOM_KEYS, PHASE_NAMES };
