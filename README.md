# Period Tracker

A private, local-first PWA for tracking periods and symptoms. Your data stays on your device.

## Run locally

```bash
cd period-app
npx serve -p 3456
```

Open http://localhost:3456

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Settings → Pages → Source: Deploy from a branch
3. Branch: main, Folder: select `period-app` (or root if you move files)
4. Save

## Google Sheet backup

See [sheets/template-setup.md](sheets/template-setup.md) for connecting your own Google Sheet.

## Development

- **Tests:** `node --test tests/metrics.test.js`
- **Icons:** Add custom SVGs to `icons/alien/`, `icons/girly/`, `icons/neutral/` (see icons/README.md)
