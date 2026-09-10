# Krishna Valley ERP: Resend Email Gateway Setup Guide

This guide walks you through the complete setup of **Resend** for the **Krishna Valley ERP System**—enabling automated, high-deliverability email dispatch for payment receipts, allotment letters, demand notices, site visit confirmations, and CRM lead follow-ups.

---

## 📌 Current System Status

* **Status**: 🟢 **Operational & Verified**
* **Active API Key**: Configured in MongoDB and `.env` (`re_QPvn...`)
* **Current Mode**: **Resend Sandbox / Testing Mode** (`onboarding@resend.dev`)
* **Authorized Recipient in Sandbox**: `krishna.valley.tech@gmail.com`

> [!NOTE]
> **Why set up a custom domain?**
> In Resend Testing Mode (`onboarding@resend.dev`), emails can **only** be sent to your registered account (`krishna.valley.tech@gmail.com`). 
> To send official emails directly to **any customer, buyer, or lead email address**, follow **Step 2** below to add and verify your custom domain (e.g. `krishnavalley.com`).

---

## 🛠️ Step-by-Step Setup

### Step 1: Accessing Your Resend Account
1. Visit the [Resend Dashboard](https://resend.com/login).
2. Log in with your registered account:
   * **Email**: `krishna.valley.tech@gmail.com`
3. You will see your dashboard showing dispatch statistics, recent emails, and API settings.

---

### Step 2: Add & Verify Your Custom Domain (To Email Any Client)
This is the most important step to unlock sending emails to all external clients from your company domain (e.g. `@krishnavalley.com`).

1. In the left sidebar of Resend, click on [Domains](https://resend.com/domains).
2. Click the black **"Add Domain"** button.
3. Enter your domain name:
   * **Option A (Subdomain - Recommended)**: `mail.krishnavalley.com` or `send.krishnavalley.com`  
     *(Recommended by email deliverability standards so transactional mail does not conflict with corporate inbox mail)*
   * **Option B (Root Domain)**: `krishnavalley.com`
4. Choose your region (e.g. `ap-south-1` / `Mumbai` or `us-east-1` / `North Virginia`) and click **"Add Domain"**.

---

### Step 3: Add DNS Records to Your Domain Provider
Resend will display DNS records that need to be added where your domain is hosted (e.g. **GoDaddy**, **Cloudflare**, **Hostinger**, **Namecheap**, or **AWS Route 53**).

You will typically add 3 records:

| Type | Name / Host | Value / Target | Priority | Purpose |
| :--- | :--- | :--- | :---: | :--- |
| **MX** | `mail` *(or subdomain)* | `feedback-smtp.us-east-1.amazonses.com` | `10` | Mail Routing |
| **TXT (SPF)** | `mail` *(or subdomain)* | `v=spf1 include:amazonses.com ~all` | — | Sender Verification |
| **TXT (DKIM)** | `resend._domainkey` | *Unique key provided in your Resend dashboard* | — | Anti-Spoofing Signature |

#### How to add records in common providers:
* **GoDaddy / Hostinger**: Go to **DNS Management** &rarr; Click **Add Record** &rarr; Select Type (TXT / MX) &rarr; Copy & paste the values from Resend.
* **Cloudflare**: Go to **DNS** &rarr; **Records** &rarr; Add the TXT and MX records &rarr; Ensure proxy is set to **DNS Only** (gray cloud).

Once added, click **"Verify Domain"** in Resend.
* DNS verification usually takes **2 to 10 minutes** (status will change from `Pending` to green `Verified`).

---

### Step 4: Configure Krishna Valley ERP

Once your domain is verified (or while using Sandbox for testing):

1. Log into **Krishna Valley ERP**.
2. Navigate to **Notifications & Telephony Hub** (or **Settings** &rarr; **Notifications**).
3. Click the **"Email Gateway"** tab.
4. Set the fields:
   * **Provider**: Select `Resend (Modern Cloud API)`.
   * **Resend API Key**: Paste your key (starts with `re_...`) or keep the existing active key.
   * **From Email**:
     * If domain verified: `notifications@krishnavalley.com` (or `info@mail.krishnavalley.com`)
     * If still in testing: `onboarding@resend.dev`
   * **From Name**: `Krishna Valley ERP` or `Krishna Valley Client Services`
   * **Reply-To Email**: `krishna.valley.tech@gmail.com` or `support@krishnavalley.com`
   * **Environment**: `production` (or `sandbox` for simulation)
   * **Channel Active**: Toggle **ON**
5. Click **"Save Configuration"**.
6. Click the green **"Verify Resend API Key"** button. You will see:
   > `Resend API Key verified successfully! Email dispatch gateway is ready.`

---

### Step 5: Send a Test Email
1. On the same Email settings card, click **"Send Test Email"**.
2. Enter the destination email:
   * If on verified domain: Enter **any email address** (e.g. your personal email or client email).
   * If on `onboarding@resend.dev`: Enter `krishna.valley.tech@gmail.com`.
3. Click **"Dispatch Test"**.
4. Check your inbox! The email will arrive in a Krishna Valley branded email template with:
   * Krishna Valley official header & branding
   * Direct contact links
   * Footer with registered Vrindavan campus address

---

## ⚡ Alternative: Sending via Gmail SMTP (No Domain Required)

If you do not have access to your domain's DNS manager right now but want to send emails to **any client** immediately, you can switch to **Custom SMTP Relay** using a **Gmail App Password**:

1. Open your Google Account for `krishna.valley.tech@gmail.com`.
2. Go to **Security** &rarr; Enable **2-Step Verification** (if not already enabled).
3. Search for **"App Passwords"** in the Google search bar.
4. Create a new App Password named `Krishna Valley ERP`.
5. Copy the generated 16-letter password (e.g. `abcd efgh ijkl mnop`).
6. In **Krishna Valley ERP &rarr; Notification Hub &rarr; Email Gateway**:
   * Change Provider to `Custom SMTP Server`
   * **Host**: `smtp.gmail.com`
   * **Port**: `587` (Secure: unchecked) or `465` (Secure: checked)
   * **Username**: `krishna.valley.tech@gmail.com`
   * **Password**: Paste the 16-letter Google App Password
   * **From Email**: `krishna.valley.tech@gmail.com`
7. Click **"Verify SMTP Connection"** and **"Save Configuration"**.

---

## 🔍 Troubleshooting & FAQs

### Q1: Error 403: "You can only send testing emails to your own email address..."
* **Cause**: You are sending from `onboarding@resend.dev` to an address other than `krishna.valley.tech@gmail.com`.
* **Fix**: Complete Step 2 & 3 above to verify your custom domain, and change `fromEmail` to your domain (e.g. `notifications@krishnavalley.com`).

### Q2: How do I generate a new Resend API key?
* Go to [resend.com/api-keys](https://resend.com/api-keys).
* Click **"Create API Key"**.
* Name: `Krishna-Valley-ERP-Live`.
* Permission: **Full Access** or **Sending Access**.
* Copy the `re_...` key immediately and save it in ERP Settings or `backend/.env`.

### Q3: What is the Resend Free Tier limit?
* **3,000 emails per month**
* **100 emails per day**
* This is more than sufficient for day-to-day ERP alerts and customer receipts. If higher volume is needed, Resend's Pro tier is $20/month for 50,000 emails.

### Q4: Where can I see logs of sent emails?
* In **Krishna Valley ERP**: Open **Notifications Hub** &rarr; **Audit Logs** tab (filter by `Email`).
* In **Resend Dashboard**: Open [resend.com/emails](https://resend.com/emails) to view delivery status, opens, clicks, and bounce reports in real time.
