import SalesLead from '../models/SalesLead.js';
import Lead from '../models/Lead.js';
import Project from '../models/Project.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import RentalManagement from '../models/RentalManagement.js';
import { uploadFileToS3 } from '../config/s3.js';
import { autoCreditAgentBookingCommission } from './agentController.js';
import { escapeRegex } from '../utils/regexUtil.js';
import mongoose from 'mongoose';

// Convert a CRM Lead into a Sales Lead OR create a direct booking
export const convertLeadToSales = async (req, res) => {
  try {
    const {
      leadId,
      projectId,
      buildingId,
      flatId,
      name,
      mobileNo,
      email,
      agreedDealPrice,
      bookingTokenAmount,
      bookingAmount,
      paymentPlanType
    } = req.body;

    let lead = null;
    if (leadId) {
      lead = await Lead.findById(leadId).populate('assignedFlat');
      if (!lead) {
        return res.status(404).json({ success: false, message: 'CRM Lead not found' });
      }
    } else if (name && mobileNo) {
      // Find or create lead on-the-fly for direct sales bookings
      lead = await Lead.findOne({ mobileNo });
      if (!lead) {
        lead = await Lead.create({
          name: name.trim(),
          mobileNo: mobileNo.trim(),
          email: email ? email.trim() : '',
          status: 'converted',
          source: 'walk_in',
          notes: 'Direct booking created from Sales Registry'
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Either leadId or buyer Name and Mobile Number are required' });
    }

    // Determine target property details
    const targetFlatId = flatId || lead.assignedFlat?._id || lead.assignedFlat;

    // Check if already converted
    const existing = await SalesLead.findOne({ leadId })
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status');

    if (existing) {
      const flatToAssign = targetFlatId || existing.flatId?._id || existing.flatId;
      await Lead.findByIdAndUpdate(leadId, {
        status: 'converted',
        assignedFlat: flatToAssign
      });
      return res.json({
        success: true,
        message: 'Lead is already in Sales registry',
        data: existing
      });
    }

    if (!targetFlatId) {
      return res.status(400).json({
        success: false,
        message: 'A flat must be selected/assigned to convert this lead to Sales'
      });
    }

    const flat = await Flat.findById(targetFlatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Selected Flat not found' });
    }

    const targetProjectId = projectId || flat.projectId;
    const targetBuildingId = buildingId || flat.buildingId;
    const dealValue = (agreedDealPrice !== undefined && agreedDealPrice !== null && Number(agreedDealPrice) > 0)
      ? Number(agreedDealPrice)
      : (flat.basePrice || 4500000);
    const tokenAmount = (bookingTokenAmount !== undefined && bookingTokenAmount !== null)
      ? Number(bookingTokenAmount)
      : (bookingAmount !== undefined ? Number(bookingAmount) : 0);
    const planType = paymentPlanType || 'installment';

    const salesLead = new SalesLead({
      leadId: lead._id,
      name: lead.name,
      mobileNo: lead.mobileNo,
      email: lead.email || '',
      projectId: targetProjectId,
      buildingId: targetBuildingId,
      flatId: targetFlatId,
      salesStatus: 'converted',
      booking: {
        isBooked: tokenAmount > 0,
        bookingDate: new Date(),
        bookingAmount: tokenAmount,
        bookingStatus: tokenAmount > 0 ? 'confirmed' : 'pending'
      },
      agreement: {
        required: true,
        uploaded: false,
        verificationStatus: 'pending'
      },
      paymentPlan: {
        type: planType,
        totalAmount: dealValue,
        bookingAmount: tokenAmount,
        remainingAmount: Math.max(0, dealValue - tokenAmount),
        numberOfInstallments: 0
      },
      installments: [],
      receipts: [],
      demandLetters: [],
      followUps: (lead.followUps || []).map((fu) => ({
        date: fu.date,
        mode: fu.mode,
        notes: fu.notes,
        nextFollowUpDate: fu.nextFollowUpDate,
        status: fu.status
      })),
      possession: {
        status: 'not_ready'
      },
      cancellation: {
        isCancelled: false,
        cancellationAmount: 0,
        refundAmount: 0
      },
      refund: {
        status: 'not_applicable',
        refundAmount: 0
      }
    });

    const saved = await salesLead.save();

    // Mark flat as hold / booked
    await Flat.findByIdAndUpdate(targetFlatId, { status: 'hold' });

    // CRITICAL: Update Lead status to 'converted' and assign flat in MongoDB
    await Lead.findByIdAndUpdate(lead._id, { status: 'converted', assignedFlat: targetFlatId });

    const populated = await SalesLead.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('leadId', 'name mobileNo');

    console.log(`[MongoDB] Lead "${lead.name}" converted to SalesLead ID: ${saved._id}`);
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error converting lead to sales:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Sales Leads with filtering & search
export const getSalesLeads = async (req, res) => {
  try {
    const { search, salesStatus, projectId } = req.query;
    let filter = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { name: regex },
        { mobileNo: regex },
        { email: regex },
        { 'agreement.agreementNumber': regex }
      ];
    }

    if (salesStatus) {
      filter.salesStatus = salesStatus;
    }

    if (projectId) {
      filter.projectId = projectId;
    }

    const salesLeads = await SalesLead.find(filter)
      .populate('projectId', 'projectName projectCode buildings')
      .populate('flatId', 'flatNumber status takenForRental')
      .populate('leadId', 'name mobileNo')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, count: salesLeads.length, data: salesLeads });
  } catch (error) {
    console.error('Error fetching sales leads:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Sales Lead by ID
export const getSalesLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const salesLead = await SalesLead.findById(id)
      .populate('projectId')
      .populate('flatId')
      .populate('leadId');

    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });
    return res.json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error fetching sales lead by id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Booking Status & Token Amount
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBooked, bookingDate, bookingAmount, bookingStatus } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    salesLead.booking = {
      isBooked: isBooked !== undefined ? isBooked : true,
      bookingDate: bookingDate ? new Date(bookingDate) : (salesLead.booking.bookingDate || new Date()),
      bookingAmount: bookingAmount !== undefined ? Number(bookingAmount) : salesLead.booking.bookingAmount,
      bookingStatus: bookingStatus || 'confirmed'
    };

    if (salesLead.booking.bookingStatus === 'confirmed' || salesLead.booking.isBooked) {
      salesLead.salesStatus = 'booked';
      
      // 1. Mark flat as sold in Flat collection
      if (salesLead.flatId) {
        await Flat.findByIdAndUpdate(salesLead.flatId, { status: 'sold' });
      }

      // 2. Auto-sync / create buyer as verified owner in Customer collection
      try {
        let customer = await Customer.findOne({ mobileNo: salesLead.mobileNo });
        if (!customer) {
          customer = new Customer({
            customerType: 'owner',
            name: salesLead.name,
            mobileNo: salesLead.mobileNo,
            email: salesLead.email || '',
            ownerDetails: {
              propertyIds: salesLead.flatId ? [salesLead.flatId] : [],
              ownershipType: 'individual',
              ownershipPercentage: 100
            },
            status: 'active'
          });
          await customer.save();
          console.log(`[Customer Registry] Auto-created new owner "${customer.name}" for sold flat`);
        } else {
          customer.customerType = 'owner';
          if (!customer.ownerDetails) {
            customer.ownerDetails = {
              propertyIds: salesLead.flatId ? [salesLead.flatId] : [],
              ownershipType: 'individual',
              ownershipPercentage: 100
            };
          } else if (salesLead.flatId) {
            const propIds = (customer.ownerDetails.propertyIds || []).map((p) => (p._id || p).toString());
            if (!propIds.includes(salesLead.flatId.toString())) {
              customer.ownerDetails.propertyIds.push(salesLead.flatId);
            }
          }
          await customer.save();
          console.log(`[Customer Registry] Synced sold flat to existing customer "${customer.name}"`);
        }
      } catch (custErr) {
        console.error('Error auto-syncing buyer to Customer registry:', custErr);
      }

      // 3. Automated Agent Commission Credit upon Flat Booking
      try {
        const flatDoc = salesLead.flatId ? await Flat.findById(salesLead.flatId) : null;
        await autoCreditAgentBookingCommission(salesLead, flatDoc, salesLead.paymentPlan?.totalAmount);
      } catch (commErr) {
        console.error('Error auto-crediting agent commission on booking:', commErr);
      }
    }

    await salesLead.save();
    return res.json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error updating booking:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Agreement Details Manually
export const updateAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      uploaded, 
      documentUrl, 
      documentName, 
      agreementDate, 
      agreementNumber, 
      verificationStatus 
    } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    salesLead.agreement = {
      required: true,
      uploaded: uploaded !== undefined ? uploaded : true,
      documentUrl: documentUrl || salesLead.agreement.documentUrl,
      documentName: documentName || salesLead.agreement.documentName || 'Buyer_Allotment_Agreement.pdf',
      uploadedAt: new Date(),
      agreementDate: agreementDate ? new Date(agreementDate) : (salesLead.agreement.agreementDate || new Date()),
      agreementNumber: agreementNumber || salesLead.agreement.agreementNumber,
      verificationStatus: verificationStatus || 'verified'
    };

    if (salesLead.agreement.verificationStatus === 'verified') {
      salesLead.salesStatus = 'agreement_completed';
    } else {
      salesLead.salesStatus = 'agreement_pending';
    }

    await salesLead.save();
    return res.json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error updating agreement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Agreement Document to AWS S3
export const uploadAgreementFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { agreementNumber, agreementDate, verificationStatus } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No agreement document file was uploaded' });
    }

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    // Upload to S3 (or persistent storage)
    const uploadResult = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'agreements');

    salesLead.agreement = {
      required: true,
      uploaded: true,
      documentUrl: uploadResult.documentUrl,
      documentName: uploadResult.documentName,
      uploadedAt: new Date(),
      agreementDate: agreementDate ? new Date(agreementDate) : (salesLead.agreement.agreementDate || new Date()),
      agreementNumber: agreementNumber || salesLead.agreement.agreementNumber || `AGR-${Date.now().toString().slice(-6)}`,
      verificationStatus: verificationStatus || 'verified'
    };

    if (salesLead.agreement.verificationStatus === 'verified') {
      salesLead.salesStatus = 'agreement_completed';
    } else {
      salesLead.salesStatus = 'agreement_pending';
    }

    await salesLead.save();

    console.log(`[Sales Agreement] Uploaded for ${salesLead.name}: ${uploadResult.documentUrl} (Storage: ${uploadResult.storage})`);
    return res.json({
      success: true,
      message: `Agreement uploaded successfully to ${uploadResult.storage}`,
      data: salesLead,
      uploadDetails: uploadResult
    });
  } catch (error) {
    console.error('Error uploading agreement file:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Setup / Generate Payment Plan and Installments
export const setupPaymentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type, // 'full_payment' | 'installment' | 'custom'
      totalAmount,
      bookingAmount,
      numberOfInstallments,
      customInstallments
    } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    const total = Number(totalAmount) || salesLead.booking?.agreedDealPrice || 0;
    const token = Number(bookingAmount) !== undefined && !isNaN(Number(bookingAmount)) ? Number(bookingAmount) : (salesLead.booking?.bookingAmount || 0);
    const remaining = Math.max(0, total - token);
    const numInst = Number(numberOfInstallments) || 1;

    let generatedInstallments = [];

    if (customInstallments && Array.isArray(customInstallments) && customInstallments.length > 0) {
      let allocatedTotal = 0;
      generatedInstallments = customInstallments.map((inst, idx) => {
        const amt = Number(inst.amount) || 0;
        allocatedTotal += amt;
        const isPaid = inst.isPaid === true || (idx === 0 && token > 0 && amt === token);
        const pAmt = isPaid ? amt : (Number(inst.paidAmount) || 0);
        const rAmt = isPaid ? 0 : Math.max(0, amt - pAmt);
        return {
          installmentNumber: idx + 1,
          name: inst.name || `Milestone ${idx + 1}`,
          dueDate: inst.dueDate ? new Date(inst.dueDate) : new Date(Date.now() + (idx + 1) * 30 * 86400000),
          amount: amt,
          paidAmount: pAmt,
          remainingAmount: rAmt,
          status: rAmt === 0 ? 'paid' : (pAmt > 0 ? 'partially_paid' : 'upcoming'),
          paidAt: isPaid ? (salesLead.booking?.bookingDate || new Date()) : null
        };
      });
    } else {
      // Milestone 1: Booking Advance Milestone (Credited as Paid)
      if (token > 0) {
        generatedInstallments.push({
          installmentNumber: 1,
          name: 'Booking Token / Advance',
          dueDate: salesLead.booking?.bookingDate || new Date(),
          amount: token,
          paidAmount: token,
          remainingAmount: 0,
          status: 'paid',
          paidAt: salesLead.booking?.bookingDate || new Date()
        });
      }

      if (remaining > 0) {
        const perInstallmentAmount = Math.round(remaining / numInst);
        for (let i = 1; i <= numInst; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + i * 30); // 30-day interval milestones

          const amount = (i === numInst) 
            ? (remaining - perInstallmentAmount * (numInst - 1)) 
            : perInstallmentAmount;

          generatedInstallments.push({
            installmentNumber: generatedInstallments.length + 1,
            name: `Milestone ${generatedInstallments.length + 1}`,
            dueDate: dueDate,
            amount: amount,
            paidAmount: 0,
            remainingAmount: amount,
            status: 'upcoming'
          });
        }
      }
    }

    const calculatedTotal = generatedInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0) || total;
    const calculatedPaid = generatedInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
    const calculatedRemaining = Math.max(0, calculatedTotal - calculatedPaid);

    salesLead.paymentPlan = {
      type: type || 'installment',
      totalAmount: calculatedTotal,
      bookingAmount: calculatedPaid,
      remainingAmount: calculatedRemaining,
      numberOfInstallments: generatedInstallments.length,
      decidedAt: new Date()
    };

    salesLead.installments = generatedInstallments;
    salesLead.salesStatus = calculatedRemaining === 0 ? 'fully_paid' : 'payment_in_progress';

    await salesLead.save();
    return res.json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error setting up payment plan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Record Payment Against Installment & Auto-Generate Receipt
export const recordInstallmentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentNumber, paidAmount, receiptNumber } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    let remainingToCredit = Number(paidAmount);
    if (!remainingToCredit || remainingToCredit <= 0) {
      return res.status(400).json({ success: false, message: 'Valid paidAmount is required' });
    }

    const startInstNum = Number(installmentNumber) || 1;
    const sortedInstallments = [...(salesLead.installments || [])].sort((a, b) => a.installmentNumber - b.installmentNumber);

    // Filter installments that actually have remaining amount > 0
    let startIndex = sortedInstallments.findIndex(i => i.installmentNumber === startInstNum);
    if (startIndex === -1 || (sortedInstallments[startIndex]?.remainingAmount || 0) <= 0) {
      // Find the first unpaid installment with positive balance
      startIndex = sortedInstallments.findIndex(i => (i.remainingAmount || 0) > 0);
    }

    if (startIndex === -1) {
      return res.status(400).json({ success: false, message: 'All installments for this unit are already fully paid. No remaining balance to credit.' });
    }

    let actualCredited = 0;

    for (let i = startIndex; i < sortedInstallments.length && remainingToCredit > 0; i++) {
      const inst = sortedInstallments[i];
      const maxCanPay = Math.max(0, inst.amount - (inst.paidAmount || 0));
      if (maxCanPay > 0) {
        const creditNow = Math.min(maxCanPay, remainingToCredit);
        inst.paidAmount = (inst.paidAmount || 0) + creditNow;
        inst.remainingAmount = Math.max(0, inst.amount - inst.paidAmount);
        inst.status = inst.remainingAmount === 0 ? 'paid' : 'partially_paid';
        inst.paidAt = new Date();
        remainingToCredit -= creditNow;
        actualCredited += creditNow;
      }
    }

    // Auto-Generate Receipt for the exact amount credited
    const genReceiptNumber = receiptNumber || `RCP-${Date.now().toString().slice(-6)}`;
    salesLead.receipts.push({
      receiptNumber: genReceiptNumber,
      amount: actualCredited,
      generatedAt: new Date(),
      documentUrl: `/receipts/${genReceiptNumber}.pdf`
    });

    // Check overall installments completion
    const allPaid = salesLead.installments.every((inst) => inst.status === 'paid');
    if (allPaid && salesLead.installments.length > 0) {
      salesLead.salesStatus = 'fully_paid';
    } else {
      salesLead.salesStatus = 'payment_in_progress';
    }

    await salesLead.save();
    return res.json({ success: true, data: salesLead, receiptNumber: genReceiptNumber });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk Import Previous Payments from Excel / Ledger
export const importPreviousPayments = async (req, res) => {
  try {
    const { payments } = req.body;
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ success: false, message: 'No payment records provided in payload' });
    }

    const Flat = (await import('../models/Flat.js')).default;

    const summary = {
      totalRows: payments.length,
      creditedCount: 0,
      totalAmountCredited: 0,
      errors: []
    };

    for (let idx = 0; idx < payments.length; idx++) {
      const row = payments[idx];
      const rowNumber = idx + 2;

      const flatNumber = String(row.flatNo || row.flat_no || row.unitNo || row.unit || '').trim();
      const paidAmount = Number(row.amount || row.paidAmount || row.amountPaid || row.paymentAmount || 0);
      const receiptNumber = String(row.receiptNumber || row.receiptNo || row.utr || row.referenceNo || `RCP-PREV-${flatNumber}-${Date.now().toString().slice(-4)}`).trim();
      const paymentDate = row.paymentDate ? new Date(row.paymentDate) : new Date();
      const paymentMode = String(row.paymentMode || 'bank_transfer').toLowerCase().trim();

      if (!flatNumber) {
        summary.errors.push(`Row ${rowNumber}: Skipped (Missing flat number).`);
        continue;
      }

      if (paidAmount <= 0) {
        summary.errors.push(`Row ${rowNumber} (Flat ${flatNumber}): Skipped (Invalid or 0 paid amount).`);
        continue;
      }

      const flat = await Flat.findOne({ flatNumber: new RegExp(`^${flatNumber}$`, 'i') });
      if (!flat) {
        summary.errors.push(`Row ${rowNumber}: Flat ${flatNumber} not found in inventory.`);
        continue;
      }

      let salesLead = await SalesLead.findOne({ flatId: flat._id, salesStatus: { $ne: 'cancelled' } });
      if (!salesLead) {
        summary.errors.push(`Row ${rowNumber}: No active sales allotment found for Flat ${flatNumber}.`);
        continue;
      }

      let remainingToCredit = paidAmount;
      const sortedInstallments = [...(salesLead.installments || [])].sort((a, b) => a.installmentNumber - b.installmentNumber);
      let actualCredited = 0;

      for (let i = 0; i < sortedInstallments.length && remainingToCredit > 0; i++) {
        const inst = sortedInstallments[i];
        const maxCanPay = Math.max(0, inst.amount - (inst.paidAmount || 0));
        if (maxCanPay > 0) {
          const creditNow = Math.min(maxCanPay, remainingToCredit);
          inst.paidAmount = (inst.paidAmount || 0) + creditNow;
          inst.remainingAmount = Math.max(0, inst.amount - inst.paidAmount);
          inst.status = inst.remainingAmount === 0 ? 'paid' : 'partially_paid';
          inst.paidAt = paymentDate;
          remainingToCredit -= creditNow;
          actualCredited += creditNow;
        }
      }

      // Add verified receipt
      salesLead.receipts.push({
        receiptNumber,
        amount: paidAmount,
        paymentMode,
        generatedAt: paymentDate,
        documentUrl: `/receipts/${receiptNumber}.pdf`
      });

      const allPaid = salesLead.installments.length > 0 && salesLead.installments.every((inst) => inst.status === 'paid');
      if (allPaid) {
        salesLead.salesStatus = 'fully_paid';
      }

      await salesLead.save();

      summary.creditedCount++;
      summary.totalAmountCredited += paidAmount;
    }

    return res.json({
      success: true,
      message: `Successfully processed ${summary.creditedCount} payment records totaling ₹${summary.totalAmountCredited.toLocaleString('en-IN')}.`,
      data: summary
    });
  } catch (error) {
    console.error('Error importing previous payments:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Demand Letter
export const generateDemandLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentNumber, amountDue, dueDate, demandLetterNumber } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    const letterNumber = demandLetterNumber || `DEM-${Date.now().toString().slice(-6)}`;

    salesLead.demandLetters.push({
      demandLetterNumber: letterNumber,
      installmentNumber: Number(installmentNumber),
      amountDue: Number(amountDue),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
      generatedAt: new Date(),
      documentUrl: `/demand-letters/${letterNumber}.pdf`,
      status: 'generated'
    });

    await salesLead.save();
    return res.status(201).json({ success: true, data: salesLead, demandLetterNumber: letterNumber });
  } catch (error) {
    console.error('Error generating demand letter:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add Sales Follow-up
export const addSalesFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, mode, notes, nextFollowUpDate, status } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    salesLead.followUps.push({
      date: date || new Date(),
      mode: mode || 'call',
      notes: notes || '',
      nextFollowUpDate: nextFollowUpDate || null,
      status: status || 'pending'
    });

    await salesLead.save();
    return res.status(201).json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error adding sales follow-up:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Possession Status with 3-Year Rental Lock-in Enforcement
export const updatePossession = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduledDate, possessionDate, remarks, possessionLetterUrl, forceOverride } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    // Enforce 3-Year Rental Lock-in Business Rule:
    // If flat is enrolled in rental program, physical possession is only available after 3 years (36 months).
    if (salesLead.flatId && (status === 'completed' || status === 'scheduled' || status === 'ready')) {
      const flat = await Flat.findById(salesLead.flatId);
      const rental = await RentalManagement.findOne({
        $or: [
          { flatId: salesLead.flatId },
          { flatIds: salesLead.flatId },
          { 'leasedUnits.flatId': salesLead.flatId }
        ],
        status: { $ne: 'terminated' }
      }).sort({ createdAt: -1 });

      const isUnderRental = flat?.takenForRental || flat?.status === 'leased' || !!rental;

      if (isUnderRental && !forceOverride) {
        let rentalStartDate = null;
        if (rental?.rentBack?.startDate) {
          rentalStartDate = new Date(rental.rentBack.startDate);
        } else if (rental?.tenantAgreement?.startDate) {
          rentalStartDate = new Date(rental.tenantAgreement.startDate);
        } else if (rental?.createdAt) {
          rentalStartDate = new Date(rental.createdAt);
        } else if (salesLead.booking?.bookingDate) {
          rentalStartDate = new Date(salesLead.booking.bookingDate);
        } else if (flat?.createdAt) {
          rentalStartDate = new Date(flat.createdAt);
        }

        if (rentalStartDate) {
          const lockInEndDate = new Date(rentalStartDate);
          lockInEndDate.setFullYear(lockInEndDate.getFullYear() + 3);
          const now = new Date();

          if (now < lockInEndDate) {
            const diffMs = lockInEndDate.getTime() - now.getTime();
            const remDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const remMonths = Math.ceil(remDays / 30.4375);

            return res.status(400).json({
              success: false,
              isLockedByRental: true,
              message: `Possession cannot be handed over. Flat is locked under the mandatory 3-Year Rental Program until ${lockInEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${remMonths} months / ${remDays} days remaining).`,
              lockInEndDate,
              remainingMonths: remMonths,
              remainingDays: remDays
            });
          }
        }
      }
    }

    salesLead.possession = {
      status: status || 'ready',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : salesLead.possession.scheduledDate,
      possessionDate: possessionDate ? new Date(possessionDate) : (status === 'completed' ? new Date() : null),
      possessionLetterUrl: possessionLetterUrl || salesLead.possession.possessionLetterUrl,
      remarks: remarks || salesLead.possession.remarks
    };

    if (status === 'completed') {
      salesLead.salesStatus = 'possessed';

      // 1. Mark flat as sold
      if (salesLead.flatId) {
        await Flat.findByIdAndUpdate(salesLead.flatId, { status: 'sold' });
      }

      // 2. Sync to Customer owner registry
      try {
        let customer = await Customer.findOne({ mobileNo: salesLead.mobileNo });
        if (customer) {
          customer.customerType = 'owner';
          if (!customer.ownerDetails) {
            customer.ownerDetails = {
              propertyIds: salesLead.flatId ? [salesLead.flatId] : [],
              ownershipType: 'individual',
              ownershipPercentage: 100
            };
          } else if (salesLead.flatId) {
            const propIds = (customer.ownerDetails.propertyIds || []).map((p) => (p._id || p).toString());
            if (!propIds.includes(salesLead.flatId.toString())) {
              customer.ownerDetails.propertyIds.push(salesLead.flatId);
            }
          }
          await customer.save();
        }
      } catch (custErr) {
        console.error('Error syncing owner on possession:', custErr);
      }
    } else if (status === 'scheduled' || status === 'ready') {
      salesLead.salesStatus = 'possession_pending';
    }

    await salesLead.save();
    return res.json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error updating possession:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Process Cancellation & Refund
export const processCancellationAndRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      cancellationAmount,
      refundAmount,
      refundStatus,
      refundMethod,
      refundReference,
      remarks
    } = req.body;

    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales record not found' });

    salesLead.cancellation = {
      isCancelled: true,
      cancellationDate: new Date(),
      reason: reason || 'Customer requested cancellation',
      cancellationAmount: Number(cancellationAmount) || 0,
      refundAmount: Number(refundAmount) || 0
    };

    salesLead.refund = {
      status: refundStatus || 'pending',
      refundAmount: Number(refundAmount) || 0,
      refundDate: refundStatus === 'completed' ? new Date() : null,
      refundReference: refundReference || '',
      refundMethod: refundMethod || 'bank_transfer',
      remarks: remarks || ''
    };

    salesLead.salesStatus = refundStatus === 'completed' ? 'refunded' : 'cancelled';

    // Release flat back to available
    if (salesLead.flatId) {
      await Flat.findByIdAndUpdate(salesLead.flatId, { status: 'available' });

      // Remove flat from Customer ownerDetails if it exists
      try {
        await Customer.updateMany(
          { 'ownerDetails.propertyIds': salesLead.flatId },
          { $pull: { 'ownerDetails.propertyIds': salesLead.flatId } }
        );
      } catch (pullErr) {
        console.error('Error removing flat from customer ownerDetails on cancellation:', pullErr);
      }
    }

    await salesLead.save();
    return res.json({ success: true, data: salesLead });
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Single Sales Allotment / Lead (Releases Flat)
export const deleteSalesLead = async (req, res) => {
  try {
    const { id } = req.params;
    const salesLead = await SalesLead.findById(id);
    if (!salesLead) return res.status(404).json({ success: false, message: 'Sales allotment not found' });

    // Release flat back to available
    if (salesLead.flatId) {
      await Flat.findByIdAndUpdate(salesLead.flatId, {
        status: 'available',
        isSold: false,
        $unset: { salesDetails: '', currentOwner: '' }
      });

      // Unlink from customer owner details
      await Customer.updateMany(
        { 'ownerDetails.propertyIds': salesLead.flatId },
        { $pull: { 'ownerDetails.propertyIds': salesLead.flatId } }
      );
    }

    await SalesLead.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Sales allotment for ${salesLead.name} deleted successfully and unit released to inventory`
    });
  } catch (error) {
    console.error('Error deleting sales lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete All Sales Allotments
export const deleteAllSalesLeads = async (req, res) => {
  try {
    const deleteRes = await SalesLead.deleteMany({});
    
    // Release all flats
    await Flat.updateMany({}, {
      status: 'available',
      isSold: false,
      $unset: { salesDetails: '', currentOwner: '' }
    });

    // Clear customer property links
    await Customer.updateMany({}, {
      $set: { 'ownerDetails.propertyIds': [] },
      $unset: { salesAllotment: '' }
    });

    return res.json({
      success: true,
      message: `Successfully deleted all ${deleteRes.deletedCount} sales allotments and released flats to inventory.`,
      deletedCount: deleteRes.deletedCount
    });
  } catch (error) {
    console.error('Error in deleteAllSalesLeads:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
