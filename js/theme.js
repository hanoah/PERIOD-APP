/**
 * Theme engine — palette + mode switching.
 * Applies data attributes to document.documentElement and persists to settings.
 */

import { getSettings, saveSettings } from './db.js';

const PALETTES = ['alien', 'girly', 'neutral'];
const MODES = ['alien', 'girly', 'neutral'];
const LEGACY_PALETTES = ['ocean', 'sunset', 'forest', 'lavender', 'mono'];

const MODE_FONTS = {
  alien: 'Space+Grotesk:wght@400;500;600;700',
  girly: 'Quicksand:wght@400;500;600;700',
  neutral: 'Lexend:wght@400;500;600;700',
};

let _fontLinkEl = null;

function loadFontForMode(mode) {
  const family = MODE_FONTS[mode] || MODE_FONTS.neutral;
  const href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  if (_fontLinkEl && _fontLinkEl.getAttribute('href') === href) return;
  if (!_fontLinkEl) {
    _fontLinkEl = document.createElement('link');
    _fontLinkEl.rel = 'stylesheet';
    _fontLinkEl.id = 'mode-font';
    document.head.appendChild(_fontLinkEl);
  }
  _fontLinkEl.href = href;
}

function resolvePalette(settings) {
  const p = settings.palette;
  if (PALETTES.includes(p)) return p;
  if (LEGACY_PALETTES.includes(p)) {
    const map = { ocean: 'neutral', sunset: 'girly', forest: 'neutral', lavender: 'alien', mono: 'neutral' };
    return map[p] ?? 'neutral';
  }
  return 'neutral';
}

/**
 * Load saved theme from DB and apply to document.
 */
export async function loadTheme() {
  const settings = await getSettings();
  const themeValid = MODES.includes(settings.theme);
  const paletteValid = PALETTES.includes(settings.palette);
  let palette = themeValid ? settings.theme : resolvePalette(settings);
  let theme = themeValid ? settings.theme : palette;
  const dark = resolveDarkMode(settings.darkMode);

  if (!paletteValid || !themeValid) {
    await saveSettings({ ...settings, palette, theme });
  }
  applyTheme({ palette, theme, dark });
  return { palette, theme, dark };
}

/**
 * Apply theme to the document.
 * @param {Object} opts
 * @param {string} opts.palette
 * @param {string} opts.theme
 * @param {boolean} opts.dark
 */
export function applyTheme({ palette, theme, dark }) {
  const root = document.documentElement;
  root.setAttribute('data-palette', palette);
  root.setAttribute('data-mode', theme);
  root.setAttribute('data-dark', dark ? 'true' : 'false');

  loadFontForMode(theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = getComputedStyle(root).getPropertyValue('--color-primary').trim() || '#6366f1';
  }
}

function resolveDarkMode(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

/**
 * Set palette (same as mode — coupled).
 */
export async function setPalette(palette) {
  if (!PALETTES.includes(palette)) return;
  applyTheme({
    palette,
    theme: palette,
    dark: document.documentElement.getAttribute('data-dark') === 'true',
  });
  const s = await getSettings();
  await saveSettings({ ...s, palette, theme: palette });
}

/**
 * Set mode and palette (coupled — mode = identity).
 */
export async function setMode(theme) {
  if (!MODES.includes(theme)) return;
  applyTheme({
    palette: theme,
    theme,
    dark: document.documentElement.getAttribute('data-dark') === 'true',
  });
  const s = await getSettings();
  await saveSettings({ ...s, theme, palette: theme });
}

/**
 * Toggle dark mode. Cycles: auto -> dark -> light -> auto.
 */
export async function toggleDarkMode() {
  const settings = await getSettings();
  const current = settings.darkMode || 'auto';
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  await saveSettings({ ...settings, darkMode: next });
  const dark = next === 'dark' ? true : next === 'light' ? false : resolveDarkMode('auto');
  applyTheme({
    palette: document.documentElement.getAttribute('data-palette') || 'neutral',
    theme: document.documentElement.getAttribute('data-mode') || 'neutral',
    dark,
  });
  return next;
}

/**
 * Listen for system theme changes when in auto mode.
 */
export function watchSystemTheme() {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mq) return;
  mq.addEventListener('change', async () => {
    const s = await getSettings();
    if (s.darkMode === 'auto') {
      applyTheme({
        palette: document.documentElement.getAttribute('data-palette') || 'neutral',
        theme: document.documentElement.getAttribute('data-mode') || 'neutral',
        dark: mq.matches,
      });
    }
  });
}

export { PALETTES, MODES };
