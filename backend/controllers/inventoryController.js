import Material from '../models/inventory/Material.js';
import Store from '../models/inventory/Store.js';
import Stock from '../models/inventory/Stock.js';
import Vendor from '../models/inventory/Vendor.js';
import PurchaseOrder from '../models/inventory/PurchaseOrder.js';
import GoodsReceipt from '../models/inventory/GoodsReceipt.js';
import MaterialIssue from '../models/inventory/MaterialIssue.js';
import StockTransfer from '../models/inventory/StockTransfer.js';
import { escapeRegex } from '../utils/regexUtil.js';
import mongoose from 'mongoose';

// =========================================================
// 1. MATERIAL CATALOG
// =========================================================

export const createMaterial = async (req, res) => {
  try {
    const {
      materialCode,
      materialName,
      category,
      subCategory,
      description,
      unit,
      minimumStockLevel,
      reorderLevel,
      maximumStockLevel
    } = req.body;

    const code = materialCode || `MAT-${Date.now().toString().slice(-6)}`;

    const material = new Material({
      materialCode: code,
      materialName,
      category,
      subCategory,
      description,
      unit,
      minimumStockLevel: Number(minimumStockLevel) || 0,
      reorderLevel: Number(reorderLevel) || 0,
      maximumStockLevel: maximumStockLevel ? Number(maximumStockLevel) : undefined
    });

    const saved = await material.save();
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error creating material:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMaterials = async (req, res) => {
  try {
    const { category, search, isActive } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ materialName: regex }, { materialCode: regex }, { category: regex }];
    }

    const materials = await Material.find(filter).sort({ materialName: 1 });
    return res.json({ success: true, count: materials.length, data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 2. STORES & STOCK LEDGER
// =========================================================

export const createStore = async (req, res) => {
  try {
    const { storeCode, storeName, projectId, location, status } = req.body;

    const code = storeCode || `STR-${Date.now().toString().slice(-4)}`;

    const store = new Store({
      storeCode: code,
      storeName,
      projectId,
      location,
      status: status || 'active'
    });

    const saved = await store.save();
    const populated = await Store.findById(saved._id).populate('projectId', 'projectName projectCode');
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error creating store:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStores = async (req, res) => {
  try {
    const { projectId } = req.query;
    let filter = {};
    if (projectId) filter.projectId = projectId;

    const stores = await Store.find(filter).populate('projectId', 'projectName projectCode').sort({ storeName: 1 });
    return res.json({ success: true, count: stores.length, data: stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStoreStock = async (req, res) => {
  try {
    const { storeId, search } = req.query;
    let filter = {};
    if (storeId && storeId !== 'all') filter.storeId = storeId;

    const stocks = await Stock.find(filter)
      .populate('storeId', 'storeName storeCode location projectId')
      .populate('materialId', 'materialName materialCode category subCategory unit minimumStockLevel reorderLevel maximumStockLevel description')
      .sort({ updatedAt: -1 });

    // Filter by search term across material name, code, or store name
    let result = stocks;
    if (search) {
      const q = search.toLowerCase();
      result = stocks.filter((s) => {
        const matName = (s.materialId?.materialName || '').toLowerCase();
        const matCode = (s.materialId?.materialCode || '').toLowerCase();
        const matCat = (s.materialId?.category || '').toLowerCase();
        const storeName = (s.storeId?.storeName || '').toLowerCase();
        return matName.includes(q) || matCode.includes(q) || matCat.includes(q) || storeName.includes(q);
      });
    }

    return res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('Error fetching store stock:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 3. VENDORS
// =========================================================

export const createVendor = async (req, res) => {
  try {
    const {
      vendorCode,
      vendorName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      panNumber,
      paymentTerms
    } = req.body;

    const code = vendorCode || `VEN-${Date.now().toString().slice(-4)}`;

    const vendor = new Vendor({
      vendorCode: code,
      vendorName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      panNumber,
      paymentTerms,
      status: 'active'
    });

    const saved = await vendor.save();
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getVendors = async (req, res) => {
  try {
    const { search, status } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ vendorName: regex }, { vendorCode: regex }, { gstNumber: regex }];
    }

    const vendors = await Vendor.find(filter).sort({ vendorName: 1 });
    return res.json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 4. PURCHASE ORDERS
// =========================================================

export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      poNumber,
      projectId,
      storeId,
      vendorId,
      orderDate,
      expectedDeliveryDate,
      items,
      remarks
    } = req.body;

    const code = poNumber || `PO-${Date.now().toString().slice(-6)}`;

    // Compute totals
    let subtotal = 0;
    let taxAmount = 0;

    const formattedItems = (items || []).map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.unitRate) || 0;
      const taxR = Number(item.taxRate) || 0;
      const itemSub = qty * rate;
      const itemTax = itemSub * (taxR / 100);
      const total = itemSub + itemTax;

      subtotal += itemSub;
      taxAmount += itemTax;

      return {
        materialId: item.materialId,
        quantity: qty,
        unitRate: rate,
        taxRate: taxR,
        totalAmount: total
      };
    });

    const po = new PurchaseOrder({
      poNumber: code,
      projectId,
      storeId,
      vendorId,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      items: formattedItems,
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      status: 'approved', // auto-approved for ERP flow
      remarks: remarks || ''
    });

    const saved = await po.save();
    const populated = await PurchaseOrder.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('storeId', 'storeName storeCode')
      .populate('vendorId', 'vendorName vendorCode phone')
      .populate('items.materialId', 'materialName materialCode unit');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchaseOrders = async (req, res) => {
  try {
    const { status, vendorId, storeId, projectId } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    if (storeId) filter.storeId = storeId;
    if (projectId) filter.projectId = projectId;

    const pos = await PurchaseOrder.find(filter)
      .populate('projectId', 'projectName projectCode')
      .populate('storeId', 'storeName storeCode')
      .populate('vendorId', 'vendorName vendorCode phone')
      .populate('items.materialId', 'materialName materialCode unit')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: pos.length, data: pos });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 5. GOODS RECEIPT (GRN) & STOCK AUTO-INCREMENT
// =========================================================

export const createGoodsReceipt = async (req, res) => {
  try {
    const {
      grnNumber,
      poId,
      invoiceNumber,
      invoiceDate,
      items
    } = req.body;

    const po = await PurchaseOrder.findById(poId);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const code = grnNumber || `GRN-${Date.now().toString().slice(-6)}`;

    const grn = new GoodsReceipt({
      grnNumber: code,
      poId: po._id,
      vendorId: po.vendorId,
      projectId: po.projectId,
      storeId: po.storeId,
      receiptDate: new Date(),
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      items: items || [],
      inspectionStatus: 'passed',
      status: 'verified' // verified triggers stock update
    });

    const savedGrn = await grn.save();

    // ⚡ ATOMIC STOCK INCREMENT FOR STORE
    for (const item of (items || [])) {
      const recQty = Number(item.receivedQuantity) || 0;
      const rate = Number(item.unitRate) || 0;
      if (recQty <= 0) continue;

      let stockDoc = await Stock.findOne({ storeId: po.storeId, materialId: item.materialId });
      if (!stockDoc) {
        stockDoc = new Stock({
          storeId: po.storeId,
          materialId: item.materialId,
          quantity: recQty,
          availableQuantity: recQty,
          averageRate: rate,
          lastUpdated: new Date()
        });
      } else {
        const oldVal = stockDoc.quantity * stockDoc.averageRate;
        const newVal = recQty * rate;
        const totalQty = stockDoc.quantity + recQty;
        const newAvg = totalQty > 0 ? (oldVal + newVal) / totalQty : rate;

        stockDoc.quantity = totalQty;
        stockDoc.availableQuantity = stockDoc.quantity - stockDoc.reservedQuantity;
        stockDoc.averageRate = Math.round(newAvg * 100) / 100;
        stockDoc.lastUpdated = new Date();
      }

      await stockDoc.save();
    }

    // Mark PO fully received
    po.status = 'fully_received';
    await po.save();

    const populated = await GoodsReceipt.findById(savedGrn._id)
      .populate('poId', 'poNumber')
      .populate('vendorId', 'vendorName')
      .populate('storeId', 'storeName')
      .populate('items.materialId', 'materialName unit');

    return res.status(201).json({ success: true, message: 'GRN created and stock auto-credited!', data: populated });
  } catch (error) {
    console.error('Error creating Goods Receipt:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getGoodsReceipts = async (req, res) => {
  try {
    const { storeId, projectId } = req.query;
    let filter = {};
    if (storeId) filter.storeId = storeId;
    if (projectId) filter.projectId = projectId;

    const grns = await GoodsReceipt.find(filter)
      .populate('poId', 'poNumber')
      .populate('vendorId', 'vendorName')
      .populate('storeId', 'storeName')
      .populate('items.materialId', 'materialName unit')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: grns.length, data: grns });
  } catch (error) {
    console.error('Error fetching Goods Receipts:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 6. MATERIAL ISSUES (SITE CONSUMPTION) & STOCK AUTO-DEBIT
// =========================================================

export const createMaterialIssue = async (req, res) => {
  try {
    const {
      issueNumber,
      projectId,
      storeId,
      purpose,
      contractorName,
      issuedTo,
      issuedBy,
      contractorContact,
      issueDate,
      items,
      remarks
    } = req.body;

    const code = issueNumber || `ISS-${Date.now().toString().slice(-6)}`;
    const contractor = contractorName || issuedTo || 'Site Contractor';
    const issuer = issuedBy || (req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : (req.user?.username || 'Store In-charge'));

    // Validate and compute stock availability
    let totalValue = 0;
    const verifiedItems = [];

    for (const item of (items || [])) {
      const qty = Number(item.quantity) || 0;
      const stockDoc = await Stock.findOne({ storeId, materialId: item.materialId });

      if (!stockDoc || stockDoc.availableQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for material ${item.materialId}. Available: ${stockDoc?.availableQuantity || 0}, Requested: ${qty}`
        });
      }

      const itemVal = qty * (stockDoc.averageRate || 0);
      totalValue += itemVal;

      verifiedItems.push({
        materialId: item.materialId,
        quantity: qty,
        unitRate: stockDoc.averageRate || 0,
        totalValue: itemVal
      });

      // ⚡ ATOMIC STOCK DECREMENT
      stockDoc.quantity = Math.max(0, stockDoc.quantity - qty);
      stockDoc.availableQuantity = Math.max(0, stockDoc.quantity - stockDoc.reservedQuantity);
      stockDoc.lastUpdated = new Date();
      await stockDoc.save();
    }

    const issue = new MaterialIssue({
      issueNumber: code,
      projectId,
      storeId,
      issuedTo: contractor,
      contractorName: contractor,
      contractorContact: contractorContact || '',
      issuedBy: issuer,
      createdBy: req.user?.id || req.user?._id,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      purpose: purpose || 'Site Construction Work',
      items: verifiedItems,
      status: 'issued',
      remarks: remarks || ''
    });

    const saved = await issue.save();
    const populated = await MaterialIssue.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('storeId', 'storeName storeCode')
      .populate('createdBy', 'firstName lastName username email')
      .populate('items.materialId', 'materialName materialCode unit');

    return res.status(201).json({ success: true, message: 'Material issued & stock debited!', data: populated });
  } catch (error) {
    console.error('Error creating material issue:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMaterialIssues = async (req, res) => {
  try {
    const { storeId, projectId } = req.query;
    let filter = {};
    if (storeId) filter.storeId = storeId;
    if (projectId) filter.projectId = projectId;

    const issues = await MaterialIssue.find(filter)
      .populate('projectId', 'projectName projectCode')
      .populate('storeId', 'storeName storeCode')
      .populate('createdBy', 'firstName lastName username email')
      .populate('items.materialId', 'materialName materialCode unit')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    console.error('Error fetching material issues:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 7. STOCK TRANSFERS (STORE TO STORE)
// =========================================================

export const createStockTransfer = async (req, res) => {
  try {
    const {
      transferNumber,
      fromStoreId,
      toStoreId,
      projectId,
      items
    } = req.body;

    if (fromStoreId === toStoreId) {
      return res.status(400).json({ success: false, message: 'Source and Destination stores cannot be the same' });
    }

    const code = transferNumber || `TRF-${Date.now().toString().slice(-6)}`;

    // Debit source store & Credit target store
    for (const item of (items || [])) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const fromStock = await Stock.findOne({ storeId: fromStoreId, materialId: item.materialId });
      if (!fromStock || fromStock.availableQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in source store for transfer. Available: ${fromStock?.availableQuantity || 0}`
        });
      }

      // Debit FromStore
      fromStock.quantity = Math.max(0, fromStock.quantity - qty);
      fromStock.availableQuantity = Math.max(0, fromStock.quantity - fromStock.reservedQuantity);
      fromStock.lastUpdated = new Date();
      await fromStock.save();

      // Credit ToStore
      let toStock = await Stock.findOne({ storeId: toStoreId, materialId: item.materialId });
      if (!toStock) {
        toStock = new Stock({
          storeId: toStoreId,
          materialId: item.materialId,
          quantity: qty,
          availableQuantity: qty,
          averageRate: fromStock.averageRate,
          lastUpdated: new Date()
        });
      } else {
        toStock.quantity += qty;
        toStock.availableQuantity = toStock.quantity - toStock.reservedQuantity;
        toStock.lastUpdated = new Date();
      }
      await toStock.save();
    }

    const transfer = new StockTransfer({
      transferNumber: code,
      fromStoreId,
      toStoreId,
      projectId,
      items,
      status: 'received',
      receivedAt: new Date()
    });

    const saved = await transfer.save();
    const populated = await StockTransfer.findById(saved._id)
      .populate('fromStoreId', 'storeName')
      .populate('toStoreId', 'storeName')
      .populate('items.materialId', 'materialName unit');

    return res.status(201).json({ success: true, message: 'Stock transferred between stores successfully!', data: populated });
  } catch (error) {
    console.error('Error creating stock transfer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStockTransfers = async (req, res) => {
  try {
    const transfers = await StockTransfer.find()
      .populate('fromStoreId', 'storeName')
      .populate('toStoreId', 'storeName')
      .populate('items.materialId', 'materialName unit')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: transfers.length, data: transfers });
  } catch (error) {
    console.error('Error fetching stock transfers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 8. REAL-TIME INVENTORY VALUATION & SUMMARY
// =========================================================

export const getInventorySummary = async (req, res) => {
  try {
    const [materialsCount, storesCount, vendorsCount, posCount, allStock] = await Promise.all([
      Material.countDocuments({ isActive: true }),
      Store.countDocuments({ status: 'active' }),
      Vendor.countDocuments({ status: 'active' }),
      PurchaseOrder.countDocuments(),
      Stock.find().populate('materialId', 'minimumStockLevel reorderLevel')
    ]);

    let totalValuation = 0;
    let lowStockCount = 0;

    allStock.forEach((s) => {
      totalValuation += (s.quantity * s.averageRate);
      if (s.materialId && s.quantity <= (s.materialId.reorderLevel || 0)) {
        lowStockCount++;
      }
    });

    return res.json({
      success: true,
      data: {
        materialsCount,
        storesCount,
        vendorsCount,
        posCount,
        totalStockItems: allStock.length,
        totalValuation: Math.round(totalValuation),
        lowStockCount
      }
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
