import express from 'express';
import multer from 'multer';
import {
  createRentalContract,
  getRentalContracts,
  getRentalContractById,
  getOwnerByFlat,
  updateRentBack,
  updateTenantAgreement,
  uploadRentBackAgreementDoc,
  uploadTenantAgreementDoc,
  updateAllocation,
  recordDepositPayment,
  terminateRentalContract,
  deleteRentalContract
} from '../controllers/rentalController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Multer memory storage for S3 uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Apply auth to all rental routes
router.use(authenticateToken);

// Auto-fetch Owner for a Flat
router.get('/flat-owner/:flatId', authorizePermission('rentals:view'), getOwnerByFlat);

// Rental Core
router.post('/', authorizePermission('rentals:create', 'rentals:manage'), createRentalContract);
router.get('/', authorizePermission('rentals:view'), getRentalContracts);
router.get('/:id', authorizePermission('rentals:view'), getRentalContractById);
router.delete('/:id', authorizePermission('rentals:manage'), deleteRentalContract);

// Lifecycle Operations
router.put('/:id/rent-back', authorizePermission('rentals:manage'), updateRentBack);
router.put('/:id/tenant-agreement', authorizePermission('rentals:manage'), updateTenantAgreement);
router.post('/:id/rent-back/upload', authorizePermission('rentals:manage'), upload.single('agreementFile'), uploadRentBackAgreementDoc);
router.post('/:id/tenant-agreement/upload', authorizePermission('rentals:manage'), upload.single('agreementFile'), uploadTenantAgreementDoc);
router.put('/:id/allocation', authorizePermission('rentals:manage'), updateAllocation);
router.post('/:id/deposits/pay', authorizePermission('rentals:manage'), recordDepositPayment);
router.put('/:id/terminate', authorizePermission('rentals:manage'), terminateRentalContract);

export default router;
