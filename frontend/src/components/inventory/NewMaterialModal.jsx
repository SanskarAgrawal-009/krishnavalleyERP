import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Package, Tag, Layers, ArrowRight } from 'lucide-react';

export const NewMaterialModal = ({ isOpen, onClose, onSubmit }) => {
  const [materialCode, setMaterialCode] = useState(`MAT-${Date.now().toString().slice(-4)}`);
  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState('Civil / Masonry');
  const [subCategory, setSubCategory] = useState('');
  const [unit, setUnit] = useState('bag');
  const [minimumStockLevel, setMinimumStockLevel] = useState(50);
  const [reorderLevel, setReorderLevel] = useState(100);
  const [maximumStockLevel, setMaximumStockLevel] = useState(1000);
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      materialCode,
      materialName,
      category,
      subCategory,
      unit,
      minimumStockLevel: Number(minimumStockLevel),
      reorderLevel: Number(reorderLevel),
      maximumStockLevel: maximumStockLevel ? Number(maximumStockLevel) : undefined,
      description
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Master Material Catalog Item"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Material Code *
            </label>
            <input
              type="text"
              required
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Material Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. UltraTech Super Cement 50kg"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="Civil / Masonry">Civil / Masonry</option>
              <option value="Steel & Rebar">Steel & Rebar</option>
              <option value="Plumbing & Sanitary">Plumbing & Sanitary</option>
              <option value="Electrical & Lighting">Electrical & Lighting</option>
              <option value="Paints & Finishes">Paints & Finishes</option>
              <option value="Flooring & Tiles">Flooring & Tiles</option>
              <option value="Wood & Carpentry">Wood & Carpentry</option>
              <option value="Safety & Consumables">Safety & Consumables</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Sub Category
            </label>
            <input
              type="text"
              placeholder="e.g. Grade 53"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Unit of Measure *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="bag">Bag</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="ton">Metric Ton</option>
              <option value="piece">Piece (pc)</option>
              <option value="sq_meter">Sq. Meter</option>
              <option value="cu_meter">Cu. Meter</option>
              <option value="meter">Meter</option>
              <option value="liter">Liter</option>
              <option value="bundle">Bundle</option>
              <option value="box">Box</option>
              <option value="set">Set</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Min Stock Level
            </label>
            <input
              type="number"
              value={minimumStockLevel}
              onChange={(e) => setMinimumStockLevel(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Reorder Alert Level
            </label>
            <input
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Max Stock Capacity
            </label>
            <input
              type="number"
              value={maximumStockLevel}
              onChange={(e) => setMaximumStockLevel(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Material Specifications / Notes
          </label>
          <textarea
            rows="2"
            placeholder="Technical details, storage constraints, or brand preference..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
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
            Save Material Item
          </button>
        </div>
      </form>
    </Modal>
  );
};
