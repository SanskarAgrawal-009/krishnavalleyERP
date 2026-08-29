import express from 'express';
import {
  createMaterial,
  getMaterials,
  createStore,
  updateStore,
  deleteStore,
  getStores,
  getStoreStock,
  createVendor,
  getVendors,
  createPurchaseOrder,
  getPurchaseOrders,
  createGoodsReceipt,
  getGoodsReceipts,
  createMaterialIssue,
  getMaterialIssues,
  createStockTransfer,
  getStockTransfers,
  getInventorySummary
} from '../controllers/inventoryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all inventory/materials routes
router.use(authenticateToken);

// Summary / Valuation
router.get('/summary', authorizePermission('materials:view'), getInventorySummary);

// 1. Materials
router.post('/materials', authorizePermission('materials:create', 'materials:manage'), createMaterial);
router.get('/materials', authorizePermission('materials:view'), getMaterials);

// 2. Stores & Stock
router.post('/stores', authorizePermission('materials:manage'), createStore);
router.get('/stores', authorizePermission('materials:view'), getStores);
router.put('/stores/:id', authorizePermission('materials:manage'), updateStore);
router.delete('/stores/:id', authorizePermission('materials:manage'), deleteStore);
router.get('/stocks', authorizePermission('materials:view'), getStoreStock);

// 3. Vendors
router.post('/vendors', authorizePermission('materials:manage', 'materials:create'), createVendor);
router.get('/vendors', authorizePermission('materials:view'), getVendors);

// 4. Purchase Orders
router.post('/purchase-orders', authorizePermission('materials:create', 'materials:manage'), createPurchaseOrder);
router.get('/purchase-orders', authorizePermission('materials:view'), getPurchaseOrders);

// 5. Goods Receipts (GRN)
router.post('/goods-receipts', authorizePermission('materials:create', 'materials:manage'), createGoodsReceipt);
router.get('/goods-receipts', authorizePermission('materials:view'), getGoodsReceipts);

// 6. Material Issues
router.post('/material-issues', authorizePermission('materials:issue', 'materials:manage'), createMaterialIssue);
router.get('/material-issues', authorizePermission('materials:view', 'materials:issue'), getMaterialIssues);

// 7. Stock Transfers
router.post('/stock-transfers', authorizePermission('materials:issue', 'materials:manage'), createStockTransfer);
router.get('/stock-transfers', authorizePermission('materials:view', 'materials:issue'), getStockTransfers);

export default router;
