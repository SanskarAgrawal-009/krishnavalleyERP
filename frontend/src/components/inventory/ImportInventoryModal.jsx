import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Home,
  User,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  RefreshCw,
  Trash2,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';

export const ImportInventoryModal = ({
  isOpen,
  onClose,
  projects = [],
  defaultProjectId = '',
  initialCategory = 'sold',
  onImportSuccess
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || (projects[0]?._id || projects[0]?.id || ''));
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'sold');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Sync default project if changed
  React.useEffect(() => {
    if (defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id || projects[0].id);
    }
  }, [defaultProjectId, projects]);

  // Reset state on modal open
  React.useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory || 'sold');
      setFile(null);
      setFileName('');
      setPreviewRows([]);
      setRawRows([]);
      setImportResult(null);
      setErrorMsg('');
    }
  }, [isOpen, initialCategory]);

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Safe helper to find key in row
  const getRowVal = (row, ...aliases) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    for (const alias of aliases) {
      if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
        return row[alias];
      }
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlias);
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
        return row[matchedKey];
      }
    }
    return '';
  };

  const cleanNumeric = (val, defaultVal = 0) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? defaultVal : n;
  };

  const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = val * 86400 * 1000;
      const d = new Date(excelEpoch.getTime() + ms);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      if (!s) return null;
      const dmyMatch = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const inferFloorFromFlat = (flatStr) => {
    if (!flatStr) return 0;
    const s = flatStr.toString().trim();
    if (/^G/i.test(s) || /ground/i.test(s)) return 0;
    const digits = s.replace(/\D/g, '');
    if (!digits) return 0;
    if (digits.startsWith('0')) return 0;
    if (digits.length >= 3) {
      const fl = parseInt(digits.slice(0, -2), 10);
      return isNaN(fl) ? 0 : fl;
    }
    const single = parseInt(digits[0], 10);
    return isNaN(single) ? 0 : single;
  };

  // Process File Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setErrorMsg('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setErrorMsg('The selected spreadsheet contains no data rows.');
          return;
        }

        setRawRows(rows);

        // Normalize rows for preview
        const normalized = rows.map((r, i) => {
          const flatNo = String(getRowVal(r, 'flat no', 'flat_no', 'flat no.', 'flat number', 'unit no', 'unit', 'flat')).trim();
          const rawFloor = getRowVal(r, 'floor', 'floor no', 'floor_no', 'floor number');
          const floor = (rawFloor !== '' && rawFloor !== undefined && rawFloor !== null) ? cleanNumeric(rawFloor, 0) : inferFloorFromFlat(flatNo);
          const building = String(getRowVal(r, 'building', 'tower', 'building name', 'block', 'wing') || 'Tower A').trim();
          
          // Current / Primary Owner
          const ownerName = String(getRowVal(r, 'owner name', 'owner_name', 'owner', 'buyer name', 'customer name', 'name', 'current owner name', 'new owner')).trim();
          const ownerMobile = String(getRowVal(r, 'owner mobile', 'owner phone', 'mobile', 'phone', 'contact', 'current owner phone')).trim();

          // Previous / Historical Owner Fields
          const prevOwnerName = String(getRowVal(r, 'previous owner name', 'previous owner', 'old owner', 'seller name', 'old owner name')).trim();
          const prevOwnerPhone = String(getRowVal(r, 'previous owner phone', 'previous mobile', 'old phone', 'seller phone')).trim();
          const prevOwnerEmail = String(getRowVal(r, 'previous owner email', 'old email', 'seller email')).trim();
          
          const rawPurchaseDate = getRowVal(r, 'previous purchase date', 'original purchase date', 'purchase date', 'original date', 'start date', 'old agreement date');
          const purchaseDate = parseExcelDate(rawPurchaseDate);

          const rawTransferDate = getRowVal(r, 'transfer date', 'ownership transfer date', 'exit date', 'buyback date', 'resale date', 'end date', 'date of transfer');
          const transferDate = parseExcelDate(rawTransferDate);

          const rawReason = getRowVal(r, 'transfer reason', 'reason', 'type', 'event', 'transfer type');
          const transferReason = String(rawReason || 'Resale').trim();

          const rawTransferValue = getRowVal(r, 'transfer deal value', 'historical valuation', 'historical deal value', 'buyback price', 'resale price', 'deal value');
          const transferDealValue = cleanNumeric(rawTransferValue, 0);

          const rawPrePossessionPaid = getRowVal(r, 'pre-possession rent paid', 'pre possession rent paid', 'pre possession total paid', 'prepossession amount');
          const prePossessionPaid = cleanNumeric(rawPrePossessionPaid, 0);

          const remarks = String(getRowVal(r, 'remarks', 'notes', 'comments', 'transfer remarks', 'audit trail')).trim();

          const rawAgreementDate = getRowVal(r, 'date of aggreement', 'date of agreement', 'agreement date', 'booking date');
          const agreementDate = parseExcelDate(rawAgreementDate);

          const rawRentalStart = getRowVal(r, 'date of the rental starts', 'rental start date', 'rental start', 'start date');
          const rentalStartDate = parseExcelDate(rawRentalStart) || agreementDate;

          // Tenure: default to 36 if empty, blank, or 0
          const rawTenure = getRowVal(r, 'tenure', 'tenure (months)', 'tenure months', 'lease tenure', 'duration');
          let tenure = cleanNumeric(rawTenure, 36);
          if (tenure <= 0) tenure = 36;

          // Monthly Rent
          const rawMonthlyRent = getRowVal(r, 'amount per month', 'monthly rent', 'rent per month', 'monthly amount', 'rent');
          const monthlyRent = cleanNumeric(rawMonthlyRent, 0);

          // Total Tenure Amount: auto-calculated as monthlyRent * tenure if blank
          const rawTotalTenureAmount = getRowVal(r, 'amount for the total tenure', 'total tenure amount', 'total amount', 'total rental amount', 'total rent');
          let totalTenureAmount = cleanNumeric(rawTotalTenureAmount, 0);
          if (totalTenureAmount <= 0 && monthlyRent > 0) {
            totalTenureAmount = monthlyRent * tenure;
          }

          // Sales Deal Price & Previous Payments
          const rawDealPrice = getRowVal(r, 'agreed deal price', 'deal price', 'sale price', 'total price', 'flat price', 'base price');
          let agreedDealPrice = cleanNumeric(rawDealPrice, 0);
          if (agreedDealPrice <= 0) {
            agreedDealPrice = totalTenureAmount > 0 ? totalTenureAmount * 3 : 4500000;
          }

          const rawPaidAmount = getRowVal(r, 'previous payment', 'previous payments', 'paid amount', 'amount paid', 'booking amount', 'advance paid', 'token amount', 'payment made');
          let previousPaidAmount = cleanNumeric(rawPaidAmount, 0);
          if (previousPaidAmount <= 0 && rawPaidAmount === '') {
            previousPaidAmount = Math.min(agreedDealPrice, 100000);
          }

          const bhkType = String(getRowVal(r, 'flat type', 'bhk type', 'type', 'bhk') || '2BHK').trim();

          return {
            rowNumber: i + 2,
            flatNo,
            floor,
            building,
            ownerName: ownerName || '—',
            ownerMobile: ownerMobile || '—',
            prevOwnerName: prevOwnerName || '—',
            prevOwnerPhone: prevOwnerPhone || '—',
            prevOwnerEmail: prevOwnerEmail || '—',
            purchaseDate: purchaseDate ? purchaseDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            transferDate: transferDate ? transferDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            transferReason: transferReason || 'Resale',
            transferDealValue,
            prePossessionPaid,
            remarks: remarks || '—',
            agreementDate: agreementDate ? agreementDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            rentalStartDate: rentalStartDate ? rentalStartDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            tenure,
            monthlyRent,
            totalTenureAmount,
            agreedDealPrice,
            previousPaidAmount,
            bhkType,
            isValid: !!flatNo
          };
        });

        setPreviewRows(normalized);
      } catch (err) {
        console.error('Error parsing excel:', err);
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Download Sample Template for Selected Category
  const handleDownloadTemplate = () => {
    const invCols = [
      { wch: 10 }, // Flat No
      { wch: 12 }, // Tower
      { wch: 8 },  // Floor
      { wch: 28 }, // Owner Name
      { wch: 16 }, // Owner Mobile
      { wch: 18 }, // Flat Type
      { wch: 14 }, // Carpet Area
      { wch: 18 }, // Super Builtup Area
      { wch: 18 }, // Agreed Deal Price
      { wch: 18 }, // Previous Payments
      { wch: 18 }, // Date of Agreement
      { wch: 22 }, // Date of the Rental Starts
      { wch: 16 }, // Tenure (Months)
      { wch: 18 }, // Amount Per Month
      { wch: 12 }, // TDS
      { wch: 14 }, // Net Amount
      { wch: 24 }, // Amount for the Total Tenure
      { wch: 20 }  // Status
    ];

    const histCols = [
      { wch: 10 }, // Flat No
      { wch: 12 }, // Tower
      { wch: 8 },  // Floor
      { wch: 28 }, // Previous Owner Name
      { wch: 18 }, // Previous Owner Mobile
      { wch: 24 }, // Previous Owner Email
      { wch: 14 }, // Previous Owner PAN
      { wch: 16 }, // Previous Owner Aadhaar
      { wch: 16 }, // Original Purchase Date
      { wch: 16 }, // Ownership Transfer Date
      { wch: 22 }, // Transfer Reason
      { wch: 18 }, // Historical Valuation
      { wch: 18 }, // Historical Paid Amount
      { wch: 30 }, // Total Rent Paid to Previous Owner
      { wch: 22 }, // Monthly Rent
      { wch: 16 }, // Paid Months
      { wch: 28 }, // Current Owner Name
      { wch: 18 }, // Current Owner Mobile
      { wch: 55 }  // Remarks
    ];

    const workbook = XLSX.utils.book_new();

    if (activeCategory === 'previous_owners') {
      const prevOwnerData = [
        {
          'Flat No': '105',
          'Tower': 'Tower A',
          'Floor': 1,
          'Previous Owner Name': 'Shakuntla Gupta',
          'Previous Owner Mobile': '+91 9800000105',
          'Previous Owner Email': 'shakuntla.gupta@example.com',
          'Previous Owner PAN': 'ABCDE1234F',
          'Previous Owner Aadhaar': '123456789012',
          'Original Purchase Date': '13/03/2014',
          'Ownership Transfer Date': '14/10/2025',
          'Transfer Reason': 'Resale',
          'Historical Valuation': 1600000,
          'Historical Paid Amount': 1600000,
          'Total Rent Paid to Previous Owner (₹)': 1600000,
          'Previous Owner Monthly Rent (₹)': 16000,
          'Previous Owner Paid Months': 100,
          'Current Owner Name': 'MADAN GOPAL SARASWAT',
          'Current Owner Mobile': '+91 9800000105',
          'Remarks': 'Flat A-105: Prior owner Shakuntla Gupta received 100-Mo Rent (₹16,00,000) prior to resale to Madan Gopal Saraswat'
        },
        {
          'Flat No': '612',
          'Tower': 'Tower A',
          'Floor': 6,
          'Previous Owner Name': 'Uma Shankar Prasad Singh',
          'Previous Owner Mobile': '+91 9800000612',
          'Previous Owner Email': 'umashankar@example.com',
          'Previous Owner PAN': 'FGHIJ5678K',
          'Previous Owner Aadhaar': '987654321098',
          'Original Purchase Date': '15/06/2015',
          'Ownership Transfer Date': '10/06/2025',
          'Transfer Reason': 'Possession Renewal',
          'Historical Valuation': 2150000,
          'Historical Paid Amount': 5500000,
          'Total Rent Paid to Previous Owner (₹)': 2150000,
          'Previous Owner Monthly Rent (₹)': 21500,
          'Previous Owner Paid Months': 100,
          'Current Owner Name': 'Uma Shankar Prasad Singh',
          'Current Owner Mobile': '+91 9800000612',
          'Remarks': 'Flat A-612: Pre-Possession Guaranteed Rent (100mo @ ₹21,500/mo, Total: ₹21,50,000) expired/renewed to Post-Possession Rate (@ ₹11,000/mo)'
        },
        {
          'Flat No': '001',
          'Tower': 'Tower A',
          'Floor': 0,
          'Previous Owner Name': 'Ved Prakash Agarwal',
          'Previous Owner Mobile': '+91 9897123456',
          'Previous Owner Email': 'vedprakash@example.com',
          'Previous Owner PAN': 'KLMNO9012P',
          'Previous Owner Aadhaar': '456789012345',
          'Original Purchase Date': '14/06/2024',
          'Ownership Transfer Date': '20/07/2025',
          'Transfer Reason': 'Buy Back',
          'Historical Valuation': 5000000,
          'Historical Paid Amount': 5000000,
          'Total Rent Paid to Previous Owner (₹)': 310000,
          'Previous Owner Monthly Rent (₹)': 31000,
          'Previous Owner Paid Months': 10,
          'Current Owner Name': 'Suresh Mehta',
          'Current Owner Mobile': '+91 9811223344',
          'Remarks': 'Flat A-001: Repurchased by developer after 10 months rent payout (₹3,10,000) and transferred to Suresh Mehta'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(prevOwnerData);
      ws['!cols'] = histCols;
      XLSX.utils.book_append_sheet(workbook, ws, 'Previous_Owners');
      XLSX.writeFile(workbook, 'Krishna_Valley_Previous_Owners_Template.xlsx');

    } else if (activeCategory === 'resell') {
      const invData = [
        {
          'Flat No': '105',
          'Tower': 'Tower A',
          'Floor': 1,
          'Owner Name': 'MADAN GOPAL SARASWAT',
          'Owner Mobile': '+91 9800000105',
          'Flat Type': 'Service Apartment',
          'Carpet Area': 850,
          'Super Builtup Area': 1150,
          'Agreed Deal Price': 5500000,
          'Previous Payments': 5500000,
          'Date of Agreement': '14/10/2025',
          'Date of the Rental Starts': '25/11/2025',
          'Tenure (Months)': 48,
          'Amount Per Month': 31000,
          'TDS': 0,
          'Net Amount': 31000,
          'Amount for the Total Tenure': 1488000,
          'Status': 'Resell'
        }
      ];
      const histData = [
        {
          'Flat No': '105',
          'Tower': 'Tower A',
          'Floor': 1,
          'Previous Owner Name': 'Shakuntla Gupta',
          'Previous Owner Mobile': '+91 9800000105',
          'Previous Owner Email': 'shakuntla.gupta@example.com',
          'Previous Owner PAN': 'ABCDE1234F',
          'Previous Owner Aadhaar': '123456789012',
          'Original Purchase Date': '13/03/2014',
          'Ownership Transfer Date': '14/10/2025',
          'Transfer Reason': 'resale',
          'Historical Valuation': 1600000,
          'Historical Paid Amount': 1600000,
          'Pre-Possession Rent Paid': 0,
          'Current Owner Name': 'MADAN GOPAL SARASWAT',
          'Current Owner Mobile': '+91 9800000105',
          'Remarks': 'Flat A-105: Prior owner Shakuntla Gupta resold to MADAN GOPAL SARASWAT'
        }
      ];
      const wsInv = XLSX.utils.json_to_sheet(invData);
      wsInv['!cols'] = invCols;
      XLSX.utils.book_append_sheet(workbook, wsInv, 'Site_Inventory');

      const wsHist = XLSX.utils.json_to_sheet(histData);
      wsHist['!cols'] = histCols;
      XLSX.utils.book_append_sheet(workbook, wsHist, 'Ownership_History');
      XLSX.writeFile(workbook, 'Krishna_Valley_Resell_Inventory_Template.xlsx');

    } else if (activeCategory === 'possession_renewal') {
      const invData = [
        {
          'Flat No': '612',
          'Tower': 'Tower A',
          'Floor': 6,
          'Owner Name': 'Uma Shankar Prasad Singh',
          'Owner Mobile': '+91 9800000612',
          'Flat Type': 'Service Apartment',
          'Carpet Area': 850,
          'Super Builtup Area': 1150,
          'Agreed Deal Price': 5500000,
          'Previous Payments': 5500000,
          'Date of Agreement': '15/06/2015',
          'Date of the Rental Starts': '10/06/2025',
          'Tenure (Months)': 36,
          'Amount Per Month': 11000,
          'TDS': 1100,
          'Net Amount': 9900,
          'Amount for the Total Tenure': 356400,
          'Status': 'Possession Renewal'
        }
      ];
      const histData = [
        {
          'Flat No': '612',
          'Tower': 'Tower A',
          'Floor': 6,
          'Previous Owner Name': 'Uma Shankar Prasad Singh',
          'Previous Owner Mobile': '+91 9800000612',
          'Previous Owner Email': 'umashankar@example.com',
          'Previous Owner PAN': 'FGHIJ5678K',
          'Previous Owner Aadhaar': '987654321098',
          'Original Purchase Date': '15/06/2015',
          'Ownership Transfer Date': '10/06/2025',
          'Transfer Reason': 'possession_renewal',
          'Historical Valuation': 2150000,
          'Historical Paid Amount': 5500000,
          'Pre-Possession Rent Paid': 2150000,
          'Current Owner Name': 'Uma Shankar Prasad Singh',
          'Current Owner Mobile': '+91 9800000612',
          'Remarks': 'Flat A-612: Pre-Possession Contract (100mo @ ₹21,500/mo, Total: ₹21,50,000) expired/renewed to Post-Possession Rate (@ ₹11,000/mo)'
        }
      ];
      const wsInv = XLSX.utils.json_to_sheet(invData);
      wsInv['!cols'] = invCols;
      XLSX.utils.book_append_sheet(workbook, wsInv, 'Site_Inventory');

      const wsHist = XLSX.utils.json_to_sheet(histData);
      wsHist['!cols'] = histCols;
      XLSX.utils.book_append_sheet(workbook, wsHist, 'Ownership_History');
      XLSX.writeFile(workbook, 'Krishna_Valley_Possession_Renewal_Template.xlsx');

    } else {
      // Standard Sold Inventory
      const invData = [
        {
          'Flat No': '001',
          'Tower': 'Tower A',
          'Floor': 0,
          'Owner Name': 'Ved Prakash Agarwal',
          'Owner Mobile': '+91 9897123456',
          'Flat Type': 'Service Apartment',
          'Carpet Area': 850,
          'Super Builtup Area': 1150,
          'Agreed Deal Price': 5500000,
          'Previous Payments': 5500000,
          'Date of Agreement': '14/06/2025',
          'Date of the Rental Starts': '25/07/2025',
          'Tenure (Months)': 36,
          'Amount Per Month': 31000,
          'TDS': 3100,
          'Net Amount': 27900,
          'Amount for the Total Tenure': 1004400,
          'Status': 'Sold'
        }
      ];
      const wsInv = XLSX.utils.json_to_sheet(invData);
      wsInv['!cols'] = invCols;
      XLSX.utils.book_append_sheet(workbook, wsInv, 'Site_Inventory');
      XLSX.writeFile(workbook, 'Krishna_Valley_Sold_Inventory_Template.xlsx');
    }
  };

  // Submit Import to Backend
  const handleConfirmImport = async () => {
    if (!file && rawRows.length === 0) {
      alert('Please select an Excel file to import.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      let res;
      if (activeCategory === 'previous_owners') {
        if (file) {
          const formData = new FormData();
          formData.append('excelFile', file);
          if (selectedProjectId) formData.append('projectId', selectedProjectId);
          res = await projectService.importOwnershipHistory(formData);
        } else {
          res = await projectService.importOwnershipHistory({
            projectId: selectedProjectId,
            items: rawRows
          });
        }
      } else {
        if (file) {
          const formData = new FormData();
          formData.append('excelFile', file);
          if (selectedProjectId) formData.append('projectId', selectedProjectId);
          res = await projectService.importFlatsExcel(formData);
        } else {
          res = await projectService.importFlatsExcel({
            projectId: selectedProjectId,
            items: rawRows
          });
        }
      }

      if (res.success && res.data) {
        setImportResult(res.data);
        if (onImportSuccess) onImportSuccess(res.data);
      } else {
        setErrorMsg(res.message || 'Import failed.');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'An error occurred while importing inventory.');
    } finally {
      setLoading(false);
    }
  };

  const validRowCount = previewRows.filter((r) => r.isValid).length;
  const invalidRowCount = previewRows.length - validRowCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excel Bulk Import: Inventory, Owners & 3-Year Guaranteed Rentals"
      maxWidth="1020px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Type Selector Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: '#f1f5f9',
          padding: '6px',
          borderRadius: '10px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'sold', label: '1. Standard Sold Inventory', color: '#16a34a', bg: '#dcfce7' },
            { id: 'resell', label: '2. Resell Inventory & History', color: '#7c3aed', bg: '#f3e8ff' },
            { id: 'possession_renewal', label: '3. Possession Renewal & Prior Contracts', color: '#059669', bg: '#ecfdf5' },
            { id: 'previous_owners', label: '4. Previous Owners Dossier', color: '#0284c7', bg: '#e0f2fe' },
          ].map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  flex: '1 1 200px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: isSelected ? `2px solid ${cat.color}` : '1px solid transparent',
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? cat.color : '#64748b',
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Top Instructions Banner */}
        <div style={{
          background: activeCategory === 'previous_owners' ? '#f0f9ff' : (activeCategory === 'resell' ? '#fbf7ff' : (activeCategory === 'possession_renewal' ? '#f0fdf9' : '#f0fdf4')),
          border: `1px solid ${activeCategory === 'previous_owners' ? '#bae6fd' : (activeCategory === 'resell' ? '#ddd6fe' : (activeCategory === 'possession_renewal' ? '#a7f3d0' : '#bbf7d0'))}`,
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <FileSpreadsheet size={24} color={activeCategory === 'previous_owners' ? '#0284c7' : (activeCategory === 'resell' ? '#7c3aed' : (activeCategory === 'possession_renewal' ? '#059669' : '#16a34a'))} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: activeCategory === 'previous_owners' ? '#0369a1' : (activeCategory === 'resell' ? '#5b21b6' : (activeCategory === 'possession_renewal' ? '#065f46' : '#166534')) }}>
                {activeCategory === 'previous_owners'
                  ? 'Upload Previous Owners Dossier & Historical Title Transfers'
                  : (activeCategory === 'resell'
                    ? 'Upload Resell Units & Prior Ownership Archive'
                    : (activeCategory === 'possession_renewal'
                      ? 'Upload Post-Possession Renewals & Initial 100-Mo Contracts'
                      : 'Upload Standard Sold Units & 3-Year Rent-Backs'))}
              </div>
              <div style={{ fontSize: '0.78rem', color: activeCategory === 'previous_owners' ? '#0284c7' : (activeCategory === 'resell' ? '#6b21a8' : (activeCategory === 'possession_renewal' ? '#047857' : '#15803d')), marginTop: '2px' }}>
                {activeCategory === 'previous_owners'
                  ? 'Key columns: Flat No, Tower, Floor, Previous Owner Name, Phone, Purchase Date, Transfer Date, Reason, Historical Valuation, Pre-Possession Rent Paid, Remarks.'
                  : 'Required columns: Flat No, Tower, Floor, Owner Name, Date of Agreement, Rental Starts, Tenure, Amount Per Month, TDS, Net Amount, Status.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: activeCategory === 'previous_owners' ? '#0284c7' : (activeCategory === 'resell' ? '#7c3aed' : (activeCategory === 'possession_renewal' ? '#059669' : '#16a34a')),
              border: `1.5px solid ${activeCategory === 'previous_owners' ? '#0284c7' : (activeCategory === 'resell' ? '#7c3aed' : (activeCategory === 'possession_renewal' ? '#059669' : '#16a34a'))}`,
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={15} /> Download {activeCategory === 'previous_owners' ? 'Previous Owners' : (activeCategory === 'resell' ? 'Resell' : (activeCategory === 'possession_renewal' ? 'Renewal' : 'Sold'))} Template
          </button>
        </div>

        {/* Project Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="#2563eb" /> Target Project / Site:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#0f172a',
              minWidth: '240px',
              backgroundColor: '#ffffff'
            }}
          >
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.projectName} ({p.projectCode || 'KV'})
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop File Upload Zone */}
        {!previewRows.length && !importResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
            }}
            style={{
              border: '2px dashed #94a3b8',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
            />
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={28} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                Click to browse or drag & drop your {activeCategory === 'previous_owners' ? 'Previous Owners Dossier' : 'Excel sheet'} here
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> spreadsheets
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Result Summary */}
        {importResult && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#166534' }}>
                  {activeCategory === 'previous_owners' ? 'Previous Owners Dossier Successfully Imported!' : 'Inventory Import Successfully Completed!'}
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '2px' }}>
                  {importResult.totalRows} row(s) processed with complete database synchronization.
                </div>
              </div>
            </div>

            {/* Metrics Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {importResult.historyRecordsAppended !== undefined ? (
                <>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0284c7' }}>{importResult.historyRecordsAppended}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>HISTORICAL RECORDS ADDED</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534' }}>{importResult.flatsUpdated}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>FLATS PROCESSED</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#7c3aed' }}>{importResult.activeOwnersUpdated || 0}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>ACTIVE OWNERS UPDATED</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534' }}>{importResult.createdFlats}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>NEW FLATS CREATED</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2563eb' }}>{importResult.updatedFlats}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>FLATS UPDATED</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#9333ea' }}>{importResult.createdOwners}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>OWNERS REGISTERED</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706' }}>{importResult.createdRentals}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>RENT-BACK CONTRACTS</div>
                  </div>
                </>
              )}
            </div>

            {/* Error logs if any */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>
                  Warnings / Skipped Rows:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: '#b45309' }}>
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 20px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close & View Inventory
              </button>
            </div>
          </div>
        )}

        {/* Data Preview Table */}
        {previewRows.length > 0 && !importResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} color="#2563eb" />
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                  {fileName}
                </span>
                <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                  {validRowCount} valid row{validRowCount !== 1 ? 's' : ''} detected
                </span>
                {invalidRowCount > 0 && (
                  <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    {invalidRowCount} skipped (missing flat no)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFileName('');
                  setPreviewRows([]);
                  setRawRows([]);
                }}
                style={{
                  padding: '5px 10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={13} /> Change File
              </button>
            </div>

            {/* Scrollable Table Container */}
            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              {activeCategory === 'previous_owners' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>#</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Flat No</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Floor</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Building</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Previous Owner</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Original Date</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Transfer Date</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Reason</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Historical Valuation</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Pre-Possession Rent</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Current Owner</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          opacity: r.isValid ? 1 : 0.5
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: '600' }}>{r.rowNumber}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#0f172a' }}>
                          {r.flatNo || <span style={{ color: '#ef4444' }}>Missing</span>}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#334155' }}>Floor {r.floor}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#2563eb' }}>{r.building}</td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '700' }}>
                          {r.prevOwnerName !== '—' ? r.prevOwnerName : (r.ownerName || '—')}
                          {r.prevOwnerPhone !== '—' && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>{r.prevOwnerPhone}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{r.purchaseDate}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{r.transferDate}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {r.transferReason}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '700' }}>
                          {formatINR(r.transferDealValue)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#059669', fontWeight: '700' }}>
                          {r.prePossessionPaid > 0 ? formatINR(r.prePossessionPaid) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#334155', fontWeight: '600' }}>
                          {r.ownerName !== '—' ? r.ownerName : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.remarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>#</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Flat No</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Floor</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Building</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Owner Name</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Deal Price</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Previous Payment</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Agreement Date</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Rental Starts</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Tenure</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Monthly Rent</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          opacity: r.isValid ? 1 : 0.5
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: '600' }}>{r.rowNumber}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#0f172a' }}>
                          {r.flatNo || <span style={{ color: '#ef4444' }}>Missing</span>}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#334155' }}>Floor {r.floor}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#2563eb' }}>{r.building}</td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '600' }}>
                          {r.ownerName}
                          {r.ownerMobile !== '—' && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.ownerMobile}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '600' }}>
                          {formatINR(r.agreedDealPrice)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: '700' }}>
                          {formatINR(r.previousPaidAmount)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{r.agreementDate}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{r.rentalStartDate}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '700', color: '#7c3aed' }}>
                          {r.tenure} Mo
                          {r.tenure === 36 && (
                            <span style={{ fontSize: '0.65rem', background: '#f3e8ff', color: '#7c3aed', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px' }}>
                              Default
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#16a34a' }}>
                          {formatINR(r.monthlyRent)}/mo
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#7e22ce' }}>
                          {formatINR(r.totalTenureAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Action Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Total <strong>{validRowCount}</strong> unit records will be imported into MongoDB.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding: '9px 18px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading || validRowCount === 0}
                  style={{
                    padding: '9px 24px',
                    background: '#16a34a',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    color: '#ffffff',
                    cursor: loading || validRowCount === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Importing Records...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Confirm &amp; Import ({validRowCount} Flats)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
