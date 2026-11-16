import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';

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
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        projectId,
        buildingId,
        ...formData,
        floor: Number(formData.floor),
        carpetArea: Number(formData.carpetArea),
        basePrice: Number(formData.basePrice),
        buybackCount: Number(formData.buybackCount)
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={flat ? `Edit Flat ${flat.flatNumber}` : `Add new flat to ${buildingName}`}
      maxWidth="620px"
      centeredHeader={true}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Flat Number & Floor Number */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Flat number *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                required
                placeholder="e.g. 101, 204, A-302"
                value={formData.flatNumber}
                onChange={(e) => handleFlatNumberChange(e.target.value)}
                className="form-card-input"
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Floor number *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="number"
                required
                min="0"
                max="150"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="form-card-input"
              />
            </div>
          </div>
        </div>

        {/* BHK Configuration & Carpet Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Flat / BHK type</span>
            </div>
            <div className="form-card-input-row">
              <select
                value={formData.bhkType}
                onChange={(e) => setFormData({ ...formData, bhkType: e.target.value })}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="1BHK">1 BHK</option>
                <option value="2BHK">2 BHK</option>
                <option value="3BHK">3 BHK</option>
                <option value="4BHK">4 BHK</option>
                <option value="Studio">Studio</option>
                <option value="Service Apartment">Service Apartment</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Villa">Villa</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Carpet area (sq.ft)</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="number"
                min="100"
                value={formData.carpetArea}
                onChange={(e) => setFormData({ ...formData, carpetArea: e.target.value })}
                className="form-card-input"
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Facing</span>
            </div>
            <div className="form-card-input-row">
              <select
                value={formData.facing}
                onChange={(e) => setFormData({ ...formData, facing: e.target.value })}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="East">East</option>
                <option value="North">North</option>
                <option value="North-East">North-East</option>
                <option value="West">West</option>
                <option value="South">South</option>
              </select>
            </div>
          </div>
        </div>

        {/* Base Price & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Valuation price (₹)</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="number"
                min="0"
                step="10000"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="form-card-input"
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Inventory status</span>
            </div>
            <div className="form-card-input-row">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="resell">Resell</option>
                <option value="buy_back">Buy Back</option>
                <option value="possession_renewal">Possession Renewal</option>
                <option value="leased">Leased</option>
                <option value="hold">Hold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Taken For Rental Toggle */}
        <div className="form-card-box" style={{ background: '#fafaf9' }}>
          <div className="form-card-prompt">
            <span>Rental pool enrollment</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#17652f', fontWeight: '600' }}>
              <input
                type="checkbox"
                id="takenForRental"
                checked={formData.takenForRental}
                onChange={(e) => setFormData({ ...formData, takenForRental: e.target.checked })}
                style={{ accentColor: '#17652f' }}
              />
              Eligible for rental pool
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.86rem',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px 26px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(23, 101, 47, 0.25)'
            }}
          >
            {submitting ? 'Saving...' : flat ? 'Save changes' : 'Add flat'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
