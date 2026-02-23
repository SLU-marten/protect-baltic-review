// ---------------------------------------------------------------------------
// Google Sheets integration via Apps Script web app
// ---------------------------------------------------------------------------

const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyQpdrMP4zndOsBd1ROk603iYiEafKK2Q1lrmXS9anthy2BdflULw7mfo-DdC3wy0AW/exec';

export interface ReviewPayload {
  category: string;
  scientific_name: string;
  reviewer_name: string;
  flag: string;
  comment: string;
}

/**
 * Submits a review to the Google Spreadsheet.
 * Throws on network failure.
 */
export async function submitReviewToSheet(payload: ReviewPayload): Promise<void> {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // Apps Script web apps require no-cors from browsers
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // With no-cors we get an opaque response (status 0).
  // If fetch itself doesn't throw, we consider it sent.
  // If we're NOT in no-cors mode (e.g., during testing), check status.
  if (response.type !== 'opaque' && !response.ok) {
    throw new Error(`Failed to submit review: HTTP ${response.status}`);
  }
}
