import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { documentService } from '../../services/documentService.js';
import { ShieldCheck, CheckCircle, Edit3, Trash2, FileText, Award } from 'lucide-react';

export const DigitalSignatureModal = ({
  isOpen,
  onClose,
  agreement,
  document,
  onSubmitSignature,
  onSubmit,
  onSign
}) => {
  const { user: currentUser } = useAuth();
  const [docList, setDocList] = useState([]);
  const [selectedDocKey, setSelectedDocKey] = useState('');
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocRef, setCustomDocRef] = useState('');

  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerRole, setSignerRole] = useState('seller_authorized_signatory');

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const activeDoc = agreement || document;

  useEffect(() => {
    if (isOpen) {
      setSignerName(currentUser?.name || 'Rajesh Sharma');
      setSignerEmail(currentUser?.email || 'admin@krishnavalley.com');
      setSignerRole('seller_authorized_signatory');
      setCustomDocRef(`AGR-${Date.now().toString().slice(-6)}`);
      setHasSignature(false);

      if (!activeDoc) {
        // Load available documents for dropdown selection
        documentService.getVault().then((res) => {
          if (res.data) {
            const list = [];
            (res.data.saleAgreements || []).forEach((sa) => {
              list.push({
                key: `sale_${sa.id}`,
                id: sa.id,
                type: 'sale_agreement',
                title: `Sale Agreement: ${sa.buyerName || sa.partyName} (Flat ${sa.flatNumber})`,
                ref: sa.agreementNumber || `BBA-${sa.id}`,
                url: sa.fileUrl || '/agreements/default.pdf',
                party: sa.buyerName || sa.partyName,
                unit: sa.flatNumber
              });
            });
            (res.data.rentalAgreements || []).forEach((ra) => {
              list.push({
                key: `rental_${ra.id}`,
                id: ra.id,
                type: 'rental_agreement',
                title: `Rental Lease: ${ra.tenantName || ra.partyName} (Flat ${ra.flatNumber})`,
                ref: ra.contractCode || `TL-${ra.id}`,
                url: ra.fileUrl || '/agreements/rental.pdf',
                party: ra.tenantName || ra.partyName,
                unit: ra.flatNumber
              });
            });
            (res.data.legalDocuments || []).forEach((ld) => {
              list.push({
                key: `legal_${ld.id || ld._id}`,
                id: ld.id || ld._id,
                type: 'legal_deed',
                title: `Legal Deed: ${ld.title}`,
                ref: ld.authorityNumber || ld.documentNumber || `LEG-${ld.id || ld._id}`,
                url: ld.fileUrl || '/documents/legal.pdf',
                party: ld.issuingAuthority || 'Govt Authority',
                unit: 'All Sites'
              });
            });
            list.push({
              key: 'custom',
              id: 'custom_doc',
              type: 'sale_agreement',
              title: '-- Other / Custom Agreement --',
              ref: '',
              url: '/documents/contract.pdf',
              party: 'Custom Party',
              unit: 'Site'
            });
            setDocList(list);
            if (list.length > 0) setSelectedDocKey(list[0].key);
          }
        }).catch(console.error);
      }
    }
  }, [isOpen, activeDoc, currentUser]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a73e8';
    ctx.beginPath();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasSignature) {
      alert('Please draw your digital signature on the pad before confirming');
      return;
    }

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas.toDataURL('image/png');

    const submitFn = onSubmitSignature || onSubmit || onSign;
    if (typeof submitFn !== 'function') return;

    if (activeDoc) {
      submitFn({
        agreementType: activeDoc.sourceType === 'sale' ? 'sale_agreement' : (activeDoc.sourceType?.includes('rental') ? 'rental_agreement' : 'legal_deed'),
        referenceId: activeDoc.id || activeDoc._id || `REF-${Date.now().toString().slice(-4)}`,
        documentTitle: activeDoc.documentTitle || activeDoc.agreementNumber || 'Agreement Document',
        documentUrl: activeDoc.fileUrl || '/agreements/default.pdf',
        signerName,
        signerEmail,
        signerRole,
        signatureDataUrl
      });
    } else {
      const chosen = docList.find((d) => d.key === selectedDocKey) || {};
      const isCustom = selectedDocKey === 'custom';
      submitFn({
        agreementType: chosen.type || 'sale_agreement',
        referenceId: isCustom ? (customDocRef || `REF-${Date.now().toString().slice(-4)}`) : (chosen.ref || chosen.id || 'REF-GENERAL'),
        documentTitle: isCustom ? (customDocTitle || 'Custom Agreement') : (chosen.title || 'Agreement Document'),
        documentUrl: chosen.url || '/agreements/contract.pdf',
        signerName,
        signerEmail,
        signerRole,
        signatureDataUrl
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital Signature & Cryptographic E-Sign Certificate"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Document Selection Banner */}
        {activeDoc ? (
          <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '6px', border: '1px solid #dadce0' }}>
            <div style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>DOCUMENT TO DIGITALLY SIGN</div>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
              {activeDoc.documentTitle || activeDoc.agreementNumber || 'Agreement Document'}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#1a73e8', marginTop: '2px', fontWeight: '600' }}>
              Party: {activeDoc.buyerName || activeDoc.tenantName || activeDoc.partyName || 'Authorized Signer'} • Flat: {activeDoc.flatNumber || 'N/A'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Select Document to Sign *
              </label>
              <select
                value={selectedDocKey}
                onChange={(e) => setSelectedDocKey(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
              >
                {docList.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedDocKey === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Contractor Service Agreement"
                    value={customDocTitle}
                    onChange={(e) => setCustomDocTitle(e.target.value)}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Reference Code
                  </label>
                  <input
                    type="text"
                    value={customDocRef}
                    onChange={(e) => setCustomDocRef(e.target.value)}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signer Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Authorized Signer Name *
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Signing Authority Role *
            </label>
            <select
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
            >
              <option value="seller_authorized_signatory">Authorized Signatory (Builder)</option>
              <option value="buyer">Purchaser / Buyer</option>
              <option value="owner">Flat Owner</option>
              <option value="tenant">Tenant</option>
              <option value="notary">Legal Advocate / Notary</option>
              <option value="witness">Witness</option>
            </select>
          </div>
        </div>

        {/* Live Drawing Pad */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.74rem', color: '#374151', fontWeight: '600' }}>
              Draw Digital Signature on Canvas *
            </label>
            <button
              type="button"
              onClick={clearCanvas}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
            >
              <Trash2 size={13} /> Clear Signature Pad
            </button>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '6px', border: '2px dashed #94a3b8', padding: '4px', textAlign: 'center' }}>
            <canvas
              ref={canvasRef}
              width={540}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ cursor: 'crosshair', display: 'block', margin: '0 auto', touchAction: 'none' }}
            />
          </div>
        </div>

        <div style={{ background: '#e8f0fe', padding: '10px 14px', borderRadius: '6px', fontSize: '0.76rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
          <strong>SHA-256 Cryptographic Assurance:</strong> Confirming will issue an immutable timestamp certificate, attach an SHA-256 verification hash, and register in the audit ledger.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f8f9fa', color: '#374151', borderRadius: '6px', border: '1px solid #dadce0', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
            Apply Signature & Issue Certificate
          </button>
        </div>
      </form>
    </Modal>
  );
};
