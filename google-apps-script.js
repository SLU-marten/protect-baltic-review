// =============================================================================
// Google Apps Script — Habitat Review Receiver
//
// SETUP:
// 1. Open your Google Spreadsheet
// 2. Go to Extensions → Apps Script
// 3. Replace the default code with this entire file
// 4. Click Deploy → New deployment
//    - Type: Web app
//    - Execute as: Me (your email)
//    - Who has access: Anyone
// 5. Click Deploy and copy the Web App URL
// 6. Paste the URL into src/utils/google-sheets.ts (GOOGLE_SCRIPT_URL)
//
// The spreadsheet will automatically get a header row on first submission.
// Each review adds one row with: timestamp, category, scientific_name,
// reviewer_name, flag, comment
// =============================================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'timestamp',
        'category',
        'scientific_name',
        'reviewer_name',
        'flag',
        'comment'
      ]);
    }

    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date().toISOString(),
      data.category || '',
      data.scientific_name || '',
      data.reviewer_name || '',
      data.flag || '',
      data.comment || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Required for CORS preflight (though no-cors mode skips this)
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Habitat Review endpoint is active' }))
    .setMimeType(ContentService.MimeType.JSON);
}
