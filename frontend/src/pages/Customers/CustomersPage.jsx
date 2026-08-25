import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ExternalLink
} from 'lucide-react';

export const CustomersPage = () => {
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
  const handleSaveCustomer = async (data) => {
    try {
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer._id, data);
      } else {
        await customerService.createCustomer(data);
      }
      setIsCreateModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
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
      const units = isOwner ? (c.ownedFlats?.length || 0) : (c.rentedFlats?.length || 0);
      return [
        `"${c.name || ''}"`,
        `"${c.customerType || ''}"`,
        `"${c.mobileNo || ''}"`,
        `"${c.email || ''}"`,
        units,
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
  let individualTenantCount = 0;
  let companyTenantCount = 0;
  let activeRentSum = 0;

  customers.forEach((c) => {
    if (c.customerType === 'owner') ownerCount++;
    if (c.customerType === 'tenant') {
      if (c.tenantDetails?.tenantType === 'company') companyTenantCount++;
      else individualTenantCount++;
      activeRentSum += (c.tenantDetails?.monthlyRent || 0);
    }
  });

  // Filter based on quickFilter
  const displayedCustomers = customers.filter((cust) => {
    if (quickFilter === 'owners') return cust.customerType === 'owner';
    if (quickFilter === 'tenants') return cust.customerType === 'tenant';
    if (quickFilter === 'corporate') return cust.tenantDetails?.tenantType === 'company';
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
          {/* Interactive Top Metrics Ribbon (Click to Filter) */}
          <div className="grid-cols-4">
        <div
          className="stat-card"
          onClick={() => setQuickFilter('all')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'all' ? '2px solid #1a73e8' : '1px solid #dadce0',
            background: quickFilter === 'all' ? '#f8fafd' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to show all profiles"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL CUSTOMERS</span>
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
          onClick={() => setQuickFilter(quickFilter === 'owners' ? 'all' : 'owners')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'owners' ? '2px solid #8b5cf6' : '1px solid #dadce0',
            background: quickFilter === 'owners' ? '#faf5ff' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter flat owners"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>FLAT OWNERS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <Key size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{ownerCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'owners' ? '#8b5cf6' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'owners' ? 'Active Filter' : 'Click to filter owners'}
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'tenants' ? 'all' : 'tenants')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'tenants' ? '2px solid #1a73e8' : '1px solid #dadce0',
            background: quickFilter === 'tenants' ? '#f4f8fe' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter tenants"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TENANT PROFILES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Home size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>{individualTenantCount + companyTenantCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'tenants' ? '#1a73e8' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'tenants' ? 'Active Filter' : 'Click to filter tenants'}
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'corporate' ? 'all' : 'corporate')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'corporate' ? '2px solid #137333' : '1px solid #dadce0',
            background: quickFilter === 'corporate' ? '#f6fbf7' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to view monthly rent pool"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY RENT POOL</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{formatINR(activeRentSum)}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'corporate' ? '#137333' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'corporate' ? 'Active Filter • Corporate' : 'Active monthly billing'}
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
                placeholder="Search by customer name, mobile, GST, or company..."
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

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px', color: '#111827', fontWeight: '600' }}
            >
              <option value="">All Customer Types</option>
              <option value="owner">Property Owners Only</option>
              <option value="tenant">Tenants Only</option>
            </select>

            <select
              value={tenantTypeFilter}
              onChange={(e) => setTenantTypeFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px', color: '#111827', fontWeight: '600' }}
            >
              <option value="">All Tenant Categories</option>
              <option value="individual">Individual / Family</option>
              <option value="company">Corporate / Company</option>
            </select>

            <button
              onClick={fetchCustomers}
              title="Refresh Customers"
              style={{ padding: '7px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', cursor: 'pointer' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Filter Segmented Control Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f3f4', paddingTop: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quick Filter:
          </span>
          {[
            { id: 'all', label: `All Profiles (${totalCount})` },
            { id: 'owners', label: `Property Owners (${ownerCount})` },
            { id: 'tenants', label: `Tenants (${individualTenantCount + companyTenantCount})` },
            { id: 'corporate', label: `Corporate (${companyTenantCount})` }
          ].map((chip) => {
            const isActive = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(chip.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid #1a73e8' : '1px solid #dadce0',
                  background: isActive ? '#e8f0fe' : '#f8f9fa',
                  color: isActive ? '#1a73e8' : '#414754',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip.label}
              </button>
            );
          })}
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
                const flatsCount = isOwner ? (cust.ownedFlats?.length || 0) : (cust.rentedFlats?.length || 0);
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

                      {/* Column 2: Category Pill */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: isOwner ? '#f3e8ff' : '#e8f0fe',
                          color: isOwner ? '#8b5cf6' : '#1a73e8',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          border: isOwner ? '1px solid #e9d5ff' : '1px solid #d2e3fc',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isOwner ? <Key size={11} /> : <Home size={11} />}
                          {isOwner ? 'FLAT OWNER' : (isCompany ? 'CORP TENANT' : 'TENANT')}
                        </span>
                        {isCompany && (
                          <div style={{ fontSize: '0.7rem', color: '#727785', marginTop: '3px', fontWeight: '500' }}>
                            Rep: {cust.name}
                          </div>
                        )}
                      </td>

                      {/* Column 3: Linked Properties */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            color: '#111827',
                            background: '#f8f9fa',
                            border: '1px solid #dadce0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Home size={12} color="#1a73e8" />
                            {flatsCount} {flatsCount === 1 ? 'Unit Linked' : 'Units Linked'}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Rent / Financials */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {!isOwner && cust.tenantDetails?.monthlyRent ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', color: '#137333', fontWeight: '800' }}>
                              {formatINR(cust.tenantDetails.monthlyRent)}/mo
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#727785' }}>Monthly Billing</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#727785', fontStyle: 'italic' }}>
                            {isOwner ? 'Self-Occupied / Direct' : 'No active rent'}
                          </span>
                        )}
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                                  {(isOwner ? cust.ownedFlats : cust.rentedFlats).map((flat, idx) => (
                                    <div key={idx} style={{ fontSize: '0.78rem', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #edeef0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: '700', color: '#111827' }}>Flat {flat.flatNumber || flat}</span>
                                      <span style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '700' }}>Active Registry</span>
                                    </div>
                                  ))}
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
              Showing <span style={{ color: '#111827', fontWeight: '700' }}>{displayedCustomers.length}</span> of {totalCount} Customers
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span>Owners: <strong style={{ color: '#8b5cf6' }}>{ownerCount}</strong></span>
              <span>Tenants: <strong style={{ color: '#1a73e8' }}>{individualTenantCount + companyTenantCount}</strong></span>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* ================= TAB 2: CUSTOMER PASSBOOKS & LEDGERS ================= */}
      {activeCustomerTab === 'passbook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Passbook Financial Metrics */}
          <div className="grid-cols-4">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL PASSBOOKS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <FileText size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{customers.length}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active financial ledgers</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL OWNED UNITS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                  <Key size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
                {customers.reduce((acc, c) => acc + (c.customerType === 'owner' ? (c.ownerDetails?.propertyIds?.length || 1) : 0), 0)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Registered buyer units</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ACTIVE TENANCIES</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
                  <Home size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                {individualTenantCount + companyTenantCount}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>Monthly rental accounts</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY RENT BILLING</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                {formatINR(activeRentSum)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active recurring inflow</span>
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
                  <FileText size={18} color="#1a73e8" /> Customer Financial Passbooks & Ledgers ({customers.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '2px' }}>
                  Live financial statements, milestone demand balances, security deposits, and payment progress per customer.
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
                    <th>Customer Name & Type</th>
                    <th>Linked Property / Unit</th>
                    <th>Financial Profile & Terms</th>
                    <th>Security / Deposit</th>
                    <th>KYC & Verification</th>
                    <th>Account Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#4b5563' }}>
                        No customer accounts found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((cust) => {
                      const isOwner = cust.customerType === 'owner';
                      const isTenant = cust.customerType === 'tenant';
                      const units = isOwner
                        ? (cust.ownerDetails?.propertyIds || [])
                        : (cust.tenantDetails?.rentalDetails?.flatId ? [cust.tenantDetails.rentalDetails.flatId] : []);

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
                                background: isOwner ? '#f3e8ff' : '#e8f0fe',
                                color: isOwner ? '#8b5cf6' : '#1a73e8'
                              }}>
                                {isOwner ? 'Property Owner' : (cust.tenantDetails?.tenantType === 'company' ? 'Corporate Tenant' : 'Individual Tenant')}
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
                                      <Building2 size={12} color="#1a73e8" />
                                      <span>{flatNo} (Floor {flr})</span>
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
                            {isOwner ? (
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#137333' }}>
                                  100% Freehold Title
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>
                                  Registry & Mutation On File
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827' }}>
                                  {formatINR(cust.tenantDetails?.monthlyRent || 0)} / mo
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>
                                  Day {cust.tenantDetails?.rentDueDay || 5} Monthly Due
                                </div>
                              </div>
                            )}
                          </td>

                          <td>
                            {isTenant ? (
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>
                                  {formatINR(cust.tenantDetails?.securityDeposit || 0)}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#137333', fontWeight: '700' }}>
                                  Escrow Held
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>N/A (Owner)</span>
                            )}
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck size={14} color="#137333" />
                              <span style={{ fontSize: '0.76rem', color: '#137333', fontWeight: '700' }}>
                                {(cust.documents?.length || 0) > 0 ? `${cust.documents.length} Docs KYC'd` : 'Verified KYC'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <StatusBadge status={cust.status || 'active'} />
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '6px 14px',
                                background: '#1a73e8',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <FileText size={13} /> Open Passbook <ArrowRight size={13} />
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

    </div>
  );
};
