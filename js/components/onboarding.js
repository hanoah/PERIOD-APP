/**
 * Onboarding — first-open mode picker. Three cards: Alien, Girly, Neutral.
 */

import { saveSettings } from '../db.js';
import { applyTheme } from '../theme.js';
import { icon } from '../icons.js';

const MODES = [
  { id: 'alien', name: 'Alien', desc: 'Sci-fi, playful', iconName: 'star' },
  { id: 'girly', name: 'Girly', desc: 'Warm, expressive', iconName: 'heart' },
  { id: 'neutral', name: 'Neutral', desc: 'Clean, calm', iconName: 'bookmark' },
];

const STORAGE_KEY = 'period-tracker-onboarding-done';

export function hasCompletedOnboarding() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function showOnboarding(container, onComplete) {
  container.innerHTML = `
    <div class="onboarding">
      <h1 class="onboarding-title">Choose your vibe</h1>
      <p class="onboarding-subtitle">Tap one to get started. You can change it anytime.</p>
      <div class="onboarding-cards" id="onboarding-cards"></div>
      <p class="onboarding-footer">That's it. Tap the button when your next period starts.</p>
    </div>
  `;

  const cardsEl = document.getElementById('onboarding-cards');
  for (const m of MODES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'onboarding-card';
    card.dataset.mode = m.id;
    card.innerHTML = `
      <span class="onboarding-icon">${icon(m.iconName)}</span>
      <span class="onboarding-name">${m.name}</span>
      <span class="onboarding-desc">${m.desc}</span>
    `;
    card.addEventListener('click', async () => {
      await saveSettings({ theme: m.id, palette: m.id });
      localStorage.setItem(STORAGE_KEY, 'true');
      const dark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
      applyTheme({ palette: m.id, theme: m.id, dark });
      onComplete();
    });
    cardsEl.appendChild(card);
  }
}
