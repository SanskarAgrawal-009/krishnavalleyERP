import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch {}

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backupDatabase() {
  console.log('📡 Connecting to MongoDB for safety backup...');
  await mongoose.connect(process.env.MONGO_URI);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../backups/pre_wipe_backup_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`📦 Creating safety backup in: ${backupDir}`);
  console.log(`Found ${collections.length} collections.`);

  let totalDocs = 0;
  for (const col of collections) {
    const data = await mongoose.connection.db.collection(col.name).find({}).toArray();
    const filePath = path.join(backupDir, `${col.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  💾 Backed up ${col.name.padEnd(25)}: ${data.length} docs`);
    totalDocs += data.length;
  }

  console.log(`\n✅ Safety Backup Completed Successfully! Total docs saved: ${totalDocs}`);
  console.log(`📁 Backup location: ${backupDir}\n`);

  await mongoose.disconnect();
}

backupDatabase().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
