#!/bin/bash
# ==============================================================================
# Krishna Valley ERP - EC2 Backend Setup Script (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================

set -e

echo "=== 1. Updating System Packages ==="
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git nginx build-essential

echo "=== 2. Installing Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "=== 3. Installing PM2 Process Manager ==="
sudo npm install -g pm2

echo "=== 4. Setting up Project Directory ==="
mkdir -p /var/www/krishna-valley-erp
cd /var/www/krishna-valley-erp

# Instructions: Clone repository or copy backend folder here
# git clone <YOUR_REPO_URL> .
# cd backend
# npm install --production

echo "=== Setup Helper Finished! ==="
