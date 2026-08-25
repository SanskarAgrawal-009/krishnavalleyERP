import express from 'express';
import multer from 'multer';
import {
  getUnifiedDocumentVault,
  uploadLegalDocument,
  createDigitalSignature
} from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 35 * 1024 * 1024 } // 35MB max
});

// Apply auth to all document routes
router.use(authenticateToken);

// Document Vault
router.get('/vault', authorizePermission('documents:view'), getUnifiedDocumentVault);

// Legal Document Upload
router.post('/legal', authorizePermission('documents:upload', 'documents:manage'), upload.single('legalFile'), uploadLegalDocument);

// Digital Signatures
router.post('/sign', authorizePermission('documents:manage'), createDigitalSignature);

export default router;
