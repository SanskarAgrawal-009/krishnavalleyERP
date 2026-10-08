import express from 'express';
import multer from 'multer';
import {
  getActiveRentals,
  getPreviousOwnersHistory,
  updateRentalTerms,
  uploadAgreementDocument,
  deleteAgreementDocument,
  uploadRegistryDocument,
  deleteRegistryDocument,
  bulkUploadDocuments,
  recordRentalPayout,
  transferOwnership,
  createManualRentalEntry,
  importRentalsFromExcel,
  getCustomerRentalLedgers,
  autoGeneratePassbookFromRegister,
  uploadLedgerExcelAndGenerate,
  updatePassbookEntry,
  deleteRentalEntry,
  deleteOwnershipHistoryEntry
} from '../controllers/rentalController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

// All rental management routes require authentication
router.use(authenticateToken);

// Table 1: Current Active Rentals Register
router.get('/active', authorizePermission('rentals:view', 'rentals:manage'), getActiveRentals);

// Table 2: Previous Owners Ownership & Rental Trail
router.get('/history', authorizePermission('rentals:view', 'rentals:manage'), getPreviousOwnersHistory);

// Passbook Ledgers for All Customers
router.get('/ledgers', authorizePermission('rentals:view', 'rentals:manage'), getCustomerRentalLedgers);

// Auto-generate Passbook from Active Register
router.post('/ledgers/auto-generate', authorizePermission('rentals:create', 'rentals:manage'), autoGeneratePassbookFromRegister);

// Upload Passbook Excel & Calculate Paid Months
router.post('/ledgers/upload-excel', authorizePermission('rentals:create', 'rentals:manage'), upload.single('excelFile'), uploadLedgerExcelAndGenerate);

// Update/Disburse individual month entry
router.put('/ledgers/:flatId/entry', authorizePermission('rentals:edit', 'rentals:manage'), updatePassbookEntry);

// Manual Rental Enrollment (Matching Required Columns)
router.post('/manual', authorizePermission('rentals:create', 'rentals:manage'), createManualRentalEntry);

// Batch Import Rentals from Excel
router.post('/import-excel', authorizePermission('rentals:create', 'rentals:manage'), upload.single('excelFile'), importRentalsFromExcel);

// Bulk Upload Registry / Rent Agreement Documents (Multi-file upload with auto-matching)
router.post('/bulk-upload-documents', authorizePermission('rentals:edit', 'rentals:manage'), upload.array('files', 100), bulkUploadDocuments);

// Update rental terms (tenure, rent, dates, TDS)
router.put('/:flatId/terms', authorizePermission('rentals:edit', 'rentals:manage'), updateRentalTerms);

// Upload rental agreement document
router.post('/:flatId/agreement', authorizePermission('rentals:edit', 'rentals:manage'), upload.single('agreementFile'), uploadAgreementDocument);

// Delete rental agreement document
router.delete('/:flatId/agreement', authorizePermission('rentals:edit', 'rentals:manage', 'rentals:delete'), deleteAgreementDocument);

// Upload owner registry document (Sale Deed / Registry Copy)
router.post('/:flatId/registry-doc', authorizePermission('rentals:edit', 'rentals:manage'), upload.single('registryFile'), uploadRegistryDocument);

// Delete owner registry document
router.delete('/:flatId/registry-doc', authorizePermission('rentals:edit', 'rentals:manage', 'rentals:delete'), deleteRegistryDocument);

// Record rental disbursement payout
router.post('/:flatId/payout', authorizePermission('rentals:edit', 'rentals:manage'), recordRentalPayout);

// Resale / Ownership transfer (archives current to Table 2, sets up new in Table 1)
router.post('/:flatId/transfer', authorizePermission('rentals:manage'), transferOwnership);

// Delete / Unenroll active rental entry
router.delete('/:flatId', authorizePermission('rentals:delete', 'rentals:manage'), deleteRentalEntry);

// Delete historical previous owner entry
router.delete('/:flatId/history/:historyId', authorizePermission('rentals:delete', 'rentals:manage'), deleteOwnershipHistoryEntry);

export default router;
