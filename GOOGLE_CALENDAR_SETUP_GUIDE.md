# Krishna Valley ERP: Google Calendar Direct Follow-Up Mapping Setup Guide

This guide walks you through connecting your **Google Calendar** with the **Krishna Valley ERP System** so that **every follow-up, call, site visit, and meeting scheduled in the CRM is directly and automatically mapped to your Google Calendar**.

---

## 🌟 How the Integration Works

1. **Automatic Direct Sync (Server-to-Server)**:
   Whenever an agent or sales head logs, schedules, reschedules, or cancels a follow-up in the CRM:
   - The ERP calls the **Google Calendar API**.
   - An event is created/updated directly on your shared Google Calendar (`krishna.valley.tech@gmail.com`).
   - The event includes:
     - **Title**: `[🏡 Site Visit] Client Name (+91 98765...)` or `[📞 Phone Call] Client Name`
     - **Date & Time**: Exact scheduled slot in `Asia/Kolkata` (IST).
     - **Location**: Automatically set to Krishna Valley Campus (NH-19, Vrindavan) for site visits.
     - **Description**: Client details, property of interest, budget, assigned representative, discussion agenda/notes, and direct link to open the lead in the ERP.
     - **Pop-Up Reminders**: Automatic notifications 30 minutes before and 1 day before.

2. **1-Click "Add to Personal Calendar" Link**:
   Even without setting up the Google Cloud API, every sales representative can click the **`+ Add to Google Calendar`** button on any follow-up card or modal to immediately add it to their personal phone calendar in 1 click!

---

## 🛠️ Step-by-Step Setup (Takes ~3-5 Minutes)

You will use a **Google Cloud Service Account** (Google's official, free, secure method for automated server applications).

### Step 1: Create or Select a Google Cloud Project
1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Log in with your Google account (e.g. `krishna.valley.tech@gmail.com`).
3. Click the project dropdown at the top &rarr; Click **"New Project"**.
4. Name it `Krishna Valley ERP` and click **"Create"**.

---

### Step 2: Enable the Google Calendar API
1. In the Google Cloud Console search bar at the top, search for:
   `Google Calendar API`
2. Click on **Google Calendar API** in the marketplace results.
3. Click the blue **"Enable"** button.

---

### Step 3: Create a Service Account and Download the Key
1. In the left-hand navigation menu (☰), go to **IAM & Admin** &rarr; **Service Accounts**.
2. Click **"+ Create Service Account"** at the top.
3. Fill in:
   - **Service account name**: `krishna-valley-calendar`
   - **Service account ID**: (automatically filled, e.g. `krishna-valley-calendar@...iam.gserviceaccount.com`)
   - Click **"Create and Continue"**, then click **"Done"**.
4. You will see your new service account in the table. Click on its email address.
5. Go to the **"Keys"** tab at the top.
6. Click **"Add Key"** &rarr; **"Create new key"**.
7. Select **JSON** and click **"Create"**.
8. A `.json` file will automatically download to your computer.

---

### Step 4: Share Your Google Calendar with the Service Account (Crucial Step!)
1. Open your downloaded `.json` file in Notepad. Look for the `client_email` field.
   It looks like:
   `krishna-valley-calendar@your-project-id.iam.gserviceaccount.com`
   *(Copy this email address)*.
2. Open [Google Calendar](https://calendar.google.com) in your browser.
3. On the left sidebar, find your calendar under **"My calendars"** (or create a new calendar called *"Krishna Valley Follow-ups"*).
4. Hover over the calendar name &rarr; click the three vertical dots (⋮) &rarr; **"Settings and sharing"**.
5. Scroll down to **"Share with specific people or groups"**.
6. Click **"+ Add people and groups"**.
7. Paste the Service Account email address (`...iam.gserviceaccount.com`).
8. Under **Permission**, select:
   👉 **"Make changes to events"**
9. Click **"Send"**.

---

### Step 5: Save Credentials in Krishna Valley ERP Hub
1. Log into your ERP dashboard and go to **Notifications** &rarr; Click the **"Google Calendar Sync"** tab.
2. Click the blue button:
   **"Import from Service Account JSON Key"**
3. Open the downloaded `.json` file in Notepad, copy all text, paste it into the dialog, and click **"Auto-Extract & Populate"**.
   *(It will automatically fill in the Service Account Email and Private Key)*.
4. Set **Target Google Calendar ID** to:
   `krishna.valley.tech@gmail.com` *(or `primary`)*.
5. Click **"Save Google Calendar Settings"**.
6. Click **"Test Google Calendar Connection"**.
   - You will see a green badge: **"Google Calendar connected successfully!"**

---

### Step 6: Sync All Existing Pending Follow-Ups (Optional)
Click the button:
**"⚡ Sync All Pending Follow-Ups Now"**
The system will loop through all existing pending follow-ups in the CRM and map them straight into your Google Calendar!

---

## 📱 Mobile Access for Sales Team
To see all follow-ups on your phone:
1. Open the **Google Calendar App** on Android or iPhone.
2. Ensure you are signed in to the Google account where the calendar resides (or where you shared it).
3. All client meetings, calls, and site visits scheduled by anyone in the Krishna Valley ERP will instantly ring and notify you on your phone!
