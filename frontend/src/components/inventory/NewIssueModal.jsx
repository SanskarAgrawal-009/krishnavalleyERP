import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { inventoryService } from '../../services/inventoryService.js';
import { projectService } from '../../services/projectService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ArrowUpRight, Package, HardHat, User, Phone, Layers, ShieldCheck } from 'lucide-react';

export const NewIssueModal = ({ isOpen, onClose, onSubmit, stores: propStores }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState(propStores || []);
  const [stocks, setStocks] = useState([]);

  const defaultIssuerName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user?.username ? `@${user.username}` : 'Amit Verma (Site Engineer)');

  const [issueNumber, setIssueNumber] = useState(`ISS-${Date.now().toString().slice(-6)}`);
  const [projectId, setProjectId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [contractorContact, setContractorContact] = useState('');
  const [issuedBy, setIssuedBy] = useState(defaultIssuerName);
  const [purpose, setPurpose] = useState('Tower A 5th Floor Slab Casting');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState(20);

  useEffect(() => {
    if (isOpen) {
      const activeIssuer = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : (user?.username ? `@${user.username}` : 'Amit Verma (Site Engineer)');
      setIssuedBy(activeIssuer);
      setContractorName('');
      setContractorContact('');

      projectService.getProjects().then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) setProjectId(res.data[0]._id);
        }
      });

      inventoryService.getStores().then((res) => {
        if (res.data) {
          setStores(res.data);
          if (res.data.length > 0) {
            setStoreId(res.data[0]._id);
            fetchStoreStock(res.data[0]._id);
          }
        }
      });
      setIssueNumber(`ISS-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen, user]);

  const fetchStoreStock = (sId) => {
    inventoryService.getStocks({ storeId: sId }).then((res) => {
      if (res.data) {
        setStocks(res.data);
        if (res.data.length > 0) {
          setSelectedMaterialId(res.data[0].materialId?._id || res.data[0].materialId);
        }
      }
    });
  };

  const handleStoreChange = (sId) => {
    setStoreId(sId);
    const matchedStore = stores.find((s) => s._id === sId);
    if (matchedStore?.projectId?._id || matchedStore?.projectId) {
      setProjectId(matchedStore.projectId?._id || matchedStore.projectId);
    }
    fetchStoreStock(sId);
  };

  const selectedStock = stocks.find((s) => (s.materialId?._id || s.materialId) === selectedMaterialId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contractorName.trim()) {
      alert('Please enter Contractor or Receiving Person Name');
      return;
    }
    if (!issuedBy.trim()) {
      alert('Please specify who is issuing the material');
      return;
    }
    if (!storeId || !selectedMaterialId || !issueQuantity) {
      alert('Please fill all required store and material fields');
      return;
    }

    if (selectedStock && Number(issueQuantity) > selectedStock.availableQuantity) {
      alert(`Cannot issue ${issueQuantity}. Only ${selectedStock.availableQuantity} available in store.`);
      return;
    }

    onSubmit({
      issueNumber,
      projectId: projectId || (stores.find(s => s._id === storeId)?.projectId?._id || stores.find(s => s._id === storeId)?.projectId),
      storeId,
      contractorName: contractorName.trim(),
      issuedTo: contractorName.trim(),
      issuedBy: issuedBy.trim(),
      contractorContact: contractorContact.trim(),
      purpose: purpose.trim(),
      items: [
        {
          materialId: selectedMaterialId,
          quantity: Number(issueQuantity)
        }
      ]
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Material to Site Contractor / Work Activity"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Issue Slip & Project Store */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Issue Slip # *
            </label>
            <input
              type="text"
              required
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Issuing Project Store *
            </label>
            <select
              required
              value={storeId}
              onChange={(e) => handleStoreChange(e.target.value)}
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
        </div>

        {/* Contractor / Person & Issued By (CRITICAL REQUIREMENT) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', fontWeight: '700' }}>
              <HardHat size={14} color="#b06000" /> Contractor / Person Name *
            </label>
            <input
              type="text"
              required
              list="contractor-suggestions"
              placeholder="e.g. Jai Balaji RCC Works / Ramesh Sharma"
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', borderColor: contractorName ? '#1a73e8' : '#d1d5db' }}
            />
            <datalist id="contractor-suggestions">
              <option value="Jai Balaji RCC Works" />
              <option value="Sharma Civil Contractors" />
              <option value="Vrindavan Heights Plumbers" />
              <option value="Krishna Electrical & MEP" />
              <option value="Ramesh Kumar (Bar Bender Foreman)" />
              <option value="Suresh Yadav (Site Supervisor)" />
            </datalist>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', fontWeight: '700' }}>
              <User size={14} color="#1a73e8" /> Issued By (Store In-charge / Engineer) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Amit Verma (Site Store In-charge)"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Work Activity & Contractor Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Work Activity / Site Purpose *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tower A 5th Floor Slab Casting"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', fontWeight: '700' }}>
              <Phone size={13} color="#6b7280" /> Contractor Mobile / Gatepass
            </label>
            <input
              type="text"
              placeholder="+91 98765 00000"
              value={contractorContact}
              onChange={(e) => setContractorContact(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Material & Available Quantity Picker */}
        <div className="g-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fcfdfd' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={16} /> Material & Stock Availability
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                Select Material from Store *
              </label>
              <select
                required
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="">-- Select Material --</option>
                {stocks.map((st) => (
                  <option key={st._id} value={st.materialId?._id || st.materialId}>
                    {st.materialId?.materialName || 'Item'} (Available: {st.availableQuantity} {st.materialId?.unit || 'unit'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                Quantity to Issue *
              </label>
              <input
                type="number"
                required
                min="1"
                max={selectedStock?.availableQuantity || 9999}
                value={issueQuantity}
                onChange={(e) => setIssueQuantity(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {selectedStock && (
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#4b5563' }}>Current Available: <strong style={{ color: '#137333' }}>{selectedStock.availableQuantity} {selectedStock.materialId?.unit}</strong></span>
              <span style={{ color: '#4b5563' }}>Valuation Rate: <strong style={{ color: '#1a73e8' }}>₹{selectedStock.averageRate}</strong></span>
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
              background: '#b06000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(176, 96, 0, 0.3)'
            }}
          >
            Confirm Material Issue & Deduct Stock
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewIssueModal;
