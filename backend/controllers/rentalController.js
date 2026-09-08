import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import apiCache from '../utils/cacheManager.js';

// Helper: Universal date parser to recover from Excel serials or any corrupt date
export function parseAnyDate(val) {
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

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }

  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
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
}

// Helper: Calculate payment end date from start date and tenure in months
function calculateEndDate(startDate, tenureMonths) {
  const parsedStart = parseAnyDate(startDate);
  if (!parsedStart) return null;
  const d = new Date(parsedStart);
  d.setMonth(d.getMonth() + Number(tenureMonths || 36));
  return d;
}

// ============================================================================
// 1. GET ACTIVE RENTALS (TABLE 1: CURRENT OWNERS)
// ============================================================================
export const getActiveRentals = async (req, res) => {
  try {
    const { search, tenure, tower, page = 1, limit = 1000 } = req.query;

    // Filter flats enrolled in rental or sold/booked
    const query = {
      $or: [
        { takenForRental: true },
        { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
        { status: { $in: ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'] } }
      ]
    };

    if (tower) {
      query.flatNumber = new RegExp(`^${tower}`, 'i');
    }

    const flats = await Flat.find(query)
      .populate('projectId', 'projectName projectCode')
      .populate('currentOwner.customerId', 'name mobileNo email panNumber aadhaarNumber address')
      .sort({ flatNumber: 1 })
      .lean();

    const activeList = flats.map((flat) => {
      const rental = flat.rentalDetails || {};
      const owner = flat.currentOwner || {};
      const linkedCustomer = owner.customerId || {};

      const ownerName = owner.name || linkedCustomer.name || 'Unassigned';
      const cleanField = (val) => (!val || val === '—' || val === '-' || val === 'On File' ? null : String(val).trim());
      const ownerMobile = cleanField(owner.mobileNo) || cleanField(linkedCustomer.mobileNo) || null;
      const ownerEmail = cleanField(owner.email) || cleanField(linkedCustomer.email) || null;
      const ownerPan = cleanField(owner.panNumber) || cleanField(linkedCustomer.panNumber) || null;
      const ownerAadhaar = cleanField(owner.aadhaarNumber) || cleanField(linkedCustomer.aadhaarNumber) || null;

      const rawReg = rental.mouDate || flat.salesDetails?.agreementDate || owner.ownershipStartDate || null;
      const registryDate = parseAnyDate(rawReg);
      const rentAmount = Number(rental.guaranteedMonthlyRent) || 0;
      const applyTds = rental.applyTds !== false;
      const tdsMode = rental.tdsMode || 'percentage';
      let tdsPercentage = Number(rental.tdsPercentage ?? 10);
      let tdsAmount = 0;

      if (!applyTds) {
        tdsPercentage = 0;
        tdsAmount = 0;
      } else if (tdsMode === 'amount' && rental.tdsAmount !== undefined && rental.tdsAmount !== null) {
        tdsAmount = Math.max(0, Number(rental.tdsAmount) || 0);
        tdsPercentage = rentAmount > 0 ? Number(((tdsAmount / rentAmount) * 100).toFixed(2)) : 0;
      } else {
        tdsPercentage = Number(rental.tdsPercentage ?? 10);
        tdsAmount = Number(rental.tdsAmount) > 0 ? Number(rental.tdsAmount) : Math.round(rentAmount * (tdsPercentage / 100));
      }
      const netAmount = rentAmount - tdsAmount;

      const tenureMonths = Number(rental.tenureMonths || 36);
      const rawStart = rental.startDate || registryDate;
      const startDate = parseAnyDate(rawStart);
      const rawEnd = rental.endDate;
      const endDate = rawEnd ? parseAnyDate(rawEnd) : calculateEndDate(startDate, tenureMonths);

      const totalCommitment = (rentAmount * tenureMonths);
      const totalPaid = Number(rental.totalDisbursedToOwner) || 0;
      const amountOutstanding = Math.max(0, totalCommitment - totalPaid);

      const paidMonthsCount = rentAmount > 0 ? Math.round(totalPaid / rentAmount) : 0;
      const remainingMonths = Math.max(0, tenureMonths - paidMonthsCount);

      return {
        _id: flat._id,
        flatNumber: flat.flatNumber,
        floor: flat.floor,
        bhkType: flat.bhkType,
        carpetArea: flat.carpetArea,
        status: flat.status,
        projectName: flat.projectId?.projectName || 'Krishna Valley Heritage',
        // Table 1 Specific Columns
        ownerName,
        ownerMobile,
        ownerEmail,
        ownerPan,
        ownerAadhaar,
        bankDetails: owner.bankDetails || {},
        registryDate,
        rentAmount,
        applyTds,
        tdsMode,
        tdsPercentage,
        tdsAmount,
        netAmount,
        startDate,
        endDate,
        effectiveFromMonthYear: rental.effectiveFromMonthYear || null,
        effectiveDate: rental.effectiveDate || null,
        termRevisions: rental.termRevisions || [],
        mouNumber: rental.mouNumber || '',
        tenureMonths,
        totalCommitment,
        totalPaid,
        amountOutstanding,
        dueDayOfMonth: Number(rental.dueDayOfMonth || 25),
        paidMonthsCount,
        remainingMonths,
        hasPreviousOwners: Array.isArray(flat.ownershipHistory) && flat.ownershipHistory.length > 0,
        previousOwnersCount: (flat.ownershipHistory || []).length
      };
    });

    // In-memory filter for search term
    let filtered = activeList;
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.flatNumber.toLowerCase().includes(term) ||
          item.ownerName.toLowerCase().includes(term) ||
          item.ownerMobile.includes(term)
      );
    }

    if (tenure && tenure !== 'all' && !isNaN(Number(tenure))) {
      filtered = filtered.filter((item) => item.tenureMonths === Number(tenure));
    }

    // KPI Aggregations
    const totalUnits = filtered.length;
    const totalMonthlyGross = filtered.reduce((sum, item) => sum + item.rentAmount, 0);
    const totalMonthlyNet = filtered.reduce((sum, item) => sum + item.netAmount, 0);
    const totalDisbursed = filtered.reduce((sum, item) => sum + item.totalPaid, 0);
    const totalOutstanding = filtered.reduce((sum, item) => sum + item.amountOutstanding, 0);
    const totalCommitmentAll = filtered.reduce((sum, item) => sum + item.totalCommitment, 0);

    return res.json({
      success: true,
      data: filtered,
      kpis: {
        totalUnits,
        totalMonthlyGross,
        totalMonthlyNet,
        totalDisbursed,
        totalOutstanding,
        totalCommitmentAll
      }
    });
  } catch (error) {
    console.error('Error fetching active rentals:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 2. GET PREVIOUS OWNERS HISTORY (TABLE 2: OWNERSHIP RESALE TRAIL)
// ============================================================================
export const getPreviousOwnersHistory = async (req, res) => {
  try {
    const { search, flatNumber } = req.query;

    const query = {
      'ownershipHistory.0': { $exists: true }
    };

    if (flatNumber) {
      query.flatNumber = new RegExp(`^${flatNumber}$`, 'i');
    }

    const flats = await Flat.find(query)
      .populate('projectId', 'projectName')
      .sort({ flatNumber: 1 })
      .lean();

    const historyRows = [];

    flats.forEach((flat) => {
      const history = flat.ownershipHistory || [];
      const currentOwnerName = flat.currentOwner?.name || 'Current Owner';

      // Iterate in reverse: history[history.length - 1] is the most recent past owner
      // Reverse array copy so index 0 is Last Owner, index 1 is 2nd Last Owner, etc.
      const reversed = [...history].reverse();

      reversed.forEach((hist, idx) => {
        let sequenceLabel = '';
        if (idx === 0) sequenceLabel = 'Last Owner (Previous)';
        else if (idx === 1) sequenceLabel = '2nd Last Owner';
        else if (idx === 2) sequenceLabel = '3rd Last Owner';
        else sequenceLabel = `${idx + 1}th Previous Owner`;

        const rentAmount = Number(hist.monthlyRent || hist.prePossessionMonthlyRent || 0);
        const applyTds = hist.applyTds !== false;
        const tdsPercentage = Number(hist.tdsPercentage || 10);
        const tdsAmount = applyTds ? Math.round(rentAmount * (tdsPercentage / 100)) : 0;
        const netAmount = rentAmount - tdsAmount;

        const cleanField = (val) => (!val || val === '—' || val === '-' || val === 'On File' ? null : String(val).trim());
        const startDate = parseAnyDate(hist.ownershipStartDate || hist.startDate);
        const endDate = parseAnyDate(hist.ownershipEndDate || hist.transferDate);
        const registryDate = parseAnyDate(hist.registryDate || hist.ownershipStartDate);
        
        let tenureMonths = Number(hist.tenureMonths || hist.paidMonths || 0);
        if (!tenureMonths && startDate && endDate) {
          const s = new Date(startDate);
          const e = new Date(endDate);
          const diffMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
          tenureMonths = Math.max(1, diffMonths);
        }

        // Who did this previous owner transfer the property to?
        // If idx === 0 (Last Owner), they transferred to current owner.
        // If idx > 0, they transferred to reversed[idx - 1].
        const transferredToName = idx === 0
          ? currentOwnerName
          : (reversed[idx - 1].name || reversed[idx - 1].previousOwnerName || 'Subsequent Owner');

        historyRows.push({
          historyId: hist._id || `${flat._id}-${idx}`,
          flatId: flat._id,
          flatNumber: flat.flatNumber,
          floor: flat.floor,
          projectName: flat.projectId?.projectName || 'Krishna Valley Heritage',
          // Table 2 Columns
          sequenceLabel,
          sequenceIndex: idx + 1,
          previousOwnerName: hist.name || hist.previousOwnerName || 'Unknown Owner',
          mobileNo: cleanField(hist.mobileNo),
          panNumber: cleanField(hist.panNumber),
          aadhaarNumber: cleanField(hist.aadhaarNumber),
          registryDate,
          rentAmount,
          applyTds,
          tdsPercentage,
          tdsAmount,
          netAmount,
          startDate,
          endDate,
          tenureMonths: tenureMonths || 36,
          totalRentPaid: Number(hist.totalRentPaid || hist.prePossessionRentPaid || 0),
          transferDate: hist.transferDate || endDate || null,
          transferReason: hist.transferReason || 'resale',
          transferredTo: transferredToName,
          remarks: hist.remarks || ''
        });
      });
    });

    let filtered = historyRows;
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.flatNumber.toLowerCase().includes(term) ||
          row.previousOwnerName.toLowerCase().includes(term) ||
          row.transferredTo.toLowerCase().includes(term)
      );
    }

    return res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('Error fetching previous owners history:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 3. UPDATE RENTAL TERMS (TABLE 1 INLINE / MODAL EDIT)
// ============================================================================
export const updateRentalTerms = async (req, res) => {
  try {
    const { flatId } = req.params;
    const {
      ownerName,
      ownerMobile,
      ownerEmail,
      ownerPan,
      ownerAadhaar,
      guaranteedMonthlyRent,
      applyTds,
      tdsMode = 'percentage',
      tdsPercentage = 10,
      tdsAmount: customTdsAmount,
      mouDate,
      startDate,
      endDate,
      tenureMonths = 36,
      dueDayOfMonth = 25,
      mouNumber,
      effectiveMonthYear,
      revisionReason,
      totalPaid: customTotalPaid
    } = req.body;

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    if (!flat.rentalDetails) flat.rentalDetails = {};

    // 1. Capture Previous Terms
    const prevRent = Number(flat.rentalDetails.guaranteedMonthlyRent || 0);
    const prevApplyTds = flat.rentalDetails.applyTds !== false;
    const prevTdsMode = flat.rentalDetails.tdsMode || 'percentage';
    let prevTdsPercent = Number(flat.rentalDetails.tdsPercentage ?? 10);
    let prevTdsAmount = 0;

    if (!prevApplyTds) {
      prevTdsPercent = 0;
      prevTdsAmount = 0;
    } else if (prevTdsMode === 'amount' && flat.rentalDetails.tdsAmount !== undefined && flat.rentalDetails.tdsAmount !== null) {
      prevTdsAmount = Math.max(0, Number(flat.rentalDetails.tdsAmount) || 0);
      prevTdsPercent = prevRent > 0 ? Number(((prevTdsAmount / prevRent) * 100).toFixed(2)) : 0;
    } else {
      prevTdsAmount = Math.round(prevRent * (prevTdsPercent / 100));
    }
    const prevNetRent = prevRent - prevTdsAmount;
    const prevTenure = Number(flat.rentalDetails.tenureMonths || 36);
    const prevStart = flat.rentalDetails.startDate ? new Date(flat.rentalDetails.startDate) : new Date();

    // 2. Parse New Terms
    const newRent = Number(guaranteedMonthlyRent) || 0;
    const shouldApplyTds = applyTds !== false;
    const newTdsMode = tdsMode === 'amount' ? 'amount' : 'percentage';
    let newTdsPercent = Number(tdsPercentage ?? 10);
    let newTdsAmount = 0;

    if (!shouldApplyTds) {
      newTdsPercent = 0;
      newTdsAmount = 0;
    } else if (newTdsMode === 'amount') {
      newTdsAmount = Math.max(0, Number(customTdsAmount) || 0);
      newTdsPercent = newRent > 0 ? Number(((newTdsAmount / newRent) * 100).toFixed(2)) : 0;
    } else {
      newTdsAmount = Math.round(newRent * (newTdsPercent / 100));
    }
    const newNetRent = newRent - newTdsAmount;
    const newTenure = Math.max(1, Number(tenureMonths) || 36);

    const start = startDate ? (parseAnyDate(startDate) || new Date(startDate)) : (parseAnyDate(flat.rentalDetails.startDate) || parseAnyDate(mouDate) || new Date());
    const mou = mouDate ? (parseAnyDate(mouDate) || new Date(mouDate)) : (parseAnyDate(flat.rentalDetails.mouDate) || start);
    const end = endDate ? (parseAnyDate(endDate) || new Date(endDate)) : calculateEndDate(start, newTenure);

    // 3. Determine Effective Month Index
    let appliedFromMonthIndex = 1;
    let effectiveDate = start;
    let formattedEffMonthYear = effectiveMonthYear;

    if (effectiveMonthYear && typeof effectiveMonthYear === 'string' && effectiveMonthYear.includes('-')) {
      const [effY, effM] = effectiveMonthYear.split('-').map(Number);
      if (!isNaN(effY) && !isNaN(effM)) {
        effectiveDate = new Date(effY, effM - 1, 1);
        const startY = start.getFullYear();
        const startM = start.getMonth() + 1; // 1-12
        const monthDiff = (effY - startY) * 12 + (effM - startM);
        appliedFromMonthIndex = Math.max(1, monthDiff + 1);
        formattedEffMonthYear = `${effY}-${String(effM).padStart(2, '0')}`;
      }
    } else {
      const y = start.getFullYear();
      const m = String(start.getMonth() + 1).padStart(2, '0');
      formattedEffMonthYear = `${y}-${m}`;
    }

    // 4. Calculate Total Gross Commitment (Rent * Tenure) with Effective Period Split
    let totalCommitment = 0;
    const priorMonthsCount = Math.min(newTenure, Math.max(0, appliedFromMonthIndex - 1));
    const newMonthsCount = Math.max(0, newTenure - priorMonthsCount);

    if (priorMonthsCount > 0 && prevRent > 0) {
      totalCommitment = (priorMonthsCount * prevRent) + (newMonthsCount * newRent);
    } else {
      totalCommitment = newTenure * newRent;
    }

    const totalPaid = customTotalPaid !== undefined && customTotalPaid !== null && customTotalPaid !== ''
      ? Math.max(0, Number(customTotalPaid))
      : (Number(flat.rentalDetails.totalDisbursedToOwner) || 0);
    const remaining = Math.max(0, totalCommitment - totalPaid);

    // 5. Update / Regenerate Ledger Entries with Period-Specific Rates
    const existingEntries = flat.rentalDetails.ledgerEntries || [];
    const existingMap = new Map();
    existingEntries.forEach((e) => {
      if (e && e.monthIndex) existingMap.set(e.monthIndex, e);
    });

    const updatedLedgerEntries = [];
    let runningCumulative = 0;

    for (let m = 1; m <= newTenure; m++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + (m - 1));
      dueDate.setDate(Math.min(Number(dueDayOfMonth || 25), 28));

      const isNewTermsMonth = m >= appliedFromMonthIndex;
      const monthGross = isNewTermsMonth ? newRent : (prevRent > 0 ? prevRent : newRent);
      const monthTds = isNewTermsMonth ? newTdsAmount : (prevRent > 0 ? prevTdsAmount : newTdsAmount);
      const monthNet = isNewTermsMonth ? newNetRent : (prevRent > 0 ? prevNetRent : newNetRent);

      const existing = existingMap.get(m);
      const isPaid = existing && existing.status === 'paid';
      const grossPaid = isPaid ? (Number(existing.grossAmount) || monthGross) : 0;
      const netPaid = isPaid ? (Number(existing.netAmountPaid) || monthNet) : 0;
      if (isPaid) {
        runningCumulative += grossPaid;
      }

      const cleanFlat = String(flat.flatNumber).replace(/[^A-Za-z0-9]/g, '');
      const isPastDue = dueDate < new Date();

      updatedLedgerEntries.push({
        monthIndex: m,
        dueDate,
        paymentDate: isPaid ? (existing.paymentDate || dueDate) : null,
        paymentMode: isPaid ? (existing.paymentMode || 'NEFT') : 'Pending',
        referenceNumber: isPaid ? existing.referenceNumber : `NEFT/KV-RENT/M${String(m).padStart(2, '0')}/${cleanFlat}`,
        grossAmount: monthGross,
        tdsDeducted: monthTds,
        netAmountPaid: netPaid,
        cumulativePaid: runningCumulative,
        remainingTenureBalance: Math.max(0, totalCommitment - runningCumulative),
        status: isPaid ? 'paid' : (isPastDue ? 'due' : 'upcoming'),
        remarks: existing?.remarks || (isNewTermsMonth && appliedFromMonthIndex > 1
          ? `Revised Terms (Effective ${formattedEffMonthYear})`
          : 'Scheduled per Active Tenure')
      });
    }

    // 6. Record in Audit Revisions History
    if (!flat.rentalDetails.termRevisions) flat.rentalDetails.termRevisions = [];
    flat.rentalDetails.termRevisions.push({
      revisionDate: new Date(),
      effectiveMonthYear: formattedEffMonthYear,
      effectiveDate,
      appliedFromMonthIndex,
      previousTerms: {
        guaranteedMonthlyRent: prevRent,
        applyTds: prevApplyTds,
        tdsMode: prevTdsMode,
        tdsPercentage: prevTdsPercent,
        tdsAmount: prevTdsAmount,
        netRent: prevNetRent,
        tenureMonths: prevTenure,
        startDate: prevStart
      },
      newTerms: {
        guaranteedMonthlyRent: newRent,
        applyTds: shouldApplyTds,
        tdsMode: newTdsMode,
        tdsPercentage: newTdsPercent,
        tdsAmount: newTdsAmount,
        netRent: newNetRent,
        tenureMonths: newTenure,
        startDate: start,
        endDate: end
      },
      reason: revisionReason || `Rental terms updated effective ${formattedEffMonthYear}`
    });

    // 7. Save Flat Rental Details
    flat.rentalDetails.guaranteedMonthlyRent = newRent;
    flat.rentalDetails.applyTds = shouldApplyTds;
    flat.rentalDetails.tdsMode = newTdsMode;
    flat.rentalDetails.tdsPercentage = newTdsPercent;
    flat.rentalDetails.tdsAmount = newTdsAmount;
    flat.rentalDetails.tenureMonths = newTenure;
    flat.rentalDetails.startDate = start;
    flat.rentalDetails.endDate = end;
    flat.rentalDetails.mouDate = mou;
    flat.rentalDetails.dueDayOfMonth = Number(dueDayOfMonth);
    if (mouNumber) flat.rentalDetails.mouNumber = mouNumber;
    flat.rentalDetails.effectiveFromMonthYear = formattedEffMonthYear;
    flat.rentalDetails.effectiveDate = effectiveDate;
    flat.rentalDetails.total36MonthCommitment = totalCommitment;
    flat.rentalDetails.remainingPayableToOwner = remaining;
    flat.rentalDetails.ledgerEntries = updatedLedgerEntries;
    flat.takenForRental = true;

    // 8. Update Owner Details if provided
    // 8. Update Owner Details if provided
    if (!flat.currentOwner) flat.currentOwner = {};
    if (ownerName && ownerName.trim()) flat.currentOwner.name = ownerName.trim();
    if (ownerMobile !== undefined) flat.currentOwner.mobileNo = ownerMobile ? ownerMobile.trim() : '';
    if (ownerEmail !== undefined) flat.currentOwner.email = ownerEmail ? ownerEmail.trim() : '';
    if (ownerPan !== undefined) flat.currentOwner.panNumber = ownerPan ? ownerPan.trim().toUpperCase() : '';
    if (ownerAadhaar !== undefined) flat.currentOwner.aadhaarNumber = ownerAadhaar ? ownerAadhaar.trim() : '';
    if (mou) flat.currentOwner.ownershipStartDate = mou;

    if (flat.currentOwner.customerId) {
      await Customer.findByIdAndUpdate(flat.currentOwner.customerId, {
        ...(ownerName && ownerName.trim() ? { name: ownerName.trim() } : {}),
        ...(ownerMobile !== undefined ? { mobileNo: ownerMobile ? ownerMobile.trim() : 'On File' } : {}),
        ...(ownerEmail !== undefined ? { email: ownerEmail ? ownerEmail.trim() : '' } : {}),
        ...(ownerPan !== undefined ? { panNumber: ownerPan ? ownerPan.trim().toUpperCase() : '' } : {}),
        ...(ownerAadhaar !== undefined ? { aadhaarNumber: ownerAadhaar ? ownerAadhaar.trim() : '' } : {})
      });
    }

    await flat.save();

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    return res.json({
      success: true,
      message: `Rental terms successfully updated for Flat ${flat.flatNumber} effective from ${formattedEffMonthYear}!`,
      data: flat.rentalDetails
    });
  } catch (error) {
    console.error('Error updating rental terms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 4. RECORD RENTAL PAYOUT
// ============================================================================
export const recordRentalPayout = async (req, res) => {
  try {
    const { flatId } = req.params;
    const {
      amount,
      paymentDate,
      paymentMode = 'NEFT',
      referenceNumber,
      monthIndex,
      remarks
    } = req.body;

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive payment amount required' });
    }

    if (!flat.rentalDetails) flat.rentalDetails = {};

    const currentDisbursed = Number(flat.rentalDetails.totalDisbursedToOwner) || 0;
    const newDisbursed = currentDisbursed + payAmount;
    flat.rentalDetails.totalDisbursedToOwner = newDisbursed;

    const tenure = Number(flat.rentalDetails.tenureMonths || 36);
    const monthlyRent = Number(flat.rentalDetails.guaranteedMonthlyRent || 0);
    const shouldApplyTds = flat.rentalDetails.applyTds !== false;
    const tdsPercent = Number(flat.rentalDetails.tdsPercentage ?? 10);
    const tdsAmount = shouldApplyTds ? Math.round(monthlyRent * (tdsPercent / 100)) : 0;
    const netRent = monthlyRent - tdsAmount;
    const totalCommitment = netRent * tenure;

    flat.rentalDetails.remainingPayableToOwner = Math.max(0, totalCommitment - newDisbursed);

    // Append to ledger entries
    if (!flat.rentalDetails.ledgerEntries) flat.rentalDetails.ledgerEntries = [];
    flat.rentalDetails.ledgerEntries.push({
      monthIndex: monthIndex || (flat.rentalDetails.ledgerEntries.length + 1),
      dueDate: new Date(paymentDate || new Date()),
      paymentDate: new Date(paymentDate || new Date()),
      paymentMode,
      referenceNumber: referenceNumber || `PAY-${Date.now()}`,
      grossAmount: payAmount,
      tdsDeducted: 0,
      netAmountPaid: payAmount,
      cumulativePaid: newDisbursed,
      remainingTenureBalance: flat.rentalDetails.remainingPayableToOwner,
      status: 'paid',
      remarks: remarks || 'Recorded via Rental Management Hub'
    });

    await flat.save();

    return res.json({
      success: true,
      message: `Payout of ₹${payAmount.toLocaleString('en-IN')} recorded successfully`,
      data: {
        totalDisbursedToOwner: newDisbursed,
        remainingPayableToOwner: flat.rentalDetails.remainingPayableToOwner
      }
    });
  } catch (error) {
    console.error('Error recording rental payout:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 5. TRANSFER OWNERSHIP (RESALE / ARCHIVE TO TABLE 2)
// ============================================================================
export const transferOwnership = async (req, res) => {
  try {
    const { flatId } = req.params;
    const {
      newOwnerName,
      newOwnerMobile,
      newOwnerEmail,
      newOwnerPan,
      newOwnerAadhaar,
      transferDate = new Date(),
      transferReason = 'resale',
      transferDealValue = 0,
      newMonthlyRent,
      newTenureMonths = 36,
      newStartDate = new Date(),
      newRegistryDate = new Date(),
      applyTds = true,
      tdsPercentage = 10,
      remarks
    } = req.body;

    if (!newOwnerName || !newOwnerMobile) {
      return res.status(400).json({ success: false, message: 'New owner name and mobile number are required' });
    }

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    // 1. Snapshot the CURRENT owner into ownershipHistory (Table 2 archive)
    const currentOwner = flat.currentOwner || {};
    const currentRental = flat.rentalDetails || {};

    if (!flat.ownershipHistory) flat.ownershipHistory = [];

    const historicalRecord = {
      previousOwnerId: currentOwner.customerId || null,
      name: currentOwner.name || 'Previous Owner',
      previousOwnerName: currentOwner.name || 'Previous Owner',
      mobileNo: currentOwner.mobileNo || '',
      email: currentOwner.email || '',
      panNumber: currentOwner.panNumber || '',
      aadhaarNumber: currentOwner.aadhaarNumber || '',
      registryDate: currentRental.mouDate || currentOwner.ownershipStartDate || null,
      monthlyRent: Number(currentRental.guaranteedMonthlyRent || 0),
      applyTds: currentRental.applyTds !== false,
      tdsPercentage: Number(currentRental.tdsPercentage || 10),
      ownershipStartDate: currentOwner.ownershipStartDate || currentRental.startDate || null,
      ownershipEndDate: new Date(transferDate),
      transferDate: new Date(transferDate),
      transferReason,
      transferDealValue: Number(transferDealValue) || 0,
      totalRentPaid: Number(currentRental.totalDisbursedToOwner || 0),
      tenureMonths: Number(currentRental.tenureMonths || 36),
      remarks: remarks || `Ownership transferred to ${newOwnerName} on ${new Date(transferDate).toLocaleDateString('en-IN')}`
    };

    flat.ownershipHistory.push(historicalRecord);

    // 2. Find or Create Customer record for New Owner
    let customer = await Customer.findOne({ mobileNo: newOwnerMobile });
    if (!customer) {
      customer = new Customer({
        customerType: 'owner',
        name: newOwnerName,
        mobileNo: newOwnerMobile,
        email: newOwnerEmail || '',
        panNumber: newOwnerPan || '',
        aadhaarNumber: newOwnerAadhaar || '',
        ownerDetails: {
          propertyIds: [flat._id],
          ownershipType: 'individual',
          ownershipPercentage: 100
        },
        status: 'active'
      });
      await customer.save();
    } else {
      if (!customer.ownerDetails?.propertyIds?.includes(flat._id)) {
        customer.ownerDetails.propertyIds.push(flat._id);
        await customer.save();
      }
    }

    // 3. Assign NEW owner as currentOwner
    flat.currentOwner = {
      customerId: customer._id,
      name: newOwnerName,
      mobileNo: newOwnerMobile,
      email: newOwnerEmail || '',
      panNumber: newOwnerPan || '',
      aadhaarNumber: newOwnerAadhaar || '',
      ownershipStartDate: new Date(transferDate),
      ownershipType: 'individual'
    };

    // 4. Setup NEW active rental terms (Table 1 reset for new owner)
    const rent = newMonthlyRent !== undefined ? Number(newMonthlyRent) : Number(currentRental.guaranteedMonthlyRent || 0);
    const shouldApplyTds = applyTds !== false;
    const tdsPercent = Number(tdsPercentage ?? 10);
    const tdsAmount = shouldApplyTds ? Math.round(rent * (tdsPercent / 100)) : 0;
    const netRent = rent - tdsAmount;

    const tenure = Math.max(1, Number(newTenureMonths) || 36);
    const start = new Date(newStartDate);
    const end = calculateEndDate(start, tenure);
    const totalCommitment = rent * tenure;

    flat.rentalDetails = {
      isRentBackActive: true,
      guaranteedMonthlyRent: rent,
      applyTds: applyTds !== false,
      tdsPercentage: Number(tdsPercentage),
      mouDate: new Date(newRegistryDate),
      startDate: start,
      endDate: end,
      tenureMonths: tenure,
      dueDayOfMonth: currentRental.dueDayOfMonth || 25,
      total36MonthCommitment: totalCommitment,
      totalDisbursedToOwner: 0, // Reset for new owner
      remainingPayableToOwner: totalCommitment,
      ledgerEntries: []
    };

    flat.status = 'resell';
    flat.takenForRental = true;

    await flat.save();

    return res.json({
      success: true,
      message: `Ownership successfully transferred to ${newOwnerName}. Previous owner ${currentOwner.name || 'Owner'} archived to history.`,
      data: {
        flatNumber: flat.flatNumber,
        newOwner: flat.currentOwner,
        newRentalDetails: flat.rentalDetails,
        archivedRecord: historicalRecord
      }
    });
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 6. CREATE MANUAL RENTAL ENTRY (TABLE 1 NEW ENROLLMENT)
// ============================================================================
export const createManualRentalEntry = async (req, res) => {
  try {
    const {
      flatId,
      flatNumber,
      ownerName,
      ownerMobile,
      ownerEmail,
      registryDate,
      rentAmount,
      applyTds,
      tdsMode = 'percentage',
      tdsPercentage = 10,
      tdsAmount: customTdsAmount,
      startDate,
      tenureMonths = 36,
      totalPaid = 0
    } = req.body;

    if (!flatId && !flatNumber) {
      return res.status(400).json({ success: false, message: 'Flat identifier (flatId or flatNumber) is required' });
    }

    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ success: false, message: 'Owner name is required' });
    }

    const rent = Number(rentAmount);
    if (isNaN(rent) || rent <= 0) {
      return res.status(400).json({ success: false, message: 'Valid monthly rent amount is required' });
    }

    let flat = null;
    if (flatId) {
      flat = await Flat.findById(flatId);
    }
    if (!flat && flatNumber) {
      flat = await Flat.findOne({
        flatNumber: { $regex: new RegExp(`^${flatNumber.trim().replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&')}$`, 'i') }
      });
    }

    if (!flat) {
      return res.status(404).json({ success: false, message: `Flat not found for "${flatNumber || flatId}"` });
    }

    // Find or create Owner in Customer collection
    let customer = null;
    if (ownerMobile && ownerMobile.trim()) {
      customer = await Customer.findOne({ mobileNo: ownerMobile.trim() });
    }
    if (!customer) {
      customer = new Customer({
        name: ownerName.trim(),
        mobileNo: ownerMobile?.trim() || 'On File',
        email: ownerEmail?.trim() || '',
        customerType: 'owner',
        status: 'active'
      });
      await customer.save();
    }

    const shouldApplyTds = applyTds !== false;
    const resolvedTdsMode = tdsMode === 'amount' ? 'amount' : 'percentage';
    let tdsPercent = Number(tdsPercentage) || 10;
    let finalTdsAmount = 0;

    if (!shouldApplyTds) {
      tdsPercent = 0;
      finalTdsAmount = 0;
    } else if (resolvedTdsMode === 'amount') {
      finalTdsAmount = Math.max(0, Number(customTdsAmount) || 0);
      tdsPercent = rent > 0 ? Number(((finalTdsAmount / rent) * 100).toFixed(2)) : 0;
    } else {
      finalTdsAmount = Math.round(rent * (tdsPercent / 100));
    }
    const netAmount = rent - finalTdsAmount;

    const tenure = Math.max(1, Number(tenureMonths) || 36);
    const mou = registryDate ? (parseAnyDate(registryDate) || new Date(registryDate)) : new Date();
    const start = startDate ? (parseAnyDate(startDate) || new Date(startDate)) : mou;
    const end = req.body.endDate ? (parseAnyDate(req.body.endDate) || calculateEndDate(start, tenure)) : calculateEndDate(start, tenure);
    const totalCommitment = rent * tenure;
    const paid = Math.max(0, Number(totalPaid) || 0);
    const remaining = Math.max(0, totalCommitment - paid);

    // Initial payout ledger entry if totalPaid > 0
    const ledgerEntries = [];
    if (paid > 0) {
      ledgerEntries.push({
        payoutDate: start,
        amountPaid: paid,
        paymentMode: 'NEFT',
        transactionReference: 'INITIAL_BALANCE',
        remarks: 'Opening disbursed rent balance recorded at manual enrollment'
      });
    }

    flat.currentOwner = {
      customerId: customer._id,
      name: ownerName.trim(),
      mobileNo: ownerMobile?.trim() || customer.mobileNo,
      email: ownerEmail?.trim() || customer.email,
      ownershipStartDate: mou,
      ownershipType: 'individual'
    };

    flat.rentalDetails = {
      isRentBackActive: true,
      guaranteedMonthlyRent: rent,
      applyTds: shouldApplyTds,
      tdsMode: resolvedTdsMode,
      tdsPercentage: tdsPercent,
      tdsAmount: finalTdsAmount,
      mouDate: mou,
      startDate: start,
      endDate: end,
      tenureMonths: tenure,
      dueDayOfMonth: 25,
      total36MonthCommitment: totalCommitment,
      totalDisbursedToOwner: paid,
      remainingPayableToOwner: remaining,
      ledgerEntries
    };

    flat.takenForRental = true;
    if (flat.status === 'available') {
      flat.status = 'sold';
    }

    await flat.save();
    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    return res.status(201).json({
      success: true,
      message: `Flat ${flat.flatNumber} successfully enrolled into Rental Management with owner ${ownerName.trim()}`,
      data: flat
    });
  } catch (error) {
    console.error('Error creating manual rental entry:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 7. IMPORT RENTALS FROM EXCEL (BATCH ENROLLMENT MATCHING SPECIFIED COLUMNS)
// ============================================================================
export const importRentalsFromExcel = async (req, res) => {
  try {
    let { rentals } = req.body;

    // Support both direct Excel file upload and JSON array of parsed rows
    if (req.file && req.file.buffer) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rentals = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }

    if (!Array.isArray(rentals) || rentals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rental records provided for import'
      });
    }

    let enrolledCount = 0;
    const notFoundFlats = [];
    const errors = [];

    for (let i = 0; i < rentals.length; i++) {
      const row = rentals[i];
      const flatNumber = String(
        row.flatNo || row['Flat No'] || row['Flat Number'] || row.flatNumber || ''
      ).trim();

      if (!flatNumber) {
        errors.push(`Row ${i + 1}: Missing Flat Number`);
        continue;
      }

      const ownerName = String(
        row.ownerName || row['Owner Name'] || row.name || ''
      ).trim();

      if (!ownerName) {
        errors.push(`Row ${i + 1}: Missing Owner Name for Flat ${flatNumber}`);
        continue;
      }

      const ownerMobile = String(row.ownerMobile || row['Owner Mobile'] || row.mobileNo || row['Mobile'] || '').trim();
      const ownerEmail = String(row.ownerEmail || row['Owner Email'] || row.email || '').trim();

      const rentAmount = Number(row.rentAmount || row['Rent Amount'] || row.rent || 0);
      if (isNaN(rentAmount) || rentAmount <= 0) {
        errors.push(`Row ${i + 1}: Invalid Rent Amount for Flat ${flatNumber}`);
        continue;
      }

      const rawTds = String(row.applyTds || row['TDS Applied'] || row['Apply TDS'] || row.tds || '').trim().toLowerCase();
      const applyTds = !['no', 'false', '0', '0%'].includes(rawTds);

      const rawTdsAmount = row.tdsAmount ?? row['TDS Amount'] ?? row['TDS (Amount)'] ?? row['TDS (₹)'] ?? row['TDS Value'] ?? row['TDS Deducted'] ?? row['TDS Amt'];
      const rawTdsPercent = row.tdsPercentage ?? row['TDS %'] ?? row['TDS Percentage'] ?? row['TDS Rate'] ?? row.tdsPercent;

      let tdsMode = 'percentage';
      let tdsPercentage = 10;
      let tdsAmount = 0;

      if (!applyTds) {
        tdsPercentage = 0;
        tdsAmount = 0;
      } else if (rawTdsAmount !== undefined && rawTdsAmount !== '' && !isNaN(Number(rawTdsAmount)) && Number(rawTdsAmount) > 0) {
        tdsMode = 'amount';
        tdsAmount = Math.max(0, Number(rawTdsAmount));
        tdsPercentage = rentAmount > 0 ? Number(((tdsAmount / rentAmount) * 100).toFixed(2)) : 0;
      } else if (rawTdsPercent !== undefined && rawTdsPercent !== '') {
        tdsMode = 'percentage';
        const cleanPct = String(rawTdsPercent).replace(/%/g, '').trim();
        tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
        tdsAmount = Math.round(rentAmount * (tdsPercentage / 100));
      } else if (rawTds && rawTds.includes('%')) {
        tdsMode = 'percentage';
        const cleanPct = rawTds.replace(/%/g, '').trim();
        tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
        tdsAmount = Math.round(rentAmount * (tdsPercentage / 100));
      } else {
        tdsMode = 'percentage';
        tdsPercentage = 10;
        tdsAmount = Math.round(rentAmount * 0.1);
      }

      const netAmount = rentAmount - tdsAmount;

      const registryDateStr = row.registryDate || row['Registry Date'] || row.mouDate || row['MOU Date'] || null;
      const startDateStr = row.startDate || row['Payment Starting Date'] || row['Start Date'] || registryDateStr;
      const endDateStr = row.endDate || row['Payment Ending Date'] || row['End Date'] || null;
      const tenureMonths = Number(row.tenureMonths || row['Tenure (Months)'] || row.tenure || 36) || 36;
      const totalPaid = Number(row.totalPaid || row['Total Paid'] || 0) || 0;

      // Find flat with flexible pattern matching
      let flat = await Flat.findOne({
        flatNumber: { $regex: new RegExp(`^${flatNumber.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&')}$`, 'i') }
      });

      // Try numeric suffix if tower prefix is missing/different e.g. "001" vs "A-001"
      if (!flat) {
        const numOnly = flatNumber.replace(/\D/g, '');
        if (numOnly) {
          flat = await Flat.findOne({
            flatNumber: { $regex: new RegExp(`^.*${numOnly}$`, 'i') }
          });
        }
      }

      if (!flat) {
        notFoundFlats.push(flatNumber);
        continue;
      }

      // Find or create Customer record for owner
      let customer = null;
      if (ownerMobile && ownerMobile !== '—' && ownerMobile !== 'On File') {
        customer = await Customer.findOne({ mobileNo: ownerMobile });
      }
      if (!customer) {
        customer = new Customer({
          name: ownerName,
          mobileNo: ownerMobile || 'On File',
          email: ownerEmail || '',
          customerType: 'owner',
          status: 'active'
        });
        await customer.save();
      }

      const mou = parseAnyDate(registryDateStr) || new Date();
      const start = parseAnyDate(startDateStr) || mou;
      const end = endDateStr ? (parseAnyDate(endDateStr) || calculateEndDate(start, tenureMonths)) : calculateEndDate(start, tenureMonths);
      const totalCommitment = rentAmount * tenureMonths;
      const remaining = Math.max(0, totalCommitment - totalPaid);

      const ledgerEntries = [];
      if (totalPaid > 0) {
        ledgerEntries.push({
          payoutDate: start,
          amountPaid: totalPaid,
          paymentMode: 'NEFT',
          transactionReference: 'INITIAL_DISBURSED',
          remarks: 'Imported opening disbursed amount from Excel sheet'
        });
      }

      flat.currentOwner = {
        customerId: customer._id,
        name: ownerName,
        mobileNo: ownerMobile || customer.mobileNo,
        email: ownerEmail || customer.email,
        ownershipStartDate: mou,
        ownershipType: 'individual'
      };

      flat.rentalDetails = {
        isRentBackActive: true,
        guaranteedMonthlyRent: rentAmount,
        applyTds,
        tdsMode,
        tdsPercentage,
        tdsAmount,
        mouDate: mou,
        startDate: start,
        endDate: end,
        tenureMonths,
        dueDayOfMonth: 25,
        total36MonthCommitment: totalCommitment,
        totalDisbursedToOwner: totalPaid,
        remainingPayableToOwner: remaining,
        ledgerEntries
      };

      flat.takenForRental = true;
      if (flat.status === 'available') {
        flat.status = 'sold';
      }

      await flat.save();
      enrolledCount++;
    }

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${rentals.length} records. Enrolled/Updated: ${enrolledCount}.`,
      data: {
        totalProcessed: rentals.length,
        enrolledCount,
        notFoundFlats,
        errors
      }
    });
  } catch (error) {
    console.error('Error importing rentals from Excel:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// HELPER: Generate Month-by-Month Passbook Ledger Entries
// ============================================================================
export function generatePassbookEntries({
  flatNumber = '',
  startDate = new Date(),
  tenureMonths = 36,
  grossRent = 0,
  applyTds = true,
  tdsMode = 'percentage',
  tdsPercentage = 10,
  tdsAmount = 0,
  netRent = 0,
  totalPaid = 0,
  dueDayOfMonth = 25,
  existingEntries = []
}) {
  const tenure = Math.max(1, Number(tenureMonths) || 36);
  const gross = Number(grossRent) || 0;
  let computedTds = 0;
  let tdsPct = 0;

  if (applyTds) {
    if (tdsMode === 'amount' && tdsAmount !== undefined && tdsAmount !== null && Number(tdsAmount) > 0) {
      computedTds = Math.max(0, Number(tdsAmount));
      tdsPct = gross > 0 ? Number(((computedTds / gross) * 100).toFixed(2)) : 0;
    } else {
      tdsPct = Number(tdsPercentage ?? 10);
      computedTds = Math.round(gross * (tdsPct / 100));
    }
  }

  const computedNet = Number(netRent) > 0 ? Number(netRent) : (gross - computedTds);
  const monthlyPayout = computedNet;
  const paid = Number(totalPaid) || 0;

  // The total paid amount in rental excel is without TDS (gross rent * paidMonths)
  const monthlyUnit = gross > 0 ? gross : 1;
  const paidMonthsCount = Math.min(tenure, Math.round(paid / monthlyUnit));
  const remainderPaid = paid % monthlyUnit;

  const start = startDate ? new Date(startDate) : new Date();
  const safeStart = isNaN(start.getTime()) ? new Date() : start;

  // Index existing entries by monthIndex if any
  const existingMap = new Map();
  if (Array.isArray(existingEntries)) {
    existingEntries.forEach((e) => {
      if (e && e.monthIndex) existingMap.set(e.monthIndex, e);
    });
  }

  const entries = [];
  let runningCumulative = 0;
  const totalTenureGrossCommitment = tenure * gross;

  for (let m = 1; m <= tenure; m++) {
    const dueDate = new Date(safeStart);
    dueDate.setMonth(dueDate.getMonth() + (m - 1));
    dueDate.setDate(Math.min(dueDayOfMonth, 28)); // keep valid day

    const cleanFlat = String(flatNumber).replace(/[^A-Za-z0-9]/g, '');
    const existing = existingMap.get(m);

    if (m <= paidMonthsCount) {
      runningCumulative += gross;
      const remainingBalance = Math.max(0, totalTenureGrossCommitment - runningCumulative);
      const paymentDate = existing?.paymentDate ? new Date(existing.paymentDate) : dueDate;

      entries.push({
        monthIndex: m,
        dueDate,
        paymentDate,
        paymentMode: existing?.paymentMode || 'NEFT',
        referenceNumber: existing?.referenceNumber || `NEFT/KV-RENT/M${String(m).padStart(2, '0')}/${cleanFlat}`,
        grossAmount: gross,
        tdsDeducted: computedTds,
        netAmountPaid: monthlyPayout,
        cumulativePaid: runningCumulative,
        remainingTenureBalance: remainingBalance,
        status: 'paid',
        remarks: existing?.remarks || 'Disbursed via Direct Bank Transfer (NEFT)'
      });
    } else if (m === paidMonthsCount + 1 && remainderPaid > 0) {
      runningCumulative += remainderPaid;
      const remainingBalance = Math.max(0, totalTenureGrossCommitment - runningCumulative);
      const partialTds = applyTds
        ? (tdsPct > 0 ? Math.round(remainderPaid * (tdsPct / 100)) : 0)
        : 0;

      entries.push({
        monthIndex: m,
        dueDate,
        paymentDate: existing?.paymentDate ? new Date(existing.paymentDate) : dueDate,
        paymentMode: existing?.paymentMode || 'NEFT',
        referenceNumber: existing?.referenceNumber || `NEFT/PARTIAL-M${String(m).padStart(2, '0')}/${cleanFlat}`,
        grossAmount: remainderPaid,
        tdsDeducted: partialTds,
        netAmountPaid: remainderPaid - partialTds,
        cumulativePaid: runningCumulative,
        remainingTenureBalance: remainingBalance,
        status: 'partial',
        remarks: existing?.remarks || `Partial payout of ₹${remainderPaid.toLocaleString('en-IN')}`
      });
    } else {
      const remainingBalance = Math.max(0, totalTenureGrossCommitment - runningCumulative);
      const isPastDue = dueDate < new Date();

      entries.push({
        monthIndex: m,
        dueDate,
        paymentDate: existing?.status === 'paid' ? existing.paymentDate : null,
        paymentMode: existing?.status === 'paid' ? (existing.paymentMode || 'NEFT') : 'Pending',
        referenceNumber: existing?.status === 'paid' ? existing.referenceNumber : '—',
        grossAmount: gross,
        tdsDeducted: computedTds,
        netAmountPaid: existing?.status === 'paid' ? monthlyPayout : 0,
        cumulativePaid: runningCumulative,
        remainingTenureBalance: remainingBalance,
        status: existing?.status === 'paid' ? 'paid' : (isPastDue ? 'due' : 'upcoming'),
        remarks: existing?.remarks || (isPastDue ? 'Disbursement Overdue' : 'Scheduled per Active Tenure')
      });
    }
  }

  return entries;
}

// ============================================================================
// 7. GET CUSTOMER RENTAL LEDGERS (ALL PASSBOOKS)
// ============================================================================
export const getCustomerRentalLedgers = async (req, res) => {
  try {
    const { search, tenure, status } = req.query;

    const query = {
      $or: [
        { takenForRental: true },
        { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
        { status: { $in: ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'] } }
      ]
    };

    const flats = await Flat.find(query)
      .populate('projectId', 'projectName projectCode')
      .populate('currentOwner.customerId', 'name mobileNo email panNumber aadhaarNumber address')
      .sort({ flatNumber: 1 })
      .lean();

    const ledgers = flats.map((flat) => {
      const rental = flat.rentalDetails || {};
      const owner = flat.currentOwner || {};
      const linkedCustomer = owner.customerId || {};

      const ownerName = owner.name || linkedCustomer.name || 'Unassigned';
      const ownerMobile = owner.mobileNo || linkedCustomer.mobileNo || '—';
      const ownerEmail = owner.email || linkedCustomer.email || '—';
      const ownerPan = owner.panNumber || linkedCustomer.panNumber || '—';
      const ownerBank = owner.bankDetails || {};

      const registryDate = rental.mouDate || flat.salesDetails?.agreementDate || owner.ownershipStartDate || null;
      const tenureMonths = Number(rental.tenureMonths || 36);
      const grossRent = Number(rental.guaranteedMonthlyRent || 0);
      const applyTds = rental.applyTds !== false;
      const tdsMode = rental.tdsMode || 'percentage';
      let tdsPercentage = Number(rental.tdsPercentage ?? 10);
      let tdsAmount = 0;

      if (!applyTds) {
        tdsPercentage = 0;
        tdsAmount = 0;
      } else if (tdsMode === 'amount' && rental.tdsAmount !== undefined && rental.tdsAmount !== null) {
        tdsAmount = Math.max(0, Number(rental.tdsAmount) || 0);
        tdsPercentage = grossRent > 0 ? Number(((tdsAmount / grossRent) * 100).toFixed(2)) : 0;
      } else {
        tdsPercentage = Number(rental.tdsPercentage ?? 10);
        tdsAmount = Number(rental.tdsAmount) > 0 ? Number(rental.tdsAmount) : Math.round(grossRent * (tdsPercentage / 100));
      }
      const netRent = grossRent - tdsAmount;

      const startDate = rental.startDate ? new Date(rental.startDate) : (registryDate ? new Date(registryDate) : new Date());
      const endDate = rental.endDate ? new Date(rental.endDate) : calculateEndDate(startDate, tenureMonths);

      const totalPaid = Number(rental.totalDisbursedToOwner || 0);
      const totalCommitmentGross = grossRent * tenureMonths;
      const totalCommitmentNet = netRent * tenureMonths;
      const amountOutstanding = Math.max(0, totalCommitmentGross - totalPaid);

      // Synthesize or use stored passbook entries
      const storedEntries = rental.ledgerEntries || [];
      const passbookEntries = (storedEntries.length >= tenureMonths)
        ? storedEntries
        : generatePassbookEntries({
            flatNumber: flat.flatNumber,
            startDate,
            tenureMonths,
            grossRent,
            applyTds,
            tdsMode,
            tdsPercentage,
            tdsAmount,
            netRent,
            totalPaid,
            dueDayOfMonth: Number(rental.dueDayOfMonth || 25),
            existingEntries: storedEntries
          });

      const paidCount = passbookEntries.filter((e) => e.status === 'paid').length;
      const dueCount = passbookEntries.filter((e) => e.status === 'due').length;
      const upcomingCount = passbookEntries.filter((e) => e.status === 'upcoming').length;

      return {
        flatId: flat._id,
        flatNumber: flat.flatNumber,
        floor: flat.floor,
        bhkType: flat.bhkType,
        projectName: flat.projectId?.projectName || 'Krishna Valley Heritage',
        ownerName,
        ownerMobile,
        ownerEmail,
        ownerPan,
        bankDetails: ownerBank,
        registryDate,
        startDate,
        endDate,
        tenureMonths,
        grossRent,
        applyTds,
        tdsMode,
        tdsPercentage,
        tdsAmount,
        netRent,
        totalCommitmentGross,
        totalCommitmentNet,
        totalPaid,
        amountOutstanding,
        paidCount,
        dueCount,
        upcomingCount,
        completionPercentage: tenureMonths > 0 ? Math.min(100, Math.round((paidCount / tenureMonths) * 100)) : 0,
        passbookEntries
      };
    });

    let filtered = ledgers;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.flatNumber.toLowerCase().includes(q) ||
          l.ownerName.toLowerCase().includes(q) ||
          l.ownerMobile.includes(q)
      );
    }
    if (tenure && tenure !== 'all' && !isNaN(Number(tenure))) {
      filtered = filtered.filter((l) => l.tenureMonths === Number(tenure));
    }
    if (status === 'completed') {
      filtered = filtered.filter((l) => l.paidCount >= l.tenureMonths);
    } else if (status === 'active') {
      filtered = filtered.filter((l) => l.paidCount < l.tenureMonths);
    }

    const totalAccounts = filtered.length;
    const totalDisbursedAll = filtered.reduce((s, l) => s + l.totalPaid, 0);
    const totalOutstandingAll = filtered.reduce((s, l) => s + l.amountOutstanding, 0);
    const totalCommitmentAll = filtered.reduce((s, l) => s + l.totalCommitmentGross, 0);
    const totalPaidMonthsAll = filtered.reduce((s, l) => s + l.paidCount, 0);

    return res.status(200).json({
      success: true,
      data: filtered,
      kpis: {
        totalAccounts,
        totalDisbursedAll,
        totalOutstandingAll,
        totalCommitmentAll,
        totalPaidMonthsAll
      }
    });
  } catch (error) {
    console.error('Error fetching customer rental ledgers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 8. AUTO-GENERATE PASSBOOKS FROM REGISTER FOR ALL (OR SPECIFIC) FLATS
// ============================================================================
export const autoGeneratePassbookFromRegister = async (req, res) => {
  try {
    const { flatId } = req.body;

    const query = flatId
      ? { _id: flatId }
      : {
          $or: [
            { takenForRental: true },
            { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
            { status: { $in: ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'] } }
          ]
        };

    const flats = await Flat.find(query);
    let updatedCount = 0;

    for (const flat of flats) {
      const rental = flat.rentalDetails || {};
      const owner = flat.currentOwner || {};
      const registryDate = rental.mouDate || flat.salesDetails?.agreementDate || owner.ownershipStartDate || new Date();
      const tenureMonths = Number(rental.tenureMonths || 36);
      const grossRent = Number(rental.guaranteedMonthlyRent || 0);
      const applyTds = rental.applyTds !== false;
      const tdsMode = rental.tdsMode || 'percentage';
      let tdsPercentage = Number(rental.tdsPercentage ?? 10);
      let tdsAmount = 0;

      if (!applyTds) {
        tdsPercentage = 0;
        tdsAmount = 0;
      } else if (tdsMode === 'amount' && rental.tdsAmount !== undefined && rental.tdsAmount !== null) {
        tdsAmount = Math.max(0, Number(rental.tdsAmount) || 0);
        tdsPercentage = grossRent > 0 ? Number(((tdsAmount / grossRent) * 100).toFixed(2)) : 0;
      } else {
        tdsPercentage = Number(rental.tdsPercentage ?? 10);
        tdsAmount = Number(rental.tdsAmount) > 0 ? Number(rental.tdsAmount) : Math.round(grossRent * (tdsPercentage / 100));
      }
      const netRent = grossRent - tdsAmount;
      const totalPaid = Number(rental.totalDisbursedToOwner || 0);
      const startDate = rental.startDate ? new Date(rental.startDate) : new Date(registryDate);
      const endDate = calculateEndDate(startDate, tenureMonths);

      const generatedEntries = generatePassbookEntries({
        flatNumber: flat.flatNumber,
        startDate,
        tenureMonths,
        grossRent,
        applyTds,
        tdsMode,
        tdsPercentage,
        tdsAmount,
        netRent,
        totalPaid,
        dueDayOfMonth: Number(rental.dueDayOfMonth || 25),
        existingEntries: rental.ledgerEntries || []
      });

      const totalCommitment = grossRent * tenureMonths;
      const remainingPayable = Math.max(0, totalCommitment - totalPaid);

      if (!flat.rentalDetails) flat.rentalDetails = {};
      flat.rentalDetails.startDate = startDate;
      flat.rentalDetails.endDate = endDate;
      flat.rentalDetails.tenureMonths = tenureMonths;
      flat.rentalDetails.total36MonthCommitment = totalCommitment;
      flat.rentalDetails.totalDisbursedToOwner = totalPaid;
      flat.rentalDetails.remainingPayableToOwner = remainingPayable;
      flat.rentalDetails.ledgerEntries = generatedEntries;
      flat.rentalDetails.isRentBackActive = true;
      flat.takenForRental = true;

      await flat.save();
      updatedCount++;
    }

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    return res.status(200).json({
      success: true,
      message: `Successfully generated passbook ledgers for ${updatedCount} properties.`,
      updatedCount
    });
  } catch (error) {
    console.error('Error auto-generating passbook ledgers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 9. UPLOAD PASSBOOK EXCEL SHEET, CALCULATE MONTHS & GENERATE ALL PAID ENTRIES
// ============================================================================
export const uploadLedgerExcelAndGenerate = async (req, res) => {
  try {
    let rows = [];

    if (req.file) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else if (Array.isArray(req.body.records)) {
      rows = req.body.records;
    } else if (Array.isArray(req.body)) {
      rows = req.body;
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No records found in Excel file' });
    }

    let updatedCount = 0;
    const notFoundFlats = [];
    const errors = [];
    const processedSummaries = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const flatNumber = String(
        row.flatNumber || row['Flat No'] || row['Flat Number'] || row.flat || row['Unit'] || ''
      ).trim();

      if (!flatNumber) {
        errors.push(`Row ${i + 1}: Missing Flat Number`);
        continue;
      }

      // Find flat with regex
      let flat = await Flat.findOne({
        flatNumber: { $regex: new RegExp(`^${flatNumber.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&')}$`, 'i') }
      });

      if (!flat) {
        const numOnly = flatNumber.replace(/\D/g, '');
        if (numOnly) {
          flat = await Flat.findOne({
            flatNumber: { $regex: new RegExp(`^.*${numOnly}$`, 'i') }
          });
        }
      }

      if (!flat) {
        notFoundFlats.push(flatNumber);
        continue;
      }

      // Parse user fields from Excel
      const ownerName = String(
        row.ownerName || row['Owner Name'] || row['Customer Name'] || row.name || flat.currentOwner?.name || ''
      ).trim();

      const tenureMonths = Number(
        row.tenureMonths || row['Tenure (Months)'] || row['Tenure'] || row['Tenure in Months'] || flat.rentalDetails?.tenureMonths || 36
      ) || 36;

      // Check for Net Rental Amount vs Gross Rent
      let netRent = Number(
        row.netAmount || row['Net Rental Amount'] || row['Net Rent'] || row['Net Amount'] || row['Monthly Net Rent'] || 0
      );
      let grossRent = Number(
        row.rentAmount || row['Rent Amount'] || row['Gross Rent'] || row['Monthly Gross Rent'] || flat.rentalDetails?.guaranteedMonthlyRent || 0
      );

      const rawTds = String(row.applyTds || row['TDS Applied'] || row['Apply TDS'] || row['TDS'] || '').trim().toLowerCase();
      const applyTds = !['no', 'false', '0', '0%'].includes(rawTds);

      const rawTdsAmount = row.tdsAmount ?? row['TDS Amount'] ?? row['TDS (Amount)'] ?? row['TDS (₹)'] ?? row['TDS Value'] ?? row['TDS Deducted'] ?? row['TDS Amt'];
      const rawTdsPercent = row.tdsPercentage ?? row['TDS %'] ?? row['TDS Percentage'] ?? row['TDS Rate'] ?? row.tdsPercent;

      let tdsMode = 'percentage';
      let tdsPercentage = 10;
      let tdsAmount = 0;

      if (!applyTds) {
        tdsPercentage = 0;
        tdsAmount = 0;
      } else if (rawTdsAmount !== undefined && rawTdsAmount !== '' && !isNaN(Number(rawTdsAmount)) && Number(rawTdsAmount) > 0) {
        tdsMode = 'amount';
        tdsAmount = Math.max(0, Number(rawTdsAmount));
      } else if (rawTdsPercent !== undefined && rawTdsPercent !== '') {
        tdsMode = 'percentage';
        const cleanPct = String(rawTdsPercent).replace(/%/g, '').trim();
        tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
      } else if (rawTds && rawTds.includes('%')) {
        const cleanPct = rawTds.replace(/%/g, '').trim();
        tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
      }

      // Reconcile Gross vs Net and TDS Amount / Percentage
      if (netRent > 0 && grossRent <= 0) {
        if (tdsMode === 'amount') {
          grossRent = netRent + tdsAmount;
          tdsPercentage = grossRent > 0 ? Number(((tdsAmount / grossRent) * 100).toFixed(2)) : 0;
        } else {
          grossRent = applyTds ? Math.round(netRent / (1 - (tdsPercentage / 100) || 0.9)) : netRent;
          tdsAmount = applyTds ? grossRent - netRent : 0;
        }
      } else if (grossRent > 0 && netRent <= 0) {
        if (tdsMode === 'amount') {
          tdsPercentage = grossRent > 0 ? Number(((tdsAmount / grossRent) * 100).toFixed(2)) : 0;
        } else {
          tdsAmount = applyTds ? Math.round(grossRent * (tdsPercentage / 100)) : 0;
        }
        netRent = grossRent - tdsAmount;
      } else if (grossRent > 0 && netRent > 0) {
        if (applyTds && tdsAmount === 0) {
          tdsAmount = Math.max(0, grossRent - netRent);
          if (tdsMode === 'amount') {
            tdsPercentage = grossRent > 0 ? Number(((tdsAmount / grossRent) * 100).toFixed(2)) : 0;
          }
        }
      }

      const totalPaid = Number(
        row.totalPaid || row['Total Paid'] || row['Paid'] || row['Total Amount Paid'] || row['Disbursed'] || 0
      ) || 0;

      const registryDateStr = row.registryDate || row['Registry Date'] || row['MOU Date'] || flat.rentalDetails?.mouDate || null;
      const startDateStr = row.startDate || row['Payment Starting Date'] || row['Start Date'] || registryDateStr || flat.rentalDetails?.startDate;

      const startDate = startDateStr ? new Date(startDateStr) : new Date();
      const endDate = calculateEndDate(startDate, tenureMonths);

      // Perform month calculations (without TDS)
      const monthlyGross = grossRent > 0 ? grossRent : 1;
      const paidMonthsCount = Math.min(tenureMonths, Math.round(totalPaid / monthlyGross));
      const remainderPaid = totalPaid % monthlyGross;
      const totalCommitmentGross = tenureMonths * monthlyGross;
      const outstandingCalculated = Math.max(0, totalCommitmentGross - totalPaid);

      // If user provided outstanding, we can also record it or use calculated
      const providedOutstanding = Number(row.amountOutstanding || row['Amount Outstanding'] || row['Outstanding'] || row['Balance']);
      const finalOutstanding = !isNaN(providedOutstanding) && providedOutstanding >= 0 ? providedOutstanding : outstandingCalculated;

      // Generate complete month-by-month passbook array
      const generatedEntries = generatePassbookEntries({
        flatNumber: flat.flatNumber,
        startDate,
        tenureMonths,
        grossRent,
        applyTds,
        tdsMode,
        tdsPercentage,
        tdsAmount,
        netRent,
        totalPaid,
        dueDayOfMonth: Number(flat.rentalDetails?.dueDayOfMonth || 25),
        existingEntries: []
      });

      // Update owner name if provided
      if (ownerName && (!flat.currentOwner?.name || flat.currentOwner.name === 'Unassigned')) {
        if (!flat.currentOwner) flat.currentOwner = {};
        flat.currentOwner.name = ownerName;
      }

      // Save into flat rentalDetails
      if (!flat.rentalDetails) flat.rentalDetails = {};
      flat.rentalDetails.isRentBackActive = true;
      flat.rentalDetails.guaranteedMonthlyRent = grossRent;
      flat.rentalDetails.applyTds = applyTds;
      flat.rentalDetails.tdsMode = tdsMode;
      flat.rentalDetails.tdsPercentage = tdsPercentage;
      flat.rentalDetails.tdsAmount = tdsAmount;
      flat.rentalDetails.startDate = startDate;
      flat.rentalDetails.endDate = endDate;
      flat.rentalDetails.tenureMonths = tenureMonths;
      flat.rentalDetails.total36MonthCommitment = totalCommitmentGross;
      flat.rentalDetails.totalDisbursedToOwner = totalPaid;
      flat.rentalDetails.remainingPayableToOwner = finalOutstanding;
      flat.rentalDetails.ledgerEntries = generatedEntries;
      flat.takenForRental = true;

      if (flat.status === 'available') {
        flat.status = 'sold';
      }

      await flat.save();
      updatedCount++;

      processedSummaries.push({
        flatNumber: flat.flatNumber,
        ownerName: flat.currentOwner?.name || ownerName,
        tenureMonths,
        monthlyNetRent: monthlyUnit,
        totalPaid,
        paidMonthsCount,
        remainderPaid,
        outstanding: finalOutstanding
      });
    }

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${rows.length} rows. Successfully calculated & updated passbooks for ${updatedCount} properties.`,
      data: {
        totalRows: rows.length,
        updatedCount,
        notFoundFlats,
        errors,
        processedSummaries
      }
    });
  } catch (error) {
    console.error('Error uploading ledger excel and generating passbook:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 10. UPDATE / DISBURSE INDIVIDUAL PASSBOOK ENTRY
// ============================================================================
export const updatePassbookEntry = async (req, res) => {
  try {
    const { flatId } = req.params;
    const { monthIndex, paymentDate, paymentMode, referenceNumber, remarks, status = 'paid' } = req.body;

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    const entries = flat.rentalDetails?.ledgerEntries || [];
    const entry = entries.find((e) => e.monthIndex === Number(monthIndex));

    if (!entry) {
      return res.status(404).json({ success: false, message: `Passbook entry for month ${monthIndex} not found` });
    }

    entry.status = status;
    entry.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    if (paymentMode) entry.paymentMode = paymentMode;
    if (referenceNumber) entry.referenceNumber = referenceNumber;
    if (remarks) entry.remarks = remarks;

    // Recalculate totals
    const paidSum = entries
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + (e.netAmountPaid || 0), 0);

    flat.rentalDetails.totalDisbursedToOwner = paidSum;
    const tenureMonths = flat.rentalDetails.tenureMonths || 36;
    const grossRent = Number(flat.rentalDetails.guaranteedMonthlyRent || 0);
    const totalCommitment = tenureMonths * grossRent;
    flat.rentalDetails.total36MonthCommitment = totalCommitment;
    flat.rentalDetails.remainingPayableToOwner = Math.max(0, totalCommitment - paidSum);

    await flat.save();

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
    }

    return res.status(200).json({
      success: true,
      message: `Passbook entry for Month ${monthIndex} updated successfully.`,
      data: flat.rentalDetails
    });
  } catch (error) {
    console.error('Error updating passbook entry:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 11. DELETE / UNENROLL RENTAL ENTRY
// ============================================================================
export const deleteRentalEntry = async (req, res) => {
  try {
    const { flatId } = req.params;

    let flat = null;
    if (mongoose.Types.ObjectId.isValid(flatId)) {
      flat = await Flat.findById(flatId);
    }
    if (!flat) {
      flat = await Flat.findOne({
        flatNumber: { $regex: new RegExp(`^${flatId.trim()}$`, 'i') }
      });
    }

    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat record not found' });
    }

    const flatNum = flat.flatNumber;

    // Reset rental details completely
    flat.takenForRental = false;
    flat.rentalDetails = {
      isRentBackActive: false,
      guaranteedMonthlyRent: 0,
      applyTds: true,
      tdsPercentage: 10,
      mouDate: null,
      startDate: null,
      endDate: null,
      tenureMonths: 36,
      dueDayOfMonth: 25,
      total36MonthCommitment: 0,
      totalDisbursedToOwner: 0,
      remainingPayableToOwner: 0,
      ledgerEntries: []
    };

    // If flat has no sales details or ownership document, reset status to available
    if (flat.status === 'sold' && (!flat.salesDetails?.buyerName || !flat.currentOwner?.customerId)) {
      flat.status = 'available';
    }

    await flat.save();

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    return res.status(200).json({
      success: true,
      message: `Rental record for Flat ${flatNum} deleted and unenrolled successfully.`,
      data: { flatId, flatNumber: flatNum }
    });
  } catch (error) {
    console.error('Error deleting rental entry:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 12. DELETE PREVIOUS OWNER HISTORY ENTRY (FROM TABLE 2)
// ============================================================================
export const deleteOwnershipHistoryEntry = async (req, res) => {
  try {
    const { flatId, historyId } = req.params;

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat record not found' });
    }

    if (!Array.isArray(flat.ownershipHistory)) {
      return res.status(404).json({ success: false, message: 'No ownership history found' });
    }

    // Filter out history item by _id or generated key
    flat.ownershipHistory = flat.ownershipHistory.filter(
      (h, idx) => String(h._id) !== String(historyId) && `${flatId}-${idx}` !== String(historyId)
    );

    await flat.save();

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
    }

    return res.status(200).json({
      success: true,
      message: 'Previous owner history entry deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting ownership history entry:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
