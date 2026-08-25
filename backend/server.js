import 'dotenv/config'; // Must be first to load environment variables before all other modules
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
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
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow during local development
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(autoAuditMiddleware);

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

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
