# Krishna Valley ERP: Brevo (Sendinblue) Setup Guide

This guide walks you through setting up **Brevo** (formerly Sendinblue) as your email provider for the **Krishna Valley ERP System**. 

Brevo is the ideal solution when you **do not have a custom domain**, giving you **300 free emails per day** with **high inbox delivery** directly from your verified Gmail address (`krishna.valley.tech@gmail.com`).

---

## 🌟 Why Brevo is the Best Zero-Domain Solution

| Feature | Resend (Without Domain) | Gmail SMTP App Password | Brevo (Free Tier) |
| :--- | :---: | :---: | :---: |
| **No Custom Domain Needed** | ❌ (Own inbox only) | ⚠️ (Requires manual App PW) | ✅ **100% Yes** |
| **Send to Any Client Inbox** | ❌ (Blocked) | ⚠️ (Risk of landing in Spam) | ✅ **Yes (Pre-warmed IPs)** |
| **Free Daily Allowance** | 100/day (Test only) | 500/day | ✅ **300 emails/day** |
| **Sender Address** | `onboarding@resend.dev` | `krishna.valley.tech@gmail.com` | ✅ `krishna.valley.tech@gmail.com` |
| **Branded Sender Name** | "Krishna Valley" | "Krishna Valley" | ✅ "Krishna Valley Client Services" |
| **Setup Time** | — | ~10 minutes | ✅ **~3 minutes** |

---

## 🛠️ Step-by-Step Setup (Takes ~3 Minutes)

### Step 1: Create a Free Brevo Account
1. Open the [Brevo Signup Page](https://www.brevo.com/signup).
2. Register with your company email:
   * **Email**: `krishna.valley.tech@gmail.com`
   * Choose a secure password.
3. Check your Gmail inbox and click the verification link sent by Brevo.
4. Complete the quick profile setup (Company Name: `Krishna Valley Infrastructure & Developers Pvt. Ltd.`).

---

### Step 2: Add & Verify Your Sender Address (Takes 30 Seconds)
1. In the Brevo dashboard, click your profile icon (top right) &rarr; **Senders, Domains & Dedicated IPs**  
   *(or directly open [app.brevo.com/senders](https://app.brevo.com/senders))*.
2. In the **Senders** tab, click **"+ Add a sender"**.
3. Fill in:
   * **From Name**: `Krishna Valley Client Services`
   * **From Email**: `krishna.valley.tech@gmail.com`
4. Click **Save**.
5. Brevo will send a **6-digit verification code** to `krishna.valley.tech@gmail.com`.
6. Enter the 6-digit code in Brevo.
7. Your sender status will immediately turn **Active & Verified (Green)**!

---

### Step 3: Generate Your Brevo API Key
1. Go to [app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api).
2. Click the blue **"+ Generate a new API key"** button.
3. Name your key: `Krishna Valley ERP Live`.
4. Click **Generate**.
5. **Copy the API key** (it begins with `xkeysib-...`).
   *(Save this key, as Brevo only shows it once).*

---

### Step 4: Configure Krishna Valley ERP
1. Log in to your **Krishna Valley ERP** dashboard.
2. Go to **Notifications & Telephony Hub** (or **Settings** &rarr; **Notifications**).
3. Click the **"Email Gateway"** tab.
4. In the **Email Service Provider** selector at the top, click:
   👉 **`🚀 Brevo (Sendinblue)`**
5. Fill in the fields:
   * **Brevo API Key**: Paste your `xkeysib-...` key.
   * **From Email**: `krishna.valley.tech@gmail.com`
   * **From Display Name**: `Krishna Valley Client Services`
   * **Reply-To Email**: `krishna.valley.tech@gmail.com`
   * **Environment Mode**: Select `Production`
   * **Channel Active**: Toggle **ON**
6. Click **"Save Configuration"**.
7. Click the green button: **"Verify Brevo API Key"**.
   * You will see:
     > `Brevo API Key verified successfully! Connected to account: krishna.valley.tech@gmail.com`

---

### Step 5: Send a Test Email to Any Recipient
1. On the same Email Settings card, click the orange **"Send Test Email"** button.
2. Enter **any recipient address** (e.g. your personal email, an employee email, or a test client email).
3. Click **"Dispatch Test"**.
4. Check the recipient's inbox!
   * The email arrives with full Krishna Valley branding.
   * Delivered directly to the **Primary Inbox**.

---

## ⚡ Alternative: Brevo SMTP Relay (If Preferred)

If you prefer using standard SMTP instead of the REST API, Brevo also provides SMTP credentials:

1. Open [app.brevo.com/settings/keys/smtp](https://app.brevo.com/settings/keys/smtp).
2. Your credentials are:
   * **Host**: `smtp-relay.brevo.com`
   * **Port**: `587`
   * **Username**: Your Brevo login email
   * **Master Password**: Click *"Generate a new SMTP key"* to get your `xsmtpsib-...` password.
3. In Krishna Valley ERP, you can select `Custom SMTP Server` and enter these credentials.

---

## 📊 Daily Limits & Quotas
* **Free Tier**: **300 emails per day** (9,000 emails per month).
* Quota resets every 24 hours at midnight UTC.
* Ideal for:
  - Lead follow-up reminders
  - Site visit confirmations
  - Customer payment receipts & demand notices
  - Rental agreement notifications
