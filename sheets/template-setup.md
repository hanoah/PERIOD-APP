# Google Sheet Setup

## 1. Create a new Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Rename it (e.g. "Period Tracker Data").

## 2. Add column headers

In row 1, add these headers:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | startDate | endDate | symptoms | createdAt | updatedAt | syncedAt |

## 3. Add Apps Script

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete any default code and paste the contents of `apps-script.js`.
3. Save (Ctrl+S).

## 4. Deploy as web app

1. Click **Deploy → New deployment**.
2. Select type: **Web app**.
3. Description: "Period Tracker Sync"
4. Execute as: **Me**
5. Who has access: **Anyone** (the URL is secret; only you will use it)
6. Click **Deploy**.
7. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/XXXX/exec`).

## 5. Connect to the app

1. Open the Period Tracker app.
2. Go to **Settings**.
3. Paste the Web app URL into the "Apps Script URL" field.
4. Click **Save**.

Your data will sync to this Sheet when you're online.
