import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { inventoryService } from '../../services/inventoryService.js';
import { projectService } from '../../services/projectService.js';
import { ShoppingCart, Plus, Trash2, DollarSign } from 'lucide-react';

export const NewPOModal = ({ isOpen, onClose, onSubmit }) => {
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [poNumber, setPoNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [projectId, setProjectId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState('');

  // Line Items
  const [items, setItems] = useState([
    { materialId: '', quantity: 100, unitRate: 380, taxRate: 18 }
  ]);

  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) setProjectId(res.data[0]._id);
        }
      });
      inventoryService.getStores().then((res) => {
        if (res.data) {
          setStores(res.data);
          if (res.data.length > 0) setStoreId(res.data[0]._id);
        }
      });
      inventoryService.getVendors().then((res) => {
        if (res.data) {
          setVendors(res.data);
          if (res.data.length > 0) setVendorId(res.data[0]._id);
        }
      });
      inventoryService.getMaterials().then((res) => {
        if (res.data) {
          setMaterials(res.data);
          if (res.data.length > 0) {
            setItems([{ materialId: res.data[0]._id, quantity: 100, unitRate: 380, taxRate: 18 }]);
          }
        }
      });
      setPoNumber(`PO-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { materialId: materials[0]?._id || '', quantity: 50, unitRate: 100, taxRate: 18 }
    ]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = val;
    setItems(updated);
  };

  // Calculations
  let subtotal = 0;
  let totalTax = 0;
  items.forEach((item) => {
    const q = Number(item.quantity) || 0;
    const r = Number(item.unitRate) || 0;
    const t = Number(item.taxRate) || 0;
    const s = q * r;
    subtotal += s;
    totalTax += s * (t / 100);
  });
  const grandTotal = subtotal + totalTax;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectId || !storeId || !vendorId || items.length === 0) {
      alert('Please fill all required PO fields and select at least one material.');
      return;
    }

    onSubmit({
      poNumber,
      projectId,
      storeId,
      vendorId,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(expectedDate),
      items,
      remarks
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Order (Procurement)"
      maxWidth="840px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Header Fields with Clear Top-Aligned Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              PO Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PO-100234"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Supplier / Vendor *
            </label>
            <select
              required
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Choose Vendor --</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vendorName} ({v.category || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Receiving Store / Warehouse *
            </label>
            <select
              required
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Choose Store --</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.storeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Expected Delivery Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Project & Remarks row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Project / Site *
            </label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Choose Project --</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.projectName} ({p.projectCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Remarks & Terms (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Payment within 30 days of site delivery & QC verification"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="g-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827' }}>
              Order Line Items & Materials ({items.length})
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              style={{
                padding: '6px 12px',
                background: '#e8f0fe',
                color: '#1a73e8',
                border: '1px solid #c7d2fe',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={13} /> Add Material Line
            </button>
          </div>

          {/* Line items column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 36px',
            gap: '10px',
            padding: '4px 10px',
            background: '#f3f4f5',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: '700',
            color: '#4b5563',
            textTransform: 'uppercase'
          }}>
            <div>Material / Product *</div>
            <div>Order Qty *</div>
            <div>Unit Rate (₹) *</div>
            <div>Tax Rate (%)</div>
            <div style={{ textAlign: 'right' }}>Line Total (₹)</div>
            <div></div>
          </div>

          {items.map((item, idx) => {
            const q = Number(item.quantity) || 0;
            const r = Number(item.unitRate) || 0;
            const t = Number(item.taxRate) || 0;
            const lineSub = q * r;
            const lineTot = lineSub + lineSub * (t / 100);

            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 36px',
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
                    Material Item *
                  </label>
                  <select
                    required
                    value={item.materialId}
                    onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px' }}
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.materialName} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                    Unit Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={item.unitRate}
                    onChange={(e) => handleItemChange(idx, 'unitRate', e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.taxRate}
                    onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px' }}
                  />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                    Line Total
                  </label>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#111827', paddingTop: '4px' }}>
                    ₹{Math.round(lineTot).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '16px' }}>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove Item"
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* PO Total Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', border: '1px solid #dadce0', padding: '12px 18px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.82rem', color: '#4b5563' }}>
            Subtotal: <strong style={{ color: '#111827' }}>₹{Math.round(subtotal).toLocaleString('en-IN')}</strong> | GST Tax: <strong style={{ color: '#1a73e8' }}>₹{Math.round(totalTax).toLocaleString('en-IN')}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', textTransform: 'uppercase' }}>TOTAL PO VALUE:</span>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333' }}>
              ₹{Math.round(grandTotal).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
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
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)'
            }}
          >
            Issue Purchase Order
          </button>
        </div>
      </form>
    </Modal>
  );
};
