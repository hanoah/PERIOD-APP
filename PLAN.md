# Period Tracker PWA — Build Plan

## User Need

> "I have to track when I'm on it so I can show the doctor trends for how long
> my periods are and how far apart. She also said tracking symptoms could be
> beneficial too but it's more so a timing thing."

**Outcome:** Walk into a doctor's appointment and say "My average cycle is X days,
my periods last Y days, here's the trend." One tap to generate a clean summary.

---

## Architecture

**Local-first PWA.** All data lives on-device in IndexedDB. Google Sheets is an
optional backup/sharing layer — never the primary store.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                        PWA (Frontend)                           │
  │                                                                  │
  │  ┌────────────────────────────────────────────────────────────┐  │
  │  │  THEME ENGINE                                              │  │
  │  │  Color Palettes (3-5 options)                              │  │
  │  │  Icon Modes: Alien 👽 | Girly 💅 | Neutral 🔵             │  │
  │  │  Stored in localStorage                                    │  │
  │  └────────────────────────────────────────────────────────────┘  │
  │                                                                  │
  │  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
  │  │  UI      │───▶│  App Logic   │───▶│  IndexedDB            │  │
  │  │          │    │  (metrics,   │    │  (periods, symptoms,  │  │
  │  │          │◀───│  predictions)│◀───│   preferences)        │  │
  │  └──────────┘    └──────────────┘    └───────────┬───────────┘  │
  │                                                  │              │
  │                   ┌──────────────────────┐        │              │
  │                   │  Sync Engine         │◀───────┘              │
  │                   │  (background, when   │                       │
  │                   │   online + Sheet     │                       │
  │                   │   URL configured)    │                       │
  │                   └──────────┬───────────┘                       │
  └──────────────────────────────┼───────────────────────────────────┘
                                 │
                      ┌──────────▼──────────┐
                      │  User's OWN Apps    │
                      │  Script (from       │
                      │  template copy)     │
                      └──────────┬──────────┘
                                 │
                      ┌──────────▼──────────┐
                      │  User's OWN Google  │
                      │  Sheet              │
                      └─────────────────────┘
```

### Why Local-First

Period logging happens in bed at midnight, in the bathroom at 6am, at the gym,
on a plane. These are moments with unreliable connectivity. Local-first means:

- Log instantly (<50ms) with no internet
- All metrics computed client-side — no API calls for core functionality
- Google Sheets becomes a backup/export layer, not a dependency
- Zero central backend = zero data liability, zero subpoena risk

### Privacy Architecture

There is no server. No database. No analytics. No tracking.

- App operator has ZERO access to user data
- Cannot be subpoenaed (nothing to hand over)
- Cannot be hacked (nothing to steal)
- User owns everything: their device + their Google Sheet
- Deleting the app + clearing browser data = complete erasure

This is a product feature, not just a technical choice.

---

## Decisions Log

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Review mode | EXPANSION | Greenfield, marginal cost of delight is low |
| 2 | Data architecture | Local-first + optional Sheets sync | Offline-first for real-world logging |
| 3 | Icon approach | Full custom SVG sets (3 modes) | Icon modes ARE the product personality |
| 4 | Symptom input | Structured only (icon taps) | Clean data for correlations, no XSS surface |
| 5 | Past entry editing | Full edit (any entry, any time) | Data accuracy = trust in metrics |
| 6 | Framework | Vanilla JS, no framework | ~5 screens, <15 files, zero dependencies |
| 7 | Hosting | GitHub Pages | Free, HTTPS, git-push deploy |
| 8 | Symptom correlations | Build in v1 | Core differentiator for doctor visits |
| 9 | Multi-device restore | Deferred | Not needed for first use |
| 10 | PDF export | Skip | Browser print-to-PDF is sufficient |

---

## Data Model

### IndexedDB Store: "periods"

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (auto) | Unique identifier |
| startDate | ISO 8601 string | Period start date |
| endDate | ISO 8601 string \| null | Period end date (null = ongoing) |
| symptoms | string[] | e.g. ["cramps", "fatigue"] |
| createdAt | timestamp | When entry was created |
| updatedAt | timestamp | Last modification |
| syncedAt | timestamp \| null | Last synced to Sheet (null = never) |

### IndexedDB Store: "settings"

| Field | Type | Description |
|-------|------|-------------|
| theme | "alien" \| "girly" \| "neutral" | Icon mode |
| palette | string | Color palette ID |
| sheetUrl | string \| null | User's Apps Script URL |
| notifyEnabled | boolean | Push notifications on/off |
| notifyDays | number | Days before predicted to notify |

### Computed Metrics (derived, not stored)

| Metric | Derivation |
|--------|------------|
| cycleLengths[] | Days between consecutive startDates |
| periodDurations[] | Days between start and end per entry |
| avgCycleLength | Mean of cycleLengths |
| avgPeriodDuration | Mean of periodDurations |
| predictedNextStart | Last startDate + avgCycleLength |
| currentCycleDay | Today - last startDate |
| currentPhase | Menstrual / Follicular / Ovulatory / Luteal |
| longestCycle | Max of cycleLengths |
| shortestCycle | Min of cycleLengths |
| symptomFrequency | Map of symptom → count per cycle phase |
| symptomCorrelations | "You report X most often during Y phase" |

---

## Screens

### 1. Home

- Cycle day counter: "Day 14 of ~28"
- Current phase label: "Follicular Phase"
- Primary action: big "Period Started" / "Period Ended" button
- Predicted next start date
- Symptom icon row (tap to toggle for today)
- Mode-specific illustration / animation

### 2. Dashboard / Stats

- Average cycle length (with trend arrow ↑↓)
- Average period duration (with trend arrow)
- Longest / shortest cycle
- Month-dot calendar (year view, period days filled, predicted outlined)
- Streak badge: "12 consecutive cycles logged"
- Symptom correlation insights: "You report headaches 2-3 days before your period"

### 3. History

- Chronological list of all period entries
- Each entry: start date, end date, duration, symptoms
- Tap to edit (date pickers for start/end, symptom toggles)
- Swipe or button to delete (with confirmation)
- "Forgot to end" indicator on entries open 10+ days

### 4. Doctor Summary

- Clean, unbranded, medical-looking view
- Date range selector (last 6 months / 12 months / all)
- Summary stats: avg cycle, avg duration, range, trend direction
- Cycle-by-cycle table
- Symptom frequency summary
- @media print CSS for clean printout
- "Copy to clipboard" and "Open Google Sheet" buttons

### 5. Settings

- Theme picker: 3 mode cards (Alien / Girly / Neutral)
- Color palette picker: visual swatches
- Dark mode toggle (or auto with system)
- Google Sheet connection: paste URL, test, status indicator
- Sync status: last sync time, entry count (local vs Sheet)
- Notification preferences: on/off, days before predicted
- About / version / dev mode (tap version 5x → export data JSON)

### 6. Onboarding (first open only)

- Three big visual cards: Alien / Girly / Neutral
- Tap one → app transforms instantly
- Palette selection
- "That's it. Tap the button when your next period starts."
- No forms, no account creation, no email, no terms

---

## Delight Features (all in v1)

| # | Feature | Effort | Description |
|---|---------|--------|-------------|
| 1 | Cycle day counter | S | "Day 14 of ~28" on home screen |
| 2 | Soft prediction | S | "Next period expected ~March 25" |
| 3 | Doctor summary export | M | One-tap clean printable view |
| 4 | Trend arrows | S | ↑↓ on average metrics |
| 5 | Longest/shortest stats | S | Quick reference on dashboard |
| 6 | Onboarding mode picker | M | Three visual cards, instant transform |
| 7 | Period start animation | S | Mode-specific micro-animation (0.5s) |
| 8 | Cycle phase labels | S | "Follicular Phase" toggle-able |
| 9 | Share with doctor flow | M | Copy / print / open Sheet |
| 10 | Streak badge | S | "12 consecutive cycles logged" |
| 11 | Dark mode per palette | M | Each palette has dark variant, auto/manual |
| 12 | Period coming notification | M | Push notification 2-3 days before predicted |
| 13 | Month-dot calendar | M | Year of dots, patterns visible at a glance |
| 14 | Symptom correlations | M | "You report headaches before your period" |
| 15 | First-open empty state | S | Warm message + mode illustration |

---

## Theme System

### Color Palettes (CSS Custom Properties)

Each palette defines: `--color-primary`, `--color-bg`, `--color-surface`,
`--color-text`, `--color-accent`, `--color-period`, `--color-predicted`.
Plus dark-mode variants via `[data-dark="true"]`.

3-5 palettes to start. User picks in Settings. Stored in localStorage.

### Icon Modes

Three full custom SVG icon sets:

- **Alien 👽** — Sci-fi, playful, weird. Period = "transmission received."
  Cramps = lightning bolt. Mood = alien face expressions.
- **Girly 💅** — Warm, expressive, cute. Period = flower/drop.
  Cramps = heat icon. Mood = face emojis with lashes.
- **Gender Neutral 🔵** — Clean, geometric, clinical. Period = circle/dot.
  Cramps = wave. Mood = abstract shapes.

~10-15 feature icons per mode = 30-45 custom SVGs total.
Shared UI icons (settings gear, back arrow, etc.) recolor via CSS.

Implementation: `[data-mode]` attribute on `<html>`, CSS swaps icon references.

---

## Project Structure

```
period-app/
├── index.html                 ← single page shell
├── manifest.json              ← PWA manifest
├── sw.js                      ← service worker
├── css/
│   ├── base.css               ← reset, typography, layout
│   ├── themes/
│   │   ├── palettes.css       ← CSS custom properties per palette
│   │   └── modes.css          ← icon-set overrides per mode
│   └── print.css              ← doctor summary print styles
├── js/
│   ├── app.js                 ← entry point, router, init
│   ├── db.js                  ← IndexedDB wrapper
│   ├── sync.js                ← Google Sheets sync engine
│   ├── metrics.js             ← cycle/duration/prediction/correlation calcs
│   ├── theme.js               ← theme + mode switching
│   └── components/
│       ├── period-button.js   ← start/end toggle with animation
│       ├── symptom-grid.js    ← icon grid for symptom logging
│       ├── cycle-dashboard.js ← stats, trends, dot calendar
│       ├── history-list.js    ← editable period history
│       ├── doctor-summary.js  ← export view
│       ├── settings-view.js   ← theme, Sheet URL, notifications
│       └── onboarding.js      ← first-open mode picker
├── icons/
│   ├── alien/                 ← SVG set (~15 files)
│   ├── girly/                 ← SVG set (~15 files)
│   └── neutral/               ← SVG set (~15 files)
├── tests/
│   └── metrics.test.js        ← unit tests (node --test)
└── sheets/
    ├── template-setup.md      ← instructions for user
    └── apps-script.js         ← Apps Script source (doGet/doPost)
```

~20 files. No build step. No node_modules. No framework.

---

## Google Sheets Sync

### User Setup Flow

1. User taps "Connect Google Sheet" in Settings
2. App shows a link to a published Google Sheet template
3. User clicks "Make a copy" → goes to their Drive
4. User opens Extensions → Apps Script → Deploy as web app
5. User pastes the deployment URL into the app
6. App tests the URL → shows ✅ connected
7. Sync runs automatically in background from now on

### Sync Protocol

- **Direction:** Device → Sheet (one-way push for v1)
- **Trigger:** On every new/edited entry + on app open (if online)
- **Payload:** All entries where `syncedAt < updatedAt`
- **Batching:** Max 50 entries per request
- **Retry:** 3 attempts with exponential backoff (1s, 4s, 16s)
- **Conflict resolution:** Last-write-wins (device is source of truth)
- **Failure:** Silent retry. Persistent failure → badge in Settings.

### Apps Script Endpoints

- `doPost(e)` — receive entries, upsert rows by ID
- `doGet(e)` — health check / return entry count (for sync status)

---

## Error Handling

### "Forgot to End" Detection

If a period entry has been open for 10+ days, the app prompts on next open:
"Your period has been going for 10 days. Still going, or forgot to log the end?"
Options: "Still going" (dismiss for 5 more days) / "Ended on [date picker]"

### Safari Private Browsing

Detected on first load. Shows warning: "Private browsing can't save your data.
Open in a normal browser window." App still renders but disables logging.

### Data Loss Recovery

After 3 logged periods, if no Sheet URL is configured:
"You have 3 cycles logged. Back them up to Google Sheets?"
Nudge — not blocking.

If IndexedDB returns empty but Sheet URL is configured:
"No local data found. Want to check your Google Sheet for a backup?"

### Duplicate Prevention

- "Period Started" debounced (300ms)
- If startDate matches today and an entry already exists: "You already
  logged a period start today. Edit it instead?"

### Data Validation

- Same-day start+end: confirm dialog ("Period lasted less than a day. Sure?")
- 45+ day open period: soft warning ("Unusually long. Correct?")
- Future dates: blocked ("Can't log a period in the future")

---

## Performance Targets

- First Contentful Paint: <1s on 3G
- Total bundle: <100KB (JS + CSS + active icon set)
- Lighthouse performance: >95
- IndexedDB operations: <10ms (expected ~12 entries/year)
- Metrics computation: <1ms (lifetime of data = ~100 entries max)

---

## Testing

### Automated (metrics.test.js)

- avgCycleLength with 0, 1, 2, N periods
- avgDuration with missing endDates
- predictedNextStart accuracy
- currentCycleDay boundary (day of start = 1)
- currentPhase label thresholds
- symptomFrequency counts
- symptomCorrelation detection
- longestCycle / shortestCycle edge cases

Run: `node --test tests/metrics.test.js`

### Manual Checklist

- [ ] Log period start on iOS Safari
- [ ] Log period start on Android Chrome
- [ ] Log period start while offline → verify saved
- [ ] Go online → verify synced to Sheet
- [ ] Edit a past entry → verify metrics update
- [ ] Delete an entry → verify metrics update
- [ ] Switch all 3 icon modes → verify icons change
- [ ] Switch all palettes → verify colors change
- [ ] Toggle dark mode → verify
- [ ] Paste bad Sheet URL → verify graceful error
- [ ] Clear site data → verify empty state shows
- [ ] Open doctor summary with 0, 1, 5 periods
- [ ] Print doctor summary → verify clean layout

---

## Deployment

1. Push to GitHub repo
2. Enable GitHub Pages (main branch, root)
3. Verify HTTPS + manifest + SW install
4. Publish Google Sheet template (public, view-only, "Make a copy")
5. Test full flow: install → log → sync → verify Sheet
6. Share URL

---

## NOT In Scope

| Item | Rationale |
|------|-----------|
| User accounts / auth | No server by design |
| Multi-device restore | Deferred — not needed for first use |
| Partner notifications | Phase 3 |
| Fertility / contraception tracking | Different problem |
| Apple Health / Google Fit export | Requires native APIs |
| AI-powered insights | Simple math is better and more trustworthy |
| Community features | Not the app's job |
| PDF generation library | Browser print is sufficient |
