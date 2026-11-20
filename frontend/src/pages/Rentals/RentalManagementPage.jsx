import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  History,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Edit,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  AlertCircle,
  Sparkles,
  Repeat,
  Plus,
  BookOpen,
  Trash2,
  FileText,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Check,
  Phone,
  FileCheck,
  X,
  Download,
  SlidersHorizontal,
  Info,
  Upload
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { projectService } from '../../services/projectService.js';
import { getFileUrl } from '../../services/api.js';
import { EditRentalTermsModal } from '../../components/rentals/EditRentalTermsModal.jsx';
import { RecordPayoutModal } from '../../components/rentals/RecordPayoutModal.jsx';
import { TransferOwnershipModal } from '../../components/rentals/TransferOwnershipModal.jsx';
import { ManualRentalEntryModal } from '../../components/rentals/ManualRentalEntryModal.jsx';
import { ImportRentalModal } from '../../components/rentals/ImportRentalModal.jsx';
import { FlatDocumentsModal } from '../../components/rentals/FlatDocumentsModal.jsx';
import { BulkRentalDocumentsModal } from '../../components/rentals/BulkRentalDocumentsModal.jsx';
import { TableSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const RentalManagementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user, isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const canCreateRental = isSuperAdmin || hasPermission('rentals:create') || hasPermission('rentals:manage');
  const canEditRental = isSuperAdmin || hasPermission('rentals:edit') || hasPermission('rentals:manage');
  const canDeleteRental = isSuperAdmin || hasPermission('rentals:delete') || hasPermission('rentals:manage');
  const canManageRentals = isSuperAdmin || hasPermission('rentals:manage');

  const activeTabParam = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(activeTabParam === 'history' ? 'history' : 'active');

  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeRentals, setActiveRentals] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [kpis, setKpis] = useState({
    totalUnits: 0,
    totalMonthlyGross: 0,
    totalMonthlyNet: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalCommitmentAll: 0
  });

  // Filters & Ordering
  const [searchQuery, setSearchQuery] = useState('');
  const [tenureFilter, setTenureFilter] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [docStatusFilter, setDocStatusFilter] = useState('all'); // 'all' | 'pending_registry' | 'pending_agreement' | 'pending_both' | 'both_uploaded'
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTower, setSelectedTower] = useState('all');
  const [projectsList, setProjectsList] = useState([]);
  const [importTargetTower, setImportTargetTower] = useState('Tower A');
  const [sortField, setSortField] = useState('flatNumber');
  const [sortOrder, setSortOrder] = useState('default'); // 'default' | 'asc' | 'desc'

  // Custom Dropper UI State (Project & Tower Dropdowns)
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTowerDropdownOpen, setIsTowerDropdownOpen] = useState(false);
  const projectDropdownRef = useRef(null);
  const towerDropdownRef = useRef(null);

  // Close droppers on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false);
      }
      if (towerDropdownRef.current && !towerDropdownRef.current.contains(event.target)) {
        setIsTowerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Inventory Projects directly from Property Inventory
  const fetchInventoryProjects = async () => {
    try {
      const res = await projectService.getProjects();
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (list && list.length > 0) {
        setProjectsList(list);
      }
    } catch (err) {
      console.error('Error fetching inventory projects:', err);
    }
  };

  // Modals
  const [selectedRentalForEdit, setSelectedRentalForEdit] = useState(null);
  const [selectedRentalForPayout, setSelectedRentalForPayout] = useState(null);
  const [selectedRentalForTransfer, setSelectedRentalForTransfer] = useState(null);
  const [selectedFlatForDocs, setSelectedFlatForDocs] = useState(null);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [isImportRentalModalOpen, setIsImportRentalModalOpen] = useState(false);
  const [isBulkDocumentsModalOpen, setIsBulkDocumentsModalOpen] = useState(false);

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch Active Rentals (Table 1)
  const fetchActiveRentals = async () => {
    setLoadingActive(true);
    try {
      const res = await rentalService.getActiveRentals({
        search: searchQuery,
        tenure: tenureFilter !== 'all' ? tenureFilter : undefined
      });
      if (res.success) {
        setActiveRentals(res.data || []);
        if (res.kpis) setKpis(res.kpis);
        if (res.meta?.projects) setProjectsList(res.meta.projects);
      }
    } catch (err) {
      console.error('Error fetching active rentals:', err);
      toast.showError('Could not load active rentals data');
    } finally {
      setLoadingActive(false);
    }
  };

  // Fetch Previous Owners History (Table 2)
  const fetchPreviousOwnersHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await rentalService.getPreviousOwnersHistory({
        search: searchQuery
      });
      if (res.success) {
        setHistoryRecords(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching previous owners history:', err);
      toast.showError('Could not load previous owners history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchActiveRentals();
      fetchPreviousOwnersHistory();
      fetchInventoryProjects();
      return;
    }
    const timer = setTimeout(() => {
      fetchActiveRentals();
      fetchPreviousOwnersHistory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, tenureFilter]);

  useEffect(() => {
    const handleRentalsUpdated = () => {
      fetchActiveRentals();
      fetchPreviousOwnersHistory();
    };
    window.addEventListener('rentalsUpdated', handleRentalsUpdated);
    window.addEventListener('flatBuybackRecorded', handleRentalsUpdated);
    return () => {
      window.removeEventListener('rentalsUpdated', handleRentalsUpdated);
      window.removeEventListener('flatBuybackRecorded', handleRentalsUpdated);
    };
  }, []);

  // Search trigger on submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'active') fetchActiveRentals();
    else fetchPreviousOwnersHistory();
  };

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const parseAnyDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      let y = val.getFullYear();
      if (y > 3000) {
        const serial = val.getUTCHours() > 12 ? val.getUTCFullYear() + 1 : val.getUTCFullYear();
        if (serial >= 20000 && serial <= 75000) {
          return new Date((serial - 25569) * 86400 * 1000);
        }
      }
      return val;
    }
    const num = Number(val);
    if (!isNaN(num) && num >= 20000 && num <= 75000) {
      return new Date((num - 25569) * 86400 * 1000);
    }
    const str = String(val).trim();
    if (!str || str === '—' || str === '-' || str.toLowerCase() === 'no data') return null;
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() > 3000) {
        const serial = d.getUTCHours() > 12 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
        if (serial >= 20000 && serial <= 75000) {
          return new Date((serial - 25569) * 86400 * 1000);
        }
      }
      return d;
    }
    return null;
  };

  const formatDate = (val, forExport = false) => {
    const parsed = parseAnyDate(val);
    if (!parsed) {
      return forExport ? 'No Data' : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>No Data</span>;
    }
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderCellData = (val, customStyle = {}) => {
    if (val === undefined || val === null || val === '' || val === '—' || val === '-' || val === 'null' || val === 'undefined' || val === 'On File') {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem', ...customStyle }}>No Data</span>;
    }
    return val;
  };

  // Natural flat number comparison (e.g. A-001 < A-002 < A-014 < A-101)
  const naturalCompare = (a, b) => {
    return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  };

  // Available Projects (synced directly with Property Inventory projects)
  const availableProjects = useMemo(() => {
    const map = new Map();
    if (projectsList && projectsList.length > 0) {
      projectsList.forEach((p) => {
        const name = p.projectName || p.name;
        if (name) {
          const towersFromBuildings = (p.buildings || []).map((b) => b.buildingName).filter(Boolean);
          const allTowers = Array.from(new Set([...(p.towers || []), ...towersFromBuildings]));
          map.set(name, {
            _id: String(p._id || p.id || name),
            projectName: name,
            projectCode: p.projectCode || 'KVH-01',
            buildings: p.buildings || [],
            towers: allTowers.length > 0 ? allTowers : ['Tower A', 'Tower B', 'Tower C']
          });
        }
      });
    }
    activeRentals.forEach((r) => {
      const name = r.projectName || 'Krishna Valley Resorts';
      if (!map.has(name)) {
        map.set(name, {
          _id: String(r.projectId || name),
          projectName: name,
          projectCode: 'KVH-01',
          buildings: [],
          towers: ['Tower A', 'Tower B', 'Tower C']
        });
      }
    });
    if (map.size === 0) {
      return [{
        _id: 'proj_default',
        projectName: 'Krishna Valley Resorts',
        projectCode: 'KVH-01',
        buildings: [{ buildingName: 'Tower A' }, { buildingName: 'Tower B' }, { buildingName: 'Tower C' }],
        towers: ['Tower A', 'Tower B', 'Tower C']
      }];
    }
    return Array.from(map.values());
  }, [projectsList, activeRentals]);

  // Tower Color System
  const getTowerColor = (towerName) => {
    if (/Tower\s*B/i.test(towerName)) {
      return { dot: '#3b82f6', text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    }
    if (/Tower\s*C/i.test(towerName)) {
      return { dot: '#f59e0b', text: '#d97706', bg: '#fef3c7', border: '#fde68a' };
    }
    if (/Tower\s*D/i.test(towerName)) {
      return { dot: '#8b5cf6', text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
    }
    return { dot: '#16a34a', text: '#15803d', bg: '#dcfce7', border: '#bbf7d0' };
  };

  // Floor derivation and labels
  const getFloor = (flatNumber) => {
    const num = parseInt(String(flatNumber || '').replace(/\D/g, ''), 10);
    return isNaN(num) ? 0 : num < 100 ? 0 : Math.floor(num / 100);
  };
  const floorLabel = (floor) => (floor === 0 ? 'Ground Floor (G)' : `Floor ${floor}`);

  // Available Towers (synced with tower in selected project and inventory)
  const availableTowers = useMemo(() => {
    const towersSet = new Set();

    if (selectedProject !== 'all') {
      const proj = availableProjects.find(
        (p) => p.projectName === selectedProject || p._id === selectedProject
      );
      if (proj) {
        (proj.towers || []).forEach((t) => towersSet.add(t));
        (proj.buildings || []).forEach((b) => {
          if (b.buildingName) towersSet.add(b.buildingName);
        });
        activeRentals.forEach((r) => {
          const matchesProj = r.projectName === proj.projectName || r.projectId === proj._id;
          if (matchesProj) {
            const rTower = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
            towersSet.add(rTower);
          }
        });
        if (towersSet.size > 0) {
          return Array.from(towersSet).sort();
        }
      }
    }

    availableProjects.forEach((p) => {
      (p.towers || []).forEach((t) => towersSet.add(t));
      (p.buildings || []).forEach((b) => {
        if (b.buildingName) towersSet.add(b.buildingName);
      });
    });

    activeRentals.forEach((r) => {
      const rTower = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
      towersSet.add(rTower);
    });

    if (towersSet.size === 0) {
      towersSet.add('Tower A');
      towersSet.add('Tower B');
      towersSet.add('Tower C');
    }
    return Array.from(towersSet).sort();
  }, [availableProjects, selectedProject, activeRentals]);

  // Available floors for currently selected tower (or across all towers)
  const availableFloors = useMemo(() => {
    const relevantFlats = activeRentals.filter((r) => {
      if (selectedTower === 'all') return true;
      const rTower = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
      return rTower === selectedTower;
    });
    const floorsSet = new Set();
    relevantFlats.forEach((r) => {
      const fl = r.floor !== undefined && r.floor !== null && !isNaN(Number(r.floor))
        ? Number(r.floor)
        : getFloor(r.flatNumber);
      floorsSet.add(fl);
    });
    return Array.from(floorsSet).sort((a, b) => a - b);
  }, [activeRentals, selectedTower]);

  // Filtered Active Rentals (by Project, Tower, Floor, Document Status, Search, and Tenure)
  const filteredActiveRentals = useMemo(() => {
    return activeRentals.filter((r) => {
      // Project filter
      if (selectedProject !== 'all') {
        const matchesProj = r.projectName === selectedProject || r.projectId === selectedProject;
        if (!matchesProj) return false;
      }
      // Tower filter
      if (selectedTower !== 'all') {
        const rTower = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
        if (rTower !== selectedTower) return false;
      }
      // Floor filter
      if (selectedFloor !== 'all') {
        const fl = r.floor !== undefined && r.floor !== null && !isNaN(Number(r.floor))
          ? Number(r.floor)
          : getFloor(r.flatNumber);
        if (fl !== Number(selectedFloor)) return false;
      }
      // Document Status filter (Agreement & Registry)
      if (docStatusFilter !== 'all') {
        const hasReg = Boolean(r.registryDocument?.fileUrl);
        const hasAgr = Boolean(r.agreementDocument?.fileUrl);
        if (docStatusFilter === 'pending_registry') {
          if (hasReg) return false;
        } else if (docStatusFilter === 'pending_agreement') {
          if (hasAgr) return false;
        } else if (docStatusFilter === 'pending_both') {
          if (hasReg || hasAgr) return false;
        } else if (docStatusFilter === 'both_uploaded') {
          if (!hasReg || !hasAgr) return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const matches =
          (r.flatNumber && r.flatNumber.toLowerCase().includes(term)) ||
          (r.ownerName && r.ownerName.toLowerCase().includes(term)) ||
          (r.ownerMobile && String(r.ownerMobile).toLowerCase().includes(term));
        if (!matches) return false;
      }
      // Tenure filter
      if (tenureFilter !== 'all') {
        if (Number(r.tenureMonths) !== Number(tenureFilter)) return false;
      }
      return true;
    });
  }, [activeRentals, selectedProject, selectedTower, selectedFloor, docStatusFilter, searchQuery, tenureFilter]);

  // Active KPIs (dynamically aggregated for currently active filter)
  const activeKpis = useMemo(() => {
    const totalUnits = filteredActiveRentals.length;
    const totalMonthlyGross = filteredActiveRentals.reduce((sum, item) => sum + (Number(item.rentAmount) || 0), 0);
    const totalMonthlyNet = filteredActiveRentals.reduce((sum, item) => sum + (Number(item.netAmount) || 0), 0);
    const totalDisbursed = filteredActiveRentals.reduce((sum, item) => sum + (Number(item.totalPaid) || 0), 0);
    const totalOutstanding = filteredActiveRentals.reduce((sum, item) => sum + (Number(item.amountOutstanding) || 0), 0);
    const totalCommitmentAll = filteredActiveRentals.reduce((sum, item) => sum + (Number(item.totalCommitment) || 0), 0);
    return {
      totalUnits,
      totalMonthlyGross,
      totalMonthlyNet,
      totalDisbursed,
      totalOutstanding,
      totalCommitmentAll
    };
  }, [filteredActiveRentals]);

  // Sorted Active Rentals Memo
  const sortedActiveRentals = useMemo(() => {
    const list = [...filteredActiveRentals];
    if (sortOrder === 'default') {
      return list.sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber));
    }

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'flatNumber':
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
          break;
        case 'ownerName':
          cmp = (a.ownerName || '').localeCompare(b.ownerName || '');
          break;
        case 'registryDate': {
          const da = parseAnyDate(a.registryDate)?.getTime() || 0;
          const db = parseAnyDate(b.registryDate)?.getTime() || 0;
          cmp = da - db;
          break;
        }
        case 'startDate': {
          const da = parseAnyDate(a.startDate)?.getTime() || 0;
          const db = parseAnyDate(b.startDate)?.getTime() || 0;
          cmp = da - db;
          break;
        }
        case 'rentAmount':
          cmp = (Number(a.rentAmount) || 0) - (Number(b.rentAmount) || 0);
          break;
        case 'netAmount':
          cmp = (Number(a.netAmount) || 0) - (Number(b.netAmount) || 0);
          break;
        case 'totalPaid':
          cmp = (Number(a.totalPaid) || 0) - (Number(b.totalPaid) || 0);
          break;
        case 'amountOutstanding':
          cmp = (Number(a.amountOutstanding) || 0) - (Number(b.amountOutstanding) || 0);
          break;
        case 'tenureMonths':
          cmp = (Number(a.tenureMonths) || 0) - (Number(b.tenureMonths) || 0);
          break;
        default:
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredActiveRentals, sortOrder, sortField]);

  // Displayed Towers: either single selected tower or all available towers
  const displayedTowers = useMemo(() => {
    if (selectedTower !== 'all') {
      return [selectedTower];
    }
    return availableTowers;
  }, [selectedTower, availableTowers]);

  // Filtered & Sorted History Records Memo
  const filteredHistoryRecords = useMemo(() => {
    return historyRecords.filter((h) => {
      if (selectedProject !== 'all') {
        const matchesProj = h.projectName === selectedProject || h.projectId === selectedProject;
        if (!matchesProj) return false;
      }
      if (selectedTower !== 'all') {
        const hTower = h.tower || (/^[Bb][\s\-_]/.test(h.flatNumber) ? 'Tower B' : 'Tower A');
        if (hTower !== selectedTower) return false;
      }
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const matches =
          (h.flatNumber && h.flatNumber.toLowerCase().includes(term)) ||
          (h.previousOwnerName && h.previousOwnerName.toLowerCase().includes(term)) ||
          (h.mobileNo && String(h.mobileNo).toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }, [historyRecords, selectedProject, selectedTower, searchQuery]);

  const sortedHistoryRecords = useMemo(() => {
    const list = [...filteredHistoryRecords];
    if (sortOrder === 'default') {
      return list.sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber));
    }

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'flatNumber':
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
          break;
        case 'ownerName':
          cmp = (a.previousOwnerName || '').localeCompare(b.previousOwnerName || '');
          break;
        case 'registryDate': {
          const da = parseAnyDate(a.registryDate)?.getTime() || 0;
          const db = parseAnyDate(b.registryDate)?.getTime() || 0;
          cmp = da - db;
          break;
        }
        case 'rentAmount':
          cmp = (Number(a.rentAmount) || 0) - (Number(b.rentAmount) || 0);
          break;
        case 'netAmount':
          cmp = (Number(a.netAmount) || 0) - (Number(b.netAmount) || 0);
          break;
        case 'totalPaid':
          cmp = (Number(a.totalRentPaid) || 0) - (Number(b.totalRentPaid) || 0);
          break;
        default:
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredHistoryRecords, sortOrder, sortField]);

  // Header click sorting
  const handleHeaderSort = (field) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') setSortOrder('default');
      else setSortOrder('asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'active') {
      const headers = [
        'Flat No',
        'Owner Name',
        'Owner Mobile',
        'Registry Date',
        'Registry Document',
        'Rental Agreement',
        'Monthly Gross Rent',
        'TDS Applied',
        'Net Monthly Rent',
        'Tenure (Months)',
        'Payment Starting Date',
        'Payment Ending Date',
        'Total Commitment',
        'Total Paid',
        'Amount Outstanding'
      ];
      const rows = sortedActiveRentals.map((r) => [
        `"${r.flatNumber}"`,
        `"${r.ownerName}"`,
        `"${r.ownerMobile || ''}"`,
        `"${formatDate(r.registryDate, true)}"`,
        `"${r.registryDocument?.fileUrl ? 'Uploaded' : 'Pending'}"`,
        `"${r.agreementDocument?.fileUrl ? 'Uploaded' : 'Pending'}"`,
        r.rentAmount,
        r.applyTds ? `${r.tdsPercentage}% (-₹${r.tdsAmount})` : 'No',
        r.netAmount,
        r.tenureMonths,
        `"${formatDate(r.startDate, true)}"`,
        `"${formatDate(r.endDate, true)}"`,
        r.totalCommitment,
        r.totalPaid,
        r.amountOutstanding
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Active_Rental_Register_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Flat No',
        'Sequence',
        'Previous Owner Name',
        'Contact',
        'Registry Date',
        'Monthly Rent',
        'TDS Applied',
        'Net Rent',
        'Start Date',
        'End Date / Transfer Date',
        'Tenure (Months)',
        'Total Rent Disbursed',
        'Transferred To'
      ];
      const rows = sortedHistoryRecords.map((h) => [
        `"${h.flatNumber}"`,
        `"${h.sequenceLabel}"`,
        `"${h.previousOwnerName}"`,
        `"${h.mobileNo}"`,
        `"${formatDate(h.registryDate, true)}"`,
        h.rentAmount,
        h.applyTds ? `${h.tdsPercentage}%` : 'No',
        h.netAmount,
        `"${formatDate(h.startDate, true)}"`,
        `"${formatDate(h.endDate, true)}"`,
        h.tenureMonths,
        h.totalRentPaid,
        `"${h.transferredTo}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Previous_Owners_Rental_Trail_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.showSuccess('Report exported to CSV!');
  };

  // Delete / Unenroll Active Rental Entry
  const handleDeleteActiveRental = async (rental) => {
    if (!rental) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete and unenroll Flat ${rental.flatNumber} (${rental.ownerName}) from the active rental register?\n\nThis will reset its guaranteed rental commitment and clear all scheduled passbook ledger entries.`
    );
    if (!confirmDelete) return;

    try {
      const res = await rentalService.deleteRental(rental._id);
      if (res.success) {
        toast.showSuccess(res.message || `Flat ${rental.flatNumber} deleted from rental register!`);
        fetchActiveRentals();
        fetchPreviousOwnersHistory();
      } else {
        toast.showError(res.message || 'Failed to delete rental entry');
      }
    } catch (err) {
      console.error('Error deleting rental entry:', err);
      toast.showError('Server error deleting rental entry');
    }
  };

  // Delete Previous Owner History Entry
  const handleDeleteHistoryEntry = async (item) => {
    if (!item) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the previous ownership record of Flat ${item.flatNumber} (${item.previousOwnerName})?`
    );
    if (!confirmDelete) return;

    try {
      const res = await rentalService.deleteOwnershipHistory(item.flatId, item.historyId);
      if (res.success) {
        toast.showSuccess(res.message || 'Previous owner record deleted!');
        fetchPreviousOwnersHistory();
      } else {
        toast.showError(res.message || 'Failed to delete history entry');
      }
    } catch (err) {
      console.error('Error deleting history entry:', err);
      toast.showError('Server error deleting history entry');
    }
  };

  // Combined sort helpers & filter checks
  const currentSortKey = sortOrder === 'default' ? `${sortField}_default` : `${sortField}_${sortOrder}`;

  const handleSortChange = (e) => {
    const val = e.target.value;
    if (val.endsWith('_default')) {
      const field = val.replace('_default', '');
      setSortField(field);
      setSortOrder('default');
    } else if (val.endsWith('_asc')) {
      const field = val.replace('_asc', '');
      setSortField(field);
      setSortOrder('asc');
    } else if (val.endsWith('_desc')) {
      const field = val.replace('_desc', '');
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSortDirection = () => {
    if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTower('all');
    setSelectedFloor('all');
    setDocStatusFilter('all');
    setTenureFilter('all');
    setSortField('flatNumber');
    setSortOrder('default');
    toast.showSuccess('Filters and sorting reset to default');
  };

  const isFilteredOrSorted =
    searchQuery !== '' ||
    selectedTower !== 'all' ||
    selectedFloor !== 'all' ||
    docStatusFilter !== 'all' ||
    tenureFilter !== 'all' ||
    sortOrder !== 'default' ||
    sortField !== 'flatNumber';

  // Render Table Head for Active Rentals
  const renderActiveTableHead = () => (
    <thead>
      <tr
        style={{
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          color: '#6b7280',
          fontSize: '0.78rem',
          fontWeight: 500
        }}
      >
        {/* Flat No */}
        <th
          onClick={() => handleHeaderSort('flatNumber')}
          style={{ padding: '12px 16px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Flat</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Owner */}
        <th
          onClick={() => handleHeaderSort('ownerName')}
          style={{ padding: '12px 16px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Owner</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Documents & Registry */}
        <th style={{ padding: '12px 16px', fontWeight: 500 }}>
          <span>Documents</span>
        </th>

        {/* Registry Date */}
        <th
          onClick={() => handleHeaderSort('registryDate')}
          style={{ padding: '12px 14px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Registry date</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Rent Amount */}
        <th
          onClick={() => handleHeaderSort('rentAmount')}
          style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Monthly rent</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* TDS */}
        <th style={{ padding: '12px 14px', fontWeight: 500 }}>TDS</th>

        {/* Net Amount */}
        <th
          onClick={() => handleHeaderSort('netAmount')}
          style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Net payout</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Start Date */}
        <th
          onClick={() => handleHeaderSort('startDate')}
          style={{ padding: '12px 14px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Start date</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* End Date */}
        <th style={{ padding: '12px 14px', fontWeight: 500 }}>End date</th>

        {/* Tenure */}
        <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Tenure</th>

        {/* Total Paid */}
        <th
          onClick={() => handleHeaderSort('totalPaid')}
          style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Total paid</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Outstanding */}
        <th
          onClick={() => handleHeaderSort('amountOutstanding')}
          style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Outstanding</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Actions */}
        <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'center' }}>Actions</th>
      </tr>
    </thead>
  );

  // Render Table Row for Active Rentals
  const renderActiveRentalRow = (r, idx) => {
    const hasRegistryDoc = Boolean(r.registryDocument?.fileUrl);
    const hasAgreementDoc = Boolean(r.agreementDocument?.fileUrl);

    return (
      <tr
        key={r._id || idx}
        style={{
          borderBottom: '1px solid #f3f4f6',
          fontSize: '0.82rem'
        }}
      >
        {/* 1. Flat No */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <button
            type="button"
            onClick={() => navigate(`/inventory/flats/${r._id}`)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#17652f',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Open flat profile"
          >
            <span>{r.flatNumber}</span>
            <ExternalLink size={12} />
          </button>
          <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '2px' }}>
            Floor {r.floor === 0 ? 'G' : renderCellData(r.floor)} • {renderCellData(r.bhkType)}
          </span>
        </td>

        {/* 2. Owner Name & Mobile */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <div style={{ fontWeight: 500, color: '#111827' }}>{renderCellData(r.ownerName)}</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {r.ownerMobile && <Phone size={10} color="#9ca3af" />}
            <span>{renderCellData(r.ownerMobile)}</span>
          </div>
        </td>

        {/* 3. Documents Pill Access */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Registry Document Pill */}
            {hasRegistryDoc ? (
              <a
                href={getFileUrl(r.registryDocument.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                title={r.registryDocument.fileName ? `Original Registry: ${r.registryDocument.fileName}${r.registryDocument.fileSize ? ` (${(r.registryDocument.fileSize / (1024 * 1024)).toFixed(1)} MB)` : ''} • Click to open` : 'View registry document'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: '#e8f2e5',
                  color: '#17652f',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  width: 'fit-content',
                  border: '1px solid #c2e2be',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldCheck size={12} color="#17652f" />
                <span>Registry</span>
                <ExternalLink size={10} color="#17652f" style={{ opacity: 0.7 }} />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedFlatForDocs(r)}
                title="Upload registry document"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#6b7280',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px dashed #d1d5db',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                <Plus size={11} />
                <span>Add registry</span>
              </button>
            )}

            {/* Rental Agreement Document Pill */}
            {hasAgreementDoc ? (
              <a
                href={getFileUrl(r.agreementDocument.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                title={r.agreementDocument.fileName ? `Original Agreement: ${r.agreementDocument.fileName}${r.agreementDocument.fileSize ? ` (${(r.agreementDocument.fileSize / (1024 * 1024)).toFixed(1)} MB)` : ''} • Click to open` : 'View rental agreement'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  width: 'fit-content',
                  border: '1px solid #bae6fd',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={12} color="#0369a1" />
                <span>Agreement</span>
                <ExternalLink size={10} color="#0369a1" style={{ opacity: 0.7 }} />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedFlatForDocs(r)}
                title="Upload rental agreement"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#6b7280',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px dashed #d1d5db',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                <Plus size={11} />
                <span>Add agreement</span>
              </button>
            )}
          </div>
        </td>

        {/* 4. Registry Date */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#374151', fontWeight: 500 }}>
            {formatDate(r.registryDate)}
          </span>
        </td>

        {/* 5. Rent Amount */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
          {formatINR(r.rentAmount)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>/month</span>
          {r.effectiveFromMonthYear && (
            <span style={{
              display: 'inline-block',
              fontSize: '0.64rem',
              color: '#17652f',
              background: '#e8f2e5',
              padding: '1px 6px',
              borderRadius: '4px',
              marginTop: '2px'
            }}>
              From: {r.effectiveFromMonthYear}
            </span>
          )}
        </td>

        {/* 6. TDS Applied */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
          {r.applyTds ? (
            <div>
              <span style={{
                background: '#f3f4f6',
                color: '#374151',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 500
              }}>
                {r.tdsMode === 'amount'
                  ? `₹${(r.tdsAmount || 0).toLocaleString('en-IN')}`
                  : `${r.tdsPercentage}%`}
              </span>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                - {formatINR(r.tdsAmount)}
              </span>
            </div>
          ) : (
            <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>None</span>
          )}
        </td>

        {/* 7. Net Amount */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600, color: '#17652f' }}>
          {formatINR(r.netAmount)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>Net /mo</span>
        </td>

        {/* 8. Starting Date */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151', fontWeight: 500 }}>
          {formatDate(r.startDate)}
        </td>

        {/* 9. Ending Date */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#17652f', fontWeight: 500 }}>
            {formatDate(r.endDate)}
          </span>
        </td>

        {/* 10. Tenure (Months) */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
          <span style={{
            background: '#f3f4f6',
            color: '#374151',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '3px 8px',
            borderRadius: '4px'
          }}>
            {r.tenureMonths} mos
          </span>
        </td>

        {/* 11. Total Paid */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
          {formatINR(r.totalPaid)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>
            {r.paidMonthsCount} paid
          </span>
        </td>

        {/* 12. Amount Outstanding */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
          {formatINR(r.amountOutstanding)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>
            {r.remainingMonths} left
          </span>
        </td>

        {/* 13. Actions */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {/* Edit Terms */}
            {canEditRental && (
              <button
                type="button"
                onClick={() => setSelectedRentalForEdit(r)}
                title="Edit terms"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#111827',
                  fontSize: '0.74rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Edit size={13} />
                <span>Edit</span>
              </button>
            )}

            {/* Flat Documents Hub Modal */}
            <button
              type="button"
              onClick={() => setSelectedFlatForDocs(r)}
              title={`Documents for flat ${r.flatNumber}`}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#111827',
                cursor: 'pointer'
              }}
            >
              <FolderOpen size={14} />
            </button>

            {/* Record Payout */}
            {(canEditRental || canManageRentals) && (
              <button
                type="button"
                onClick={() => setSelectedRentalForPayout(r)}
                title="Record payout"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#17652f',
                  cursor: 'pointer'
                }}
              >
                <DollarSign size={14} />
              </button>
            )}

            {/* Resale Transfer */}
            {canManageRentals && (
              <button
                type="button"
                onClick={() => setSelectedRentalForTransfer(r)}
                title="Transfer ownership"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#17652f',
                  cursor: 'pointer'
                }}
              >
                <Repeat size={14} />
              </button>
            )}

            {/* Delete / Unenroll */}
            {canDeleteRental && (
              <button
                type="button"
                onClick={() => handleDeleteActiveRental(r)}
                title="Delete rental"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>

      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE HEADER */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '2px 0'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            Rentals
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Manage rental contracts, owner payout terms, passbook ledgers, and resale records.
          </p>
        </div>

        {/* Action Buttons Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Primary CTA: Manual Rental Entry */}
          {canCreateRental && (
            <button
              onClick={() => setIsManualEntryModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#17652f',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Add rental</span>
            </button>
          )}

          {/* Import by Excel */}
          {canCreateRental && (
            <button
              onClick={() => {
                setImportTargetTower(selectedTower !== 'all' ? selectedTower : 'Tower A');
                setIsImportRentalModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={15} style={{ color: '#17652f' }} />
              <span>Import rentals</span>
            </button>
          )}

          {/* Bulk Document Upload (Registry & Agreements) */}
          {(canEditRental || canManageRentals) && (
            <button
              onClick={() => setIsBulkDocumentsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Bulk upload registry documents and rent agreements"
            >
              <Upload size={15} style={{ color: '#17652f' }} />
              <span>Upload documents</span>
            </button>
          )}

          {/* Passbook Ledgers Hub */}
          {canManageRentals && (
            <button
              onClick={() => navigate('/rentals/ledgers')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <BookOpen size={15} style={{ color: '#17652f' }} />
              <span>Ledgers</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#111827',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            title="Export to CSV"
          >
            <Download size={14} style={{ color: '#6b7280' }} />
            <span>Export CSV</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={() => {
              fetchActiveRentals();
              fetchPreviousOwnersHistory();
              toast.showSuccess('Refreshed rental registers');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#111827',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            title="Refresh table data"
          >
            <RefreshCw size={14} style={{ color: '#6b7280' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP KPI CARDS STRIP */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px'
      }}>
        {/* Card 1: Enrolled Units */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Enrolled units</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {activeKpis.totalUnits} <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#6b7280' }}>units</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Active rental contracts
          </span>
        </div>

        {/* Card 2: Monthly Gross Rent */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Monthly gross rent</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {formatINR(activeKpis.totalMonthlyGross)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Total scheduled monthly payout
          </span>
        </div>

        {/* Card 3: Monthly Net Payout */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Monthly net payout</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#17652f', margin: '4px 0 2px' }}>
            {formatINR(activeKpis.totalMonthlyNet)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            After TDS deductions
          </span>
        </div>

        {/* Card 4: Total Disbursed */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Total disbursed</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {formatINR(activeKpis.totalDisbursed)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Cumulative to current owners
          </span>
        </div>

        {/* Card 5: Outstanding Balance */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Outstanding balance</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} color="#b45309" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {formatINR(activeKpis.totalOutstanding)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Remaining contract liability
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABS & SEARCH/FILTER WORKSPACE (EXECUTIVE COMMAND BAR) */}
      {/* ========================================================================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        {/* TOP LEVEL NAVIGATION & SCOPE SWITCHER BAR */}
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(180deg, #fafbfc 0%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left: Project & Tower Custom Droppers (Directly Synced with Property Inventory) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* 1. CUSTOM PROJECT DROPPER (Synced with Inventory) */}
            <div ref={projectDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsProjectDropdownOpen((prev) => !prev);
                  setIsTowerDropdownOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 13px',
                  background: '#ffffff',
                  border: isProjectDropdownOpen ? '1.5px solid #17652f' : '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease'
                }}
                title="Select Project from Inventory"
              >
                <Building2 size={15} color="#17652f" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Project:
                </span>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                  {selectedProject === 'all' ? 'All Projects' : selectedProject}
                </strong>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: '#e8f2e5',
                  color: '#17652f',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {selectedProject === 'all'
                    ? activeRentals.length
                    : activeRentals.filter((r) => r.projectName === selectedProject || r.projectId === selectedProject).length}
                </span>
                <ChevronDown
                  size={14}
                  color="#64748b"
                  style={{
                    transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>

              {/* Project Dropdown Menu */}
              {isProjectDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 60,
                  minWidth: '280px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                  padding: '6px'
                }}>
                  <div style={{ padding: '7px 10px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Select Project
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                      Inventory Synced
                    </span>
                  </div>

                  {/* All Projects Option */}
                  <div
                    onClick={() => {
                      setSelectedProject('all');
                      setSelectedTower('all');
                      setSelectedFloor('all');
                      setIsProjectDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedProject === 'all' ? '#e8f2e5' : 'transparent',
                      color: selectedProject === 'all' ? '#17652f' : '#0f172a',
                      fontWeight: selectedProject === 'all' ? 700 : 500,
                      fontSize: '0.82rem',
                      marginTop: '4px',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => { if (selectedProject !== 'all') e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (selectedProject !== 'all') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={14} color={selectedProject === 'all' ? '#17652f' : '#64748b'} />
                      <span>All Projects</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '8px',
                        background: selectedProject === 'all' ? '#ffffff' : '#f1f5f9',
                        color: selectedProject === 'all' ? '#17652f' : '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {activeRentals.length} units
                      </span>
                      {selectedProject === 'all' && <Check size={14} color="#17652f" />}
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                  {/* Individual Projects from Inventory */}
                  {availableProjects.map((p) => {
                    const isSelected = selectedProject === p.projectName || selectedProject === p._id;
                    const count = activeRentals.filter((r) => r.projectId === p._id || r.projectName === p.projectName).length;
                    return (
                      <div
                        key={p._id || p.projectName}
                        onClick={() => {
                          setSelectedProject(p.projectName);
                          setSelectedTower('all');
                          setSelectedFloor('all');
                          setIsProjectDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected ? '#e8f2e5' : 'transparent',
                          color: isSelected ? '#17652f' : '#0f172a',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.82rem',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                          <div>
                            <div>{p.projectName}</div>
                            {p.towers && p.towers.length > 0 && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>
                                {p.towers.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '8px',
                            background: isSelected ? '#ffffff' : '#f1f5f9',
                            color: isSelected ? '#17652f' : '#64748b',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            {count} units
                          </span>
                          {isSelected && <Check size={14} color="#17652f" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. CUSTOM TOWER DROPPER (Directly synced with Tower in Project) */}
            <div ref={towerDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsTowerDropdownOpen((prev) => !prev);
                  setIsProjectDropdownOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  background: '#ffffff',
                  border: isTowerDropdownOpen ? '1.5px solid #17652f' : '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease'
                }}
                title="Select Tower (Synced with Project in Inventory)"
              >
                <Layers size={15} color={selectedTower === 'all' ? '#17652f' : getTowerColor(selectedTower).dot} />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tower:
                </span>
                {selectedTower !== 'all' ? (
                  <>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getTowerColor(selectedTower).dot,
                      display: 'inline-block'
                    }} />
                    <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                      {selectedTower}
                    </strong>
                    <span style={{
                      padding: '1px 7px',
                      borderRadius: '10px',
                      background: getTowerColor(selectedTower).bg,
                      color: getTowerColor(selectedTower).text,
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {filteredActiveRentals.filter((r) => {
                        const rt = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
                        return rt === selectedTower;
                      }).length}
                    </span>
                  </>
                ) : (
                  <>
                    <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                      All Towers
                    </strong>
                    <span style={{
                      padding: '1px 7px',
                      borderRadius: '10px',
                      background: '#e8f2e5',
                      color: '#17652f',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {filteredActiveRentals.length}
                    </span>
                  </>
                )}
                <ChevronDown
                  size={14}
                  color="#64748b"
                  style={{
                    transform: isTowerDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>

              {/* Tower Dropdown Menu */}
              {isTowerDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 60,
                  minWidth: '260px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                  padding: '6px'
                }}>
                  <div style={{ padding: '7px 10px 6px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Select Tower / Wing
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
                      {availableTowers.length} {availableTowers.length === 1 ? 'Tower' : 'Towers'}
                    </span>
                  </div>

                  {/* All Towers Option */}
                  <div
                    onClick={() => {
                      setSelectedTower('all');
                      setSelectedFloor('all');
                      setIsTowerDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedTower === 'all' ? '#e8f2e5' : 'transparent',
                      color: selectedTower === 'all' ? '#17652f' : '#0f172a',
                      fontWeight: selectedTower === 'all' ? 700 : 500,
                      fontSize: '0.82rem',
                      marginTop: '4px',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => { if (selectedTower !== 'all') e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (selectedTower !== 'all') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={14} color={selectedTower === 'all' ? '#17652f' : '#64748b'} />
                      <span>All Towers</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '8px',
                        background: selectedTower === 'all' ? '#ffffff' : '#f1f5f9',
                        color: selectedTower === 'all' ? '#17652f' : '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {filteredActiveRentals.length} units
                      </span>
                      {selectedTower === 'all' && <Check size={14} color="#17652f" />}
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                  {/* Individual Towers Synced with Project in Inventory */}
                  {availableTowers.map((tName) => {
                    const isSelected = selectedTower === tName;
                    const colors = getTowerColor(tName);
                    const count = filteredActiveRentals.filter((r) => {
                      const rt = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
                      return rt === tName;
                    }).length;

                    return (
                      <div
                        key={tName}
                        onClick={() => {
                          setSelectedTower(tName);
                          setSelectedFloor('all');
                          setIsTowerDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected ? colors.bg : 'transparent',
                          color: isSelected ? colors.text : '#0f172a',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.82rem',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: colors.dot,
                            display: 'inline-block'
                          }} />
                          <span>{tName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '8px',
                            background: isSelected ? '#ffffff' : '#f1f5f9',
                            color: isSelected ? colors.text : '#64748b',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            {count} {count === 1 ? 'unit' : 'units'}
                          </span>
                          {isSelected && <Check size={14} color={colors.text} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Campus / Location Tag */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '7px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid #e2e8f0'
            }}>
              <CheckCircle2 size={13} color="#16a34a" />
              <span>Inventory Synced</span>
            </span>
          </div>
            {/* Right: Active vs Resale History Tabs */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              gap: '3px'
            }}>
              <button
                type="button"
                onClick={() => handleTabChange('active')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: activeTab === 'active' ? '#17652f' : 'transparent',
                  color: activeTab === 'active' ? '#ffffff' : '#64748b',
                  fontWeight: activeTab === 'active' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'active' ? '0 1px 3px rgba(23,101,47,0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Building2 size={13} />
                <span>Active Register</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: activeTab === 'active' ? '#e8f2e5' : '#e2e8f0',
                  color: activeTab === 'active' ? '#17652f' : '#64748b'
                }}>
                  {activeRentals.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('history')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: activeTab === 'history' ? '#17652f' : 'transparent',
                  color: activeTab === 'history' ? '#ffffff' : '#64748b',
                  fontWeight: activeTab === 'history' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'history' ? '0 1px 3px rgba(23,101,47,0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <History size={13} />
                <span>Resale History</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: activeTab === 'history' ? '#e8f2e5' : '#e2e8f0',
                  color: activeTab === 'history' ? '#17652f' : '#64748b'
                }}>
                  {historyRecords.length}
                </span>
              </button>
            </div>
          </div>

          {/* BOTTOM LEVEL: SEARCH, FILTERS & TABLE CONTROLS */}
          <div style={{
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {/* Left: Search + Filter Tools (Single Line Cluster) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
              {/* Compact Search Box */}
              <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '280px', minWidth: '190px', flexShrink: 0 }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder={activeTab === 'active' ? 'Search flat, owner, mobile...' : 'Search resale history...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 28px 7px 32px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    outline: 'none',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </form>

              {/* Floor Filter (Cascading with Tower, default: All Floors) */}
              {activeTab === 'active' && (
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    background: selectedFloor !== 'all' ? '#e8f2e5' : '#ffffff',
                    color: selectedFloor !== 'all' ? '#17652f' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '130px',
                    flexShrink: 0
                  }}
                  title="Filter flats by floor"
                >
                  <option value="all">All Floors</option>
                  {availableFloors.map((fl) => (
                    <option key={fl} value={fl}>
                      {floorLabel(fl)}
                    </option>
                  ))}
                </select>
              )}

              {/* Document Filter (Agreement & Registry) */}
              {activeTab === 'active' && (
                <select
                  value={docStatusFilter}
                  onChange={(e) => setDocStatusFilter(e.target.value)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    background: docStatusFilter !== 'all' ? '#e8f2e5' : '#ffffff',
                    color: docStatusFilter !== 'all' ? '#17652f' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '165px',
                    flexShrink: 0
                  }}
                  title="Filter by Agreement and Registry status"
                >
                  <option value="all">All Documents</option>
                  <option value="pending_registry">Pending Registry</option>
                  <option value="pending_agreement">Pending Agreement</option>
                  <option value="pending_both">Pending Both (Reg + Agr)</option>
                  <option value="both_uploaded">Both Uploaded</option>
                </select>
              )}

              {/* Tenure Filter */}
              {activeTab === 'active' && (
                <select
                  value={tenureFilter}
                  onChange={(e) => setTenureFilter(e.target.value)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    background: tenureFilter !== 'all' ? '#e8f2e5' : '#ffffff',
                    color: tenureFilter !== 'all' ? '#17652f' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    width: '125px',
                    flexShrink: 0
                  }}
                >
                  <option value="all">All Tenures</option>
                  <option value="36">36 Months</option>
                  <option value="48">48 Months</option>
                  <option value="60">60 Months</option>
                  <option value="100">100 Months</option>
                </select>
              )}

              {/* Sort Selector */}
              <select
                value={currentSortKey}
                onChange={handleSortChange}
                style={{
                  padding: '7px 11px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: sortOrder !== 'default' ? '#e8f2e5' : '#ffffff',
                  color: sortOrder !== 'default' ? '#17652f' : '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  width: '190px',
                  flexShrink: 0
                }}
              >
                {activeTab === 'active' ? (
                  <>
                    <option value="flatNumber_default">Sort: Flat No (Natural)</option>
                    <option value="flatNumber_desc">Sort: Flat No (Desc)</option>
                    <option value="ownerName_asc">Sort: Owner (A to Z)</option>
                    <option value="ownerName_desc">Sort: Owner (Z to A)</option>
                    <option value="rentAmount_desc">Sort: Gross Rent (High)</option>
                    <option value="rentAmount_asc">Sort: Gross Rent (Low)</option>
                    <option value="netAmount_desc">Sort: Net Payout (High)</option>
                    <option value="amountOutstanding_desc">Sort: Outstanding (High)</option>
                    <option value="totalPaid_desc">Sort: Total Paid (High)</option>
                    <option value="startDate_desc">Sort: Start Date (Newest)</option>
                    <option value="registryDate_desc">Sort: Registry (Newest)</option>
                  </>
                ) : (
                  <>
                    <option value="flatNumber_default">Sort: Flat No</option>
                    <option value="ownerName_asc">Sort: Past Owner (A to Z)</option>
                    <option value="rentAmount_desc">Sort: Gross Rent (High)</option>
                    <option value="startDate_desc">Sort: Transfer (Newest)</option>
                  </>
                )}
              </select>

              {/* Quick Direction Toggle Button */}
              <button
                type="button"
                onClick={toggleSortDirection}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
              >
                {sortOrder === 'desc' ? <ArrowDown size={13} color="#17652f" /> : <ArrowUp size={13} color="#17652f" />}
              </button>

              {/* Reset Filters & Sort Button */}
              {isFilteredOrSorted && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '7px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Reset all filters and sorting"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Right: Flat Count Pill */}
            {activeTab === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
                <span style={{
                  fontSize: '0.78rem',
                  color: '#475569',
                  fontWeight: 600,
                  background: '#f8fafc',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: '1px solid #e2e8f0'
                }}>
                  Showing <strong>{filteredActiveRentals.length}</strong> {filteredActiveRentals.length === 1 ? 'unit' : 'units'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TABLE 1: ACTIVE RENTAL REGISTER (CURRENT OWNERS) */}
        {/* ========================================================================= */}
        {activeTab === 'active' && (
          <>
            {loadingActive ? (
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <TableSkeleton rows={8} columns={12} />
              </div>
            ) : sortedActiveRentals.length === 0 && selectedTower !== 'all' ? (
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <EmptyState
                  icon={Building2}
                  title={`No active rentals found in ${selectedTower}`}
                  description="No flats are currently enrolled in this tower matching your filters."
                />
              </div>
            ) : (
              /* Render Separate Tables for Each Tower */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {displayedTowers.map((towerName) => {
                  const towerFlats = sortedActiveRentals.filter((r) => {
                    const rTower = r.tower || (/^[Bb][\s\-_]/.test(r.flatNumber) ? 'Tower B' : /^[Cc][\s\-_]/.test(r.flatNumber) ? 'Tower C' : 'Tower A');
                    return rTower === towerName;
                  });
                  const towerUnitCount = towerFlats.length;
                  const towerGross = towerFlats.reduce((s, r) => s + (Number(r.rentAmount) || 0), 0);
                  const towerNet = towerFlats.reduce((s, r) => s + (Number(r.netAmount) || 0), 0);
                  const towerPaid = towerFlats.reduce((s, r) => s + (Number(r.totalPaid) || 0), 0);
                  const towerOutstanding = towerFlats.reduce((s, r) => s + (Number(r.amountOutstanding) || 0), 0);

                  return (
                    <div
                      key={towerName}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        position: 'relative'
                      }}
                    >
                      {/* Top Aesthetic Accent Ribbon */}
                      <div style={{
                        height: '3px',
                        width: '100%',
                        background: towerName === 'Tower B'
                          ? 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)'
                          : 'linear-gradient(90deg, #15803d 0%, #22c55e 50%, #10b981 100%)'
                      }} />

                      {/* Tower Header Bar */}
                      <div
                        style={{
                          padding: '16px 20px',
                          background: towerName === 'Tower B' ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' : 'linear-gradient(135deg, #fbfdfb 0%, #f4f8f4 100%)',
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '14px'
                        }}
                      >
                        {/* Left: Tower Badge & Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: towerName === 'Tower B' ? '#3b82f6' : '#17652f',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Building2 size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#0f172a' }}>
                                {towerName} — Rental Register
                              </h3>
                              <span
                                style={{
                                  padding: '2px 9px',
                                  borderRadius: '12px',
                                  background: towerUnitCount > 0 ? '#dcfce7' : '#f1f5f9',
                                  color: towerUnitCount > 0 ? '#15803d' : '#64748b',
                                  fontSize: '0.76rem',
                                  fontWeight: 700
                                }}
                              >
                                {towerUnitCount} {towerUnitCount === 1 ? 'Unit' : 'Units'}
                              </span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  color: '#475569',
                                  fontSize: '0.72rem',
                                  fontWeight: 500
                                }}
                              >
                                {selectedProject === 'all' ? 'Krishna Valley Resorts' : selectedProject}
                              </span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                              Dedicated ledger, agreements, registry documents & payouts for {towerName}
                            </p>
                          </div>
                        </div>

                        {/* Right: Metrics & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                            <div>
                              <span style={{ color: '#64748b' }}>Gross: </span>
                              <strong style={{ color: '#0f172a' }}>{formatINR(towerGross)}</strong>
                            </div>
                            <div style={{ borderLeft: '1px solid #e2e8f0', height: '14px' }} />
                            <div>
                              <span style={{ color: '#64748b' }}>Net: </span>
                              <strong style={{ color: '#16a34a' }}>{formatINR(towerNet)}</strong>
                            </div>
                            <div style={{ borderLeft: '1px solid #e2e8f0', height: '14px' }} />
                            <div>
                              <span style={{ color: '#64748b' }}>Paid: </span>
                              <strong style={{ color: '#0284c7' }}>{formatINR(towerPaid)}</strong>
                            </div>
                            <div style={{ borderLeft: '1px solid #e2e8f0', height: '14px' }} />
                            <div>
                              <span style={{ color: '#64748b' }}>Balance: </span>
                              <strong style={{ color: '#d97706' }}>{formatINR(towerOutstanding)}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setImportTargetTower(towerName);
                                setIsImportRentalModalOpen(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                              title={`Import Excel register specifically into ${towerName}`}
                            >
                              <Upload size={13} color="#2563eb" />
                              <span>Import into {towerName}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsManualEntryModalOpen(true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: towerName === 'Tower B' ? '#2563eb' : '#17652f',
                                color: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                              }}
                              title={`Manually enroll a unit into ${towerName}`}
                            >
                              <Plus size={13} />
                              <span>Add Unit</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tower Table Body */}
                      {towerUnitCount === 0 ? (
                        <div style={{
                          padding: '48px 24px',
                          textAlign: 'center',
                          background: 'radial-gradient(ellipse at top, #f8fafc 0%, #ffffff 100%)',
                          borderTop: '1px solid #f1f5f9'
                        }}>
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '14px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 16px',
                              boxShadow: '0 4px 12px rgba(37,99,235,0.12)'
                            }}
                          >
                            <Building2 size={28} />
                          </div>
                          <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                            {towerName} Rental Register Ready for Enrollment
                          </h4>
                          <p style={{ margin: '0 auto 20px', maxWidth: '520px', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.6 }}>
                            Enroll units into <strong>{towerName}</strong> individually or upload the complete Excel register.
                            All records in {towerName} are completely isolated and guaranteed not to overwrite or affect Tower A.
                          </p>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setImportTargetTower(towerName);
                                setIsImportRentalModalOpen(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Upload size={15} />
                              <span>Import {towerName} Register (.xlsx)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsManualEntryModalOpen(true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 18px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <Plus size={15} />
                              <span>Add Single Unit</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Tower Single Flat Table (Direct Table - No Accordion Scaffolding) */
                        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1360px' }}>
                            {renderActiveTableHead()}
                            <tbody>
                              {towerFlats.map((r, idx) => renderActiveRentalRow(r, idx))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* 5. TABLE 2: PREVIOUS OWNERS TRAIL (HISTORICAL OWNERSHIP) */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                  Resale history
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                  Archived records from ownership transfers and past rental terms.
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#17652f', background: '#e8f2e5', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                {sortedHistoryRecords.length} records
              </span>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '24px' }}>
                <TableSkeleton rows={6} columns={11} />
              </div>
            ) : sortedHistoryRecords.length === 0 ? (
              <EmptyState
                icon={History}
                title="No resale records found"
                description="When flats are transferred or resold, historical owner records will appear here."
              />
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1250px' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.78rem', fontWeight: 500 }}>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Flat</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500 }}>Sequence</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Previous owner</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Documents</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500 }}>Registry date</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Monthly rent</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500 }}>TDS</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Net payout</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500 }}>Start date</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500 }}>Transfer date</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Tenure</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>Total disbursed</th>
                      <th style={{ padding: '12px 16px', fontWeight: 500 }}>Transferred to</th>
                      <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistoryRecords.map((h, idx) => (
                      <tr
                        key={h.historyId || idx}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: '0.82rem'
                        }}
                      >
                        {/* Flat No */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, color: '#111827' }}>
                          {h.flatNumber}
                        </td>

                        {/* Sequence */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <span style={{
                            background: '#f3f4f6',
                            color: '#374151',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {h.sequenceLabel}
                          </span>
                        </td>

                        {/* Previous Owner Name */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 500, color: '#111827' }}>{renderCellData(h.previousOwnerName)}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>{renderCellData(h.mobileNo)}</div>
                        </td>

                        {/* Archived Documents */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {h.registryDocument?.fileUrl ? (
                            <a
                              href={getFileUrl(h.registryDocument.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                color: '#17652f',
                                background: '#e8f2e5',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textDecoration: 'none'
                              }}
                            >
                              <ShieldCheck size={12} /> Registry
                            </a>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>None</span>
                          )}
                        </td>

                        {/* Registry Date */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                          {formatDate(h.registryDate)}
                        </td>

                        {/* Rent Amount */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
                          {formatINR(h.rentAmount)}
                        </td>

                        {/* TDS Applied */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          {h.applyTds ? (
                            <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                              {h.tdsPercentage}%
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>None</span>
                          )}
                        </td>

                        {/* Net Rent */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#17652f' }}>
                          {formatINR(h.netAmount)}
                        </td>

                        {/* Payment Start Date */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                          {formatDate(h.startDate)}
                        </td>

                        {/* Transfer Date */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#17652f', fontWeight: 500 }}>
                          {formatDate(h.transferDate)}
                        </td>

                        {/* Tenure */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <span style={{ background: '#f3f4f6', color: '#475569', fontSize: '0.74rem', fontWeight: 500, padding: '2px 6px', borderRadius: '4px' }}>
                            {h.tenureMonths} mos
                          </span>
                        </td>

                        {/* Total Rent Disbursed */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#17652f' }}>
                          {formatINR(h.totalRentPaid)}
                        </td>

                        {/* Transferred To */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowRight size={12} color="#17652f" />
                            <span>{renderCellData(h.transferredTo)}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {canDeleteRental && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryEntry(h)}
                              title="Delete history entry"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                color: '#dc2626',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. MODALS */}
        {/* ========================================================================= */}

        {/* FLAT DOCUMENTS HUB MODAL */}
        <FlatDocumentsModal
          isOpen={!!selectedFlatForDocs}
          onClose={() => setSelectedFlatForDocs(null)}
          flat={selectedFlatForDocs}
          onUpdated={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
          }}
        />

        {/* EDIT RENTAL TERMS MODAL */}
        <EditRentalTermsModal
          isOpen={!!selectedRentalForEdit}
          onClose={() => setSelectedRentalForEdit(null)}
          rental={selectedRentalForEdit}
          onUpdated={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
          }}
        />

        {/* RECORD PAYOUT MODAL */}
        <RecordPayoutModal
          isOpen={!!selectedRentalForPayout}
          onClose={() => setSelectedRentalForPayout(null)}
          rental={selectedRentalForPayout}
          onUpdated={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
          }}
        />

        {/* TRANSFER OWNERSHIP MODAL */}
        <TransferOwnershipModal
          isOpen={!!selectedRentalForTransfer}
          onClose={() => setSelectedRentalForTransfer(null)}
          rental={selectedRentalForTransfer}
          onTransferred={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
          }}
        />

        {/* MANUAL RENTAL ENTRY MODAL */}
        <ManualRentalEntryModal
          isOpen={isManualEntryModalOpen}
          onClose={() => setIsManualEntryModalOpen(false)}
          initialTower={selectedTower !== 'all' ? selectedTower : undefined}
          onSuccess={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
            toast.showSuccess('Flat enrolled into active rental register!');
          }}
        />

        {/* IMPORT RENTAL REGISTER BY EXCEL MODAL */}
        <ImportRentalModal
          isOpen={isImportRentalModalOpen}
          onClose={() => setIsImportRentalModalOpen(false)}
          initialTower={importTargetTower || (selectedTower !== 'all' ? selectedTower : 'Tower A')}
          availableTowers={availableTowers}
          onSuccess={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
            toast.showSuccess('Rental register updated from Excel!');
          }}
        />

        {/* BULK DOCUMENTS (REGISTRY / AGREEMENT) UPLOAD MODAL */}
        <BulkRentalDocumentsModal
          isOpen={isBulkDocumentsModalOpen}
          onClose={() => setIsBulkDocumentsModalOpen(false)}
          flats={activeRentals}
          onUpdated={() => {
            fetchActiveRentals();
            fetchPreviousOwnersHistory();
          }}
        />

      </div>
      );
};

      export default RentalManagementPage;
