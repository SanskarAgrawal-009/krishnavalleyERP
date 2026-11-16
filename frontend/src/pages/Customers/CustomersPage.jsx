import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { customerService } from '../../services/customerService.js';
import { ManualCustomerModal } from '../../components/customers/ManualCustomerModal.jsx';
import { CustomerDetailModal } from '../../components/customers/CustomerDetailModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { TableSkeleton, CardGridSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

import {
  User,
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
  Repeat,
  CreditCard
} from 'lucide-react';

export const CustomersPage = () => {
  const { isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();

  const canCreateCustomer = isSuperAdmin || hasAnyPermission(['customers:manage', 'sales:create']);
  const canManageCustomer = isSuperAdmin || hasPermission('customers:manage');
  const canExportCustomers = isSuperAdmin || hasAnyPermission(['customers:view', 'reports:view']);
  const canDeleteCustomer = isSuperAdmin || hasPermission('customers:manage');
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
  const toast = useToast();

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
      toast.error('Failed to fetch customer directory');
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
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            Customers
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '4px 0 0 0' }}>
            Directory of property owners, tenants, and passbook records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setWipeConfirmPhrase('');
                setIsWipeModalOpen(true);
              }}
              style={{
                padding: '8px 14px',
                fontSize: '0.84rem',
                backgroundColor: '#ffffff',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Wipe all customer records (Super Admin only)"
            >
              <Trash2 size={15} /> Wipe all customers
            </button>
          )}

          {canExportCustomers && (
            <button
              onClick={handleExportCSV}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            >
              <Download size={15} /> Export CSV
            </button>
          )}

          {canCreateCustomer && (
            <button
              onClick={() => {
                setEditingCustomer(null);
                setIsCreateModalOpen(true);
              }}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              <UserPlus size={16} /> Add customer
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="g-card no-scrollbar" style={{
        display: 'flex',
        padding: '4px',
        gap: '4px',
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap'
      }}>
        {[
          { id: 'directory', label: `Directory (${customers.length})`, icon: Users },
          { id: 'passbook', label: `Passbooks (${customers.length})`, icon: FileText }
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
                padding: '8px 16px',
                borderRadius: '6px',
                background: isSelected ? '#17652f' : 'transparent',
                color: isSelected ? '#ffffff' : '#6b7280',
                fontWeight: isSelected ? '600' : '500',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 4 Metrics Ribbon */}
      <div className="grid-cols-4">
        <div
          className="stat-card"
          onClick={() => setQuickFilter('all')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'all' ? '1px solid #17652f' : '1px solid #e5e7eb',
            background: quickFilter === 'all' ? '#f0fdf4' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Property owners</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{totalCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'all' ? '#17652f' : '#6b7280', fontWeight: '500' }}>
            {quickFilter === 'all' ? 'Showing all' : 'Click to show all'}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            border: '1px solid #e5e7eb',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Allotted units</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <Key size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{totalPropertiesCount || totalCount}</div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>
            Units in registry
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'rentback' ? 'all' : 'rentback')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'rentback' ? '1px solid #17652f' : '1px solid #e5e7eb',
            background: quickFilter === 'rentback' ? '#f0fdf4' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Rent-back units</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <Repeat size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{rentBackOwnerCount || totalCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'rentback' ? '#17652f' : '#6b7280', fontWeight: '500' }}>
            {quickFilter === 'rentback' ? 'Filtered view' : 'Assured return contracts'}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            border: '1px solid #e5e7eb',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Monthly disbursements</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f9fafb', color: '#4b5563' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
            {formatINR(totalMonthlyDisbursements || (totalCount * 31000))}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>
            Total rent commitment
          </span>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="g-card" style={{
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="e.g. Rahul, Flat 101, or 98765"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
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

        <button
          onClick={fetchCustomers}
          title="Refresh customers"
          style={{ padding: '7px 12px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#374151', cursor: 'pointer' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Customer Data Table / Skeletons / Empty State */}
      {loading ? (
        <TableSkeleton rows={7} columns={5} />
      ) : displayedCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers match filter"
          description={`No registered customer profiles match "${quickFilter}". Reset filters or add a new customer.`}
          primaryAction={() => setQuickFilter('all')}
          primaryActionLabel="Reset filters"
          primaryActionIcon={RefreshCw}
          secondaryAction={() => {
            setEditingCustomer(null);
            setIsCreateModalOpen(true);
          }}
          secondaryActionLabel="Add customer"
          secondaryActionIcon={UserPlus}
        />
      ) : (
        <div className="g-card animate-fade-in" style={{ padding: '0', borderRadius: '8px', overflow: 'hidden', width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', width: '28%', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Customer</th>
                <th style={{ padding: '12px 16px', width: '18%', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Category</th>
                <th style={{ padding: '12px 16px', width: '22%', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Linked properties</th>
                <th style={{ padding: '12px 16px', width: '16%', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Monthly rent and bank</th>
                <th style={{ padding: '12px 16px', width: '16%', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Actions</th>
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
                        borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6',
                        backgroundColor: isExpanded ? '#f9fafb' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => setExpandedCustomerId(isExpanded ? null : cust._id)}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Column 1: Customer Profile */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#f0fdf4',
                            color: '#17652f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isCompany && cust.companyDetails?.companyName ? cust.companyDetails.companyName : cust.name}
                              </span>
                              {isExpanded ? <ChevronUp size={14} color="#17652f" /> : <ChevronDown size={14} color="#9ca3af" />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                              <a
                                href={`tel:${cust.mobileNo}`}
                                onClick={(e) => e.stopPropagation()}
                                title="Click to call"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#f0fdf4',
                                  color: '#17652f',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textDecoration: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: '500'
                                }}
                              >
                                <Phone size={11} /> {cust.mobileNo}
                              </a>

                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="WhatsApp chat"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#f0fdf4',
                                  color: '#17652f',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textDecoration: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: '500'
                                }}
                              >
                                <MessageSquare size={11} /> WhatsApp
                              </a>

                              <button
                                type="button"
                                onClick={(e) => handleCopy(cust.mobileNo, e)}
                                title="Copy mobile number"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  color: copiedText === cust.mobileNo ? '#17652f' : '#9ca3af',
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
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: '#f0fdf4',
                          color: '#17652f',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '500',
                          border: '1px solid #bbf7d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Key size={11} /> Owner
                        </span>
                      </td>

                      {/* Column 3: Linked Properties */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {units.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              {units.slice(0, 2).map((flat, idx) => {
                                const fNum = flat.flatNumber || (typeof flat === 'string' ? `Flat ${flat.slice(-3)}` : `Unit ${idx + 1}`);
                                const flr = flat.floor !== undefined && flat.floor !== null ? (flat.floor === 0 ? 'Ground' : `Flr ${flat.floor}`) : '';
                                return (
                                  <span
                                    key={flat._id || idx}
                                    style={{
                                      fontSize: '0.74rem',
                                      fontWeight: '500',
                                      color: '#17652f',
                                      background: '#f0fdf4',
                                      border: '1px solid #bbf7d0',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Home size={11} color="#17652f" />
                                    Flat {fNum} {flr ? `(${flr})` : ''}
                                  </span>
                                );
                              })}
                              {units.length > 2 && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
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
                            <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '400' }}>
                              {units.length} {units.length === 1 ? 'unit allotted' : 'units allotted'}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: '400',
                              color: '#9ca3af',
                              background: '#f9fafb',
                              border: '1px dashed #d1d5db',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Home size={11} color="#9ca3af" />
                              0 units linked
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Column 4: Guaranteed Rent-Back & Bank Status */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {(() => {
                          const bank = cust.bankDetails || cust.ownerDetails?.bankDetails || {};
                          const totalRent = units.reduce((sum, u) => sum + (Number(u.rentalDetails?.guaranteedMonthlyRent) || 31000), 0);
                          const hasBank = Boolean(bank.accountNumber || bank.bankName);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontSize: '0.84rem', color: '#17652f', fontWeight: '600' }}>
                                {formatINR(totalRent || (units.length * 31000) || 31000)} / mo
                              </span>
                              {hasBank ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  color: '#17652f',
                                  background: '#f0fdf4',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  width: 'fit-content',
                                  fontWeight: '500'
                                }}>
                                  <CreditCard size={10} /> {bank.bankName || 'Bank'}: ••{String(bank.accountNumber || '').slice(-4)}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.68rem',
                                  color: '#6b7280',
                                  background: '#f3f4f6',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  width: 'fit-content',
                                  fontWeight: '400'
                                }}>
                                  No account linked
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Column 5: Actions Toolbar */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', overflow: 'hidden' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDetailModalOpen(true);
                            }}
                            className="btn-primary"
                            style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                          >
                            Passbook
                          </button>

                          {canManageCustomer && (
                            <button
                              onClick={() => {
                                setEditingCustomer(cust);
                                setIsCreateModalOpen(true);
                              }}
                              title="Edit customer"
                              style={{
                                padding: '5px 7px',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '5px',
                                color: '#4b5563',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {canDeleteCustomer && (
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              title="Delete customer"
                              style={{
                                padding: '5px 7px',
                                background: '#ffffff',
                                border: '1px solid #fee2e2',
                                borderRadius: '5px',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline Expanded Detail Drawer */}
                    {isExpanded && (
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <td colSpan={5} style={{ padding: '16px 20px' }}>
                          {(() => {
                            const bank = cust.bankDetails || cust.ownerDetails?.bankDetails || {};
                            const pan = cust.panNumber || cust.ownerDetails?.panNumber || '';
                            const aadhaar = cust.aadhaarNumber || cust.ownerDetails?.aadhaarNumber || '';
                            const nominee = cust.ownerDetails?.nominee || {};
                            const fullAddr = cust.permanentAddress || cust.address?.street || cust.address?.addressLine1 || (cust.address?.city ? `${cust.address.city}, ${cust.address.state || ''}` : 'Krishna Valley, Mathura');

                            return (
                              <div style={{
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '16px 20px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '16px'
                              }}>
                                {/* Sub-Panel 1: Contact & Address */}
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={14} color="#17652f" /> Basic information
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div><strong>Name:</strong> {cust.name}</div>
                                    <div><strong>Mobile:</strong> {cust.mobileNo}</div>
                                    {cust.alternateMobileNo && <div><strong>Alt phone:</strong> {cust.alternateMobileNo}</div>}
                                    {cust.email && <div><strong>Email:</strong> {cust.email}</div>}
                                    <div><strong>Address:</strong> {fullAddr}</div>
                                    <div><strong>Registered:</strong> {new Date(cust.createdAt).toLocaleDateString('en-IN')}</div>
                                  </div>
                                </div>

                                {/* Sub-Panel 2: Banking & NEFT Account Details */}
                                <div style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <CreditCard size={14} color="#17652f" /> Bank payout account
                                    </div>
                                    {canManageCustomer && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCustomer(cust);
                                          setIsCreateModalOpen(true);
                                        }}
                                        style={{
                                          fontSize: '0.7rem',
                                          background: '#17652f',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '3px 8px',
                                          borderRadius: '4px',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}
                                        title="Edit account details"
                                      >
                                        <Edit size={10} /> Edit account
                                      </button>
                                    )}
                                  </div>

                                  {bank.accountNumber || bank.bankName ? (
                                    <div style={{ fontSize: '0.8rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div><strong>Bank:</strong> {bank.bankName || 'Not specified'}</div>
                                      <div><strong>Branch:</strong> {bank.branch || 'Main Branch'}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong>A/C:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{bank.accountNumber || '—'}</span>
                                        {bank.accountNumber && (
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopy(bank.accountNumber, e)}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px' }}
                                            title="Copy account number"
                                          >
                                            {copiedText === bank.accountNumber ? <Check size={11} color="#17652f" /> : <Copy size={11} color="#6b7280" />}
                                          </button>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong>IFSC:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{bank.ifscCode || '—'}</span>
                                        {bank.ifscCode && (
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopy(bank.ifscCode, e)}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px' }}
                                            title="Copy IFSC"
                                          >
                                            {copiedText === bank.ifscCode ? <Check size={11} color="#17652f" /> : <Copy size={11} color="#6b7280" />}
                                          </button>
                                        )}
                                      </div>
                                      {bank.accountHolderName && <div><strong>Holder:</strong> {bank.accountHolderName}</div>}
                                      {bank.upiId && <div><strong>UPI ID:</strong> {bank.upiId}</div>}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <span>No bank account registered.</span>
                                      {canManageCustomer && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCustomer(cust);
                                            setIsCreateModalOpen(true);
                                          }}
                                          style={{
                                            padding: '4px 8px',
                                            background: '#ffffff',
                                            border: '1px solid #17652f',
                                            color: '#17652f',
                                            borderRadius: '4px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            width: 'fit-content',
                                            fontSize: '0.74rem'
                                          }}
                                        >
                                          + Add bank details
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Sub-Panel 3: KYC & Nominee Profile */}
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldCheck size={14} color="#17652f" /> KYC and nominee details
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div><strong>PAN:</strong> {pan ? <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#111827' }}>{pan}</span> : 'On file'}</div>
                                    <div><strong>Aadhaar:</strong> {aadhaar || 'Verified on file'}</div>
                                    {nominee.name && <div><strong>Nominee:</strong> {nominee.name} ({nominee.relation || nominee.relationship || 'Nominee'})</div>}
                                    {nominee.contactNo && <div><strong>Nominee phone:</strong> {nominee.contactNo}</div>}
                                    <div><strong>Ownership:</strong> <span style={{ textTransform: 'capitalize' }}>{cust.ownerDetails?.ownershipType || 'Individual'}</span> ({cust.ownerDetails?.ownershipPercentage || 100}%)</div>
                                  </div>
                                </div>

                                {/* Sub-Panel 4: Linked Flats & Passbook */}
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Home size={14} color="#17652f" /> Property units ({flatsCount})
                                  </div>
                                  {flatsCount === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                      No property units linked.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '130px', overflowY: 'auto', marginBottom: '10px' }}>
                                      {units.map((flat, idx) => {
                                        const fNum = flat.flatNumber || (typeof flat === 'string' ? `Flat ${flat.slice(-3)}` : `Unit ${idx + 1}`);
                                        const flr = flat.floor !== undefined && flat.floor !== null ? (flat.floor === 0 ? 'Ground' : `Flr ${flat.floor}`) : '';
                                        const rent = flat.rentalDetails?.guaranteedMonthlyRent;
                                        return (
                                          <div key={flat._id || idx} style={{ fontSize: '0.78rem', background: '#f9fafb', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                              <Home size={12} color="#17652f" />
                                              <span style={{ fontWeight: '500', color: '#111827' }}>Flat {fNum}</span>
                                              {flr && <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>({flr})</span>}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '500' }}>
                                              {rent ? `${formatINR(rent)}/mo` : 'Rent-back'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomer(cust);
                                      setIsDetailModalOpen(true);
                                    }}
                                    className="btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}
                                  >
                                    View passbook
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Table Summary Footer */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            <div>
              Showing <span style={{ color: '#111827', fontWeight: '600' }}>{displayedCustomers.length}</span> of {totalCount} property owners
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span>Registered owners: <strong style={{ color: '#17652f' }}>{ownerCount}</strong></span>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* ================= TAB 2: OWNER PASSBOOKS & LEDGERS ================= */}
      {activeCustomerTab === 'passbook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Passbook Financial Metrics */}
          <div className="grid-cols-4">
            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Total passbooks</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
                  <FileText size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{customers.length}</div>
              <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Active owner accounts</span>
            </div>

            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Total units</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
                  <Key size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                {customers.reduce((acc, c) => acc + (c.ownerDetails?.propertyIds?.length || 1), 0)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Registered units</span>
            </div>

            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Rent-back units</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
                  <Repeat size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                {customers.length}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#17652f', fontWeight: '500' }}>Assured return contracts</span>
            </div>

            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Monthly disbursements</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f9fafb', color: '#4b5563' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                {formatINR(customers.length * 31000)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Company rent commitment</span>
            </div>
          </div>

          {/* Passbooks Register Table */}
          <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
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
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Passbooks ({customers.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>
                  Financial statements, return payouts, and payment records.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchCustomers}
                style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#374151' }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
              </button>
            </div>

            <div className="table-responsive">
              <table style={{ minWidth: '840px', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Owner</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Property</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Title</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Monthly rent</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Bank account</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>KYC status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                        No property owner accounts found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((cust) => {
                      const units = cust.ownerDetails?.propertyIds || [];
                      const bank = cust.ownerDetails?.bankDetails || {};

                      return (
                        <tr key={cust._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.88rem' }}>{cust.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>{cust.mobileNo}</div>
                            <div style={{ marginTop: '3px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '500',
                                background: '#f0fdf4',
                                color: '#17652f',
                                border: '1px solid #bbf7d0'
                              }}>
                                Owner
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {units.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {units.map((u, idx) => {
                                  const flatNo = u?.flatNumber || (typeof u === 'string' ? `Flat ${u.slice(-3)}` : `Unit ${idx + 1}`);
                                  const projName = u?.projectId?.projectName || u?.projectId?.projectCode || 'Krishna Valley';
                                  const flr = u?.floor !== undefined && u?.floor !== null ? u.floor : 1;
                                  return (
                                    <div key={idx} style={{ fontSize: '0.78rem', fontWeight: '500', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Building2 size={12} color="#17652f" />
                                      <span>Flat {flatNo} (Floor {flr})</span>
                                      <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '400' }}>• {projName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Building2 size={12} /> Unit portfolio attached
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '500', color: '#17652f' }}>
                                Freehold title
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '400' }}>
                                Registered
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#17652f' }}>
                                {formatINR(31000)} / mo
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '400' }}>
                                Assured return
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {bank.accountNumber ? (
                              <div style={{ fontSize: '0.76rem' }}>
                                <div style={{ fontWeight: '500', color: '#111827' }}>{bank.bankName || 'Bank Account'}</div>
                                <div style={{ color: '#6b7280' }}>A/C: ••••{bank.accountNumber.slice(-4)}</div>
                                <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>IFSC: {bank.ifscCode}</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>On file</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#f0fdf4',
                              color: '#17652f',
                              fontWeight: '500',
                              border: '1px solid #bbf7d0'
                            }}>
                              Verified
                            </span>
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setIsDetailModalOpen(true);
                              }}
                              className="btn-primary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.75rem'
                              }}
                            >
                              Passbook
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '100%', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>Wipe all customers</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Super admin authorization required</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', border: '1px solid #fee2e2' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.5' }}>
                This will permanently delete:
              </p>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.6' }}>
                <li>All customer profiles (owners and tenants)</li>
                <li>All sales lead history and buyer records</li>
                <li>All flat ownership and title records</li>
              </ul>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Type <span style={{ color: '#b91c1c', fontFamily: 'monospace', fontWeight: 600 }}>DELETE ALL CUSTOMERS</span> to confirm:
            </label>
            <input
              type="text"
              value={wipeConfirmPhrase}
              onChange={(e) => setWipeConfirmPhrase(e.target.value)}
              placeholder="DELETE ALL CUSTOMERS"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '1px solid #dc2626' : '1px solid #d1d5db',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                marginBottom: '16px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setIsWipeModalOpen(false); setWipeConfirmPhrase(''); }}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.84rem' }}
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
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '#dc2626' : '#f3f4f6',
                  color: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '0.84rem',
                  cursor: wipeConfirmPhrase === 'DELETE ALL CUSTOMERS' ? 'pointer' : 'not-allowed',
                  opacity: isWiping ? 0.7 : 1,
                }}
              >
                {isWiping ? 'Wiping...' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
