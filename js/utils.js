/**
 * Shared utilities.
 */

/**
 * Format ISO date for display (e.g. "Mar 13, 2026").
 */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format date short (e.g. "Mar 13").
 */
export function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Show a toast message.
 */
export function showToast(message, duration = 3000) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.removeAttribute('aria-hidden');
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }, duration);
}

/**
 * Debounce a function.
 */
export function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
