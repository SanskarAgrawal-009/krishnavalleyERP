import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Layers, Plus, Home, Sparkles, CheckCircle } from 'lucide-react';

export const ManualFloorModal = ({
  isOpen,
  onClose,
  onSubmit,
  projectName = '',
  building = null
}) => {
  const currentFloors = building?.numberOfFloors || 0;
  const nextFloorNumber = currentFloors + 1;

  const [floorNumber, setFloorNumber] = useState(nextFloorNumber);
  const [numberOfFlats, setNumberOfFlats] = useState(4);
  const [bhkType, setBhkType] = useState('2BHK');
  const [carpetArea, setCarpetArea] = useState(950);
  const [basePrice, setBasePrice] = useState(4500000);
  const [unitPrefix, setUnitPrefix] = useState(''); // e.g., 'A-' or ''
  const [loading, setLoading] = useState(false);

  // Generate preview of flat numbers
  const previewFlats = Array.from({ length: Math.min(Number(numberOfFlats) || 0, 12) }, (_, i) => {
    const num = i + 1;
    const flatNo = `${unitPrefix}${floorNumber}${String(num).padStart(2, '0')}`;
    return flatNo;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const generatedList = Array.from({ length: Number(numberOfFlats) }, (_, i) => {
        const num = i + 1;
        const flatNumber = `${unitPrefix}${floorNumber}${String(num).padStart(2, '0')}`;
        return {
          flatNumber,
          floor: Number(floorNumber),
          bhkType,
          carpetArea: Number(carpetArea),
          basePrice: Number(basePrice),
          status: 'available'
        };
      });

      await onSubmit({
        floorNumber: Number(floorNumber),
        numberOfFlats: Number(numberOfFlats),
        bhkType,
        carpetArea: Number(carpetArea),
        basePrice: Number(basePrice),
        flatsToCreate: generatedList
      });

      onClose();
    } catch (err) {
      alert(err.message || 'Failed to add floor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Floor: ${building?.buildingName || 'Building'} (${projectName || 'Project'})`}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Info Banner */}
        <div style={{
          background: '#e8f0fe',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Layers size={20} color="#1a73e8" />
          <div style={{ fontSize: '0.82rem', color: '#1e3a8a' }}>
            Current Building Height: <strong>{currentFloors} Floors</strong>. Adding floor will automatically update tower specs and configure unit inventory in MongoDB.
          </div>
        </div>

        {/* Floor Number & Unit Count */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Floor Number *
            </label>
            <input
              type="number"
              required
              min="0"
              max="150"
              value={floorNumber}
              onChange={(e) => setFloorNumber(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Flats on this Floor *
            </label>
            <input
              type="number"
              required
              min="1"
              max="20"
              value={numberOfFlats}
              onChange={(e) => setNumberOfFlats(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.88rem' }}
            />
          </div>
        </div>

        {/* Unit Prefix (Optional) & BHK Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Unit Prefix (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. A- or BLK-"
              value={unitPrefix}
              onChange={(e) => setUnitPrefix(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Default BHK Configuration
            </label>
            <select
              value={bhkType}
              onChange={(e) => setBhkType(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.88rem' }}
            >
              <option value="1RK">1RK Studio</option>
              <option value="1BHK">1 BHK Apartment</option>
              <option value="2BHK">2 BHK Luxury</option>
              <option value="3BHK">3 BHK Premium</option>
              <option value="4BHK">4 BHK Penthouse</option>
              <option value="Villa">Villa / Duplex</option>
              <option value="Commercial">Commercial Office / Shop</option>
            </select>
          </div>
        </div>

        {/* Carpet Area & Base Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Carpet Area (sq. ft)
            </label>
            <input
              type="number"
              value={carpetArea}
              onChange={(e) => setCarpetArea(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Base Valuation (₹)
            </label>
            <input
              type="number"
              step="50000"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.88rem' }}
            />
          </div>
        </div>

        {/* Generated Flats Preview */}
        <div>
          <label style={{ fontSize: '0.78rem', color: '#4b5563', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
            Preview of Units Generated on Floor {floorNumber}:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#f8f9fa', padding: '10px 12px', borderRadius: '6px', border: '1px solid #dadce0' }}>
            {previewFlats.map((fn, idx) => (
              <span
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #c7d2fe',
                  color: '#1e40af',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Home size={12} /> {fn}
              </span>
            ))}
            {Number(numberOfFlats) > 12 && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280', alignSelf: 'center' }}>
                +{Number(numberOfFlats) - 12} more
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
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
            disabled={loading}
            style={{
              padding: '9px 22px',
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)'
            }}
          >
            <Plus size={16} /> {loading ? 'Creating Floor...' : `Create Floor ${floorNumber} & Units`}
          </button>
        </div>

      </form>
    </Modal>
  );
};
