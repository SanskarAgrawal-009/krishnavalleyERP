import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import http from 'http';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  // Find an admin user
  const user = await User.findOne({ role: { $in: ['super_admin', 'admin', 'taskforce_manager'] } })
    .select('username email role permissions')
    .lean();
  
  if (!user) {
    console.log('No admin user found');
    process.exit(1);
  }
  
  console.log('Found user:', user.username, user.role);
  
  // Generate a valid token
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role, permissions: user.permissions || [] },
    secret,
    { expiresIn: '1h' }
  );
  
  console.log('Token generated, testing export-excel endpoint...');
  
  // Test the Excel export endpoint
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/taskforce-manager/weekly-reports/export-excel?period=this_week',
    headers: { 'Authorization': `Bearer ${token}` }
  };
  
  const req = http.get(options, (res) => {
    const chunks = [];
    res.on('data', (d) => chunks.push(d));
    res.on('end', () => {
      const body = Buffer.concat(chunks);
      console.log('STATUS:', res.statusCode);
      console.log('CONTENT-TYPE:', res.headers['content-type']);
      console.log('CONTENT-DISPOSITION:', res.headers['content-disposition']);
      console.log('BODY_LENGTH:', body.length, 'bytes');
      if (res.statusCode !== 200) {
        console.log('ERROR_BODY:', body.toString().substring(0, 500));
      } else {
        console.log('SUCCESS! Excel file received with', body.length, 'bytes');
      }
      
      // Now test Word export
      console.log('\nTesting export-word endpoint...');
      const opts2 = { ...options, path: '/api/taskforce-manager/weekly-reports/export-word?period=this_week' };
      const req2 = http.get(opts2, (res2) => {
        const chunks2 = [];
        res2.on('data', (d) => chunks2.push(d));
        res2.on('end', () => {
          const body2 = Buffer.concat(chunks2);
          console.log('STATUS:', res2.statusCode);
          console.log('CONTENT-TYPE:', res2.headers['content-type']);
          console.log('CONTENT-DISPOSITION:', res2.headers['content-disposition']);
          console.log('BODY_LENGTH:', body2.length, 'bytes');
          if (res2.statusCode !== 200) {
            console.log('ERROR_BODY:', body2.toString().substring(0, 500));
          } else {
            console.log('SUCCESS! Word file received with', body2.length, 'bytes');
          }
          process.exit(0);
        });
      });
      req2.on('error', (e) => { console.error('Word request error:', e.message); process.exit(1); });
    });
  });
  req.on('error', (e) => { console.error('Excel request error:', e.message); process.exit(1); });
}

main().catch((e) => { console.error(e); process.exit(1); });

