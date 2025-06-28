# Secure File Download Portal

This project creates a secure, one-time-use code portal for downloading specific files from Google Drive. It is built entirely on the Google Workspace platform using Google Apps Script and Google Sheets, making it a powerful, serverless solution that can be managed by non-developers after initial setup.

The application features a simple user interface for entering a download code and a separate, password-protected administrative dashboard for creating and managing these download links.

## Features

-   **Secure, One-Time Use Codes:** Each 6-digit code can only be used to download its assigned file once.
-   **Admin Dashboard:** A password-protected interface to view active codes and create new download links.
-   **Automated Code Management:** Codes are automatically moved from an "Active" to a "Complete" list upon use, providing an audit trail.
-   **Code Reuse:** Used codes can be safely reassigned to new files, preventing code exhaustion.
-   **Serverless Architecture:** Runs entirely on Google's infrastructure, requiring no separate web server or database hosting.
-   **Embeddable:** Designed to be easily embedded into any HTML webpage, including WordPress or Google Sites.

## How It Works: System Architecture

The application uses a simple but powerful combination of Google Workspace tools:

1.  **Front-End (HTML & JavaScript):** A single-page web application built with vanilla HTML, CSS, and JavaScript. It provides the user interface for both regular users and administrators. This is served by Google Apps Script.
2.  **Backend (Google Apps Script - `Code.gs`):** The server-side engine that handles all the logic. It communicates with the Google Sheet database to validate codes, generate secure download links, move records, and generate new codes.
3.  **Database (Google Sheets):** A single Google Sheet acts as the database, containing two tabs:
    *   **`Active`:** A list of all currently valid download codes, their corresponding file names, and the original Google Drive file URLs.
    *   **`Complete`:** An archive of used codes. When a file is downloaded, its entry is moved here along with a timestamp, deactivating the code.

## Installation and Setup Guide

Follow these steps to deploy your own instance of the File Download Portal.

### Phase 1: Prepare the Google Sheet Database

1.  **Create a Google Sheet:** Go to [sheets.google.com/create](https://sheets.google.com/create) and create a new spreadsheet. Name it something clear, like "File Download Portal Data".
2.  **Create Two Tabs:**
    *   Rename the default "Sheet1" tab to **`Active`**.
    *   Click the `+` icon at the bottom to add a new sheet. Rename this second tab to **`Complete`**.
3.  **Add Headers:** In the very first row of **both** the `Active` and `Complete` sheets, add the following column headers exactly as written:
    *   Cell `A1`: `Download Code`
    *   Cell `B1`: `File Name`
    *   Cell `C1`: `File URL`
    *   Cell `D1`: `Date Created`
    *   **In the `Complete` sheet only**, add an additional header in Cell `E1`: `Date Completed`

### Phase 2: Create the Google Apps Script Project

1.  **Open the Script Editor:** From within your newly created Google Sheet, click **Extensions > Apps Script**. A new script project, bound to this sheet, will open.
2.  **Name the Project:** Click on "Untitled project" at the top left and give it a name, like "File Download Portal".
3.  **Add Project Files:**
    *   **`Code.gs`:** Delete the default content and paste the full contents of the `Code.gs` file from this repository.
    *   **`index.html`:** Click the `+` icon next to "Files" and select **HTML**. Name the file `index.html`. Delete the default content and paste the full contents of the `index.html` file from this repository.
4.  **Configure the Script:**
    *   In the `Code.gs` file, find the line `const ADMIN_PASSWORD = "---SET YOUR STRONG ADMIN PASSWORD HERE---";`
    *   Replace the placeholder text with a secure password of your choice. This will be used to access the admin dashboard.
5.  **Save the project** by clicking the floppy disk icon (💾).

### Phase 3: Set File Sharing Permissions

This is a critical step for the download links to work for external users.

1.  For every file in your Google Drive that you intend to make downloadable, you must set its sharing permission.
2.  Right-click the file in Google Drive and select **Share**.
3.  Under "General access", change the setting from "Restricted" to **"Anyone with the link"**.
4.  Ensure the role is set to **Viewer**.
5.  Click **Done**.

### Phase 4: Deploy the Web App

1.  In the Apps Script editor, click the blue **Deploy** button > **New deployment**.
2.  **Authorize Permissions:** A dialog will appear asking for permission to access your Google Sheets and Drive. This is required for the script to function.
    *   Click **Authorize access**.
    *   Choose your Google account.
    *   You may see a "Google hasn't verified this app" warning. Click **"Advanced"**, then click **"Go to [Your Project Name] (unsafe)"**.
    *   Click **"Allow"** on the final permissions screen.
3.  **Configure Deployment:**
    *   Click the gear icon (⚙️) next to "Select type" and choose **Web app**.
    *   **Description:** (Optional) Add a description for this deployment.
    *   **Execute as:** `Me` (your Google account).
    *   **Who has access:** `Anyone`.
4.  Click **Deploy**.
5.  **Copy the Web App URL:** A dialog will appear with the deployment URL (it ends in `/exec`). **Copy this URL.** This is the public link to your application.

## How to Embed on an HTML Webpage (e.g., WordPress)

You can embed the portal directly into any webpage that allows you to edit its HTML. This requires adding the `setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` method in the `doGet` function of `Code.gs`, which is already included in the provided file.

### Simple (Fixed-Size) Embed

This is the quickest method. It works well on desktop but may require vertical scrolling on mobile.

```
<iframe 
  src="---PASTE YOUR WEB APP URL HERE---" 
  style="width: 100%; height: 800px; border: none;">
</iframe>
```

### Responsive Embed (Recommended)

This method uses CSS to create a much better experience on mobile devices.

1.  Paste this entire code block into your webpage's HTML editor.
2.  Replace the placeholder URL with your Web App URL.

```
<style>
  /* This targets the iframe using its unique ID */
  #file-download-portal-iframe {
    /* Default styles for desktop and larger screens */
    width: 100%;
    height: 800px; /* A good default height for desktop */
    border: none;   /* Removes the default iframe border */
    display: block; /* Helps prevent extra space below the iframe */
    margin: 0 auto; /* Centers the iframe if the container is wider */
  }

  /* This is a Media Query for mobile devices */
  /* It applies the styles inside only when the screen width is 768px or less */
  @media (max-width: 768px) {
    #file-download-portal-iframe {
      /* On mobile, make the iframe fill the entire vertical height of the screen */
      height: 100vh; 
    }
  }
</style>

<iframe 
  id="file-download-portal-iframe" 
  src="---PASTE YOUR WEB APP URL HERE---">
</iframe>
```
