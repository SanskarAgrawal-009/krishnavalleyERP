import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Building2,
  Home,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Layers,
  Compass,
  Maximize2,
  Tag,
  ArrowRight,
  ExternalLink,
  Upload,
  Pencil,
  Save,
  Check,
  Sparkles,
  Receipt
} from 'lucide-react';
import { projectService } from '../../services/projectService.js';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';
import { DetailModalSkeleton } from '../common/SkeletonLoader.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const FlatDetailModal = ({
  isOpen,
  onClose,
  flatId,
  initialFlat,
  onEditFlat,
  projectName,
  buildingName
}) => {
  const navigate = useNavigate();
  const [flatData, setFlatData] = useState(initialFlat || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'blueprint' | 'commercial' | 'allocation'

  // Inline Specs Edit State
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [specsForm, setSpecsForm] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const loadFlatDetail = async () => {
    if (!flatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectService.getFlatById(flatId);
      if (res.data) {
        setFlatData(res.data);
      }
    } catch (err) {
      console.error('Error fetching flat detail:', err);
      setError(err.message || 'Error loading flat details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && flatId) {
      if (initialFlat) setFlatData(initialFlat);
      loadFlatDetail();
      setActiveTab('specs');
      setIsEditingSpecs(false);
    } else {
      setFlatData(null);
    }
  }, [isOpen, flatId]);

  if (!isOpen) return null;

  const flat = flatData || initialFlat || {};
  const isSold = (flat.status || '').toLowerCase() !== 'available' && !['hold', 'booked', 'on_hold', 'pending'].includes((flat.status || '').toLowerCase());
  const isRental = flat.takenForRental || (flat.status || '').toLowerCase() === 'leased' || Boolean(flat.rentalContract);
  const owner = flat.currentOwner || flat.owner || null;

  const handleStartEditSpecs = () => {
    setSpecsForm({
      bhkType: flat.bhkType || '2BHK',
      carpetArea: flat.carpetArea || 950,
      superBuiltUpArea: flat.superBuiltUpArea || 1200,
      facing: flat.facing || 'East',
      floor: flat.floor ?? 1,
      furnishingStatus: flat.furnishingStatus || 'Semi-Furnished',
      balconiesCount: flat.balconiesCount || 2,
      bathroomsCount: flat.bathroomsCount || 2,
      parkingSlot: flat.parkingSlot || 'Stilt 01',
      basePrice: flat.basePrice || 4500000,
      pricePerSqFt: flat.pricePerSqFt || 4200,
      status: flat.status || 'available'
    });
    setIsEditingSpecs(true);
  };

  const handleSaveSpecs = async (e) => {
    e.preventDefault();
    setIsSavingSpecs(true);
    try {
      const res = await projectService.updateFlat(flat._id || flat.id || flatId, specsForm);
      if (res.success || res.data) {
        setFlatData(res.data || { ...flat, ...specsForm });
        setIsEditingSpecs(false);
        setToastMessage('Unit specifications updated successfully!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error saving specs:', err);
      alert(err.message || 'Failed to update specifications');
    } finally {
      setIsSavingSpecs(false);
    }
  };

  const handleNavigateToSales = () => {
    onClose();
    navigate(`/sales?search=${encodeURIComponent(flat.flatNumber || '')}`);
  };

  const handleNavigateToFlatProfile = () => {
    onClose();
    navigate(`/inventory/flats/${flat._id || flatId}`);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Home size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                  Flat {flat.flatNumber || 'Loading...'}
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isSold ? '#1e3a8a' : '#14532d',
                  color: isSold ? '#93c5fd' : '#86efac',
                  border: isSold ? '1px solid #3b82f6' : '1px solid #22c55e',
                  textTransform: 'uppercase'
                }}>
                  {flat.status ? flat.status.replace(/_/g, ' ') : (isSold ? 'SOLD' : 'AVAILABLE')}
                </span>
                {isRental && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#581c87',
                    color: '#e9d5ff',
                    border: '1px solid #a855f7'
                  }}>
                    3-YR RENTAL POOL
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{projectName || flat.projectId?.projectName || 'Krishna Valley Heritage'}</span>
                <span>•</span>
                <span>{buildingName || flat.buildingName || 'Tower A'}</span>
                <span>•</span>
                <span>{flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor || 1}`}</span>
                <span>•</span>
                <span>{flat.bhkType || '2BHK'} ({flat.carpetArea || 950} sqft)</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleNavigateToFlatProfile}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
              }}
              title="Open full dedicated flat profile page"
            >
              <span>Full Flat Profile</span>
              <ExternalLink size={14} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TOAST ALERT */}
        {toastMessage && (
          <div style={{
            padding: '8px 24px',
            background: '#ecfdf5',
            borderBottom: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.82rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SKELETON LOADING OR TAB NAVIGATION */}
        {loading && !flatData ? (
          <DetailModalSkeleton />
        ) : (
          <>
            {/* TAB NAVIGATION */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              padding: '0 16px',
              gap: '4px'
            }}>
          {[
            { id: 'specs', label: 'Unit Specifications', icon: Layers },
            { id: 'blueprint', label: 'Floor Plan & Blueprints', icon: Maximize2 },
            { id: 'commercial', label: 'Commercials & Rate Card', icon: DollarSign },
            { id: 'allocation', label: 'Allocation & Domain Status', icon: ShieldCheck }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: UNIT SPECIFICATIONS */}
          {activeTab === 'specs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                    Physical Architectural Specifications
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Structural dimensions, floor layout, and room zoning
                  </span>
                </div>

                {!isEditingSpecs ? (
                  <button
                    type="button"
                    onClick={handleStartEditSpecs}
                    style={{
                      padding: '6px 14px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#334155',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Pencil size={13} /> Edit Specifications
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingSpecs(false)}
                      style={{
                        padding: '6px 12px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      type="button"
                      onClick={handleSaveSpecs}
                      loading={isSavingSpecs}
                      loadingText="Saving..."
                      icon={Check}
                      variant="success"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      Save Changes
                    </LoadingButton>
                  </div>
                )}
              </div>

              {!isEditingSpecs ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>BHK TYPE</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.bhkType || '2BHK'}
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>CARPET AREA</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.carpetArea || 950} Sq.Ft
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>SUPER BUILT-UP AREA</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.superBuiltUpArea || 1200} Sq.Ft
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>FACING ORIENTATION</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.facing || 'East Facing'}
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>FLOOR LEVEL</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor || 1}`}
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>FURNISHING STATUS</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.furnishingStatus || 'Semi-Furnished'}
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>BALCONIES &amp; BATHROOMS</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.balconiesCount || 2} Balcony / {flat.bathroomsCount || 2} Bath
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>PARKING SLOT</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                      {flat.parkingSlot || 'Stilt Covered 01'}
                    </div>
                  </div>
                </div>
              ) : (
                /* Editable Form */
                <form onSubmit={handleSaveSpecs} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>BHK Type</label>
                    <select
                      value={specsForm.bhkType}
                      onChange={(e) => setSpecsForm({ ...specsForm, bhkType: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="1BHK">1BHK</option>
                      <option value="2BHK">2BHK</option>
                      <option value="3BHK">3BHK</option>
                      <option value="4BHK">4BHK</option>
                      <option value="Studio">Studio</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Carpet Area (Sq.Ft)</label>
                    <input
                      type="number"
                      value={specsForm.carpetArea}
                      onChange={(e) => setSpecsForm({ ...specsForm, carpetArea: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Super Built-Up Area (Sq.Ft)</label>
                    <input
                      type="number"
                      value={specsForm.superBuiltUpArea}
                      onChange={(e) => setSpecsForm({ ...specsForm, superBuiltUpArea: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Facing Orientation</label>
                    <select
                      value={specsForm.facing}
                      onChange={(e) => setSpecsForm({ ...specsForm, facing: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="East">East</option>
                      <option value="North">North</option>
                      <option value="North-East">North-East</option>
                      <option value="West">West</option>
                      <option value="South">South</option>
                      <option value="Park Facing">Park Facing</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Floor Level</label>
                    <input
                      type="number"
                      value={specsForm.floor}
                      onChange={(e) => setSpecsForm({ ...specsForm, floor: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Furnishing Status</label>
                    <select
                      value={specsForm.furnishingStatus}
                      onChange={(e) => setSpecsForm({ ...specsForm, furnishingStatus: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="Unfurnished">Unfurnished</option>
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Fully-Furnished">Fully-Furnished</option>
                    </select>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: FLOOR PLANS & BLUEPRINTS */}
          {activeTab === 'blueprint' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Floor Plan &amp; Architectural Blueprints
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Unit layout diagram, room dimensions, and approved engineering CAD drawings
                </span>
              </div>

              {flat.blueprintUrl ? (
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#f8fafc',
                  textAlign: 'center'
                }}>
                  <img
                    src={flat.blueprintUrl}
                    alt={`Floor Plan Flat ${flat.flatNumber}`}
                    style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', padding: '16px' }}
                  />
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px'
                }}>
                  <Maximize2 size={36} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontWeight: '700', color: '#334155' }}>Standard Architectural Blueprint On File</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Type: {flat.bhkType || '2BHK'} Deluxe Suite • Floor Area: {flat.carpetArea || 950} sq.ft
                  </div>
                  <div style={{ display: 'inline-flex', gap: '10px', marginTop: '16px' }}>
                    <span style={{ fontSize: '0.74rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
                      Master Bed: 14' × 12'
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
                      Living: 18' × 14'
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
                      Kitchen: 10' × 8'
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMERCIAL & RATE CARD */}
          {activeTab === 'commercial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Commercial Pricing &amp; Rate Card Configuration
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Base unit valuation, per-sqft calculation, PLC premium, and payment schedule baseline
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>BASE UNIT PRICE</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                    {formatINR(flat.basePrice || 4500000)}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Standard registry base</span>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>RATE PER SQ.FT</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
                    {formatINR(flat.pricePerSqFt || 4200)}/sqft
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Carpet area calculation</span>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>FLOOR RISE PREMIUM</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                    ₹{((flat.floor || 1) * 25).toLocaleString('en-IN')}/sqft
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>₹25 per floor above Ground</span>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>PLC (LOCATION CHARGE)</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                    {flat.plcCharges ? formatINR(flat.plcCharges) : 'Standard PLC Included'}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Park / Corner facing</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALLOCATION & DOMAIN ROUTING STATUS */}
          {activeTab === 'allocation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Unit Allocation &amp; Cross-Module Status
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Operational state across Sales Deals and 3-Year Guaranteed Rental Management
                </span>
              </div>

              {/* Status Case A: SOLD */}
              {isSold && (
                <div style={{
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={20} color="#2563eb" />
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e40af' }}>
                        Unit is Sold &amp; Allotted to Registered Buyer
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#2563eb', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      SALES ALLOTMENT ACTIVE
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>REGISTERED BUYER</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                        {owner?.name || 'Registered Client'}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{owner?.mobileNo || 'Contact on file'}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>AGREED SALE VALUE</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                        {formatINR(flat.basePrice || 4500000)}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #dbeafe', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleNavigateToSales}
                      style={{
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Open Sales Deal &amp; Milestone Demands <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Status Case B: RENTAL POOL */}
              {isRental && (
                <div style={{
                  background: '#f5f3ff',
                  border: '1.5px solid #ddd6fe',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={20} color="#7c3aed" />
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#5b21b6' }}>
                        Unit Enrolled in 3-Year Guaranteed Rental Program
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#7c3aed', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      RENT-BACK ACTIVE
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>MONTHLY GUARANTEED RETURN</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#5b21b6' }}>
                        {formatINR(flat.rentalDetails?.monthlyRent || 25000)}/month
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>CONTRACT TENURE</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                        36 Months Guaranteed
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #ede9fe', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleNavigateToFlatProfile}
                      style={{
                        padding: '8px 16px',
                        background: '#7c3aed',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      View Flat Profile &amp; Passbook Ledger <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Status Case C: AVAILABLE */}
              {!isSold && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} color="#16a34a" />
                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#166534' }}>
                      Unit is Vacant &amp; Available for Booking
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#15803d' }}>
                    This flat is unencumbered in the physical inventory and ready for client allotment or enrollment into the rental program.
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={handleNavigateToSales}
                      style={{
                        padding: '8px 16px',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Create Booking in Sales ➔
                    </button>

                    <button
                      type="button"
                      onClick={handleNavigateToFlatProfile}
                      style={{
                        padding: '8px 16px',
                        background: '#ffffff',
                        border: '1px solid #7c3aed',
                        color: '#7c3aed',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Open Full Flat Profile ➔
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

          </>
        )}

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Unit ID: <code style={{ color: '#0f172a', fontWeight: '700' }}>{flat._id || flatId}</code>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};

export default FlatDetailModal;
