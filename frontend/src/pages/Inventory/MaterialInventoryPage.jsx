import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService.js';
import { NewMaterialModal } from '../../components/inventory/NewMaterialModal.jsx';
import { NewStoreModal } from '../../components/inventory/NewStoreModal.jsx';
import { NewVendorModal } from '../../components/inventory/NewVendorModal.jsx';
import { NewPOModal } from '../../components/inventory/NewPOModal.jsx';
import { NewGRNModal } from '../../components/inventory/NewGRNModal.jsx';
import { NewIssueModal } from '../../components/inventory/NewIssueModal.jsx';
import { NewTransferModal } from '../../components/inventory/NewTransferModal.jsx';

import {
  Package,
  Layers,
  Truck,
  ShoppingCart,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Repeat,
  DollarSign,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Building2,
  TrendingDown,
  TrendingUp,
  Tag,
  FileSpreadsheet,
  Calendar,
  FileText,
  Clock,
  Filter,
  Edit,
  Trash2
} from 'lucide-react';

export const MaterialInventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'stocks');

  // Stock Ledger Mode: 'activities' (all movements & transactions) | 'balances' (current on-hand stock)
  const [ledgerViewMode, setLedgerViewMode] = useState('activities');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all'); // 'all' | 'inward' | 'outward' | 'transfer'
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalValuation: 0,
    lowStockCount: 0,
    materialsCount: 0,
    storesCount: 0,
    vendorsCount: 0,
    posCount: 0
  });

  // Data Collections
  const [stocks, setStocks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [grns, setGrns] = useState([]);
  const [issues, setIssues] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // Modals
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSummary = async () => {
    try {
      const res = await inventoryService.getSummary();
      if (res.data) setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchSummary();
      const [stkRes, matRes, strRes, venRes, poRes, grnRes, issRes, trfRes] = await Promise.all([
        inventoryService.getStocks(),
        inventoryService.getMaterials(),
        inventoryService.getStores(),
        inventoryService.getVendors(),
        inventoryService.getPurchaseOrders(),
        inventoryService.getGoodsReceipts(),
        inventoryService.getMaterialIssues(),
        inventoryService.getTransfers()
      ]);

      if (stkRes.data) setStocks(stkRes.data);
      if (matRes.data) setMaterials(matRes.data);
      if (strRes.data) setStores(strRes.data);
      if (venRes.data) setVendors(venRes.data);
      if (poRes.data) setPos(poRes.data);
      if (grnRes.data) setGrns(grnRes.data);
      if (issRes.data) setIssues(issRes.data);
      if (trfRes.data) setTransfers(trfRes.data);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Handlers for creating new items
  const handleSaveMaterial = async (data) => {
    try {
      await inventoryService.createMaterial(data);
      alert('Material created successfully!');
      setIsMatModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveStore = async (data) => {
    try {
      if (editingStore) {
        await inventoryService.updateStore(editingStore._id || editingStore.id, data);
        alert('Project store warehouse updated successfully!');
      } else {
        await inventoryService.createStore(data);
        alert('Project store warehouse created successfully!');
      }
      setIsStoreModalOpen(false);
      setEditingStore(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStore = async (store) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${store.storeName}"?`)) return;
    try {
      await inventoryService.deleteStore(store._id || store.id);
      alert('Store deleted successfully!');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveVendor = async (data) => {
    try {
      await inventoryService.createVendor(data);
      alert('Vendor registered successfully!');
      setIsVendorModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSavePO = async (data) => {
    try {
      await inventoryService.createPurchaseOrder(data);
      alert('Purchase Order approved & issued!');
      setIsPoModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveGRN = async (data) => {
    try {
      const res = await inventoryService.createGoodsReceipt(data);
      alert(res.message || 'GRN verified & stock credited!');
      setIsGrnModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveIssue = async (data) => {
    try {
      const res = await inventoryService.createMaterialIssue(data);
      alert(res.message || 'Material issued & stock debited!');
      setIsIssueModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveTransfer = async (data) => {
    try {
      const res = await inventoryService.createTransfer(data);
      alert(res.message || 'Stock transferred between project stores!');
      setIsTransferModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateTransferStatus = async (transferId, newStatus) => {
    try {
      const res = await inventoryService.updateStockTransfer(transferId, { status: newStatus });
      alert(res.message || `Transfer marked as ${newStatus}!`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="g-card" style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Material Inventory & Site Stores
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              STOCK ENGINE
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
            Complete tracking of construction raw materials, stock ledgers, purchase orders, goods receipts, and inter-site transfers.
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={{
            padding: '8px 14px',
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '6px',
            color: '#111827',
            fontWeight: '600',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL STOCK VALUATION</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {formatINR(summary.totalValuation)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Across all site stores</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>LOW STOCK REORDERS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#ffdad6', color: '#ba1a1a' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: summary.lowStockCount > 0 ? '#ba1a1a' : '#137333', marginTop: '4px' }}>
            {summary.lowStockCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Items below reorder level</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MASTER CATALOG</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
            {summary.materialsCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Cataloged material items</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>VENDORS & STORES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
            {summary.vendorsCount} <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>/ {summary.storesCount} Stores</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active supply network</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Header (Synchronized with Sidebar) */}
      <div className="g-card" style={{
        display: 'flex',
        padding: '6px',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'stocks', label: `Stock Ledger (${stocks.length})` },
          { id: 'materials', label: `Materials (${materials.length})` },
          { id: 'stores', label: `Stores (${stores.length})` },
          { id: 'vendors', label: `Vendors (${vendors.length})` },
          { id: 'pos', label: `Purchase Orders (${pos.length})` },
          { id: 'grns', label: `Goods Receipts (${grns.length})` },
          { id: 'issues', label: `Material Issues (${issues.length})` },
          { id: 'transfers', label: `Transfers (${transfers.length})` }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '9px 14px',
                borderRadius: '6px',
                background: isSelected ? '#1a73e8' : 'transparent',
                color: isSelected ? '#ffffff' : '#374151',
                fontWeight: isSelected ? '800' : '600',
                fontSize: '0.8rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: STOCK LEDGER & ACTIVITIES ================= */}
      {activeTab === 'stocks' && (() => {
        // 1. Flatten all stock movements (Inwards, Outwards, Transfers) into a unified chronological activity log
        const allActivities = [];

        // Goods Receipts (Inward: +Stock)
        (grns || []).forEach((g) => {
          (g.items || []).forEach((item, idx) => {
            const mat = item.materialId || {};
            const matName = mat.materialName || mat.name || 'Material Item';
            const matCode = mat.materialCode || mat.code || 'MAT';
            const matUnit = mat.unit || mat.unitOfMeasure || 'units';
            const qty = Number(item.receivedQuantity || item.quantity || 0);
            const rate = Number(item.unitRate || 0);

            allActivities.push({
              id: `grn-${g._id || g.id}-${idx}`,
              date: new Date(g.receiptDate || g.createdAt || Date.now()),
              type: 'inward',
              typeLabel: 'INWARD / GRN',
              materialName: matName,
              materialCode: matCode,
              category: mat.category || 'Civil',
              unit: matUnit,
              quantity: qty,
              unitRate: rate,
              totalAmount: qty * rate,
              storeName: g.storeId?.storeName || 'Main Central Store',
              referenceDoc: g.grnNumber || 'GRN-REC',
              subReference: g.invoiceNumber ? `Inv: ${g.invoiceNumber}` : (g.poId?.poNumber ? `PO: ${g.poId.poNumber}` : 'Direct Receipt'),
              partyName: g.vendorId?.vendorName ? `Supplier: ${g.vendorId.vendorName}` : 'Vendor Supply',
              status: g.status || 'Verified'
            });
          });
        });

        // Material Issues (Outward: -Stock)
        (issues || []).forEach((iss) => {
          (iss.items || []).forEach((item, idx) => {
            const mat = item.materialId || {};
            const matName = mat.materialName || mat.name || 'Material Item';
            const matCode = mat.materialCode || mat.code || 'MAT';
            const matUnit = mat.unit || mat.unitOfMeasure || 'units';
            const qty = Number(item.quantity || 0);
            const rate = Number(item.unitRate || 0);

            allActivities.push({
              id: `iss-${iss._id || iss.id}-${idx}`,
              date: new Date(iss.issueDate || iss.createdAt || Date.now()),
              type: 'outward',
              typeLabel: 'ISSUE / OUTWARD',
              materialName: matName,
              materialCode: matCode,
              category: mat.category || 'Civil',
              unit: matUnit,
              quantity: qty,
              unitRate: rate,
              totalAmount: qty * rate,
              storeName: iss.storeId?.storeName || 'Main Central Store',
              referenceDoc: iss.issueNumber || 'ISS-OUT',
              subReference: iss.projectId?.projectName ? `Project: ${iss.projectId.projectName}` : 'Site Work',
              partyName: (iss.contractorName || iss.issuedTo) ? `Issued To: ${iss.contractorName || iss.issuedTo}${iss.purpose ? ` (${iss.purpose})` : ''}` : (iss.purpose || 'Site Consumption'),
              status: iss.status || 'Issued'
            });
          });
        });

        // Stock Transfers (Inter-Store Movement: ⇄ Transfer)
        (transfers || []).forEach((tr) => {
          (tr.items || []).forEach((item, idx) => {
            const mat = item.materialId || {};
            const matName = mat.materialName || mat.name || 'Material Item';
            const matCode = mat.materialCode || mat.code || 'MAT';
            const matUnit = mat.unit || mat.unitOfMeasure || 'units';
            const qty = Number(item.quantity || 0);

            allActivities.push({
              id: `trf-${tr._id || tr.id}-${idx}`,
              date: new Date(tr.transferDate || tr.createdAt || Date.now()),
              type: 'transfer',
              typeLabel: 'INTER-STORE TRANSFER',
              materialName: matName,
              materialCode: matCode,
              category: mat.category || 'Civil',
              unit: matUnit,
              quantity: qty,
              unitRate: 0,
              totalAmount: 0,
              storeName: `${tr.fromStoreId?.storeName || 'Source'} → ${tr.toStoreId?.storeName || 'Destination'}`,
              referenceDoc: tr.transferNumber || 'TRF-MOVE',
              subReference: tr.vehicleNumber ? `Vehicle: ${tr.vehicleNumber}` : 'Gatepass Verified',
              partyName: `Inter-Store Relocation`,
              status: tr.status || 'Transferred'
            });
          });
        });

        // Sort chronologically: newest activity first
        allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());

        // 2. Synthesize unified current stock balances (including 0-stock catalog materials)
        const unifiedBalances = [...stocks];
        const existingMaterialIds = new Set(stocks.map((s) => (s.materialId?._id || s.materialId)?.toString()));

        materials.forEach((mat) => {
          const mId = (mat._id || mat.id)?.toString();
          if (!existingMaterialIds.has(mId)) {
            unifiedBalances.push({
              _id: `synthetic-${mId}`,
              materialId: mat,
              storeId: stores.length > 0 ? stores[0] : { storeName: 'Main Store', storeCode: 'STR-MAIN' },
              quantity: 0,
              availableQuantity: 0,
              reservedQuantity: 0,
              averageRate: 0,
              isUnstocked: true
            });
          }
        });

        // Metrics calculations
        const totalInwardUnits = allActivities.filter((a) => a.type === 'inward').reduce((acc, a) => acc + a.quantity, 0);
        const totalIssuedUnits = allActivities.filter((a) => a.type === 'outward').reduce((acc, a) => acc + a.quantity, 0);
        const totalTransferredUnits = allActivities.filter((a) => a.type === 'transfer').reduce((acc, a) => acc + a.quantity, 0);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header & Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Stock Ledger & Activity Journal
                  <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    {ledgerViewMode === 'activities' ? `${allActivities.length} Movements` : `${unifiedBalances.length} Material Balances`}
                  </span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '2px' }}>
                  Audit log of all inward receipts (GRN), site debits (Material Issues), inter-store transfers, and warehouse balances.
                </div>
              </div>

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: '#f1f3f4', padding: '3px', borderRadius: '6px', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('activities')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: ledgerViewMode === 'activities' ? '#1a73e8' : 'transparent',
                    color: ledgerViewMode === 'activities' ? '#ffffff' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Clock size={14} /> All Activities & Movements ({allActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('balances')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: ledgerViewMode === 'balances' ? '#1a73e8' : 'transparent',
                    color: ledgerViewMode === 'balances' ? '#ffffff' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={14} /> Warehouse Balances ({unifiedBalances.length})
                </button>
              </div>
            </div>

            {/* Sub-KPI Movement Summary Bar */}
            <div className="grid-cols-4">
              <div className="stat-card" style={{ padding: '14px 18px' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>TOTAL TRANSACTIONS</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
                  {allActivities.length}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>All logged stock movements</span>
              </div>

              <div className="stat-card" style={{ padding: '14px 18px' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>TOTAL INWARD (GRN)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#137333', marginTop: '2px' }}>
                  +{totalInwardUnits.toLocaleString('en-IN')} <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>units</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: '600' }}>{grns.length} received shipments</span>
              </div>

              <div className="stat-card" style={{ padding: '14px 18px' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>SITE CONSUMPTION (ISSUED)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ba1a1a', marginTop: '2px' }}>
                  -{totalIssuedUnits.toLocaleString('en-IN')} <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>units</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#ba1a1a', fontWeight: '600' }}>{issues.length} contractor issues</span>
              </div>

              <div className="stat-card" style={{ padding: '14px 18px' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>INTER-STORE TRANSFERS</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#8b5cf6', marginTop: '2px' }}>
                  ⇄ {totalTransferredUnits.toLocaleString('en-IN')} <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>units</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: '600' }}>{transfers.length} inter-warehouse transfers</span>
              </div>
            </div>

            {/* Filter & Action Toolbars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                  <input
                    type="text"
                    placeholder={ledgerViewMode === 'activities' ? "Search activity, slip #, material, party..." : "Search balances, code, store..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '7px 12px 7px 30px',
                      fontSize: '0.82rem',
                      border: '1px solid #dadce0',
                      borderRadius: '6px',
                      width: '260px'
                    }}
                  />
                </div>

                {ledgerViewMode === 'activities' && (
                  <div style={{ display: 'flex', gap: '4px', background: '#f8f9fa', padding: '2px', borderRadius: '6px', border: '1px solid #dadce0' }}>
                    {[
                      { id: 'all', label: 'All Activities' },
                      { id: 'inward', label: '+ Inwards (GRN)' },
                      { id: 'outward', label: '- Issues' },
                      { id: 'transfer', label: '⇄ Transfers' }
                    ].map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setActivityTypeFilter(f.id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          background: activityTypeFilter === f.id ? '#111827' : 'transparent',
                          color: activityTypeFilter === f.id ? '#ffffff' : '#4b5563'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(true)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    color: '#111827',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowUpRight size={14} color="#ba1a1a" /> Issue Material
                </button>

                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    color: '#111827',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Repeat size={14} color="#8b5cf6" /> Store Transfer
                </button>

                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(true)}
                  style={{
                    background: '#1a73e8',
                    color: '#ffffff',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  <CheckCircle size={14} /> Receive GRN
                </button>
              </div>
            </div>

            {/* VIEW 1: COMPREHENSIVE STOCK ACTIVITIES & TRANSACTION JOURNAL */}
            {ledgerViewMode === 'activities' && (
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Activity Type</th>
                        <th>Material Item & Code</th>
                        <th>Movement Qty</th>
                        <th>Valuation Rate</th>
                        <th>Store Warehouse / Route</th>
                        <th>Party / Destination / Work</th>
                        <th>Reference Doc #</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = allActivities.filter((act) => {
                          if (activityTypeFilter !== 'all' && act.type !== activityTypeFilter) return false;
                          if (!searchTerm) return true;
                          const q = searchTerm.toLowerCase();
                          return (
                            act.materialName.toLowerCase().includes(q) ||
                            act.materialCode.toLowerCase().includes(q) ||
                            act.category.toLowerCase().includes(q) ||
                            act.referenceDoc.toLowerCase().includes(q) ||
                            act.subReference.toLowerCase().includes(q) ||
                            act.partyName.toLowerCase().includes(q) ||
                            act.storeName.toLowerCase().includes(q)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '38px 20px', color: '#4b5563' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <Clock size={32} color="#9ca3af" />
                                  <div style={{ fontWeight: '700', color: '#111827' }}>
                                    {allActivities.length === 0 ? 'No stock activities recorded yet' : 'No matching stock transactions found'}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    {allActivities.length === 0 ? 'Receive a Goods Receipt (GRN) or issue materials to see transaction entries here.' : 'Try changing your search terms or filter.'}
                                  </div>
                                  {allActivities.length === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setIsGrnModalOpen(true)}
                                      style={{
                                        marginTop: '6px',
                                        background: '#1a73e8',
                                        color: '#ffffff',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        border: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      + Inward First GRN
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((act) => {
                          const isInward = act.type === 'inward';
                          const isOutward = act.type === 'outward';
                          const isTransfer = act.type === 'transfer';

                          return (
                            <tr key={act.id}>
                              <td style={{ color: '#4b5563', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: '700', color: '#111827' }}>
                                  {act.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                  {act.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              <td>
                                {isInward ? (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#e6f4ea', color: '#137333', fontSize: '0.74rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <ArrowDownLeft size={13} /> + INWARD
                                  </span>
                                ) : isOutward ? (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#ffdad6', color: '#ba1a1a', fontSize: '0.74rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <ArrowUpRight size={13} /> - ISSUE
                                  </span>
                                ) : (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#f3e8ff', color: '#8b5cf6', fontSize: '0.74rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Repeat size={13} /> ⇄ TRANSFER
                                  </span>
                                )}
                              </td>

                              <td>
                                <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.88rem' }}>{act.materialName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                                  <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '1px 5px', borderRadius: '3px', fontWeight: '700', marginRight: '4px' }}>
                                    {act.materialCode}
                                  </span>
                                  {act.category}
                                </div>
                              </td>

                              <td style={{ fontWeight: '800', fontSize: '0.95rem', color: isInward ? '#137333' : (isOutward ? '#ba1a1a' : '#8b5cf6') }}>
                                {isInward ? `+${act.quantity}` : (isOutward ? `-${act.quantity}` : `⇄ ${act.quantity}`)} <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '600' }}>{act.unit}</span>
                              </td>

                              <td style={{ color: '#111827', fontWeight: '600' }}>
                                {act.unitRate > 0 ? (
                                  <div>
                                    <div>{formatINR(act.unitRate)}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Total: {formatINR(act.totalAmount)}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#9ca3af' }}>—</span>
                                )}
                              </td>

                              <td style={{ color: '#111827', fontWeight: '600', fontSize: '0.82rem' }}>
                                {act.storeName}
                              </td>

                              <td style={{ color: '#374151', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: '600', color: '#111827' }}>{act.partyName}</div>
                                {act.subReference && (
                                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{act.subReference}</div>
                                )}
                              </td>

                              <td>
                                <strong style={{ color: '#1a73e8', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                                  {act.referenceDoc}
                                </strong>
                              </td>

                              <td>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontSize: '0.72rem', fontWeight: '700', textTransform: 'capitalize' }}>
                                  {act.status}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: CURRENT ON-HAND WAREHOUSE BALANCES & VALUATION */}
            {ledgerViewMode === 'balances' && (
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Material Item & Specs</th>
                        <th>Warehouse Store</th>
                        <th>Available / Total Stock</th>
                        <th>Reorder Trigger Level</th>
                        <th>Unit Valuation</th>
                        <th>Total Value</th>
                        <th>Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredBalances = unifiedBalances.filter((item) => {
                          if (!searchTerm) return true;
                          const q = searchTerm.toLowerCase();
                          const matName = (item.materialId?.materialName || item.materialId?.name || '').toLowerCase();
                          const matCode = (item.materialId?.materialCode || item.materialId?.code || '').toLowerCase();
                          const matCat = (item.materialId?.category || '').toLowerCase();
                          const storeName = (item.storeId?.storeName || '').toLowerCase();
                          return matName.includes(q) || matCode.includes(q) || matCat.includes(q) || storeName.includes(q);
                        });

                        if (filteredBalances.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: '#4b5563' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <Package size={32} color="#9ca3af" />
                                  <div style={{ fontWeight: '700', color: '#111827' }}>No stock balances found</div>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filteredBalances.map((item) => {
                          const matName = item.materialId?.materialName || item.materialId?.name || 'Material Item';
                          const matCode = item.materialId?.materialCode || item.materialId?.code || 'MAT';
                          const matCat = item.materialId?.category || 'Civil';
                          const matUnit = item.materialId?.unit || item.materialId?.unitOfMeasure || 'units';
                          const reorderLvl = item.materialId?.reorderLevel || item.materialId?.minimumStockLevel || item.minReorderLevel || 0;
                          const minStockLvl = item.materialId?.minimumStockLevel || 0;
                          const totalQty = Number(item.quantity ?? item.availableQuantity ?? 0);
                          const availQty = Number(item.availableQuantity ?? item.quantity ?? 0);
                          const unitRate = Number(item.averageRate || item.unitPrice || 0);
                          const totVal = totalQty * unitRate;

                          const isOutOfStock = totalQty <= 0;
                          const isCriticalLow = totalQty > 0 && totalQty <= minStockLvl;
                          const isReorderDue = totalQty > 0 && totalQty <= reorderLvl;

                          return (
                            <tr key={item._id || item.id}>
                              <td>
                                <strong style={{ color: '#111827', fontSize: '0.9rem' }}>{matName}</strong>
                                <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '2px' }}>
                                  <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '1px 5px', borderRadius: '3px', fontWeight: '700', marginRight: '6px' }}>
                                    {matCode}
                                  </span>
                                  {matCat}
                                </div>
                              </td>
                              <td style={{ color: '#111827', fontWeight: '600' }}>
                                {item.storeId?.storeName || 'Main Central Store'}
                                {item.storeId?.storeCode && (
                                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{item.storeId.storeCode}</div>
                                )}
                              </td>
                              <td>
                                <div style={{ fontWeight: '800', color: isOutOfStock ? '#ba1a1a' : (isReorderDue ? '#b06000' : '#137333'), fontSize: '0.95rem' }}>
                                  {availQty} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#4b5563' }}>{matUnit}</span>
                                </div>
                                {item.reservedQuantity > 0 && (
                                  <div style={{ fontSize: '0.72rem', color: '#b06000' }}>
                                    Total: {totalQty} ({item.reservedQuantity} reserved)
                                  </div>
                                )}
                              </td>
                              <td style={{ color: '#4b5563', fontWeight: '600' }}>
                                {reorderLvl} {matUnit}
                              </td>
                              <td style={{ color: '#111827', fontWeight: '600' }}>
                                {formatINR(unitRate)}
                              </td>
                              <td style={{ color: '#111827', fontWeight: '800' }}>
                                {formatINR(totVal)}
                              </td>
                              <td>
                                {isOutOfStock ? (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#ffdad6', color: '#ba1a1a', fontSize: '0.74rem', fontWeight: '700', border: '1px solid #ffdad6' }}>
                                    ZERO STOCK
                                  </span>
                                ) : isCriticalLow ? (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#ffdad6', color: '#ba1a1a', fontSize: '0.74rem', fontWeight: '700', border: '1px solid #ffdad6' }}>
                                    CRITICAL LOW
                                  </span>
                                ) : isReorderDue ? (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#fef7e0', color: '#b06000', fontSize: '0.74rem', fontWeight: '700', border: '1px solid #feefc3' }}>
                                    REORDER DUE
                                  </span>
                                ) : (
                                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#e6f4ea', color: '#137333', fontSize: '0.74rem', fontWeight: '700', border: '1px solid #ceead6' }}>
                                    OPTIMAL
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ================= TAB 2: MATERIALS CATALOG ================= */}
      {activeTab === 'materials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Material Master Catalog ({materials.length})</h3>
              <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '2px' }}>
                Standard construction materials, raw inventory, units of measure, and reorder thresholds.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input
                  type="text"
                  placeholder="Search materials, category, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '7px 12px 7px 30px',
                    fontSize: '0.82rem',
                    border: '1px solid #dadce0',
                    borderRadius: '6px',
                    width: '240px'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsMatModalOpen(true)}
                style={{
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={15} /> Add New Material
              </button>
            </div>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Material Name & Specs</th>
                    <th>Material Code</th>
                    <th>Category & Sub-Category</th>
                    <th>Unit of Measure</th>
                    <th>Min Stock Level</th>
                    <th>Reorder Trigger Level</th>
                    <th>Max Stock Capacity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredMaterials = materials.filter((m) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      const name = (m.materialName || m.name || '').toLowerCase();
                      const code = (m.materialCode || m.code || '').toLowerCase();
                      const cat = (m.category || '').toLowerCase();
                      const subCat = (m.subCategory || '').toLowerCase();
                      const desc = (m.description || '').toLowerCase();
                      return name.includes(q) || code.includes(q) || cat.includes(q) || subCat.includes(q) || desc.includes(q);
                    });

                    if (filteredMaterials.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: '#4b5563' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <Package size={32} color="#9ca3af" />
                              <div style={{ fontWeight: '700', color: '#111827' }}>
                                {materials.length === 0 ? 'No material catalog items created yet' : 'No matching materials found'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                {materials.length === 0 ? 'Create master materials (cement, TMT steel, sand, tiles) to start tracking inventory.' : 'Try searching with different terms.'}
                              </div>
                              {materials.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => setIsMatModalOpen(true)}
                                  style={{
                                    marginTop: '6px',
                                    background: '#1a73e8',
                                    color: '#ffffff',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  + Create First Material Item
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filteredMaterials.map((m) => {
                      const matName = m.materialName || m.name || 'Unnamed Material';
                      const matCode = m.materialCode || m.code || 'MAT-CAT';
                      const matUnit = m.unit || m.unitOfMeasure || 'units';
                      const minStock = m.minimumStockLevel ?? 0;
                      const reorderLvl = m.reorderLevel ?? 0;
                      const maxStock = m.maximumStockLevel ? `${m.maximumStockLevel} ${matUnit}` : 'Unlimited';

                      return (
                        <tr key={m._id || m.id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem' }}>{matName}</div>
                            {m.description && (
                              <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '2px', maxWidth: '280px' }}>
                                {m.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <code style={{ background: '#e8f0fe', padding: '3px 8px', borderRadius: '4px', color: '#1a73e8', fontWeight: '800', fontSize: '0.78rem' }}>
                              {matCode}
                            </code>
                          </td>
                          <td>
                            <div style={{ color: '#111827', fontWeight: '600' }}>{m.category || 'Civil'}</div>
                            {m.subCategory && (
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Grade/Type: {m.subCategory}</div>
                            )}
                          </td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontWeight: '700', fontSize: '0.76rem', textTransform: 'capitalize' }}>
                              {matUnit}
                            </span>
                          </td>
                          <td style={{ color: '#374151', fontWeight: '600' }}>
                            {minStock} {matUnit}
                          </td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#ffdad6', color: '#ba1a1a', fontWeight: '800', fontSize: '0.76rem' }}>
                              {reorderLvl} {matUnit}
                            </span>
                          </td>
                          <td style={{ color: '#4b5563', fontWeight: '600' }}>
                            {maxStock}
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: m.isActive === false ? '#ffdad6' : '#e6f4ea',
                              color: m.isActive === false ? '#ba1a1a' : '#137333',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              textTransform: 'capitalize'
                            }}>
                              {m.isActive === false ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: STORES ================= */}
      {activeTab === 'stores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Project Site Warehouses & Stores ({stores.length})</h3>
            <button
              type="button"
              onClick={() => {
                setEditingStore(null);
                setIsStoreModalOpen(true);
              }}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Add Store Warehouse
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {stores.map((s) => (
              <div key={s._id || s.id} className="g-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827' }}>{s.storeName}</h4>
                    <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      {s.storeCode}
                    </span>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: s.status === 'active' ? '#e6f4ea' : '#ffdad6', color: s.status === 'active' ? '#137333' : '#ba1a1a', fontSize: '0.74rem', fontWeight: '700' }}>
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Project: <strong style={{ color: '#111827' }}>{s.projectId?.projectName || 'General Site'}</strong></div>
                  <div>Storekeeper: <strong style={{ color: s.storeKeeper ? '#15803d' : '#b45309' }}>{s.storeKeeper || 'Unassigned'}</strong></div>
                  <div>Location: <strong style={{ color: '#111827' }}>{s.location || 'On-site'}</strong></div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f3f4',
                  paddingTop: '10px',
                  marginTop: '4px'
                }}>
                  <button
                    onClick={() => {
                      setEditingStore(s);
                      setIsStoreModalOpen(true);
                    }}
                    style={{
                      background: s.storeKeeper ? '#f8fafc' : '#eff6ff',
                      border: s.storeKeeper ? '1px solid #cbd5e1' : '1px solid #bfdbfe',
                      color: s.storeKeeper ? '#334155' : '#1d4ed8',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit size={12} />
                    {s.storeKeeper ? 'Edit Store' : 'Assign Storekeeper'}
                  </button>

                  <button
                    onClick={() => handleDeleteStore(s)}
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Delete Store"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: VENDORS ================= */}
      {activeTab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Suppliers & Vendors Master ({vendors.length})</h3>
              <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '2px' }}>
                Directory of approved building material vendors, cement & steel distributors, and suppliers.
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input
                  type="text"
                  placeholder="Search vendors, GST, contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '7px 12px 7px 30px',
                    fontSize: '0.82rem',
                    border: '1px solid #dadce0',
                    borderRadius: '6px',
                    width: '240px'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsVendorModalOpen(true)}
                style={{
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={15} /> Register Vendor
              </button>
            </div>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Vendor / Company</th>
                    <th>Contact Person</th>
                    <th>Phone & Email</th>
                    <th>Tax Identifiers (GST / PAN)</th>
                    <th>City / State</th>
                    <th>Payment Terms</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredVendors = vendors.filter((v) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      const vName = (v.vendorName || '').toLowerCase();
                      const vCode = (v.vendorCode || '').toLowerCase();
                      const vGst = (v.gstNumber || v.gstin || '').toLowerCase();
                      const vPan = (v.panNumber || '').toLowerCase();
                      const vContact = typeof v.contactPerson === 'string' 
                        ? v.contactPerson.toLowerCase() 
                        : (v.contactPerson?.name || '').toLowerCase();
                      const vPhone = (v.phone || v.contactPerson?.mobileNo || '').toLowerCase();
                      const vCity = (v.address?.city || (typeof v.address === 'string' ? v.address : '')).toLowerCase();
                      return vName.includes(q) || vCode.includes(q) || vGst.includes(q) || vPan.includes(q) || vContact.includes(q) || vPhone.includes(q) || vCity.includes(q);
                    });

                    if (filteredVendors.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: '#4b5563' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <Truck size={32} color="#9ca3af" />
                              <div style={{ fontWeight: '700', color: '#111827' }}>
                                {vendors.length === 0 ? 'No vendors registered yet' : 'No matching vendors found'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                {vendors.length === 0 ? 'Register your material suppliers, steel dealers, and civil contractors.' : 'Try changing your search keywords.'}
                              </div>
                              {vendors.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => setIsVendorModalOpen(true)}
                                  style={{
                                    marginTop: '6px',
                                    background: '#1a73e8',
                                    color: '#ffffff',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  + Register First Vendor
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filteredVendors.map((v) => {
                      const contactName = typeof v.contactPerson === 'object' && v.contactPerson !== null
                        ? v.contactPerson.name || 'N/A'
                        : (typeof v.contactPerson === 'string' ? v.contactPerson : 'N/A');
                      const phone = v.phone || (typeof v.contactPerson === 'object' ? v.contactPerson?.mobileNo : '') || 'N/A';
                      const email = v.email || (typeof v.contactPerson === 'object' ? v.contactPerson?.email : '') || '';
                      const gst = v.gstNumber || v.gstin || 'N/A';
                      const pan = v.panNumber || '';
                      const cityState = v.address?.city 
                        ? `${v.address.city}${v.address.state ? `, ${v.address.state}` : ''}`
                        : (typeof v.address === 'string' ? v.address : 'Jaipur, RJ');

                      return (
                        <tr key={v._id || v.id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem' }}>{v.vendorName}</div>
                            <span style={{ fontSize: '0.72rem', background: '#e8f0fe', color: '#1a73e8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              {v.vendorCode || 'VENDOR'}
                            </span>
                          </td>
                          <td>
                            <div style={{ color: '#111827', fontWeight: '600' }}>{contactName}</div>
                            {typeof v.contactPerson === 'object' && v.contactPerson?.email && (
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{v.contactPerson.email}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ color: '#1a73e8', fontWeight: '700' }}>
                              {phone !== 'N/A' ? (
                                <a href={`tel:${phone}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{phone}</a>
                              ) : 'N/A'}
                            </div>
                            {email && (
                              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                                <a href={`mailto:${email}`} style={{ color: '#4b5563', textDecoration: 'none' }}>{email}</a>
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ color: '#111827', fontWeight: '700', fontFamily: 'monospace' }}>{gst}</div>
                            {pan && <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>PAN: {pan}</div>}
                          </td>
                          <td style={{ color: '#374151', fontWeight: '600' }}>{cityState}</td>
                          <td style={{ color: '#374151', fontWeight: '600' }}>{v.paymentTerms || 'Net 30 Days'}</td>
                          <td>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: (v.status === 'inactive' || v.status === 'blacklisted') ? '#ffdad6' : '#e6f4ea',
                              color: (v.status === 'inactive' || v.status === 'blacklisted') ? '#ba1a1a' : '#137333',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              textTransform: 'capitalize'
                            }}>
                              {v.status || 'active'}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PURCHASE ORDERS ================= */}
      {activeTab === 'pos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Purchase Orders Register ({pos.length})</h3>
            <button
              type="button"
              onClick={() => setIsPoModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Raise Purchase Order
            </button>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Project Site</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po._id || po.id}>
                      <td><strong style={{ color: '#1a73e8' }}>{po.poNumber}</strong></td>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{po.vendorId?.vendorName || 'Vendor'}</td>
                      <td style={{ color: '#374151', fontWeight: '600' }}>{po.projectId?.projectName || 'Site'}</td>
                      <td style={{ color: '#111827', fontWeight: '800' }}>{formatINR(po.totalAmount)}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#e8f0fe', color: '#1a73e8', fontSize: '0.74rem', fontWeight: '700' }}>
                          {po.status}
                        </span>
                      </td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem', fontWeight: '600' }}>
                        {new Date(po.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: GOODS RECEIPTS (GRN) ================= */}
      {activeTab === 'grns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Goods Receipts (GRN) Inward Register ({grns.length})</h3>
            <button
              type="button"
              onClick={() => setIsGrnModalOpen(true)}
              style={{
                background: '#137333',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <CheckCircle size={15} /> Inward New GRN
            </button>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>GRN Number</th>
                    <th>Vendor Invoice / DC</th>
                    <th>Warehouse Store</th>
                    <th>Items Inwarded</th>
                    <th>Received By</th>
                    <th>Receipt Date</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((g) => (
                    <tr key={g._id || g.id}>
                      <td><strong style={{ color: '#137333' }}>{g.grnNumber}</strong></td>
                      <td style={{ color: '#111827', fontWeight: '600' }}>{g.challanNumber || g.invoiceNumber || 'Direct DC'}</td>
                      <td style={{ color: '#374151', fontWeight: '600' }}>{g.storeId?.storeName || 'Main Store'}</td>
                      <td style={{ color: '#111827', fontWeight: '700' }}>{g.items?.length || 1} material items</td>
                      <td style={{ color: '#4b5563', fontWeight: '600' }}>{g.receivedBy || 'Store In-charge'}</td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem', fontWeight: '600' }}>
                        {new Date(g.receivedDate || g.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 7: MATERIAL ISSUES ================= */}
      {activeTab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Material Issues to Site Contractors ({issues.length})</h3>
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <ArrowUpRight size={15} /> Issue to Contractor
            </button>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Issue Slip No</th>
                    <th>Contractor / Person</th>
                    <th>Project Tower / Work</th>
                    <th>Items Issued</th>
                    <th>Issued By</th>
                    <th>Issue Date</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((iss) => {
                    const contractor = iss.contractorName || iss.issuedTo || 'Site Contractor';
                    const issuer = iss.issuedBy || (iss.createdBy?.firstName ? `${iss.createdBy.firstName} ${iss.createdBy.lastName || ''}`.trim() : (iss.createdBy?.username ? `@${iss.createdBy.username}` : 'Store In-charge'));
                    return (
                      <tr key={iss._id || iss.id}>
                        <td><strong style={{ color: '#1a73e8' }}>{iss.issueNumber}</strong></td>
                        <td style={{ fontWeight: '700', color: '#111827' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{contractor}</span>
                            {iss.contractorContact && (
                              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '500' }}>
                                📞 {iss.contractorContact}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: '#374151', fontWeight: '600' }}>{iss.projectId?.projectName || 'Site Work'} ({iss.purpose || 'Civil'})</td>
                        <td style={{ color: '#111827', fontWeight: '700' }}>{iss.items?.length || 1} items debited</td>
                        <td style={{ color: '#4b5563', fontWeight: '600' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a73e8' }}></span>
                            {issuer}
                          </span>
                        </td>
                        <td style={{ color: '#4b5563', fontSize: '0.76rem', fontWeight: '600' }}>
                          {new Date(iss.issueDate || iss.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 8: TRANSFERS ================= */}
      {activeTab === 'transfers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Inter-Store Material Transfers ({transfers.length})</h3>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              style={{
                background: '#8b5cf6',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Repeat size={15} /> Transfer Between Stores
            </button>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Transfer Code</th>
                    <th>Source Warehouse</th>
                    <th>Destination Warehouse</th>
                    <th>Items Transferred</th>
                    <th>Vehicle / Gatepass</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => (
                    <tr key={tr._id || tr.id}>
                      <td><strong style={{ color: '#8b5cf6' }}>{tr.transferNumber}</strong></td>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{tr.fromStoreId?.storeName || 'Source Store'}</td>
                      <td style={{ fontWeight: '700', color: '#137333' }}>{tr.toStoreId?.storeName || 'Destination Store'}</td>
                      <td style={{ color: '#111827', fontWeight: '700' }}>{tr.items?.length || 1} material items</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.8rem' }}>
                            🎫 {tr.gatepassNumber || 'GP-VERIFIED'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {tr.vehicleNumber ? `🚛 ${tr.vehicleNumber}` : 'Gate Clearance Logged'}
                            {tr.driverName ? ` • ${tr.driverName}` : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: tr.status === 'received' ? '#dcfce7' : (tr.status === 'in_transit' ? '#fef3c7' : '#e8f0fe'),
                          color: tr.status === 'received' ? '#15803d' : (tr.status === 'in_transit' ? '#b45309' : '#1a73e8'),
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: tr.status === 'received' ? '#15803d' : (tr.status === 'in_transit' ? '#b45309' : '#1a73e8')
                          }}></span>
                          {tr.status ? tr.status.replace(/_/g, ' ') : 'Received'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {tr.status === 'in_transit' ? (
                          <button
                            onClick={() => handleUpdateTransferStatus(tr._id || tr.id, 'received')}
                            style={{
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 1px 3px rgba(21, 128, 61, 0.25)'
                            }}
                            title="Confirm delivery arrival and gatepass verification at destination"
                          >
                            <CheckCircle size={13} /> Mark Received
                          </button>
                        ) : (
                          <span style={{
                            fontSize: '0.74rem',
                            color: '#15803d',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f0fdf4',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #bbf7d0'
                          }}>
                            <CheckCircle size={12} /> Delivered
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CRUD MODALS */}
      <NewMaterialModal isOpen={isMatModalOpen} onClose={() => setIsMatModalOpen(false)} onSubmit={handleSaveMaterial} />
      <NewStoreModal
        isOpen={isStoreModalOpen}
        onClose={() => {
          setIsStoreModalOpen(false);
          setEditingStore(null);
        }}
        onSubmit={handleSaveStore}
        store={editingStore}
      />
      <NewVendorModal isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} onSubmit={handleSaveVendor} />
      <NewPOModal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} onSubmit={handleSavePO} materials={materials} vendors={vendors} stores={stores} />
      <NewGRNModal isOpen={isGrnModalOpen} onClose={() => setIsGrnModalOpen(false)} onSubmit={handleSaveGRN} materials={materials} vendors={vendors} stores={stores} pos={pos} />
      <NewIssueModal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleSaveIssue} materials={materials} stores={stores} />
      <NewTransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} onSubmit={handleSaveTransfer} materials={materials} stores={stores} />

    </div>
  );
};
