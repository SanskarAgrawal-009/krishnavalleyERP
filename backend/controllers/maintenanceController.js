import MaintenanceBill from '../models/MaintenanceBill.js';
import ServiceRequest from '../models/ServiceRequest.js';
import TenantPenalty from '../models/TenantPenalty.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import RentalManagement from '../models/RentalManagement.js';
import { uploadFileToS3 } from '../config/s3.js';
import mongoose from 'mongoose';

// =========================================================
// 1. MAINTENANCE BILLING
// =========================================================

// Create Single Maintenance Bill
export const createMaintenanceBill = async (req, res) => {
  try {
    let {
      projectId,
      buildingId,
      flatId,
      payerType,
      payerId,
      billingMonth,
      billingYear,
      maintenanceAmount,
      utilityCharges,
      penaltyAmount,
      dueDate,
      remarks
    } = req.body;

    if (!flatId) {
      return res.status(400).json({ success: false, message: 'Please select a flat unit.' });
    }
    if (!payerId) {
      return res.status(400).json({ success: false, message: 'Please select a billed payer.' });
    }

    const flat = await Flat.findById(flatId);
    if (flat) {
      projectId = projectId || flat.projectId;
      buildingId = buildingId || flat.buildingId || flat.projectId;
    }

    if (!projectId) {
      const defaultProj = await Project.findOne({});
      projectId = defaultProj?._id;
    }

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project reference is required.' });
    }

    const maint = Number(maintenanceAmount) || 3500;
    const util = Number(utilityCharges) || 0;
    const pen = Number(penaltyAmount) || 0;
    const total = maint + util + pen;

    const monthStr = billingMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const billNumber = `MB-${Date.now().toString().slice(-6)}`;

    const bill = new MaintenanceBill({
      projectId,
      buildingId: mongoose.Types.ObjectId.isValid(buildingId) ? buildingId : undefined,
      flatId,
      payerType: payerType || 'owner',
      payerId,
      billNumber,
      billingMonth: monthStr,
      billingYear: Number(billingYear) || new Date().getFullYear(),
      maintenanceAmount: maint,
      utilityCharges: util,
      penaltyAmount: pen,
      totalAmount: total,
      paidAmount: 0,
      balanceAmount: total,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
      paymentStatus: 'unpaid',
      remarks: remarks || ''
    });

    const saved = await bill.save();
    const populated = await MaintenanceBill.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('payerId', 'name mobileNo email');

    return res.status(201).json({ success: true, message: 'Maintenance bill issued successfully', data: populated });
  } catch (error) {
    console.error('Error creating maintenance bill:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Batch Generate Bills exclusively for Occupied Flats (Sold to Owners & Leased to Tenants/Companies)
export const batchGenerateMaintenanceBills = async (req, res) => {
  try {
    const { billingMonth, billingYear, defaultAmount, defaultUtility, dueDate } = req.body;
    const month = billingMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const year = Number(billingYear) || new Date().getFullYear();
    const maint = Number(defaultAmount) || 3500;
    const util = Number(defaultUtility) || 500;
    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000);

    // 1. Fetch all flats in inventory
    const allFlats = await Flat.find({}).populate('projectId');
    if (!allFlats || allFlats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No flat units found in inventory. Please register inventory first.'
      });
    }

    const defaultProj = await Project.findOne({});

    // 2. Fetch all registered customers and active rental contracts
    const customers = await Customer.find({});
    const rentalContracts = await RentalManagement.find({ contractStatus: { $ne: 'terminated' } });

    let createdBills = [];
    let alreadyBilledCount = 0;
    let unsoldVacantCount = 0;
    let ownerBilledCount = 0;
    let tenantBilledCount = 0;
    let corporateBilledCount = 0;

    for (let i = 0; i < allFlats.length; i++) {
      const flat = allFlats[i];
      const flatIdStr = flat._id.toString();

      // A. Check for active Rental Contract (Tenant or Corporate Lessee occupying unit)
      const rentalContract = rentalContracts.find((rc) => {
        if (rc.flatId && rc.flatId.toString() === flatIdStr) return true;
        if (rc.flatIds && rc.flatIds.some((f) => (f._id || f).toString() === flatIdStr)) return true;
        if (rc.leasedUnits && rc.leasedUnits.some((lu) => lu.flatId && lu.flatId.toString() === flatIdStr)) return true;
        return false;
      });

      // B. Check for direct Tenant customer profile
      const directTenant = customers.find((c) => 
        c.customerType === 'tenant' && 
        c.tenantDetails?.rentalDetails?.flatId && 
        c.tenantDetails.rentalDetails.flatId.toString() === flatIdStr
      );

      // C. Check for Owner who bought this flat
      const flatOwner = customers.find((c) => 
        c.customerType === 'owner' && 
        c.ownerDetails?.propertyIds?.some((p) => (p._id || p).toString() === flatIdStr)
      );

      const isSold = flat.status === 'sold' || flatOwner !== undefined;
      const isLeased = flat.takenForRental || flat.status === 'leased' || rentalContract !== undefined || directTenant !== undefined;

      // RULE 1: Unsold & Unleased Flats (Vacant Inventory) have NO maintenance bill
      if (!isSold && !isLeased) {
        unsoldVacantCount++;
        continue;
      }

      // Check if bill already exists for this flat & month
      const existing = await MaintenanceBill.findOne({ flatId: flat._id, billingMonth: month });
      if (existing) {
        alreadyBilledCount++;
        continue;
      }

      let payer = null;
      let payerType = 'owner';
      let remarks = '';

      // RULE 2: Rented Flats -> Bill to Tenant / Corporate Entity
      if (rentalContract) {
        const contractTenant = customers.find((c) => c._id.toString() === rentalContract.tenantId?.toString());
        payer = contractTenant || directTenant || flatOwner;
        payerType = payer?.customerType || 'tenant';
        const isCorp = payer?.tenantDetails?.tenantType === 'company' || rentalContract.isMultiUnit;
        if (isCorp) {
          corporateBilledCount++;
          remarks = `Corporate Lease Maintenance: ${payer?.tenantDetails?.company?.companyName || payer?.name || 'Corporate Entity'}`;
        } else {
          tenantBilledCount++;
          remarks = `Rental Tenancy Maintenance: ${payer?.name || 'Resident Tenant'}`;
        }
      } else if (directTenant) {
        payer = directTenant;
        payerType = 'tenant';
        const isCorp = directTenant.tenantDetails?.tenantType === 'company';
        if (isCorp) {
          corporateBilledCount++;
          remarks = `Corporate Lease Maintenance: ${directTenant.tenantDetails?.company?.companyName || directTenant.name}`;
        } else {
          tenantBilledCount++;
          remarks = `Tenant Maintenance: ${directTenant.name}`;
        }
      } 
      // RULE 3: Sold & Occupied by Owner -> Bill to Owner
      else if (flatOwner) {
        payer = flatOwner;
        payerType = 'owner';
        ownerBilledCount++;
        remarks = `Owner-Occupied Residence Maintenance: ${flatOwner.name}`;
      } else if (flat.status === 'sold') {
        payer = customers.find((c) => c.customerType === 'owner') || customers[0];
        payerType = 'owner';
        ownerBilledCount++;
        remarks = `Owner Maintenance (Sold Flat ${flat.flatNumber})`;
      } else {
        unsoldVacantCount++;
        continue;
      }

      if (!payer) {
        unsoldVacantCount++;
        continue;
      }

      const flatNumStr = (flat.flatNumber || `F${i + 1}`).toString().replace(/[^a-zA-Z0-9]/g, '');
      const billNumber = `MB-${month.replace(/\s+/g, '').slice(0, 3).toUpperCase()}-${flatNumStr}-${Date.now().toString().slice(-4)}${i}`;
      const projId = flat.projectId?._id || flat.projectId || defaultProj?._id;
      const bldId = mongoose.Types.ObjectId.isValid(flat.buildingId) ? flat.buildingId : undefined;

      const bill = new MaintenanceBill({
        projectId: projId,
        buildingId: bldId,
        flatId: flat._id,
        payerType: payerType,
        payerId: payer._id,
        billNumber,
        billingMonth: month,
        billingYear: year,
        maintenanceAmount: maint,
        utilityCharges: util,
        penaltyAmount: 0,
        totalAmount: maint + util,
        paidAmount: 0,
        balanceAmount: maint + util,
        dueDate: due,
        paymentStatus: 'unpaid',
        remarks: remarks
      });

      const saved = await bill.save();
      createdBills.push(saved);
    }

    let msg = `Generated ${createdBills.length} maintenance bills for ${month} (${ownerBilledCount} Owner-Occupied, ${tenantBilledCount} Individual Tenants, ${corporateBilledCount} Corporate). ${unsoldVacantCount} unsold/vacant flats excluded.`;
    if (createdBills.length === 0 && alreadyBilledCount > 0) {
      msg = `All ${alreadyBilledCount} occupied flats already have maintenance bills generated for ${month}. ${unsoldVacantCount} unsold/vacant units excluded.`;
    } else if (createdBills.length === 0 && unsoldVacantCount > 0) {
      msg = `No bills generated: All ${unsoldVacantCount} units in inventory are unsold/vacant. Maintenance is only charged to sold/occupied properties.`;
    }

    const allCurrentBills = await MaintenanceBill.find({ billingMonth: month })
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('payerId', 'name mobileNo email customerType')
      .sort({ createdAt: -1 });

    return res.status(201).json({
      success: true,
      message: msg,
      count: createdBills.length,
      skipped: alreadyBilledCount,
      unsoldExcluded: unsoldVacantCount,
      data: allCurrentBills
    });
  } catch (error) {
    console.error('Error batch generating maintenance bills:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Maintenance Bills with filtering
export const getMaintenanceBills = async (req, res) => {
  try {
    const { paymentStatus, billingMonth, flatId, payerId } = req.query;
    let filter = {};

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (billingMonth) filter.billingMonth = billingMonth;
    if (flatId) filter.flatId = flatId;
    if (payerId) filter.payerId = payerId;

    const bills = await MaintenanceBill.find(filter)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('payerId', 'name mobileNo email customerType')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    console.error('Error fetching maintenance bills:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Record Maintenance Payment with Mandatory Proof Upload & UTR
export const recordMaintenancePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, paymentMethod, transactionReference, utrNumber, remarks } = req.body;
    const file = req.file;

    const bill = await MaintenanceBill.findById(id);
    if (!bill) return res.status(404).json({ success: false, message: 'Maintenance bill not found' });

    const payVal = Number(paidAmount);
    if (!payVal || payVal <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid paidAmount.' });
    }

    const utr = utrNumber || transactionReference;
    if (!utr) {
      return res.status(400).json({ success: false, message: 'Payment UTR / Transaction Reference number is mandatory for confirmation.' });
    }

    // Upload Payment Proof File (Image/PDF) to S3 / persistent storage
    let proofUrl = '';
    if (file) {
      const uploadRes = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'maintenance-proofs');
      proofUrl = uploadRes.documentUrl;
    } else if (req.body.proofFileUrl) {
      proofUrl = req.body.proofFileUrl;
    }

    if (!proofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Bill payment proof (Image, PDF, JPG) is mandatory. Please upload the transaction receipt.'
      });
    }

    const userRole = req.user?.roleCode || req.user?.role || '';
    const isAdminOrAccountant = ['admin', 'accounts_head', 'finance_manager', 'super_admin'].includes(userRole);

    const paymentEntry = {
      paidAmount: payVal,
      paymentMethod: paymentMethod || 'upi',
      utrNumber: utr,
      proofFileUrl: proofUrl,
      submittedBy: req.user?._id,
      submittedAt: new Date(),
      verificationStatus: isAdminOrAccountant ? 'approved' : 'pending',
      approvedBy: isAdminOrAccountant ? req.user?._id : undefined,
      approvedAt: isAdminOrAccountant ? new Date() : undefined,
      rejectionReason: ''
    };

    bill.utrNumber = utr;
    bill.proofFileUrl = proofUrl;
    bill.paymentMethod = paymentMethod || 'upi';
    bill.transactionReference = utr;
    bill.submittedBy = req.user?._id;
    bill.submittedAt = new Date();
    if (remarks) bill.remarks = remarks;

    if (isAdminOrAccountant) {
      // Direct Admin / Accountant Approval
      bill.paidAmount = (bill.paidAmount || 0) + payVal;
      bill.balanceAmount = Math.max(0, bill.totalAmount - bill.paidAmount);
      bill.paymentStatus = bill.balanceAmount === 0 ? 'paid' : 'partially_paid';
      bill.verificationStatus = 'approved';
      bill.approvedBy = req.user?._id;
      bill.approvedAt = new Date();
      bill.receiptUrl = `/receipts/maint_${bill.billNumber}_${utr}.pdf`;
    } else {
      // Pending Admin / Accountant Review
      bill.paymentStatus = 'pending_approval';
      bill.verificationStatus = 'pending';
    }

    if (!bill.paymentHistory) bill.paymentHistory = [];
    bill.paymentHistory.push(paymentEntry);

    await bill.save();

    const populated = await MaintenanceBill.findById(bill._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('payerId', 'name mobileNo email customerType')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email');

    const msg = isAdminOrAccountant
      ? `Payment of ₹${payVal} confirmed and verified by ${req.user?.name || 'Accountant'}!`
      : `Payment proof & UTR (${utr}) submitted successfully! Awaiting Admin / Accountant approval.`;

    return res.json({ success: true, message: msg, data: populated });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin / Accountant Approval or Rejection of Payment
export const verifyMaintenancePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // 'approve' | 'reject'

    const bill = await MaintenanceBill.findById(id);
    if (!bill) return res.status(404).json({ success: false, message: 'Maintenance bill not found' });

    if (action === 'approve') {
      const lastPending = (bill.paymentHistory || []).find((p) => p.verificationStatus === 'pending') || {
        paidAmount: bill.totalAmount - (bill.paidAmount || 0)
      };

      const verifiedPayAmount = lastPending.paidAmount || bill.totalAmount;
      bill.paidAmount = Math.min(bill.totalAmount, (bill.paidAmount || 0) + verifiedPayAmount);
      bill.balanceAmount = Math.max(0, bill.totalAmount - bill.paidAmount);
      bill.paymentStatus = bill.balanceAmount === 0 ? 'paid' : 'partially_paid';
      bill.verificationStatus = 'approved';
      bill.approvedBy = req.user?._id;
      bill.approvedAt = new Date();
      bill.rejectionReason = '';

      if (bill.paymentHistory && bill.paymentHistory.length > 0) {
        bill.paymentHistory[bill.paymentHistory.length - 1].verificationStatus = 'approved';
        bill.paymentHistory[bill.paymentHistory.length - 1].approvedBy = req.user?._id;
        bill.paymentHistory[bill.paymentHistory.length - 1].approvedAt = new Date();
      }

      await bill.save();

      const populated = await MaintenanceBill.findById(bill._id)
        .populate('projectId', 'projectName projectCode')
        .populate('flatId', 'flatNumber status')
        .populate('payerId', 'name mobileNo email customerType')
        .populate('approvedBy', 'name email');

      return res.json({
        success: true,
        message: `Payment of ₹${verifiedPayAmount} approved by ${req.user?.name || 'Accountant'}!`,
        data: populated
      });
    } else if (action === 'reject') {
      bill.verificationStatus = 'rejected';
      bill.paymentStatus = 'rejected';
      bill.rejectionReason = rejectionReason || 'Payment proof / UTR could not be verified by Accounts.';
      bill.approvedBy = req.user?._id;
      bill.approvedAt = new Date();

      if (bill.paymentHistory && bill.paymentHistory.length > 0) {
        bill.paymentHistory[bill.paymentHistory.length - 1].verificationStatus = 'rejected';
        bill.paymentHistory[bill.paymentHistory.length - 1].rejectionReason = bill.rejectionReason;
        bill.paymentHistory[bill.paymentHistory.length - 1].approvedBy = req.user?._id;
        bill.paymentHistory[bill.paymentHistory.length - 1].approvedAt = new Date();
      }

      await bill.save();

      const populated = await MaintenanceBill.findById(bill._id)
        .populate('projectId', 'projectName projectCode')
        .populate('flatId', 'flatNumber status')
        .populate('payerId', 'name mobileNo email customerType');

      return res.json({
        success: true,
        message: `Payment rejected. Reason: ${bill.rejectionReason}`,
        data: populated
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be "approve" or "reject".' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 2. SERVICE REQUESTS & REPAIRS
// =========================================================

// Create Service Request Ticket
export const createServiceRequest = async (req, res) => {
  try {
    const {
      projectId,
      buildingId,
      flatId,
      requesterType,
      requesterId,
      category,
      title,
      description,
      priority,
      billedTo,
      assignedTechnician
    } = req.body;

    const ticketNumber = `SR-${Date.now().toString().slice(-6)}`;

    const request = new ServiceRequest({
      ticketNumber,
      projectId,
      buildingId,
      flatId,
      requesterType: requesterType || 'owner',
      requesterId,
      category: category || 'plumbing',
      title: title || 'Repair Request',
      description: description || '',
      priority: priority || 'medium',
      status: assignedTechnician?.name ? 'assigned' : 'open',
      assignedTechnician: assignedTechnician || {},
      billedTo: billedTo || 'free_warranty',
      photos: []
    });

    const saved = await request.save();
    const populated = await ServiceRequest.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('requesterId', 'name mobileNo email');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error creating service request:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Service Requests
export const getServiceRequests = async (req, res) => {
  try {
    const { status, category, priority, flatId } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (flatId) filter.flatId = flatId;

    const requests = await ServiceRequest.find(filter)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('requesterId', 'name mobileNo email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Service Request Status / Work Order
export const updateServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTechnician, estimatedCost, finalCost, resolutionNotes, billedTo } = req.body;

    const request = await ServiceRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found' });

    if (status) request.status = status;
    if (status === 'resolved' || status === 'closed') request.resolvedAt = new Date();
    if (assignedTechnician) request.assignedTechnician = assignedTechnician;
    if (estimatedCost !== undefined) request.estimatedCost = Number(estimatedCost);
    if (finalCost !== undefined) request.finalCost = Number(finalCost);
    if (resolutionNotes) request.resolutionNotes = resolutionNotes;
    if (billedTo) request.billedTo = billedTo;

    await request.save();
    return res.json({ success: true, data: request });
  } catch (error) {
    console.error('Error updating service request:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Photo Proof for Service Request
export const uploadServicePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No photo file was uploaded' });
    }

    const request = await ServiceRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found' });

    const uploadResult = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'service_photos');

    request.photos.push({
      fileUrl: uploadResult.documentUrl,
      fileName: uploadResult.documentName,
      uploadedAt: new Date()
    });

    await request.save();
    return res.json({ success: true, message: 'Photo uploaded to S3', data: request });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 3. TENANT PENALTIES & INFRACTIONS
// =========================================================

// Levy Penalty on Tenant / Occupant
export const levyPenalty = async (req, res) => {
  try {
    const {
      projectId,
      buildingId,
      flatId,
      customerId,
      customerType,
      violationType,
      description,
      penaltyAmount,
      remarks
    } = req.body;

    const penaltyNumber = `PEN-${Date.now().toString().slice(-6)}`;

    let evidenceDoc = undefined;
    if (req.file) {
      const uploadResult = await uploadFileToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'penalty_evidence');
      evidenceDoc = {
        fileUrl: uploadResult.documentUrl,
        fileName: uploadResult.documentName
      };
    }

    const penalty = new TenantPenalty({
      penaltyNumber,
      projectId,
      buildingId,
      flatId,
      customerId,
      customerType: customerType || 'tenant',
      violationType: violationType || 'late_payment',
      description: description || req.body.reason || 'Infraction penalty levied',
      penaltyAmount: Number(penaltyAmount) || 1000,
      incidentDate: new Date(),
      evidenceDocument: evidenceDoc,
      paymentStatus: 'pending',
      remarks: remarks || ''
    });

    const saved = await penalty.save();
    const populated = await TenantPenalty.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('customerId', 'name mobileNo email customerType');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error levying penalty:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Penalties
export const getPenalties = async (req, res) => {
  try {
    const { paymentStatus, violationType, flatId, customerId } = req.query;
    let filter = {};

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (violationType) filter.violationType = violationType;
    if (flatId) filter.flatId = flatId;
    if (customerId) filter.customerId = customerId;

    const penalties = await TenantPenalty.find(filter)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status')
      .populate('customerId', 'name mobileNo email customerType')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: penalties.length, data: penalties });
  } catch (error) {
    console.error('Error fetching penalties:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Settle / Waive Penalty
export const settlePenalty = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionReference, remarks } = req.body; // paymentStatus: 'paid' | 'waived' | 'adjusted_from_deposit'

    const penalty = await TenantPenalty.findById(id);
    if (!penalty) return res.status(404).json({ success: false, message: 'Penalty record not found' });

    penalty.paymentStatus = paymentStatus || 'paid';
    penalty.paidAt = new Date();
    if (transactionReference) penalty.transactionReference = transactionReference;
    if (remarks) penalty.remarks = remarks;

    await penalty.save();
    return res.json({ success: true, message: `Penalty marked as ${penalty.paymentStatus}`, data: penalty });
  } catch (error) {
    console.error('Error settling penalty:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
