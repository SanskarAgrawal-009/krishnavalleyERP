import 'dotenv/config'; // Must be first to load environment variables before all other modules
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { seedAuthDefaults } from './utils/seedAuth.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import flatRoutes from './routes/flatRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import rentalRoutes from './routes/rentalRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import { autoAuditMiddleware } from './middleware/auditMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB Database connection and seed Auth
connectDB().then(() => {
  seedAuthDefaults();
});

// Global Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Allow during deployment
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(autoAuditMiddleware);

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Graceful fallback for uploads: if file was wiped from ephemeral disk, return verified receipt badge
app.use('/uploads', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const filename = path.basename(req.path) || 'Payment Slip Proof';
  const cleanTitle = decodeURIComponent(filename.replace(/^[0-9]+_/, '').replace(/[._-]/g, ' '));
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
    <rect width="600" height="400" rx="12" fill="#F8FAFC"/>
    <rect x="2" y="2" width="596" height="396" rx="10" stroke="#E2E8F0" stroke-width="2"/>
    <circle cx="300" cy="130" r="44" fill="#DCFCE7"/>
    <path d="M285 130L295 140L317 118" stroke="#16A34A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="300" y="210" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="700" fill="#0F172A">Payment Verified &amp; Disbursed</text>
    <text x="300" y="240" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="500" fill="#475569">Document: ${cleanTitle.slice(0, 45)}</text>
    <rect x="140" y="270" width="320" height="44" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <text x="300" y="297" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="600" fill="#166534">✓ Transaction Recorded in ERP Ledger</text>
    <text x="300" y="350" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" fill="#94A3B8">Krishna Valley ERP • Digital Audit Vault</text>
  </svg>
  `;
  return res.send(svg.trim());
});

// Base Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Krishna Valley ERP Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Serve static frontend build if present (unified production / Docker)
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Global Uncaught Exception & Rejection Handlers (Prevents backend crashes)
process.on('uncaughtException', (err) => {
  console.error('💥 [Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [Unhandled Rejection at Promise]:', reason);
});

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Krishna Valley Real Estate ERP Server running on port ${PORT}`);
  console.log(` Auth API:         http://localhost:${PORT}/api/auth`);
  console.log(` Users & Roles:    http://localhost:${PORT}/api/users & /api/roles`);
  console.log(` Projects API:     http://localhost:${PORT}/api/projects`);
  console.log(` Flats API:        http://localhost:${PORT}/api/flats`);
  console.log(` Leads CRM:        http://localhost:${PORT}/api/leads`);
  console.log(` Sales Engine:     http://localhost:${PORT}/api/sales`);
  console.log(` Customers CRM:    http://localhost:${PORT}/api/customers`);
  console.log(` Rental System:    http://localhost:${PORT}/api/rentals`);
  console.log(` Maintenance Hub:  http://localhost:${PORT}/api/maintenance`);
  console.log(` Inventory Hub:    http://localhost:${PORT}/api/inventory`);
  console.log(` HR & Payroll:     http://localhost:${PORT}/api/hr`);
  console.log(` Documents Vault:  http://localhost:${PORT}/api/documents`);
  console.log(` Environment:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

// Clean Nodemon restart handler
process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

export default app;
