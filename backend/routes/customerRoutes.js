import express from 'express';
import multer from 'multer';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  uploadCustomerDocument,
  verifyCustomerDocument,
  logCustomerCommunication,
  deleteCustomer,
  wipeAllCustomers
} from '../controllers/customerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission, authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Configure Multer for in-memory file buffers (for S3 streaming)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

// Apply auth to all customer routes
router.use(authenticateToken);

// Customer Core
router.post('/', authorizePermission('customers:manage', 'sales:create'), createCustomer);
router.get('/', authorizePermission('customers:view'), getCustomers);
router.get('/:id', authorizePermission('customers:view'), getCustomerById);
router.put('/:id', authorizePermission('customers:manage'), updateCustomer);
router.delete('/wipe-all', authorizeRoles('super_admin'), wipeAllCustomers);
router.delete('/:id', authorizePermission('customers:manage'), deleteCustomer);

// Document Management (S3 Upload & Verification)
router.post('/:id/documents/upload', authorizePermission('customers:manage'), upload.single('documentFile'), uploadCustomerDocument);
router.put('/:id/documents/:docId/verify', authorizePermission('customers:manage'), verifyCustomerDocument);

// Omnichannel Communication & Call Recording Log
router.post('/:id/communications', authorizePermission('customers:view', 'customers:manage'), upload.single('mediaFile'), logCustomerCommunication);

export default router;
