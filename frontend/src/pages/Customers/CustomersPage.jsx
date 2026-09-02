import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { customerService } from '../../services/customerService.js';
import { ManualCustomerModal } from '../../components/customers/ManualCustomerModal.jsx';
import { CustomerDetailModal } from '../../components/customers/CustomerDetailModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

import {
  Users,
  UserPlus,
  Phone,
  MessageSquare,
  Home,
  Building2,
  Key,
  Briefcase,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Mail,
  ExternalLink,
  AlertTriangle,
  Repeat
} from 'lucide-react';

export const CustomersPage = () => {
  const { isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getTabFromParam = (param) => {
    if (param === 'passbook') return 'passbook';
    return 'directory';
  };

  const [activeCustomerTab, setActiveCustomerTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setActiveCustomerTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveCustomerTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tenantTypeFilter, setTenantTypeFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [copiedText, setCopiedText] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Super Admin Wipe Modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmPhrase, setWipeConfirmPhrase] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (typeFilter) params.customerType = typeFilter;
      if (tenantTypeFilter) params.tenantType = tenantTypeFilter;

      const res = await customerService.getCustomers(params);
      if (res.data) setCustomers(res.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [typeFilter, tenantTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const refreshActiveCustomer = async (id) => {
    try {
      const res = await customerService.getCustomerById(id);
      if (res.data) setSelectedCustomer(res.data);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  // Customer Actions
  const handleSaveCustomer = async (data, files = {}) => {
    try {
      let customerRes;
      if (editingCustomer) {
        customerRes = await customerService.updateCustomer(editingCustomer._id, data);
      } else {
        customerRes = await customerService.createCustomer(data);
      }

      const custId = editingCustomer ? editingCustomer._id : customerRes?.data?._id;

      if (custId && files) {
        if (files.agreementFile) {
          const fd = new FormData();
          fd.append('documentFile', files.agreementFile);
          fd.append('documentType', 'sale_deed');
          fd.append('documentName', files.agreementFile.name || 'Sales Agreement');
          fd.append('documentNumber', data.ownerDetails?.salesAllotment?.agreementNumber || `AGR-${Date.now().toString().slice(-6)}`);
          await customerService.uploadCustomerDocument(custId, fd);
        }
        if (files.receiptFile) {
          const fd = new FormData();
          fd.append('documentFile', files.receiptFile);
          fd.append('documentType', 'rent_receipt');
          fd.append('documentName', files.receiptFile.name || 'Payment Receipt');
          fd.append('documentNumber', `REC-${Date.now().toString().slice(-6)}`);
          await customerService.uploadCustomerDocument(custId, fd);
        }
        if (files.kycFile) {
          const fd = new FormData();
          fd.append('documentFile', files.kycFile);
          fd.append('documentType', 'aadhaar');
          fd.append('documentName', files.kycFile.name || 'Owner KYC Document');
          await customerService.uploadCustomerDocument(custId, fd);
        }
      }

      setIsCreateModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
      alert(editingCustomer ? 'Owner / Customer updated successfully!' : 'Owner registered & Sales Allotment created with documents!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (window.confirm(`Delete customer "${customer.name}" and all records?`)) {
      try {
        await customerService.deleteCustomer(customer._id);
        fetchCustomers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleUploadDocument = async (id, formData) => {
    try {
      await customerService.uploadCustomerDocument(id, formData);
      alert('Document uploaded successfully to S3!');
      refreshActiveCustomer(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVerifyDocument = async (id, docId, data) => {
    try {
      await customerService.verifyCustomerDocument(id, docId, data);
      alert('Document verification status updated!');
      refreshActiveCustomer(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogCommunication = async (id, formData) => {
    try {
      await customerService.logCustomerCommunication(id, formData);
      alert('Communication interaction logged!');
      refreshActiveCustomer(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopy = (text, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Customer Name', 'Type', 'Mobile', 'Email', 'Linked Units', 'Monthly Rent'];
    const rows = displayedCustomers.map((c) => {
      const isOwner = c.customerType === 'owner';
      const units = isOwner
        ? (c.ownerDetails?.propertyIds || [])
        : (c.tenantDetails?.rentalDetails?.flatId ? [c.tenantDetails.rentalDetails.flatId] : []);
      return [
        `"${c.name || ''}"`,
        `"${c.customerType || ''}"`,
        `"${c.mobileNo || ''}"`,
        `"${c.email || ''}"`,
        units.length,
        c.tenantDetails?.monthlyRent || 0
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customers_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Metrics
  const totalCount = customers.length;
  let ownerCount = 0;
  let totalPropertiesCount = 0;
  let rentBackOwnerCount = 0;
  let totalMonthlyDisbursements = 0;

  customers.forEach((c) => {
    ownerCount++;
    const propList = c.ownerDetails?.propertyIds || [];
    const count = Array.isArray(propList) && propList.length > 0 ? propList.length : 1;
    totalPropertiesCount += count;
    rentBackOwnerCount++;
    totalMonthlyDisbursements += 31000 * count;
  });

  // Filter based on quickFilter
  const displayedCustomers = customers.filter((cust) => {
    if (quickFilter === 'rentback') return true;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div className="g-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Customer & Resident Directory
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              PROFILES & KYC
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Comprehensive directory of property owners, individual tenants, and corporate bulk leases with unified passbooks.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setWipeConfirmPhrase('');
                setIsWipeModalOpen(true);
              }}
              style={{
                padding: '9px 16px',
                fontSize: '0.84rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Wipe all customer records (Super Admin Only)"
            >
              <Trash2 size={15} /> Wipe All Customers
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
            title="Export Customers to CSV Spreadsheet"
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsCreateModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} /> Register New Customer
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="g-card" style={{
        display: 'flex',
        padding: '6px',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'directory', label: `Customer Directory (${customers.length})`, icon: Users },
          { id: 'passbook', label: `Customer Passbooks & Ledgers (${customers.length})`, icon: FileText }
        ].map((tab) => {
          const isSelected = activeCustomerTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '10px 18px',
                borderRadius: '6px',
                background: isSelected ? '#1a73e8' : 'transparent',
                color: isSelected ? '#ffffff' : '#374151',
                fontWeight: isSelected ? '800' : '600',
                fontSize: '0.84rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <IconComp size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: DIRECTORY ================= */}
      {activeCustomerTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Top 4 Metrics Ribbon */}
      <div className="grid-cols-4">
        <div
          className="stat-card"
          onClick={() => setQuickFilter('all')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'all' ? '2px solid #1a73e8' : '1px solid #dadce0',
            background: quickFilter === 'all' ? '#f4f8fe' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to show all owners"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL PROPERTY OWNERS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{totalCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'all' ? '#1a73e8' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'all' ? 'Active Filter • All' : 'Click to show all'}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            border: '1px solid #dadce0',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ALLOTTED FLAT UNITS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <Key size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{totalPropertiesCount || totalCount}</div>
          <span style={{ fontSize: '0.74rem', color: '#6b21a8', fontWeight: '600' }}>
            Properties in registry
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'rentback' ? 'all' : 'rentback')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'rentback' ? '2px solid #16a34a' : '1px solid #dadce0',
            background: quickFilter === 'rentback' ? '#f0fdf4' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter Rent-Back beneficiaries"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>RENT-BACK BENEFICIARIES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a' }}>
              <Repeat size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{rentBackOwnerCount || totalCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'rentback' ? '#16a34a' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'rentback' ? 'Active Filter' : 'Receiving 3-yr assured rent'}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            border: '1px solid #dadce0',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY DISBURSEMENTS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {formatINR(totalMonthlyDisbursements || (totalCount * 31000))}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#b06000', fontWeight: '600' }}>
            Company rent commitment
          </span>
        </div>
      </div>

      {/* Action Bar & Quick Filter Chips Ribbon */}
      <div className="g-card" style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 280px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input
                type="text"
                placeholder="Search by owner name, mobile, PAN, or flat number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem', color: '#111827', fontWeight: '600' }}
              />
            </div>
            <button
              type="submit"
              className="btn-secondary"
              style={{ padding: '0 14px', fontSize: '0.82rem' }}
            >
              Search
            </button>
          </form>

          {/* Refresh button */}
          <button
            onClick={fetchCustomers}
            title="Refresh Customers"
            style={{ padding: '7px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Customer Data Table */}
      {displayedCustomers.length === 0 ? (
        <div className="g-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Users size={48} style={{ opacity: 0.25, margin: '0 auto 16px', color: '#1a73e8' }} />
          <h3 style={{ color: '#111827', marginBottom: '8px', fontWeight: '800', fontSize: '1.2rem' }}>No Customer Profiles Match Filter</h3>
          <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '20px', fontWeight: '500', maxWidth: '440px', margin: '0 auto 20px' }}>
            No registered profiles match "{quickFilter}". Reset filters or register a new resident profile.
          </p>
          <button
            onClick={() => setQuickFilter('all')}
            className="btn-secondary"
            style={{ padding: '9px 18px', fontSize: '0.84rem' }}
          >
            Reset Quick Filters
          </button>
        </div>
      ) : (
        <div className="g-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
                <th style={{ padding: '14px 18px', width: '28%' }}>CUSTOMER / ENTITY</th>
                <th style={{ padding: '14px 16px', width: '18%' }}>CATEGORY</th>
                <th style={{ padding: '14px 16px', width: '22%' }}>LINKED PROPERTIES</th>
                <th style={{ padding: '14px 16px', width: '16%' }}>RENT / FINANCIALS</th>
                <th style={{ padding: '14px 18px', width: '16%', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.map((cust) => {
                const cleanPhone = (cust.mobileNo || '').replace(/[^0-9]/g, '');
                const isOwner = cust.customerType === 'owner';
                const isCompany = cust.tenantDetails?.tenantType === 'company';
                const units = isOwner
                  ? (cust.ownerDetails?.propertyIds || [])
                  : (cust.tenantDetails?.rentalDetails?.flatId ? [cust.tenantDetails.rentalDetails.flatId] : []);
                const flatsCount = units.length;
                const isExpanded = expandedCustomerId === cust._id;

                return (
                  <React.Fragment key={cust._id}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f3f4',
                        backgroundColor: isExpanded ? '#f4f8fe' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => setExpandedCustomerId(isExpanded ? null : cust._id)}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8fafd'; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Column 1: Customer Profile */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isOwner ? '#f3e8ff' : '#e8f0fe',
                            color: isOwner ? '#8b5cf6' : '#1a73e8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isCompany && cust.companyDetails?.companyName ? cust.companyDetails.companyName : cust.name}
                              </span>
                              {isExpanded ? <ChevronUp size={14} color="#1a73e8" /> : <ChevronDown size={14} color="#727785" />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                              <a
                                href={`tel:${cust.mobileNo}`}
                                onClick={(e) => e.stopPropagation()}
                                title="Click to Call"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#e8f0fe',
                                  color: '#1a73e8',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  textDecoration: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: '700'
                                }}
                              >
                                <Phone size={11} /> {cust.mobileNo}
                              </a>

                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="WhatsApp Chat"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#e6f4ea',
                                  color: '#137333',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  textDecoration: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: '700'
                                }}
                              >
                                <MessageSquare size={11} /> WA
                              </a>

                              <button
                                type="button"
                                onClick={(e) => handleCopy(cust.mobileNo, e)}
                                title="Copy Mobile Number"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  color: copiedText === cust.mobileNo ? '#137333' : '#727785',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                {copiedText === cust.mobileNo ? <Check size={12} /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Status Pill */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          border: '1px solid #a7f3d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Key size={11} /> PROPERTY OWNER
                        </span>
                      </td>

                      {/* Column 3: Linked Properties */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {units.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              {units.slice(0, 2).map((flat, idx) => {
                                const fNum = flat.flatNumber || (typeof flat === 'string' ? `Flat ${flat.slice(-3)}` : `Unit ${idx + 1}`);
                                const flr = flat.floor !== undefined && flat.floor !== null ? (flat.floor === 0 ? 'Ground Flr' : `Flr ${flat.floor}`) : '';
                                return (
                                  <span
                                    key={flat._id || idx}
                                    style={{
                                      fontSize: '0.74rem',
                                      fontWeight: '700',
                                      color: '#166534',
                                      background: '#f0fdf4',
                                      border: '1px solid #bbf7d0',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Home size={11} color="#16a34a" />
                                    Flat {fNum} {flr ? `(${flr})` : ''}
                                  </span>
                                );
                              })}
                              {units.length > 2 && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  color: '#4b5563',
                                  background: '#f3f4f6',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb'
                                }}>
                                  +{units.length - 2} more
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '500' }}>
                              {units.length} {units.length === 1 ? 'Unit Allotted' : 'Units Portfolio'}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: '600',
                              color: '#9ca3af',
                              background: '#f9fafb',
                              border: '1px dashed #d1d5db',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Home size={11} color="#9ca3af" />
                              0 Units Linked
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Column 4: Guaranteed Rent-Back */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: '800' }}>
                            {formatINR(31000)} / mo
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '700' }}>
                            3-Year Assured Return
                          </span>
                        </div>
                      </td>

                      {/* Column 5: Actions Toolbar */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right', overflow: 'hidden' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDetailModalOpen(true);
                            }}
                            title="Open Customer Passbook Ledger"
                            className="btn-primary"
                            style={{ padding: '5px 9px', fontSize: '0.72rem' }}
                          >
                            Passbook <ArrowRight size={12} />
                          </button>

                          <button
                            onClick={() => {
                              setEditingCustomer(cust);
                              setIsCreateModalOpen(true);
                            }}
                            title="Edit Profile"
                            style={{
                              padding: '5px 7px',
                              background: '#f8f9fa',
                              border: '1px solid #dadce0',
                              borderRadius: '5px',
                              color: '#414754',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit size={12} />
                          </button>

                          <button
                            onClick={() => handleDeleteCustomer(cust)}
                            title="Delete Customer Profile"
                            style={{
                              padding: '5px 7px',
                              background: '#ffdad6',
                              border: '1px solid #ffdad6',
                              borderRadius: '5px',
                              color: '#ba1a1a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Expanded Detail Drawer */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafd', borderBottom: '1px solid #d2e3fc' }}>
                        <td colSpan={5} style={{ padding: '16px 20px' }}>
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #dadce0',
                            borderRadius: '8px',
                            padding: '16px 20px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '20px'
                          }}>
                            {/* Sub-Panel 1: Contact & Address */}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Resident Contact Details
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div><strong>Full Name:</strong> {cust.name}</div>
                                <div><strong>Mobile:</strong> {cust.mobileNo}</div>
                                {cust.email && <div><strong>Email:</strong> {cust.email}</div>}
                                {cust.permanentAddress && <div><strong>Address:</strong> {cust.permanentAddress}</div>}
                                <div><strong>Registered On:</strong> {new Date(cust.createdAt).toLocaleString('en-IN')}</div>
                              </div>
                            </div>

                            {/* Sub-Panel 2: Linked Flats Overview */}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Property Unit Portfolio ({flatsCount})
                              </div>
                              {flatsCount === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#727785', fontStyle: 'italic' }}>
                                  No property units currently linked to this customer account.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                                  {units.map((flat, idx) => {
                                    const fNum = flat.flatNumber || (typeof flat === 'string' ? `Flat ${flat.slice(-3)}` : `Unit ${idx + 1}`);
                                    const proj = flat.projectId?.projectName || flat.projectId?.projectCode || 'Krishna Valley';
                                    const flr = flat.floor !== undefined && flat.floor !== null ? (flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor}`) : '';
                                    const bhk = flat.bhkType || '';
                                    return (
                                      <div key={flat._id || idx} style={{ fontSize: '0.78rem', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #edeef0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <Home size={13} color={isOwner ? '#8b5cf6' : '#2563eb'} />
                                          <span style={{ fontWeight: '700', color: '#111827' }}>Flat {fNum}</span>
                                          {(flr || bhk) && (
                                            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                              ({[bhk, flr].filter(Boolean).join(', ')})
                                            </span>
                                          )}
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '700' }}>
                                          {proj}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Sub-Panel 3: Passbook & Ledger Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Financial Passbook
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setIsDetailModalOpen(true);
                                }}
                                className="btn-primary"
                                style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                              >
                                View Complete Ledger Passbook <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Table Summary Footer */}
          <div style={{
            padding: '12px 18px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #dadce0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#414754',
            fontWeight: '600'
          }}>
            <div>
              Showing <span style={{ color: '#111827', fontWeight: '700' }}>{displayedCustomers.length}</span> of {totalCount} Property Owners
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span>Registered Owners: <strong style={{ color: '#059669' }}>{ownerCount}</strong></span>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* ================= TAB 2: OWNER PASSBOOKS & LEDGERS ================= */}
      {activeCustomerTab === 'passbook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Passbook Financial Metrics */}
          <div className="grid-cols-4">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL OWNER PASSBOOKS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <FileText size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{customers.length}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active titleholder statements</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL OWNED UNITS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                  <Key size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
                {customers.reduce((acc, c) => acc + (c.ownerDetails?.propertyIds?.length || 1), 0)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Registered buyer units</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>RENT-BACK BENEFICIARIES</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a' }}>
                  <Repeat size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                {customers.length}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700' }}>Receiving 3-yr assured returns</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY DISBURSEMENTS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                {formatINR(customers.length * 31000)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Company payout outflow</span>
            </div>
          </div>

          {/* Passbooks Register Table */}
          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#1a73e8" /> Property Owner Passbooks & Financial Statements ({customers.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '2px' }}>
                  Live financial statements, booking milestone demand balances, 3-year guaranteed return payouts, and NEFT records.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchCustomers}
                style={{ padding: '6px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Ledgers
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Owner Name & Contact</th>
                    <th>Linked Property / Unit</th>
                    <th>Ownership Title</th>
                    <th>3-Yr Guaranteed Rent</th>
                    <th>Bank & NEFT Account</th>
                    <th>KYC Verification</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#4b5563' }}>
                        No property owner accounts found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((cust) => {
                      const units = cust.ownerDetails?.propertyIds || [];
                      const bank = cust.ownerDetails?.bankDetails || {};

                      return (
                        <tr key={cust._id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#111827' }}>{cust.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{cust.mobileNo}</div>
                            <div style={{ marginTop: '3px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0'
                              }}>
                                Property Owner
                              </span>
                            </div>
                          </td>

                          <td>
                            {units.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {units.map((u, idx) => {
                                  const flatNo = u?.flatNumber || (typeof u === 'string' ? `Flat ${u.slice(-3)}` : `Unit ${idx + 1}`);
                                  const projName = u?.projectId?.projectName || u?.projectId?.projectCode || 'Krishna Valley';
                                  const flr = u?.floor !== undefined && u?.floor !== null ? u.floor : 1;
                                  return (
                                    <div key={idx} style={{ fontSize: '0.78rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Building2 size={12} color="#16a34a" />
                                      <span>Flat {flatNo} (Floor {flr})</span>
                                      <span style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>• {projName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Building2 size={12} /> Unit Portfolio Attached
                              </div>
                            )}
                          </td>

                          <td>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#137333' }}>
                                100% Freehold Title
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>
                                Registry & Mutation Complete
                              </div>
                            </div>
                          </td>

                          <td>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#7c3aed' }}>
                                {formatINR(31000)} / mo
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600' }}>
                                36-Mo Assured Return
                              </div>
                            </div>
                          </td>

                          <td>
                            {bank.accountNumber ? (
                              <div style={{ fontSize: '0.76rem' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{bank.bankName || 'Bank Account'}</div>
                                <div style={{ color: '#475569' }}>A/C: ••••{bank.accountNumber.slice(-4)}</div>
                                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>IFSC: {bank.ifscCode}</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Bank details on file</span>
                            )}
                          </td>

                          <td>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontWeight: '700',
                              border: '1px solid #a7f3d0'
                            }}>
                              ✓ Verified Titleholder
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#1a73e8',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '0.76rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Open Statement
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ManualCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleSaveCustomer}
        customer={editingCustomer}
      />

      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        customer={selectedCustomer}
        onUploadDocument={handleUploadDocument}
        onVerifyDocument={handleVerifyDocument}
        onLogCommunication={handleLogCommunication}
        onRefresh={() => refreshActiveCustomer(selectedCustomer?._id)}
      />

      {/* SUPER ADMIN WIPE ALL CUSTOMERS MODAL */}
      {isWipeModalOpen && isSuperAdmin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '500px', width: '100%', border: '2px solid #dc2626', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#991b1b' }}>Danger Zone: Wipe All Customers</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#b91c1c' }}>Super Admin Authorization Required</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#fef2f2', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px', border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', lineHeight: '1.6' }}>
                This operation will permanently delete:
              </p>
              <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.8' }}>
                <li>All customer profiles (Owners and Tenants)</li>
                <li>All sales lead history and buyer associations</li>
                <li>All flat ownership & Chain of Title records</li>
              </ul>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Type <span style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: '0.9rem' }}>DELETE ALL CUSTOMERS</span> to confirm:
            </label>
            <input
              type="text"
              value={wipeConfirmPhrase}
              onChange={(e) => setWipeConfirmPhrase(e.target.value)}
              placeholder="Type DELETE ALL CUSTOMERS..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                marginBottom: '20px',
                backgroundColor: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '#fef2f2' : '#ffffff'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setIsWipeModalOpen(false); setWipeConfirmPhrase(''); }}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wipeConfirmPhrase !== 'DELETE ALL CUSTOMERS' || isWiping}
                onClick={async () => {
                  setIsWiping(true);
                  try {
                    const result = await customerService.wipeAllCustomers(wipeConfirmPhrase);
                    alert(result.message || 'All customers wiped successfully.');
                    setIsWipeModalOpen(false);
                    setWipeConfirmPhrase('');
                    fetchCustomers();
                  } catch (err) {
                    alert(err.message || 'Failed to wipe customers.');
                  } finally {
                    setIsWiping(false);
                  }
                }}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  backgroundColor: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '#dc2626' : '#e5e7eb',
                  color: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  fontWeight: '800',
                  cursor: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? 'pointer' : 'not-allowed',
                  opacity: isWiping ? 0.7 : 1,
                }}
              >
                {isWiping ? 'Wiping...' : 'Permanently Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
