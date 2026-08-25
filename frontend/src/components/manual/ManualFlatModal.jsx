import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';

export const ManualFlatModal = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  buildingId,
  buildingName = 'Building',
  flat = null
}) => {
  const [formData, setFormData] = useState({
    flatNumber: '',
    floor: 1,
    bhkType: '2BHK',
    carpetArea: 950,
    basePrice: 4500000,
    facing: 'East',
    status: 'available',
    buybackCount: 0,
    takenForRental: false
  });

  useEffect(() => {
    if (flat) {
      setFormData({
        flatNumber: flat.flatNumber || '',
        floor: flat.floor !== undefined && flat.floor !== null ? flat.floor : 1,
        bhkType: flat.bhkType || '2BHK',
        carpetArea: flat.carpetArea || 950,
        basePrice: flat.basePrice || 4500000,
        facing: flat.facing || 'East',
        status: flat.status || 'available',
        buybackCount: flat.buybackCount || 0,
        takenForRental: flat.takenForRental || false
      });
    } else {
      setFormData({
        flatNumber: '',
        floor: 1,
        bhkType: '2BHK',
        carpetArea: 950,
        basePrice: 4500000,
        facing: 'East',
        status: 'available',
        buybackCount: 0,
        takenForRental: false
      });
    }
  }, [flat, isOpen]);

  // Auto-infer floor when flat number changes
  const handleFlatNumberChange = (val) => {
    const digits = val.replace(/\D/g, '');
    let calculatedFloor = formData.floor;
    if (digits.length >= 3) {
      const fl = parseInt(digits.slice(0, -2), 10);
      if (!isNaN(fl) && fl > 0) calculatedFloor = fl;
    } else if (digits.length > 0) {
      const single = parseInt(digits[0], 10);
      if (!isNaN(single) && single > 0) calculatedFloor = single;
    }
    setFormData({ ...formData, flatNumber: val, floor: calculatedFloor });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      projectId,
      buildingId,
      ...formData,
      floor: Number(formData.floor),
      carpetArea: Number(formData.carpetArea),
      basePrice: Number(formData.basePrice),
      buybackCount: Number(formData.buybackCount)
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={flat ? `Edit Flat: ${flat.flatNumber}` : `Manual Entry: Add Flat to "${buildingName}"`}
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Flat Number & Floor Number (Auto-calculated & Editable) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Flat / Unit Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101, 204, A-302"
              value={formData.flatNumber}
              onChange={(e) => handleFlatNumberChange(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Floor Number *
            </label>
            <input
              type="number"
              required
              min="0"
              max="150"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* BHK Configuration & Carpet Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              BHK Type
            </label>
            <select
              value={formData.bhkType}
              onChange={(e) => setFormData({ ...formData, bhkType: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="1BHK">1 BHK</option>
              <option value="2BHK">2 BHK</option>
              <option value="3BHK">3 BHK</option>
              <option value="4BHK">4 BHK</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Studio">Studio</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Carpet Area (sq.ft)
            </label>
            <input
              type="number"
              min="100"
              value={formData.carpetArea}
              onChange={(e) => setFormData({ ...formData, carpetArea: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Facing
            </label>
            <select
              value={formData.facing}
              onChange={(e) => setFormData({ ...formData, facing: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="East">East</option>
              <option value="North">North</option>
              <option value="North-East">North-East</option>
              <option value="West">West</option>
              <option value="South">South</option>
            </select>
          </div>
        </div>

        {/* Base Price & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Base Valuation Price (₹)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Inventory Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="available">Available</option>
              <option value="hold">Hold</option>
              <option value="sold">Sold</option>
              <option value="leased">Leased</option>
            </select>
          </div>
        </div>

        {/* Taken For Rental Toggle */}
        <div style={{
          background: '#f8f9fa',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid #dadce0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <input
            type="checkbox"
            id="takenForRental"
            checked={formData.takenForRental}
            onChange={(e) => setFormData({ ...formData, takenForRental: e.target.checked })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="takenForRental" style={{ fontSize: '0.85rem', color: '#111827', cursor: 'pointer', margin: 0, fontWeight: '600' }}>
            Taken For Rental Pool (Eligible for tenant lease)
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #dadce0', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
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
            {flat ? 'Save Changes' : 'Add Flat Unit'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
