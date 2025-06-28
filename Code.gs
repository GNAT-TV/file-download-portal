/**
 * @fileoverview This is the server-side backend for the "File Download Portal" web app.
 * It handles all logic for validating codes, generating download links, and managing
 * administrative functions. This script is intended to be container-bound to the
 * Google Sheet that serves as its database.
 */

// --- CONFIGURATION ---

/**
 * The password required to access the administrative dashboard.
 * IMPORTANT: Change this to a strong, unique password.
 * @type {string}
 */
const ADMIN_PASSWORD = "---SET YOUR STRONG ADMIN PASSWORD HERE---"; 

// --- SPREADSHEET CONSTANTS ---
const ACTIVE_SHEET_NAME = "Active";
const COMPLETE_SHEET_NAME = "Complete";


// --- WEB APP ENDPOINTS ---

/**
 * Serves the main HTML page for the web application when a user visits the URL.
 *
 * The .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) method is
 * the critical setting that permits this Web App to be embedded in an iframe
 * on an external website (like WordPress). Without this, browsers will block
 * the connection with a "refused to connect" error.
 *
 * @param {object} e - The event parameter for a GET request.
 * @returns {HtmlOutput} The HTML service output to be rendered in the browser.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('File Download Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// --- USER-FACING FUNCTIONS (Called via google.script.run from index.html) ---

/**
 * Checks if a user-provided download code is valid by searching for it in the 'Active' sheet.
 * @param {string} code - The 6-digit code entered by the user.
 * @returns {{success: boolean, fileName: string}|{success: boolean, error: string}} An object containing either the file name on success or an error message on failure.
 */
function checkCode(code) {
  if (!code || code.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit code.' };
  }
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACTIVE_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Iterate through rows, starting from 1 to skip the header row.
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === code) {
      // Found a valid code. Return the file name for display.
      return { success: true, fileName: data[i][1] };
    }
  }
  
  return { success: false, error: 'Invalid or expired download code.' };
}

/**
 * Finalizes a download by generating a direct link and moving the record
 * from the 'Active' sheet to the 'Complete' sheet to prevent reuse.
 * @param {string} code - The 6-digit code to finalize.
 * @returns {{success: boolean, downloadUrl: string}|{success: boolean, error: string}} An object with the direct download URL on success or an error message on failure.
 */
function getDownloadLinkAndFinalize(code) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getSheetByName(ACTIVE_SHEET_NAME);
  const completeSheet = ss.getSheetByName(COMPLETE_SHEET_NAME);
  const data = activeSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === code) {
      const rowData = data[i];
      const fileUrl = rowData[2];
      const fileId = extractFileIdFromUrl_(fileUrl);
      
      if (!fileId) {
        return { success: false, error: 'Invalid Google Drive URL format in the database.' };
      }
      
      // Transactional Step 1: Append the used record to the 'Complete' sheet with a timestamp.
      completeSheet.appendRow([rowData[0], rowData[1], rowData[2], rowData[3], new Date()]);
      
      // Transactional Step 2: Delete the record from the 'Active' sheet.
      activeSheet.deleteRow(i + 1); // +1 because sheet rows are 1-indexed, array is 0-indexed
      
      // Create a direct download link that forces the browser to download instead of preview.
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      return { success: true, downloadUrl: downloadUrl };
    }
  }
  
  return { success: false, error: 'Code not found. It may have already been used.' };
}


// --- ADMIN FUNCTIONS (Called via google.script.run from index.html) ---

/**
 * Checks if the provided admin password matches the configured password.
 * @param {string} password - The password entered by the admin.
 * @returns {{success: boolean}|{success: boolean, error: string}} An object indicating success or failure.
 */
function checkAdminPassword(password) {
  if (password === ADMIN_PASSWORD) {
    return { success: true };
  }
  return { success: false, error: 'Incorrect password.' };
}

/**
 * Retrieves all data from the 'Active' sheet and converts Date objects into
 * strings to ensure they can be sent to the client-side correctly.
 * @returns {Array<Array<string>>} A 2D array of the active download data, safe for transport.
 */
function getActiveDownloads() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACTIVE_SHEET_NAME);
  const allData = sheet.getDataRange().getValues();
  
  // If the sheet has 1 row (just the header) or is empty, return an empty array.
  if (allData.length <= 1) {
    return [];
  }
  
  // Get all rows except the header.
  const dataRows = allData.slice(1);
  
  // Use .map() to create a new array with the Date object in column 3 converted to a string.
  // This is critical because google.script.run cannot serialize Date objects.
  const serializableData = dataRows.map(row => {
    if (row[3] && row[3] instanceof Date) {
      const newRow = [...row];
      newRow[3] = row[3].toISOString();
      return newRow;
    }
    return row;
  });
  
  return serializableData;
}

/**
 * Creates a new download entry by generating a unique code and adding it to the 'Active' sheet.
 * @param {{fileName: string, fileUrl: string}} fileInfo - An object containing the display name and Google Drive URL for the new file.
 * @returns {{success: boolean, newCode: string}|{success: boolean, error: string}} An object with the newly generated code on success or an error on failure.
 */
function addDownload(fileInfo) {
  const { fileName, fileUrl } = fileInfo;
  if (!fileName || !fileUrl) {
    return { success: false, error: 'File name and URL are required.' };
  }
  if (!extractFileIdFromUrl_(fileUrl)) {
    return { success: false, error: 'The provided URL does not appear to be a valid Google Drive file link.' };
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACTIVE_SHEET_NAME);
  const newCode = generateUniqueCode_();
  
  // Append the new record with the current timestamp.
  sheet.appendRow([newCode, fileName, fileUrl, new Date()]);
  
  return { success: true, newCode: newCode };
}


// --- HELPER FUNCTIONS ---

/**
 * Generates a unique 6-digit code that is not currently in use in the 'Active' sheet.
 * It continues to generate new codes until a unique one is found.
 * @private
 * @returns {string} The unique 6-digit code.
 */
function generateUniqueCode_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACTIVE_SHEET_NAME);
  const allData = sheet.getDataRange().getValues();
  // Get all existing codes to prevent collisions.
  const existingCodes = allData.length > 1 ? allData.slice(1).map(row => row[0].toString()) : [];
  let newCode;
  do {
    newCode = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existingCodes.includes(newCode));
  return newCode;
}

/**
 * Extracts the Google Drive file ID from various common Google Drive URL formats.
 * @private
 * @param {string} url - The Google Drive URL.
 * @returns {string|null} The file ID if found, otherwise null.
 */
function extractFileIdFromUrl_(url) {
  // Regular expression to find the Google Drive file ID.
  const regex = /\/d\/([a-zA-Z0-9_-]{25,})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
