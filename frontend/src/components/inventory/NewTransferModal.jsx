import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { inventoryService } from '../../services/inventoryService.js';
import { projectService } from '../../services/projectService.js';
import { Repeat, ArrowRight, Package } from 'lucide-react';

export const NewTransferModal = ({ isOpen, onClose, onSubmit }) => {
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState([]);
  const [fromStocks, setFromStocks] = useState([]);

  const [transferNumber, setTransferNumber] = useState(`TRF-${Date.now().toString().slice(-6)}`);
  const [projectId, setProjectId] = useState('');
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(10);

  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) setProjectId(res.data[0]._id);
        }
      });
      inventoryService.getStores().then((res) => {
        if (res.data && res.data.length >= 2) {
          setStores(res.data);
          setFromStoreId(res.data[0]._id);
          setToStoreId(res.data[1]._id);
          fetchFromStock(res.data[0]._id);
        } else if (res.data) {
          setStores(res.data);
        }
      });
      setTransferNumber(`TRF-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen]);

  const fetchFromStock = (sId) => {
    inventoryService.getStocks({ storeId: sId }).then((res) => {
      if (res.data) {
        setFromStocks(res.data);
        if (res.data.length > 0) setSelectedMaterialId(res.data[0].materialId?._id || res.data[0].materialId);
      }
    });
  };

  const handleFromStoreChange = (sId) => {
    setFromStoreId(sId);
    fetchFromStock(sId);
  };

  const selectedStock = fromStocks.find((s) => (s.materialId?._id || s.materialId) === selectedMaterialId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fromStoreId || !toStoreId || !selectedMaterialId || !quantity) {
      alert('Please fill all required fields');
      return;
    }
    if (fromStoreId === toStoreId) {
      alert('Source and destination stores cannot be identical.');
      return;
    }

    onSubmit({
      transferNumber,
      fromStoreId,
      toStoreId,
      projectId,
      items: [
        {
          materialId: selectedMaterialId,
          quantity: Number(quantity)
        }
      ]
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inter-Store Stock Transfer"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Transfer Code # *
          </label>
          <input
            type="text"
            required
            value={transferNumber}
            onChange={(e) => setTransferNumber(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        {/* Source and Destination Stores */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Source Store (Debit From) *
            </label>
            <select
              required
              value={fromStoreId}
              onChange={(e) => handleFromStoreChange(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Source Store --</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.storeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Destination Store (Credit To) *
            </label>
            <select
              required
              value={toStoreId}
              onChange={(e) => setToStoreId(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Target Store --</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.storeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Material & Quantity */}
        <div className="g-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#8b5cf6' }}>
            Transfer Material & Quantity
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                Select Material to Transfer *
              </label>
              <select
                required
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="">-- Select Material --</option>
                {fromStocks.map((st) => (
                  <option key={st._id} value={st.materialId?._id || st.materialId}>
                    {st.materialId?.materialName || 'Material'} (Available: {st.availableQuantity} {st.materialId?.unit || 'unit'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                Transfer Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                max={selectedStock?.availableQuantity || 9999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {selectedStock && (
            <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', padding: '10px 14px', borderRadius: '6px', fontSize: '0.78rem', color: '#4b5563' }}>
              Available in Source Store: <strong style={{ color: '#137333' }}>{selectedStock.availableQuantity} {selectedStock.materialId?.unit}</strong>
            </div>
          )}
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
              background: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.3)'
            }}
          >
            Execute Stock Transfer
          </button>
        </div>
      </form>
    </Modal>
  );
};
