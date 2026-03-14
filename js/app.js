/**
 * Entry point — router, init, navigation.
 */

import { open, isAvailable } from './db.js';
import { syncOnLoad } from './sync.js';
import { loadTheme, watchSystemTheme } from './theme.js';
import { icon } from './icons.js';
import { renderHome } from './components/period-button.js';
import { renderStats } from './components/cycle-dashboard.js';
import { renderHistory } from './components/history-list.js';
import { renderDoctor } from './components/doctor-summary.js';
import { renderSettings } from './components/settings-view.js';
import { renderInstallGuide } from './components/install-guide.js';
import { showOnboarding, hasCompletedOnboarding } from './components/onboarding.js';
import { showToast } from './utils.js';

const MAIN = document.getElementById('main');
const NAV = document.getElementById('nav');

const ROUTES = {
  '/': renderHome,
  '/stats': renderStats,
  '/history': renderHistory,
  '/doctor': renderDoctor,
  '/settings': renderSettings,
  '/install': renderInstallGuide,
};

async function init() {
  // Check IndexedDB (Safari private mode)
  const idbOk = await isAvailable();
  if (!idbOk) {
    MAIN.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <p><strong>Private browsing can't save your data.</strong></p>
        <p>Open this app in a normal browser window to use it.</p>
      </div>
    `;
    return;
  }

  await open();
  await loadTheme();
  watchSystemTheme();
  syncOnLoad();

  const completed = await hasCompletedOnboarding();
  if (!completed) {
    showOnboarding(MAIN, () => {
      NAV.hidden = false;
      initNav();
      route();
    });
  } else {
    NAV.hidden = false;
    initNav();
    route();
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
}

function route() {
  const hash = window.location.hash.slice(1) || '/';
  const path = hash.split('?')[0];
  const render = ROUTES[path] || ROUTES['/'];

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.removeAttribute('aria-current');
    if (a.getAttribute('data-route') === path || (path === '/' && a.getAttribute('data-route') === '/')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  MAIN.innerHTML = '';
  render(MAIN).catch((err) => {
    console.error('Render error:', err);
    MAIN.innerHTML = `
      <div class="card card-empty">
        <p>Something went wrong.</p>
        <button type="button" class="btn btn-primary" id="error-retry">Try again</button>
      </div>
    `;
    document.getElementById('error-retry')?.addEventListener('click', () => route());
  });
}

/** Replace nav placeholder icons with Pepicons SVGs. */
function initNav() {
  const ROUTE_ICONS = {
    '/': 'house',
    '/stats': 'calendar',
    '/history': 'list',
    '/doctor': 'clipboard',
    '/settings': 'gear',
  };
  document.querySelectorAll('.nav-link').forEach((a) => {
    const route = a.getAttribute('data-route');
    const iconName = ROUTE_ICONS[route];
    const span = a.querySelector('.nav-icon');
    if (span && iconName) {
      span.innerHTML = icon(iconName);
    }
  });
}

// Expose for components
window.__app = { route, showToast };

init();
