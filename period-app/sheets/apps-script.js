/**
 * Google Apps Script for Period Tracker sync.
 * Paste this into your Sheet's Apps Script editor, then Deploy as Web app.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const entries = data.entries || [];
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['id', 'startDate', 'endDate', 'symptoms', 'createdAt', 'updatedAt', 'syncedAt']);
    }

    for (const entry of entries) {
      const id = entry.id || '';
      const rows = sheet.getDataRange().getValues();
      let found = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === id) {
          found = i;
          break;
        }
      }

      const row = [
        id,
        entry.startDate || '',
        entry.endDate || '',
        (entry.symptoms || []).join(','),
        entry.createdAt || '',
        entry.updatedAt || '',
        entry.syncedAt || Date.now(),
      ];

      if (found >= 0) {
        sheet.getRange(found + 1, 1, found + 1, 7).setValues([row]);
      } else {
        sheet.appendRow(row);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const count = Math.max(0, sheet.getLastRow() - 1);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, count }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
