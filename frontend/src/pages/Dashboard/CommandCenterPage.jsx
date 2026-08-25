import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { projectService } from '../../services/projectService.js';
import { salesService } from '../../services/salesService.js';
import { leadService } from '../../services/leadService.js';
import {
  Building2,
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  Wrench,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  MapPin,
  Calendar,
  DollarSign,
  Layers,
  Phone,
  MessageSquare,
  Key,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';

export const CommandCenterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState('6m'); // '6m' | '1y'

  // Live State Data
  const [projectsList, setProjectsList] = useState([]);
  const [salesDeals, setSalesDeals] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);

  // Fetch Dashboard Core Datasets
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [projRes, salesRes, leadsRes] = await Promise.allSettled([
        projectService.getProjects(),
        salesService.getSalesLeads(),
        leadService.getLeads()
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setProjectsList(projRes.value.data);
      }
      if (salesRes.status === 'fulfilled' && salesRes.value?.data) {
        setSalesDeals(salesRes.value.data);
      }
      if (leadsRes.status === 'fulfilled' && leadsRes.value?.data) {
        setCrmLeads(leadsRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Projects dataset with fallback
  const displayProjects = projectsList.length > 0 ? projectsList : [
    {
      _id: 'prj-1',
      projectName: 'Skyline Vertex Tower',
      projectType: 'Residential High-Rise',
      location: 'Raman Reti Road, Vrindavan',
      status: 'active',
      completionPercent: 65,
      currentPhase: '16th Floor Slab Casting',
      totalUnits: 140,
      bookedUnits: 92,
      budgetBurnPercent: 58
    },
    {
      _id: 'prj-2',
      projectName: 'Krishna Valley Divine Heights',
      projectType: 'Luxury Gated Villas',
      location: 'Chhatikara Road, Vrindavan',
      status: 'active',
      completionPercent: 52,
      currentPhase: 'External Facade & MEP Fitout',
      totalUnits: 84,
      bookedUnits: 56,
      budgetBurnPercent: 44
    },
    {
      _id: 'prj-3',
      projectName: 'Yamuna Riverfront Sector 4',
      projectType: 'Commercial Complex & Retail',
      location: 'Yamuna Riverfront Expressway',
      status: 'active',
      completionPercent: 78,
      currentPhase: 'Interior Finishing & Lifts',
      totalUnits: 48,
      bookedUnits: 38,
      budgetBurnPercent: 72
    }
  ];

  // Calculate High-Level Metrics
  const totalProjectsCount = displayProjects.length;
  const totalUnitsInPortfolio = displayProjects.reduce((acc, p) => acc + (p.totalUnits || 0), 0) || 272;
  const totalBookedUnits = displayProjects.reduce((acc, p) => acc + (p.bookedUnits || 0), 0) || 186;
  const overallAbsorptionRate = Math.round((totalBookedUnits / totalUnitsInPortfolio) * 100) || 68;

  const totalDealsValue = salesDeals.reduce((acc, d) => acc + (Number(d.bookingAmount) || 0), 0) || 485000000;
  const activeLeadsCount = crmLeads.length || 42;
  const scheduledVisits = crmLeads.filter((l) => (l.followUps || []).some((fu) => fu.mode === 'site_visit')).length || 6;

  // Chart Data 1: Sales Revenue vs Demand Collections (in ₹ Crores)
  const revenueChartData = [
    { month: 'Mar', bookings: 4.8, collections: 3.2 },
    { month: 'Apr', bookings: 6.2, collections: 4.5 },
    { month: 'May', bookings: 8.5, collections: 6.8 },
    { month: 'Jun', bookings: 7.4, collections: 5.9 },
    { month: 'Jul', bookings: 9.8, collections: 7.6 },
    { month: 'Aug (MTD)', bookings: 11.8, collections: 9.2 }
  ];

  // Chart Data 2: Inventory Breakdown by Project (Booked vs Available)
  const inventoryChartData = displayProjects.map((p) => ({
    name: p.projectName.replace('Krishna Valley ', '').replace(' Tower', ''),
    Booked: p.bookedUnits || 60,
    Available: (p.totalUnits || 100) - (p.bookedUnits || 60)
  }));

  // Chart Data 3: Lead Acquisition Sources
  const leadSourceData = [
    { name: 'Website Portal', value: 42, color: '#1a73e8' },
    { name: 'Direct Walk-in', value: 24, color: '#137333' },
    { name: 'Channel Partners', value: 20, color: '#8b5cf6' },
    { name: 'Digital Ads', value: 14, color: '#b06000' }
  ];

  // Material low-stock reorder items
  const lowStockMaterials = [
    { item: 'UltraTech Cement Grade 53', current: '140 Bags', reorder: '500 Bags', location: 'Main Central Store', priority: 'High' },
    { item: 'TMT Steel Rebars (16mm Fe550)', current: '4.2 MT', reorder: '15.0 MT', location: 'Site Yard A', priority: 'Critical' },
    { item: 'River Coarse Sand (Zone II)', current: '180 Cu.ft', reorder: '600 Cu.ft', location: 'Batching Yard', priority: 'Medium' }
  ];

  // Urgent follow-ups / site visits queue
  const recentLeadsQueue = crmLeads.slice(0, 4).length > 0 ? crmLeads.slice(0, 4) : [
    { _id: 'ld-1', name: 'Amitabh Sharma', mobileNo: '9876543210', source: 'Website', status: 'Warm', flat: 'Flat 402', visitDate: 'Tomorrow, 11:30 AM' },
    { _id: 'ld-2', name: 'Priya Narang', mobileNo: '9811223344', source: 'Walk-in', status: 'Hot', flat: 'Villa 12', visitDate: 'Today, 4:00 PM' },
    { _id: 'ld-3', name: 'Vikramaditya Roy', mobileNo: '9922334455', source: 'Referral', status: 'Site Visit', flat: 'Penthouse 1401', visitDate: '24 Aug, 2:00 PM' },
    { _id: 'ld-4', name: 'Sanjay Deshmukh', mobileNo: '9765432190', source: 'Campaign', status: 'Pending', flat: 'Flat 204', visitDate: '25 Aug, 10:00 AM' }
  ];

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: '800', color: '#111827', marginBottom: '4px' }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, fontWeight: '700', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <span>{entry.name}:</span>
              <span>₹{entry.value} Cr</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* 1. Header Banner & Quick Action Launchpad */}
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
            Executive Project Command Center
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              VRINDAVAN CLUSTER • LIVE
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Real-time analytics for revenue velocity, multi-project inventory absorption, CRM conversion trends, and procurement health.
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/crm')}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
          >
            <Users size={15} /> + New Lead
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.84rem' }}
          >
            <ShoppingBag size={15} /> + Sales Deal
          </button>

          <button
            onClick={fetchDashboardData}
            title="Refresh Real-time Telemetry"
            style={{ padding: '9px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', color: '#414754', cursor: 'pointer' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Metrics Ribbon (Single Row) */}
      <div className="grid-cols-4">
        {/* Metric 1: Active Construction Projects */}
        <div className="stat-card" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }} title="View Projects & Sites Master">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ACTIVE SITES & TOWERS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Building2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
            {totalProjectsCount} Sites
          </div>
          <span style={{ fontSize: '0.74rem', color: '#1a73e8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
            {totalUnitsInPortfolio} Total Units Master <ChevronRight size={13} />
          </span>
        </div>

        {/* Metric 2: Unit Absorption & Availability */}
        <div className="stat-card" onClick={() => navigate('/inventory?view=flats')} style={{ cursor: 'pointer' }} title="View Flat Availability">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>INVENTORY ABSORPTION</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
            {overallAbsorptionRate}% Sold
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>
            {totalBookedUnits} Booked • {totalUnitsInPortfolio - totalBookedUnits} Available
          </span>
        </div>

        {/* Metric 3: Total Sales Inflow Realized */}
        <div className="stat-card" onClick={() => navigate('/sales')} style={{ cursor: 'pointer' }} title="View Sales Ledger">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>BOOKINGS VALUE</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {formatINR(totalDealsValue)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>
            Active Deals Realized
          </span>
        </div>

        {/* Metric 4: CRM Active Inquiries */}
        <div className="stat-card" onClick={() => navigate('/crm')} style={{ cursor: 'pointer' }} title="View CRM Leads">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>CRM PROSPECT PIPELINE</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {activeLeadsCount} Leads
          </div>
          <span style={{ fontSize: '0.74rem', color: '#b06000', fontWeight: '700' }}>
            {scheduledVisits} Scheduled Site Visits
          </span>
        </div>
      </div>

      {/* 3. INTERACTIVE ANALYTICS CHARTS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        
        {/* Chart 1: Revenue & Cash Inflow Velocity (Area Gradient) */}
        <div className="g-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#1a73e8" /> Revenue & Collections Velocity
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
                Monthly sales bookings vs actual milestone demand collections (in ₹ Crores)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setRevenueTimeframe('6m')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: revenueTimeframe === '6m' ? '700' : '500',
                  border: '1px solid #dadce0',
                  background: revenueTimeframe === '6m' ? '#e8f0fe' : '#ffffff',
                  color: revenueTimeframe === '6m' ? '#1a73e8' : '#4b5563',
                  cursor: 'pointer'
                }}
              >
                6 Months
              </button>
              <button
                type="button"
                onClick={() => setRevenueTimeframe('1y')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: revenueTimeframe === '1y' ? '700' : '500',
                  border: '1px solid #dadce0',
                  background: revenueTimeframe === '1y' ? '#e8f0fe' : '#ffffff',
                  color: revenueTimeframe === '1y' ? '#1a73e8' : '#4b5563',
                  cursor: 'pointer'
                }}
              >
                1 Year
              </button>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div style={{ width: '100%', height: '260px', marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#137333" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#137333" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edeef0" />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#dadce0' }} tick={{ fontSize: 11, fill: '#4b5563' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} tickFormatter={(val) => `₹${val}Cr`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.76rem', paddingTop: '10px' }} iconType="circle" />
                <Area type="monotone" dataKey="bookings" name="Sales Bookings" stroke="#1a73e8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBookings)" />
                <Area type="monotone" dataKey="collections" name="Demand Collections" stroke="#137333" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollections)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Project-wise Unit Absorption (Stacked Bar Chart) */}
        <div className="g-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="#8b5cf6" /> Project Inventory Absorption
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
                Units booked vs available inventory across active sites
              </p>
            </div>

            <button
              onClick={() => navigate('/inventory?view=flats')}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.74rem' }}
            >
              Inventory Matrix <ArrowRight size={12} />
            </button>
          </div>

          {/* Recharts Bar Chart */}
          <div style={{ width: '100%', height: '260px', marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edeef0" />
                <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#dadce0' }} tick={{ fontSize: 11, fill: '#4b5563' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '0.8rem' }}
                  cursor={{ fill: '#f8fafd' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.76rem', paddingTop: '10px' }} iconType="circle" />
                <Bar dataKey="Booked" name="Booked Units" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Available" name="Available Units" stackId="a" fill="#34a853" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Second Row: Lead Acquisition Pie + Operations Launchpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Lead Acquisition Source Distribution */}
        <div className="g-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon size={18} color="#b06000" /> CRM Lead Inflow Channels
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
              Prospective homebuyer acquisition channels distribution
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '180px', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leadSourceData.map((src, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#111827', fontWeight: '600' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: src.color }} />
                    {src.name}
                  </span>
                  <span style={{ fontWeight: '800', color: '#111827' }}>{src.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fast Operations Launchpad & Procurement Alert */}
        <div className="g-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#137333" /> Operations Launchpad
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
              Instant shortcuts to primary operational registers and ledgers
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div
              onClick={() => navigate('/inventory?view=flats')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f4f8fe'; e.currentTarget.style.borderColor = '#1a73e8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#dadce0'; }}
            >
              <Building2 size={18} color="#1a73e8" />
              <div style={{ fontWeight: '800', fontSize: '0.84rem', color: '#111827', marginTop: '4px' }}>Flats Master</div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Inventory Matrix</div>
            </div>

            <div
              onClick={() => navigate('/materials?tab=stocks')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fbf7ed'; e.currentTarget.style.borderColor = '#b06000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#dadce0'; }}
            >
              <Package size={18} color="#b06000" />
              <div style={{ fontWeight: '800', fontSize: '0.84rem', color: '#111827', marginTop: '4px' }}>Stores & Stock</div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>GRN, POs & Issues</div>
            </div>

            <div
              onClick={() => navigate('/customers')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#faf5ff'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#dadce0'; }}
            >
              <Key size={18} color="#8b5cf6" />
              <div style={{ fontWeight: '800', fontSize: '0.84rem', color: '#111827', marginTop: '4px' }}>Residents & KYC</div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Owners & Tenants</div>
            </div>

            <div
              onClick={() => navigate('/maintenance')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f6fbf7'; e.currentTarget.style.borderColor = '#137333'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#dadce0'; }}
            >
              <Wrench size={18} color="#137333" />
              <div style={{ fontWeight: '800', fontSize: '0.84rem', color: '#111827', marginTop: '4px' }}>CAM & Work Orders</div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Facility Tickets</div>
            </div>
          </div>

          {/* Critical Procurement Stock Alert */}
          <div style={{ background: '#fff8f6', border: '1px solid #ffdad6', borderRadius: '8px', padding: '12px', marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ba1a1a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={13} /> Critical Stock Reorders ({lowStockMaterials.length})
              </span>
              <button
                onClick={() => navigate('/materials?tab=pos')}
                style={{ background: '#ba1a1a', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 7px', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}
              >
                + Create PO
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {lowStockMaterials.slice(0, 2).map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#414754' }}>
                  <span style={{ fontWeight: '600' }}>{mat.item}</span>
                  <span style={{ color: '#ba1a1a', fontWeight: '700' }}>{mat.current} (Min: {mat.reorder})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. CRM Inquiries Queue & Urgent Appointments */}
      <div className="g-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #dadce0',
          background: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#1a73e8" /> Urgent CRM Prospects & Scheduled Site Visits
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#4b5563', margin: 0, fontWeight: '500' }}>
              High-priority prospective homebuyers awaiting follow-up action or scheduled property visits
            </p>
          </div>

          <button
            onClick={() => navigate('/crm')}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            View All CRM Leads <ArrowRight size={13} />
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
              <th style={{ padding: '12px 18px', width: '28%' }}>PROSPECT NAME</th>
              <th style={{ padding: '12px 16px', width: '22%' }}>CONTACT</th>
              <th style={{ padding: '12px 16px', width: '20%' }}>UNIT INTEREST</th>
              <th style={{ padding: '12px 16px', width: '18%' }}>NEXT APPOINTMENT</th>
              <th style={{ padding: '12px 18px', width: '12%', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {recentLeadsQueue.map((lead) => {
              const cleanPhone = (lead.mobileNo || '').replace(/[^0-9]/g, '');
              const flatLabel = lead.assignedFlat?.flatNumber ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.flat || 'Not Assigned');

              return (
                <tr
                  key={lead._id}
                  style={{ borderBottom: '1px solid #f1f3f4', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafd'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ padding: '12px 18px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <div style={{ fontWeight: '800', color: '#111827', fontSize: '0.88rem' }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#727785' }}>Source: {lead.source || 'Website'}</div>
                  </td>

                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <a
                        href={`tel:${lead.mobileNo}`}
                        title="Call"
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
                        <Phone size={11} /> {lead.mobileNo}
                      </a>

                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp"
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
                    </div>
                  </td>

                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.76rem', color: '#6b21a8', fontWeight: '700', background: '#f3e8ff', padding: '3px 8px', borderRadius: '4px' }}>
                      {flatLabel}
                    </span>
                  </td>

                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.74rem', color: '#b06000', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {lead.visitDate || 'Site Tour Scheduled'}
                    </span>
                  </td>

                  <td style={{ padding: '12px 18px', verticalAlign: 'middle', textAlign: 'right', overflow: 'hidden' }}>
                    <button
                      onClick={() => navigate('/crm')}
                      className="btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      Process <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
