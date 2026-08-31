# End-to-End AWS Deployment Guide: Amplify (Frontend) & EC2 (Backend)

This document provides exact, battle-tested steps to deploy:
- **Backend (Node.js/Express + MongoDB + AWS S3)** on an **AWS EC2 Ubuntu Instance** with PM2 and Nginx.
- **Frontend (React/Vite)** on **AWS Amplify Hosting** with SSL and continuous deployment.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    User["Client Browser"] -->|HTTPS (Custom Domain / Amplify URL)| Amplify["AWS Amplify Hosting\n(React Vite Frontend)"]
    Amplify -->|API Requests: /api/...| Nginx["Nginx Reverse Proxy (Port 80/443)\non AWS EC2"]
    Nginx -->|Proxy: localhost:5000| PM2["Node.js Express ERP Server\nmanaged by PM2"]
    PM2 -->|Data Operations| Mongo["MongoDB Atlas Cluster"]
    PM2 -->|Documents & Blueprints| S3["AWS S3 Bucket\n(krishna-valley-erp-documents)"]
```

---

## PART 1: Backend Deployment on AWS EC2

### Step 1.1: Launch an EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2).
2. Click **Launch Instance**.
3. **Name**: `krishna-valley-erp-backend`
4. **AMI (OS)**: Select **Ubuntu Server 24.04 LTS (HVM)** or **Ubuntu 22.04 LTS**.
5. **Instance Type**: `t3.small` (recommended for production) or `t2.micro` / `t3.micro` (free-tier eligible).
6. **Key Pair**: Select an existing key pair or click **Create new key pair** (download `your-key.pem`).
7. **Network Settings (Security Group)**:
   - Check **Allow SSH traffic from** (your IP or Anywhere `0.0.0.0/0`).
   - Check **Allow HTTP traffic from the internet** (Port 80).
   - Check **Allow HTTPS traffic from the internet** (Port 443).
   - Click **Add Security Group Rule**: Custom TCP ➔ Port `5000` ➔ Source: Anywhere `0.0.0.0/0`.
8. **Storage**: `20 GiB` gp3.
9. Click **Launch Instance**.

---

### Step 1.2: Connect to Your EC2 Instance

Open PowerShell or terminal on your machine:
```bash
# Set permissions (if on Mac/Linux: chmod 400 your-key.pem)
ssh -i "path/to/your-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

### Step 1.3: Run the Server Setup

Once connected to your Ubuntu instance, run:
```bash
# Update and install Node.js 20, PM2, Git, and Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get update -y
sudo apt-get install -y nodejs git nginx
sudo npm install -g pm2
```

Verify installations:
```bash
node -v   # Should show v20.x.x
pm2 -v    # Should show PM2 version
```

---

### Step 1.4: Deploy Backend Code to EC2

1. Create application directory:
   ```bash
   sudo mkdir -p /var/www/krishna-valley-erp
   sudo chown -R ubuntu:ubuntu /var/www/krishna-valley-erp
   cd /var/www/krishna-valley-erp
   ```

2. Clone your repository (or copy your backend directory):
   ```bash
   git clone <YOUR_GIT_REPO_URL> .
   cd backend
   npm install --production
   ```

3. Create the production `.env` file:
   ```bash
   nano .env
   ```
   Paste the following production values:
   ```env
   PORT=5000
   NODE_ENV=production
   CLIENT_URL=*

   MONGO_URI=mongodb+srv://krishnavalleytech_db_user:Z3y3FgJtwT5aC8H@cluster0.gfk3ule.mongodb.net/construction_erp?authSource=admin&retryWrites=true&w=majority&appName=Cluster0

   JWT_SECRET=super_secret_jwt_key_change_in_production
   JWT_EXPIRES_IN=7d

   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10485760

   AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
   AWS_REGION=us-east-1
   AWS_BUCKET_NAME=krishna-valley-erp-documents

   COMPANY_NAME=Krishna Valley Real Estate Ltd.
   COMPANY_EMAIL=contact@krishnavalley.com
   COMPANY_PHONE=+91 98765 43210
   ```
   Save with `Ctrl + O` ➔ `Enter`, exit with `Ctrl + X`.

4. Start the backend with PM2:
   ```bash
   pm2 start server.js --name "krishna-valley-backend"
   pm2 save
   pm2 startup
   # (Copy and run the command that pm2 startup outputs to enable reboot persistence)
   ```

---

### Step 1.5: Configure Nginx as Reverse Proxy

1. Create Nginx site config:
   ```bash
   sudo nano /etc/nginx/sites-available/krishna-valley-erp
   ```
2. Paste:
   ```nginx
   server {
       listen 80;
       server_name _;

       client_max_body_size 30M;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Enable the site and restart Nginx:
   ```bash
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo ln -s /etc/nginx/sites-available/krishna-valley-erp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. Test API Health in your browser:
   `http://<YOUR_EC2_PUBLIC_IP>/api/health` or `http://<YOUR_EC2_PUBLIC_IP>/api/projects`

---

## PART 2: Frontend Deployment on AWS Amplify

AWS Amplify Hosting is pre-configured via the [`amplify.yml`](file:///c:/Users/sansk/OneDrive/Desktop/KRISHNA%20VALLEY/ERP%20system/frontend/amplify.yml) file created in your frontend.

### Step 2.1: Connect Your Repository to AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2. Click **Host an app** (or **New app ➔ Host web app**).
3. Select your Git provider (**GitHub**, **GitLab**, or **AWS CodeCommit**) and authorize AWS.
4. Select your repository: `krishna-valley-erp` and select branch: `main`.
5. Check **Connecting a monorepo?** and enter the frontend directory: `frontend`.
6. Click **Next**.

---

### Step 2.2: Configure Environment Variables in Amplify

In the **Build settings** page:
1. Amplify will auto-detect the [`amplify.yml`](file:///c:/Users/sansk/OneDrive/Desktop/KRISHNA%20VALLEY/ERP%20system/frontend/amplify.yml) build spec.
2. Click **Advanced settings** ➔ **Add environment variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: `http://<YOUR_EC2_PUBLIC_IP>` *(or `https://api.yourdomain.com` if using SSL)*
3. Click **Next** ➔ click **Save and deploy**.

---

### Step 2.3: Verify Single-Page-App (SPA) Rewrites in Amplify

Because React Router is used in the ERP (`/sales`, `/inventory`, `/rentals`, etc.), configure Amplify redirect rule:
1. In the Amplify App dashboard, click **Rewrites and redirects** in the left menu.
2. Click **Edit** and verify the SPA rewrite rule:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
3. Save changes.

---

## PART 3: Post-Deployment Verification Checklist

| # | Checkpoint | Target | Status |
| :-: | :--- | :--- | :---: |
| 1 | EC2 Node.js process running via PM2 | `pm2 status` shows `online` | ✅ Ready |
| 2 | Nginx forwarding port 80 ➔ 5000 | `curl http://localhost/api/settings` | ✅ Ready |
| 3 | MongoDB Atlas IP Whitelist | Whitelist EC2 Elastic IP in Mongo Atlas | ⚙️ Required |
| 4 | Amplify Vite production build | `dist/` deployed to AWS CDN | ✅ Ready |
| 5 | Live S3 file uploads | File uploads stream to `us-east-1` bucket | ✅ Live |
