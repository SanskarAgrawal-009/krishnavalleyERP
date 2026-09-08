import express from 'express';
import multer from 'multer';
import {
  getActiveRentals,
  getPreviousOwnersHistory,
  updateRentalTerms,
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

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

// All rental management routes require authentication
router.use(authenticateToken);

// Table 1: Current Active Rentals Register
router.get('/active', getActiveRentals);

// Table 2: Previous Owners Ownership & Rental Trail
router.get('/history', getPreviousOwnersHistory);

// Passbook Ledgers for All Customers
router.get('/ledgers', getCustomerRentalLedgers);

// Auto-generate Passbook from Active Register
router.post('/ledgers/auto-generate', autoGeneratePassbookFromRegister);

// Upload Passbook Excel & Calculate Paid Months
router.post('/ledgers/upload-excel', upload.single('excelFile'), uploadLedgerExcelAndGenerate);

// Update/Disburse individual month entry
router.put('/ledgers/:flatId/entry', updatePassbookEntry);

// Manual Rental Enrollment (Matching Required Columns)
router.post('/manual', createManualRentalEntry);

// Batch Import Rentals from Excel
router.post('/import-excel', upload.single('excelFile'), importRentalsFromExcel);

// Update rental terms (tenure, rent, dates, TDS)
router.put('/:flatId/terms', updateRentalTerms);

// Record rental disbursement payout
router.post('/:flatId/payout', recordRentalPayout);

// Resale / Ownership transfer (archives current to Table 2, sets up new in Table 1)
router.post('/:flatId/transfer', transferOwnership);

// Delete / Unenroll active rental entry
router.delete('/:flatId', deleteRentalEntry);

// Delete historical previous owner entry
router.delete('/:flatId/history/:historyId', deleteOwnershipHistoryEntry);

export default router;
