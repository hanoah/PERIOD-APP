# Period Tracker — Project Instructions

## Design Context

### Users

Primary user is the app creator — tracking period timing and symptoms to show a
doctor trends in cycle length and duration. Secondary users are anyone who wants
a private, simple period tracker without ads, accounts, or data harvesting.

Context: logging happens in bed, in the bathroom, on the go. Speed and
offline-first matter more than feature depth.

### Brand Personality

The app has three distinct personalities that the user selects:

**Alien mode** — quirky, nerdy, FIRST Robotics energy
- 3 words: weird, playful, electric
- Emotional tone: "DON'T PANIC" — lighthearted sci-fi humor
- Reference: neon green/purple/magenta on dark backgrounds, glowing stars,
  cats-in-space, Y2K sci-fi, Hitchhiker's Guide
- Mood board colors: `#39FF14` (neon green), `#BF00FF` (electric purple),
  `#FF00FF` (magenta), `#0D0221` (deep space), `#1A1A2E` (dark navy)

**Girly mode** — feminine, confident, kawaii
- 3 words: pink, soft, unapologetic
- Emotional tone: "On Wednesdays we wear pink" — girly AND smart
- Reference: bubblegum pink monochrome, marshmallow textures, neon pink signs,
  hearts, cotton candy, stickers, vinyl records
- Mood board colors: `#FFB6C1` (light pink), `#FF69B4` (hot pink),
  `#FFC0CB` (pink), `#FF1493` (deep pink), `#FFF0F5` (lavender blush)

**Neutral mode** — clinical, professional, trustworthy
- 3 words: clean, calm, medical
- Emotional tone: "show this to your doctor" — no explanation needed
- Reference: health app UI, mint/teal accent on white, charcoal text,
  rounded cards with subtle shadows, lots of white space
- Mood board colors: `#4ECDC4` (mint/teal), `#F7F7F7` (off-white),
  `#2D3436` (charcoal), `#DFE6E9` (light gray), `#FFFFFF` (white)

### Aesthetic Direction

Each mode is a complete visual identity, not just a palette swap:

- **Alien:** Dark-mode-first. Neon accents glow against deep space backgrounds.
  Borders and surfaces feel like control panels. Text is bright. Everything
  buzzes with energy.
- **Girly:** Light-mode-first. Pink everything. Soft rounded shapes, generous
  padding, bubbly. Cards feel like stickers. The whole app feels like a cute
  notebook.
- **Neutral:** Light-mode-first. Near-white backgrounds, minimal color, mint
  accent used sparingly. Cards have subtle shadows. Feels like a medical app
  designed by someone with taste.

### Anti-references

- Flo, Clue, and other mainstream period trackers (bloated, ad-heavy, sell data)
- Generic "AI-generated" purple-gradient-on-white aesthetic
- Gray text on colored backgrounds
- Cards nested in cards
- Gamification (streaks are OK, badges/points are not)

### Icon Sources

| Mode | Source | License |
|------|--------|---------|
| Alien | [Iconscout Space pack](https://iconscout.com/free-icon-pack/free-space-icon-pack_72408) | Free (Digital License) |
| Girly | [Iconscout Fitness & Gym pack](https://iconscout.com/free-icon-pack/free-fitness-and-gym-icon-pack_69203) | Free (Digital License) |
| Neutral | [Pepicons](https://pepicons.com/) | MIT (open source) |

### Design Principles

1. **Privacy is the product.** No server, no tracking, no accounts. This isn't
   a feature — it's the architecture. Never compromise it for convenience.

2. **One tap, not ten.** The core action (log a period) must be achievable in
   one tap from the home screen. Everything else is secondary.

3. **Modes are identities, not skins.** Switching modes should feel like opening
   a different app. Colors, icons, tone, and spatial rhythm all change.

4. **Data serves the doctor visit.** Every metric, chart, and summary exists to
   answer a specific medical question. If it doesn't help the doctor
   conversation, cut it.

5. **Respect the moment.** Period logging happens in vulnerable, private, tired
   moments. The UI should never feel demanding, judgmental, or noisy.

### Accessibility

- Target WCAG 2.1 AA for all modes
- All three palettes must pass 4.5:1 contrast for body text, 3:1 for large text
- Alien mode neon colors need careful contrast — use dark backgrounds, not
  neon-on-neon
- Girly mode pink-on-pink needs validation — ensure text is always readable
- Support `prefers-reduced-motion` — disable period-start animations
- Touch targets minimum 44x44px (already met with current button sizing)

### Tech Stack

- Vanilla JS (ES modules), no framework, no build step
- CSS custom properties for theming (palette + mode attributes on `<html>`)
- IndexedDB for local-first data storage
- Service worker for offline caching
- Optional Google Sheets sync via Apps Script
- GitHub Pages hosting
