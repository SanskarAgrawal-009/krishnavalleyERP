import React, { useState, useEffect, useMemo } from 'react';
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
import { inventoryService } from '../../services/inventoryService.js';
import { maintenanceService } from '../../services/maintenanceService.js';
import { rentalService } from '../../services/rentalService.js';
import { taskService } from '../../services/taskService.js';
import { UpcomingMeetingsWidget } from '../../components/taskforce/UpcomingMeetingsWidget.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractRoleCode } from '../../utils/taskPermissions.js';
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
  ChevronDown,
  PieChart as PieIcon,
  BarChart3,
  Repeat,
  CheckCircle2,
  ShieldCheck,
  Search,
  ExternalLink,
  FileText,
  Target,
  Shield,
  Home,
  Sparkles,
  Trash2,
  Activity
} from 'lucide-react';

export const CommandCenterPage = () => {
  const navigate = useNavigate();
  const { user, userRole: authRole, isSuperAdmin, hasPermission } = useAuth();
  const userRole = extractRoleCode(user, authRole);
  const isTaskforceRole = userRole === 'taskforce_manager' || userRole === 'taskforce_member' || userRole === 'staff' || Boolean(user?.isTaskforceMember);
  const canViewSalesRevenue = isSuperAdmin || hasPermission('sales:view') || hasPermission('reports:financial') || userRole === 'sales_head' || userRole === 'accounts_manager';
  const isFinancialRestricted = isTaskforceRole || !canViewSalesRevenue;

  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [revenueTimeframe, setRevenueTimeframe] = useState('6m'); // '6m' | '1y'
  const [inventoryViewMode, setInventoryViewMode] = useState('floor'); // 'floor' | 'project'
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  // Live Datasets from Backend APIs
  const [projectsList, setProjectsList] = useState([]);
  const [flatsList, setFlatsList] = useState([]);
  const [salesDeals, setSalesDeals] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [rentalKpis, setRentalKpis] = useState({
    totalUnits: 0,
    totalMonthlyGross: 0,
    totalDisbursed: 0,
    totalCommitmentAll: 0
  });
  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    mdDirectivesActive: 0,
    followUpsDueToday: 0,
    roadblocksCount: 0
  });

  // Reference UI states: Cluster Selector and Today's Tasks
  const [selectedCluster, setSelectedCluster] = useState('Vrindavan Cluster');
  const [clusterDropdownOpen, setClusterDropdownOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'open' | 'closed'
  const [todayTasksList, setTodayTasksList] = useState(() => {
    try {
      const saved = localStorage.getItem('kv_executive_today_tasks');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [
      { id: 1, text: 'Review today’s scheduled buyer site visits', priority: 'High', completed: false },
      { id: 2, text: 'Verify pending monthly guaranteed rental payouts', priority: 'Medium', completed: false },
      { id: 3, text: 'Check on-site material deliveries and stores receipt', priority: 'Normal', completed: true },
    ];
  });
  const [newTaskInput, setNewTaskInput] = useState('');

  // Persist tasks
  useEffect(() => {
    try {
      localStorage.setItem('kv_executive_today_tasks', JSON.stringify(todayTasksList));
    } catch { /* ignore */ }
  }, [todayTasksList]);

  // Fetch Dashboard Core Datasets in Parallel
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        projRes,
        flatsRes,
        salesRes,
        leadsRes,
        materialsRes,
        serviceRes,
        rentalsRes,
        taskRes
      ] = await Promise.allSettled([
        projectService.getProjects(),
        projectService.getFlats(),
        salesService.getSalesLeads(),
        leadService.getLeads(),
        inventoryService.getMaterials(),
        maintenanceService.getServiceRequests(),
        rentalService.getActiveRentals(),
        taskService.getStats()
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setProjectsList(Array.isArray(projRes.value.data) ? projRes.value.data : []);
      }
      if (flatsRes.status === 'fulfilled' && flatsRes.value?.data) {
        setFlatsList(Array.isArray(flatsRes.value.data) ? flatsRes.value.data : []);
      }
      if (salesRes.status === 'fulfilled' && salesRes.value?.data) {
        setSalesDeals(Array.isArray(salesRes.value.data) ? salesRes.value.data : []);
      }
      if (leadsRes.status === 'fulfilled' && leadsRes.value?.data) {
        const leadsData = leadsRes.value.data?.leads || leadsRes.value.data || [];
        setCrmLeads(Array.isArray(leadsData) ? leadsData : []);
      }
      if (materialsRes.status === 'fulfilled' && materialsRes.value?.data) {
        const mData = materialsRes.value.data?.materials || materialsRes.value.data || [];
        setMaterialsList(Array.isArray(mData) ? mData : []);
      }
      if (serviceRes.status === 'fulfilled' && serviceRes.value?.data) {
        const sData = serviceRes.value.data?.requests || serviceRes.value.data || [];
        setServiceRequests(Array.isArray(sData) ? sData : []);
      }
      if (rentalsRes.status === 'fulfilled' && rentalsRes.value?.kpis) {
        setRentalKpis(rentalsRes.value.kpis);
      }
      if (taskRes.status === 'fulfilled' && taskRes.value?.stats) {
        setTaskStats(taskRes.value.stats);
      }
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching real-time dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'taskforce_manager') {
      navigate('/taskforce-dashboard', { replace: true });
      return;
    }
    fetchDashboardData();
  }, [userRole, navigate]);

  // Format INR in standard Indian notations
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  const formatCr = (val) => {
    const num = Number(val) || 0;
    const cr = num / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  };

  const formatLakhs = (val) => {
    const num = Number(val) || 0;
    const lk = num / 100000;
    return `₹${lk.toFixed(2)} L`;
  };

  // ==========================================
  // REAL-TIME METRIC CALCULATIONS
  // ==========================================

  // 1. Projects & Units Master
  const totalProjectsCount = projectsList.length;
  const totalUnitsInPortfolio = flatsList.length > 0
    ? flatsList.length
    : projectsList.reduce((acc, p) => acc + (Number(p.totalUnits) || 0), 0);

  const totalBookedUnits = flatsList.length > 0
    ? flatsList.filter((f) => ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'].includes(f.status) || f.takenForRental).length
    : salesDeals.length;

  const totalAvailableUnits = flatsList.length > 0
    ? flatsList.filter((f) => f.status === 'available' && !f.takenForRental).length
    : Math.max(0, totalUnitsInPortfolio - totalBookedUnits);

  const overallAbsorptionRate = totalUnitsInPortfolio > 0
    ? Math.round((totalBookedUnits / totalUnitsInPortfolio) * 100)
    : 0;

  // 2. Realized Sales Bookings Portfolio Valuation
  const totalBookedValue = useMemo(() => {
    const dealsSum = salesDeals.reduce((acc, d) => {
      return acc + (Number(d.finalPrice) || Number(d.bookingAmount) || 0);
    }, 0);

    if (dealsSum > 0) return dealsSum;

    if (flatsList.length > 0) {
      return flatsList
        .filter((f) => ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'].includes(f.status) || f.takenForRental)
        .reduce((sum, f) => {
          const price = Number(f.basePrice) || Number(f.salesDetails?.agreedDealPrice) || Number(f.pricing?.totalPrice) || 0;
          return sum + price;
        }, 0);
    }
    return 0;
  }, [salesDeals, flatsList]);

  const totalPortfolioValue = useMemo(() => {
    if (flatsList.length > 0) {
      return flatsList.reduce((sum, f) => {
        const price = Number(f.basePrice) || Number(f.pricing?.totalPrice) || 0;
        return sum + price;
      }, 0);
    }
    return 0;
  }, [flatsList]);

  // 3. Guaranteed Rental Assurance Program
  const monthlyRentalPayout = rentalKpis.totalMonthlyGross || 0;
  const totalRentDisbursed = rentalKpis.totalDisbursed || 0;
  const totalRentalUnits = rentalKpis.totalUnits || (flatsList.filter(f => f.takenForRental).length);

  // 4. CRM Leads & Pipeline
  const activeLeadsCount = crmLeads.length;
  const scheduledVisits = crmLeads.filter(
    (l) => l.status === 'site_visit' || l.status === 'site_visit_scheduled' || (l.followUps || []).some((fu) => fu.mode === 'site_visit')
  ).length;

  const openServiceRequestsCount = serviceRequests.filter(
    (sr) => sr.status === 'open' || sr.status === 'assigned' || sr.status === 'in_progress'
  ).length;

  // ==========================================
  // DYNAMIC CHART 1: Real-time Monthly Revenue & Collections
  // ==========================================
  const generateRevenueChartData = () => {
    const monthsCount = revenueTimeframe === '1y' ? 12 : 6;
    const months = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('en-IN', { month: 'short' });
      const year = d.getFullYear();
      const monthIdx = d.getMonth();

      // Aggregate sales bookings for this month
      const monthlyBookings = salesDeals
        .filter((deal) => {
          const dt = new Date(deal.bookingDate || deal.createdAt);
          return dt.getMonth() === monthIdx && dt.getFullYear() === year;
        })
        .reduce((sum, deal) => sum + (Number(deal.finalPrice || deal.bookingAmount || 0)), 0);

      const monthlyCollections = salesDeals
        .filter((deal) => {
          const dt = new Date(deal.bookingDate || deal.createdAt);
          return dt.getMonth() === monthIdx && dt.getFullYear() === year;
        })
        .reduce((sum, deal) => sum + (Number(deal.bookingAmount || (deal.finalPrice ? deal.finalPrice * 0.4 : 0))), 0);

      const bookingsCr = Number((monthlyBookings / 10000000).toFixed(2));
      const collectionsCr = Number((monthlyCollections / 10000000).toFixed(2));

      months.push({
        month: `${mName}${i === 0 ? ' (MTD)' : ''}`,
        bookings: bookingsCr,
        collections: collectionsCr
      });
    }
    return months;
  };

  const revenueChartData = generateRevenueChartData();

  // Operational Taskforce Directives Throughput Chart (for restricted roles)
  const taskforceChartData = useMemo(() => {
    const monthsCount = revenueTimeframe === '1y' ? 12 : 6;
    const months = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('en-IN', { month: 'short' });

      months.push({
        month: `${mName}${i === 0 ? ' (MTD)' : ''}`,
        assigned: i === 0 ? (taskStats.activeTasks || 0) : 0,
        completed: i === 0 ? (taskStats.completedTasks || 0) : 0
      });
    }
    return months;
  }, [revenueTimeframe, taskStats]);

  // ==========================================
  // DYNAMIC CHART 2: Inventory Absorption (Floor-wise & Project Summary)
  // ==========================================
  const floorInventoryData = useMemo(() => {
    if (flatsList.length === 0) {
      return [];
    }

    const floorMap = {};
    flatsList.forEach((f) => {
      const flNum = f.floor !== undefined && f.floor !== null ? Number(f.floor) : 0;
      const flLabel = flNum === 0 ? 'GF' : `F${flNum}`;
      if (!floorMap[flLabel]) {
        floorMap[flLabel] = {
          floor: flLabel,
          floorOrder: flNum,
          Booked: 0,
          Available: 0,
          Total: 0
        };
      }
      floorMap[flLabel].Total++;
      const isBooked = ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'].includes(f.status) || f.takenForRental;
      if (isBooked) {
        floorMap[flLabel].Booked++;
      } else {
        floorMap[flLabel].Available++;
      }
    });

    return Object.values(floorMap).sort((a, b) => a.floorOrder - b.floorOrder);
  }, [flatsList]);

  const projectInventoryData = useMemo(() => {
    return [
      {
        name: 'Krishna Valley (Vrindavan)',
        Booked: totalBookedUnits,
        Available: totalAvailableUnits,
        Total: totalUnitsInPortfolio
      }
    ];
  }, [totalBookedUnits, totalAvailableUnits, totalUnitsInPortfolio]);

  // ==========================================
  // DYNAMIC CHART 3: Real-time Lead Acquisition Channels (Donut)
  // ==========================================
  const leadSourceData = useMemo(() => {
    if (crmLeads.length === 0) {
      return [];
    }

    const sourceCounts = {};
    crmLeads.forEach((l) => {
      const rawSrc = l.leadSource || l.source || 'Website Portal';
      let cleanSrc = 'Website Portal';
      if (/walk/i.test(rawSrc)) cleanSrc = 'Direct Walk-in';
      else if (/agent|partner|channel/i.test(rawSrc)) cleanSrc = 'Channel Partners & Agents';
      else if (/meta|ad|facebook|google|campaign|social/i.test(rawSrc)) cleanSrc = 'Meta & Social Ads';
      else if (/referral|word/i.test(rawSrc)) cleanSrc = 'Referrals';
      else if (/direct/i.test(rawSrc)) cleanSrc = 'Direct Inquiries';
      else cleanSrc = rawSrc;

      sourceCounts[cleanSrc] = (sourceCounts[cleanSrc] || 0) + 1;
    });

    const palette = ['#17652f', '#0284c7', '#10b981', '#f59e0b', '#4a9e68', '#ec4899'];
    const total = crmLeads.length;

    return Object.entries(sourceCounts).map(([name, count], idx) => ({
      name,
      count,
      value: Math.round((count / total) * 100),
      color: palette[idx % palette.length]
    }));
  }, [crmLeads]);

  // ==========================================
  // DYNAMIC FEED: Real-time Urgent CRM Leads Queue
  // ==========================================
  const recentLeadsQueue = useMemo(() => {
    let list = crmLeads;
    if (leadSearchQuery.trim()) {
      const q = leadSearchQuery.toLowerCase();
      list = list.filter((l) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.mobileNo && String(l.mobileNo).toLowerCase().includes(q)) ||
        (l.requirement && l.requirement.toLowerCase().includes(q))
      );
    }

    return list.slice(0, 6).map((lead) => {
      const flatInfo = lead.requirement || (lead.budget ? formatINR(lead.budget) : 'Service Apartment');

      let visitDate = 'Tour Follow-up Pending';
      if (lead.followUps && lead.followUps.length > 0) {
        const lastFu = lead.followUps[lead.followUps.length - 1];
        if (lastFu.nextFollowUpDate) {
          visitDate = new Date(lastFu.nextFollowUpDate).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } else if (lead.siteVisitDetails?.scheduledDate) {
        visitDate = new Date(lead.siteVisitDetails.scheduledDate).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        });
      }

      return {
        _id: lead._id,
        name: lead.name || 'Prospective Buyer',
        mobileNo: lead.mobileNo || 'N/A',
        source: lead.leadSource || lead.source || 'Direct Inquiry',
        status: lead.status || 'Active',
        flat: flatInfo,
        visitDate
      };
    });
  }, [crmLeads, leadSearchQuery]);

  // Custom Chart Tooltip for Revenue
  const RevenueCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          fontSize: '0.82rem',
          minWidth: '180px'
        }}>
          <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, fontWeight: '700', display: 'flex', gap: '12px', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>{entry.name}:</span>
              <span>₹{entry.value} Cr</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Chart Tooltip for Taskforce Directives
  const TaskforceCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          fontSize: '0.82rem',
          minWidth: '190px'
        }}>
          <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, fontWeight: '700', display: 'flex', gap: '12px', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>{entry.name}:</span>
              <span>{entry.value} Directives</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Chart Tooltip for Floor Absorption
  const FloorCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const booked = payload.find((p) => p.dataKey === 'Booked')?.value || 0;
      const available = payload.find((p) => p.dataKey === 'Available')?.value || 0;
      const total = booked + available;
      const pct = total > 0 ? Math.round((booked / total) * 100) : 0;

      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          fontSize: '0.82rem',
          minWidth: '200px'
        }}>
          <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
            {label === 'GF' ? 'Ground Floor' : label.startsWith('F') ? `Floor ${label.replace('F', '')}` : label}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#17652f', fontWeight: '700', margin: '2px 0' }}>
            <span>Booked / Sold:</span>
            <span>{booked} Units ({pct}%)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: '600', margin: '2px 0' }}>
            <span>Available:</span>
            <span>{available} Units ({100 - pct}%)</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: '600' }}>
            <span>Total Units:</span>
            <span>{total} Units</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>

      {/* 1. Executive Editorial Hero Section with Resort Landscape & Watercolor Hills (Inspired by Inspo Image 4) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #133922 0%, #174428 50%, #1e5332 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          minHeight: '195px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          boxShadow: '0 12px 36px -10px rgba(19, 57, 34, 0.35)'
        }}
      >
        {/* Art at the left at the very end (Border-free Watercolor Hills) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '100%',
            width: 'auto',
            maxHeight: '170px',
            pointerEvents: 'none',
            zIndex: 1,
            userSelect: 'none'
          }}
        >
          <img
            src="/assets/valley-hills-luminous.png"
            alt="Valley Hills Landscape Contour"
            style={{
              height: '100%',
              width: 'auto',
              objectFit: 'contain',
              objectPosition: 'left bottom',
              display: 'block',
              opacity: 0.65
            }}
          />
        </div>

        {/* Resort photograph at the right at the very end with seamless left bleed & zero borders */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '48%',
            minWidth: '280px',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
            overflow: 'hidden'
          }}
        >
          <img
            src="/assets/krishna-valley-resort-building.jpg"
            alt="Krishna Valley Luxury Resort & Swimming Pool"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              display: 'block',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 16%, rgba(0,0,0,1) 46%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 16%, rgba(0,0,0,1) 46%)'
            }}
          />
        </div>

        {/* Dynamic text layer elevated cleanly above the art (Z-Index 2) */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '620px' }}>

          {/* Greeting */}
          <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: '500', marginBottom: '4px', letterSpacing: '-0.01em' }}>
            Good morning, {user?.firstName || 'Rajesh'}
          </div>

          {/* Clean, Calm Page Title */}
          <h1
            style={{
              fontFamily: "'Newsreader', 'Lora', Georgia, serif",
              fontSize: '2.25rem',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 8px 0',
              letterSpacing: '-0.025em',
              lineHeight: 1.15
            }}
          >
            Dashboard
          </h1>

          {/* Subtitle in soft mint */}
          <p
            style={{
              fontSize: '0.86rem',
              color: '#d1fae5',
              margin: '0 0 18px 0',
              fontWeight: '400',
              maxWidth: '560px',
              lineHeight: 1.5,
              opacity: 0.95
            }}
          >
            Overview of sales, inventory, and operations.
          </p>

          {/* Cluster Selector, Live Status & Refresh Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setClusterDropdownOpen(!clusterDropdownOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 15px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              >
                <MapPin size={13} color="#86efac" />
                <span>{selectedCluster}</span>
                <ChevronDown size={13} color="#d1fae5" />
              </button>

              {clusterDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8e6df',
                    borderRadius: '10px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                    zIndex: 30,
                    minWidth: '180px',
                    padding: '4px'
                  }}
                >
                  {['Vrindavan Cluster', 'Mathura Gateway', 'Govardhan Sanctuary'].map((c) => (
                    <div
                      key={c}
                      onClick={() => { setSelectedCluster(c); setClusterDropdownOpen(false); }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        fontWeight: selectedCluster === c ? '700' : '500',
                        color: selectedCluster === c ? '#17652f' : '#1f2937',
                        backgroundColor: selectedCluster === c ? '#e8f2e5' : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 15px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#86efac',
                border: '1px solid rgba(52, 211, 153, 0.3)'
              }}
            >
              <Activity size={13} color="#86efac" />
              <span>Live</span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#34d399',
                  display: 'inline-block'
                }}
              />
            </div>

            <button
              onClick={fetchDashboardData}
              title="Refresh"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '16px' }}>

        {/* Metric 1: Total Sales */}
        <div
          onClick={() => navigate('/sales')}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px 22px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'border-color 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                color: '#17652f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500', marginTop: '12px' }}>
              Total sales
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '600', color: '#111827', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {formatCr(totalBookedValue)}
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {totalBookedUnits} units booked
            </span>
            <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600', backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>
              {overallAbsorptionRate}% of portfolio
            </span>
          </div>
        </div>

        {/* Metric 2: Units Booked */}
        <div
          onClick={() => navigate('/inventory')}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px 22px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'border-color 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >
          <div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              color: '#17652f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={18} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500', marginTop: '12px' }}>
              Units booked
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '600', color: '#111827', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {overallAbsorptionRate}% <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#6b7280' }}>({totalBookedUnits} of {totalUnitsInPortfolio})</span>
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, overallAbsorptionRate)}%`, height: '100%', backgroundColor: '#17652f', borderRadius: '9999px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#374151' }}>
                {totalAvailableUnits} available
              </span>
              <span style={{ fontSize: '0.75rem', color: '#17652f', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                View units <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Monthly Rental Payouts */}
        <div
          onClick={() => navigate('/rentals')}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px 22px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'border-color 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >
          <div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              color: '#17652f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Home size={18} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500', marginTop: '12px' }}>
              Monthly rental payouts
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '600', color: '#111827', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {formatLakhs(monthlyRentalPayout)} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#6b7280' }}>/ month</span>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {totalRentalUnits} enrolled • {formatCr(totalRentDisbursed)} paid
            </span>
            <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600', backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>
              {totalRentalUnits > 0 ? 'Active' : 'None'}
            </span>
          </div>
        </div>

        {/* Metric 4: Active Leads */}
        <div
          onClick={() => navigate('/crm')}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px 22px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'border-color 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >
          <div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              color: '#17652f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500', marginTop: '12px' }}>
              Active leads
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: '600', color: '#111827', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {activeLeadsCount}
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {scheduledVisits} scheduled visits
            </span>
            <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600', backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>
              {activeLeadsCount > 0 ? 'Active' : 'None'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Recent Sales & Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

        {/* Left Column: Recent Sales */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '22px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                Recent sales
              </h2>
              <span style={{
                backgroundColor: '#f0fdf4',
                color: '#17652f',
                fontSize: '0.72rem',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {salesDeals.length > 0 ? salesDeals.length : flatsList.filter(f => ['sold', 'booked'].includes(f.status)).length}
              </span>
            </div>
            <button
              onClick={() => navigate('/sales')}
              style={{
                background: 'none',
                border: 'none',
                color: '#17652f',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View all <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.74rem', fontWeight: '500' }}>
                  <th style={{ padding: '10px 12px' }}>Unit and buyer</th>
                  <th style={{ padding: '10px 12px' }}>Project</th>
                  <th style={{ padding: '10px 12px' }}>Amount</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {salesDeals.length === 0 && flatsList.filter(f => ['sold', 'booked'].includes(f.status)).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                      No sales recorded yet. New sales bookings will appear here.
                    </td>
                  </tr>
                ) : (
                  (salesDeals.length > 0 ? salesDeals.slice(0, 5) : flatsList.filter(f => ['sold', 'booked'].includes(f.status)).slice(0, 5)).map((row, idx) => {
                    const unitName = row.assignedFlat?.flatNumber || row.flatNumber || `Flat ${row.flatNumber || idx + 101}`;
                    const buyerName = row.buyerName || row.name || row.customerName || (row.ownerDetails?.name) || 'Confirmed Buyer';
                    const projectName = row.assignedFlat?.projectId?.projectName || row.projectName || 'Krishna Valley Residency';
                    const dealPrice = row.finalPrice || row.bookingAmount || row.basePrice || (row.pricing?.totalPrice) || 0;
                    const stage = row.status || row.bookingStatus || 'Allotted';
                    const dateFormatted = row.bookingDate || row.createdAt
                      ? new Date(row.bookingDate || row.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recent';

                    return (
                      <tr
                        key={row._id || idx}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.12s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#faf9f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        onClick={() => navigate('/sales')}
                      >
                        <td style={{ padding: '12px', fontWeight: '500', color: '#111827' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#f0fdf4', color: '#17652f', fontSize: '0.74rem', fontWeight: '600' }}>
                              {unitName}
                            </span>
                            <span>{buyerName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{projectName}</td>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#17652f' }}>
                          {dealPrice > 0 ? formatINR(dealPrice) : 'Confirmed'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            backgroundColor: '#f0fdf4',
                            color: '#17652f',
                            textTransform: 'capitalize'
                          }}>
                            {String(stage).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>{dateFormatted}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Tasks Widget */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '22px 20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            Tasks
          </h2>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'open', 'closed'].map((filter) => {
              const isActive = taskFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? '600' : '500',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#17652f' : '#f3f4f6',
                    color: isActive ? '#ffffff' : '#6b7280',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '140px' }}>
            {todayTasksList
              .filter((t) => {
                if (taskFilter === 'open') return !t.completed;
                if (taskFilter === 'closed') return t.completed;
                return true;
              })
              .map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: t.completed ? '#fafafa' : '#ffffff',
                    border: '1px solid #e5e7eb',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTodayTasksList(prev => prev.map(item => item.id === t.id ? { ...item, completed: !item.completed } : item));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: t.completed ? '#17652f' : '#9ca3af'
                      }}
                    >
                      {t.completed ? (
                        <CheckCircle2 size={18} color="#17652f" />
                      ) : (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                      )}
                    </button>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: t.completed ? '400' : '500',
                      color: t.completed ? '#9ca3af' : '#111827',
                      textDecoration: t.completed ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {t.text}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '600',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fef3c7' : '#f0fdf4',
                      color: t.priority === 'High' ? '#b91c1c' : t.priority === 'Medium' ? '#b45309' : '#17652f'
                    }}>
                      {t.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTodayTasksList(prev => prev.filter(item => item.id !== t.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Quick Task Add */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTaskInput.trim()) {
                setTodayTasksList(prev => [
                  ...prev,
                  { id: Date.now(), text: newTaskInput.trim(), priority: 'Normal', completed: false }
                ]);
                setNewTaskInput('');
              }
            }}
            style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}
          >
            <input
              type="text"
              placeholder="e.g. Inspect block A roof"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.8rem',
                backgroundColor: '#ffffff',
                color: '#111827',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#17652f',
                color: '#ffffff',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Add task
            </button>
          </form>
        </div>

      </div>

      {/* 2.5 Scheduled Meetings & MoM Overview */}
      <UpcomingMeetingsWidget />

      {/* 4. Operations Overview */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: '#17652f' }}>
            <Building2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Active site</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827' }}>
              {totalProjectsCount} site • 12 floors
            </div>
          </div>
        </div>

        {isFinancialRestricted ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: '#17652f' }}>
              <Target size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Tasks</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827' }}>
                {taskStats.activeTasks || 0} open • {taskStats.completedTasks || 0} closed
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: '#17652f' }}>
              <TrendingUp size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Average unit price</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827' }}>
                {totalBookedUnits > 0 ? `${formatLakhs(totalBookedValue / totalBookedUnits)} / unit` : 'Pending first booking'}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#f0f9ff', color: '#0284c7' }}>
            <Package size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Materials</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827' }}>
              {materialsList.length} items cataloged
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#fffbeb', color: '#d97706' }}>
            <Wrench size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Maintenance</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827' }}>
              {openServiceRequestsCount} open issues
            </div>
          </div>
        </div>
      </div>

      {/* 5. Sales & Inventory Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '22px' }}>

        {/* Chart 1: Monthly Sales & Collections OR Task Progress */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isFinancialRestricted ? (
                  <>
                    <Target size={18} color="#17652f" /> Task progress
                  </>
                ) : (
                  <>
                    <TrendingUp size={18} color="#17652f" /> Monthly sales and collections
                  </>
                )}
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: '4px 0 0 0', fontWeight: '400' }}>
                {isFinancialRestricted
                  ? 'Tasks assigned and completed over time'
                  : 'Monthly sales bookings and collections in ₹ crore'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setRevenueTimeframe('6m')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  fontWeight: revenueTimeframe === '6m' ? '600' : '500',
                  border: 'none',
                  background: revenueTimeframe === '6m' ? '#17652f' : 'transparent',
                  color: revenueTimeframe === '6m' ? '#ffffff' : '#6b7280',
                  cursor: 'pointer'
                }}
              >
                6 Months
              </button>
              <button
                type="button"
                onClick={() => setRevenueTimeframe('1y')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  fontWeight: revenueTimeframe === '1y' ? '600' : '500',
                  border: 'none',
                  background: revenueTimeframe === '1y' ? '#17652f' : 'transparent',
                  color: revenueTimeframe === '1y' ? '#ffffff' : '#6b7280',
                  cursor: 'pointer'
                }}
              >
                1 Year
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '270px', marginTop: '4px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {isFinancialRestricted ? (
                <AreaChart data={taskforceChartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#17652f" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#17652f" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<TaskforceCustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.76rem', paddingTop: '10px' }} iconType="circle" />
                  <Area type="monotone" dataKey="assigned" name="Assigned" stroke="#17652f" strokeWidth={2} fillOpacity={1} fill="url(#colorAssigned)" />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              ) : (
                <AreaChart data={revenueChartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#17652f" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#17652f" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val}Cr`} />
                  <Tooltip content={<RevenueCustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.76rem', paddingTop: '10px' }} iconType="circle" />
                  <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#17652f" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
                  <Area type="monotone" dataKey="collections" name="Collections" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorCollections)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Units by floor */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="#17652f" /> Units by floor
              </h2>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: '400' }}>
                {inventoryViewMode === 'floor'
                  ? 'Booked and available units across 12 floors'
                  : 'Total units summary'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '3px', background: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setInventoryViewMode('floor')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: inventoryViewMode === 'floor' ? '600' : '500',
                    border: 'none',
                    background: inventoryViewMode === 'floor' ? '#ffffff' : 'transparent',
                    color: inventoryViewMode === 'floor' ? '#17652f' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  By floor
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryViewMode('project')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: inventoryViewMode === 'project' ? '600' : '500',
                    border: 'none',
                    background: inventoryViewMode === 'project' ? '#ffffff' : 'transparent',
                    color: inventoryViewMode === 'project' ? '#17652f' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Total
                </button>
              </div>

              <button
                onClick={() => navigate('/inventory?view=flats')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                All units <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '270px', marginTop: '4px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={inventoryViewMode === 'floor' ? floorInventoryData : projectInventoryData}
                margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
                barSize={inventoryViewMode === 'floor' ? 18 : 48}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey={inventoryViewMode === 'floor' ? 'floor' : 'name'}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<FloorCustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.76rem', paddingTop: '10px' }} iconType="circle" />
                <Bar
                  dataKey="Booked"
                  name="Booked"
                  stackId="absorption"
                  fill="#17652f"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Available"
                  name="Available"
                  stackId="absorption"
                  fill="#86c8a0"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 6. Leads Distribution & Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>

        {/* Leads by source */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon size={18} color="#17652f" /> Leads by source
            </h2>
            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: '400' }}>
              Distribution of {crmLeads.length} leads by acquisition source
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
            <div style={{ width: '180px', height: '180px', minWidth: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.78rem' }}
                    formatter={(val, name, item) => [`${val}% (${item.payload.count} leads)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leadSourceData.map((src, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontWeight: '500' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: src.color, flexShrink: 0 }} />
                    {src.name}
                  </span>
                  <span style={{ fontWeight: '600', color: '#111827' }}>
                    {src.value}% <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '400' }}>({src.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#17652f" /> Quick links
            </h2>
            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: '400' }}>
              Shortcuts to frequent tasks and records
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div
              onClick={() => navigate('/inventory?view=flats')}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Building2 size={18} color="#17652f" />
                <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                  {totalUnitsInPortfolio} units
                </span>
              </div>
              <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Units</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Unit availability and plans</div>
            </div>

            {isFinancialRestricted ? (
              <>
                <div
                  onClick={() => navigate('/taskforce')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Target size={18} color="#17652f" />
                    <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                      {taskStats.activeTasks || 0} open
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Tasks board</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Tasks and board</div>
                </div>

                <div
                  onClick={() => navigate('/taskforce-manager')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <ShieldCheck size={18} color="#17652f" />
                    <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                      Team
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Team overview</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Workload and timeline</div>
                </div>

                <div
                  onClick={() => navigate('/crm?tab=inquiries')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Users size={18} color="#17652f" />
                    <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                      CRM
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Leads</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Leads and site visits</div>
                </div>
              </>
            ) : (
              <>
                <div
                  onClick={() => navigate('/rentals')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Repeat size={18} color="#17652f" />
                    <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                      {totalRentalUnits} enrolled
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Rentals</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Ledgers and payouts</div>
                </div>

                <div
                  onClick={() => navigate('/sales')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <ShoppingBag size={18} color="#17652f" />
                    <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                      Sales
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Sales</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Bookings and payment plans</div>
                </div>

                <div
                  onClick={() => navigate('/customers')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Key size={18} color="#17652f" />
                    <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#17652f', background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px' }}>
                      Customers
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Customers</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Bank details and documents</div>
                </div>
              </>
            )}

            <div
              onClick={() => navigate('/materials?tab=stocks')}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Package size={18} color="#17652f" />
                <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>
                  Stock
                </span>
              </div>
              <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Materials</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Orders and stock</div>
            </div>

            <div
              onClick={() => navigate('/maintenance')}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Wrench size={18} color="#17652f" />
                <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>
                  Issues
                </span>
              </div>
              <div style={{ fontWeight: '600', fontSize: '0.84rem', color: '#111827', marginTop: '6px' }}>Maintenance</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Tickets and work orders</div>
            </div>
          </div>

          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            color: '#374151'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
              <CheckCircle2 size={14} color="#16a34a" /> All stores operating normally
            </span>
            <button
              onClick={() => navigate('/materials?tab=pos')}
              style={{
                background: '#17652f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              New purchase order
            </button>
          </div>
        </div>

      </div>

      {/* 7. Recent Leads Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={17} color="#17652f" /> Recent leads
            </h2>
            <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: '4px 0 0 0', fontWeight: '400' }}>
              Leads requiring follow-up or scheduled visits ({crmLeads.length} total)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="e.g. Sharma"
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.78rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <button
              onClick={() => navigate('/crm')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              View all leads <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.74rem', fontWeight: '500' }}>
                <th style={{ padding: '12px 20px' }}>Lead and source</th>
                <th style={{ padding: '12px 18px' }}>Contact</th>
                <th style={{ padding: '12px 18px' }}>Interested in</th>
                <th style={{ padding: '12px 18px' }}>Scheduled visit</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentLeadsQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                    No leads found. Try a different search.
                  </td>
                </tr>
              ) : (
                recentLeadsQueue.map((lead) => {
                  const cleanPhone = (lead.mobileNo || '').replace(/[^0-9]/g, '');

                  return (
                    <tr
                      key={lead._id || Math.random()}
                      style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.12s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.88rem' }}>
                          {lead.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ background: '#f0fdf4', color: '#17652f', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            {lead.source}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <a
                            href={`tel:${lead.mobileNo}`}
                            title="Call lead"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f0fdf4',
                              color: '#17652f',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '0.76rem',
                              fontWeight: '600'
                            }}
                          >
                            <Phone size={12} /> {lead.mobileNo}
                          </a>

                          {cleanPhone.length >= 10 && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Message on WhatsApp"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ecfdf5',
                                color: '#059669',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.76rem',
                                fontWeight: '600',
                                border: '1px solid #a7f3d0'
                              }}
                            >
                              <MessageSquare size={12} /> WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '500', background: '#f3f4f6', padding: '3px 8px', borderRadius: '5px' }}>
                          {lead.flat}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.76rem', color: '#4b5563', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={13} color="#6b7280" /> {lead.visitDate}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate('/crm')}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.74rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '6px',
                            backgroundColor: '#17652f',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          View <ArrowRight size={11} />
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
  );
};
