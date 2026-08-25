import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { inventoryService } from '../../services/inventoryService.js';
import { CheckCircle, Truck, Package, Layers } from 'lucide-react';

export const NewGRNModal = ({ isOpen, onClose, onSubmit }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [grnNumber, setGrnNumber] = useState(`GRN-${Date.now().toString().slice(-6)}`);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [receivedItems, setReceivedItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      inventoryService.getPurchaseOrders().then((res) => {
        if (res.data) {
          setPurchaseOrders(res.data);
          if (res.data.length > 0) {
            handleSelectPO(res.data[0]._id, res.data);
          }
        }
      });
      setGrnNumber(`GRN-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen]);

  const handleSelectPO = (poId, list = purchaseOrders) => {
    setSelectedPoId(poId);
    const matched = list.find((p) => p._id === poId);
    if (matched) {
      setReceivedItems(
        (matched.items || []).map((item) => ({
          materialId: item.materialId?._id || item.materialId,
          materialName: item.materialId?.materialName || 'Material Item',
          unit: item.materialId?.unit || 'unit',
          orderedQuantity: item.quantity,
          receivedQuantity: item.quantity,
          rejectedQuantity: 0,
          unitRate: item.unitRate,
          condition: 'good'
        }))
      );
    }
  };

  const handleItemQtyChange = (idx, val) => {
    const updated = [...receivedItems];
    updated[idx].receivedQuantity = Number(val);
    setReceivedItems(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPoId) {
      alert('Please select a purchase order.');
      return;
    }

    onSubmit({
      grnNumber,
      poId: selectedPoId,
      invoiceNumber,
      items: receivedItems
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Goods Receipt Note (GRN) — Receive Shipment"
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Select Purchase Order *
            </label>
            <select
              required
              value={selectedPoId}
              onChange={(e) => handleSelectPO(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Choose PO --</option>
              {purchaseOrders.map((po) => (
                <option key={po._id} value={po._id}>
                  {po.poNumber} • {po.vendorId?.vendorName || 'Vendor'} (₹{po.totalAmount})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              GRN Number *
            </label>
            <input
              type="text"
              required
              value={grnNumber}
              onChange={(e) => setGrnNumber(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Vendor Invoice #
            </label>
            <input
              type="text"
              placeholder="e.g. INV-90812"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Received Items Inspection Table */}
        <div className="g-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#137333' }}>
            Goods Verification & Store Stock Auto-Credit ({receivedItems.length} items)
          </h4>

          {/* Table Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '10px',
            padding: '4px 10px',
            background: '#f3f4f5',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: '700',
            color: '#4b5563',
            textTransform: 'uppercase'
          }}>
            <div>Material & Order Info</div>
            <div>Received Quantity *</div>
            <div>QC Inspection Status *</div>
            <div style={{ textAlign: 'right' }}>Credited Value (₹)</div>
          </div>

          {receivedItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: '10px',
                alignItems: 'center',
                background: '#f8f9fa',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #dadce0'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                  Material Name
                </label>
                <strong style={{ color: '#111827', fontSize: '0.85rem' }}>{item.materialName}</strong>
                <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>
                  Ordered: {item.orderedQuantity} {item.unit} @ ₹{item.unitRate}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                  Received Qty *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={item.receivedQuantity}
                  onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem', padding: '6px 8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                  Quality Check *
                </label>
                <select
                  value={item.condition}
                  onChange={(e) => {
                    const updated = [...receivedItems];
                    updated[idx].condition = e.target.value;
                    setReceivedItems(updated);
                  }}
                  style={{ width: '100%', fontSize: '0.85rem', padding: '6px 8px' }}
                >
                  <option value="good">Good / Quality Passed</option>
                  <option value="damaged">Damaged / Flawed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div style={{ textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                  Total Valuation
                </label>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#137333', paddingTop: '4px' }}>
                  ₹{Math.round(item.receivedQuantity * item.unitRate).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#e8f0fe', padding: '10px 14px', borderRadius: '6px', fontSize: '0.78rem', color: '#1f2937', border: '1px solid #d2e3fc' }}>
          <strong>Automated Store Credit:</strong> Submitting this GRN will automatically increment the physical stock in the receiving store and recalculate the average unit cost.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '9px 22px',
              background: '#137333',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(19, 115, 51, 0.3)'
            }}
          >
            Verify GRN & Credit Stock
          </button>
        </div>
      </form>
    </Modal>
  );
};
