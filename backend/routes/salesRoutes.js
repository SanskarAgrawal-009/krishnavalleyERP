import express from 'express';
import multer from 'multer';
import {
  convertLeadToSales,
  getSalesLeads,
  getSalesLeadById,
  updateBooking,
  updateAgreement,
  uploadAgreementFile,
  setupPaymentPlan,
  recordInstallmentPayment,
  generateDemandLetter,
  addSalesFollowUp,
  updatePossession,
  processCancellationAndRefund,
  importPreviousPayments,
  deleteSalesLead,
  deleteAllSalesLeads
} from '../controllers/salesController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Configure Multer for in-memory file buffers (for direct S3 streaming)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max file size
});

// Apply auth to all sales routes
router.use(authenticateToken);

// Sales Lead Core
router.post('/convert', authorizePermission('sales:create', 'crm:edit'), convertLeadToSales);
router.post('/import-payments', authorizePermission('sales:create', 'sales:edit', 'accounts:manage'), importPreviousPayments);
router.get('/', authorizePermission('sales:view'), getSalesLeads);
router.get('/:id', authorizePermission('sales:view'), getSalesLeadById);
router.delete('/delete-all', authorizePermission('sales:manage', 'sales:approve'), deleteAllSalesLeads);
router.delete('/:id', authorizePermission('sales:manage', 'sales:approve'), deleteSalesLead);

// Lifecycle Operations
router.put('/:id/booking', authorizePermission('sales:create', 'sales:edit'), updateBooking);
router.put('/:id/agreement', authorizePermission('sales:edit'), updateAgreement);
router.post('/:id/agreement/upload', authorizePermission('sales:edit'), upload.single('agreementFile'), uploadAgreementFile);
router.put('/:id/payment-plan', authorizePermission('sales:create', 'sales:edit', 'sales:approve'), setupPaymentPlan);
router.post('/:id/installments/pay', authorizePermission('sales:edit', 'accounts:manage'), recordInstallmentPayment);
router.post('/:id/demand-letters', authorizePermission('sales:edit', 'accounts:manage'), generateDemandLetter);
router.post('/:id/follow-ups', authorizePermission('sales:view', 'sales:edit'), addSalesFollowUp);
router.put('/:id/possession', authorizePermission('sales:approve', 'sales:edit'), updatePossession);
router.post('/:id/cancel-refund', authorizePermission('sales:approve'), processCancellationAndRefund);

export default router;
