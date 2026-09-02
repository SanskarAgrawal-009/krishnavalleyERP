import RentalManagement from '../models/RentalManagement.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import SalesLead from '../models/SalesLead.js';
import { uploadFileToS3 } from '../config/s3.js';
import { escapeRegex } from '../utils/regexUtil.js';
import mongoose from 'mongoose';

// Auto-fetch Owner Details for a given Flat Unit
export const getOwnerByFlat = async (req, res) => {
  try {
    const { flatId } = req.params;
    if (!flatId || !mongoose.Types.ObjectId.isValid(flatId)) {
      return res.status(400).json({ success: false, message: 'Valid flatId is required' });
    }

    // 1. Check if a registered Owner Customer is linked to this flat
    let owner = await Customer.findOne({
      customerType: 'owner',
      'ownerDetails.propertyIds': flatId
    }).populate({
      path: 'ownerDetails.propertyIds',
      select: 'flatNumber status projectId buildingId',
      populate: { path: 'projectId', select: 'projectName projectCode' }
    });

    if (owner) {
      return res.json({
        success: true,
        data: owner,
        source: 'customer_registry',
        message: `Owner found in Customer registry: ${owner.name}`
      });
    }

    // 2. Fallback: Check if Flat was purchased/booked in Sales
    const salesLead = await SalesLead.findOne({
      flatId,
      salesStatus: { $in: ['converted', 'booked', 'agreement_signed', 'demanded', 'possession_completed'] }
    }).populate('projectId', 'projectName projectCode');

    if (salesLead) {
      // Find or create customer record for this sales buyer
      let customer = await Customer.findOne({ mobileNo: salesLead.mobileNo });
      if (!customer) {
        customer = new Customer({
          customerType: 'owner',
          name: salesLead.name,
          mobileNo: salesLead.mobileNo,
          email: salesLead.email || '',
          ownerDetails: {
            propertyIds: [flatId],
            ownershipType: 'individual',
            ownershipPercentage: 100
          },
          status: 'active'
        });
        await customer.save();
      } else {
        // Ensure flat is in owner's property list
        const propIds = (customer.ownerDetails?.propertyIds || []).map(p => (p._id || p).toString());
        if (!propIds.includes(flatId.toString())) {
          if (!customer.ownerDetails) {
            customer.ownerDetails = { propertyIds: [flatId], ownershipType: 'individual', ownershipPercentage: 100 };
          } else {
            customer.ownerDetails.propertyIds.push(flatId);
          }
          await customer.save();
        }
      }

      const populatedCustomer = await Customer.findById(customer._id).populate({
        path: 'ownerDetails.propertyIds',
        select: 'flatNumber status projectId buildingId',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      });

      return res.json({
        success: true,
        data: populatedCustomer,
        source: 'sales_registry',
        message: `Owner found from Sales conversion: ${salesLead.name}`
      });
    }

    return res.json({
      success: true,
      data: null,
      message: 'No registered owner found for this flat'
    });
  } catch (error) {
    console.error('Error in getOwnerByFlat:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new 36-Month Guaranteed Rent-Back Contract
export const createRentalContract = async (req, res) => {
  try {
    let {
      projectId,
      buildingId,
      flatId,
      flatIds,
      ownerId,
      rentBack,
      status,
      remarks
    } = req.body;

    // Resolve flat list
    const allFlatIds = Array.isArray(flatIds) && flatIds.length > 0 
      ? flatIds 
      : (flatId ? [flatId] : []);

    const primaryFlatId = flatId || allFlatIds[0];
    const primaryOwnerId = ownerId || null;

    if (!primaryFlatId || !primaryOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'Flat unit and registered property owner are required'
      });
    }

    // Auto-resolve buildingId and projectId from primary flat if not provided
    let resolvedBuildingId = buildingId;
    let resolvedProjectId = projectId;

    if (primaryFlatId && (!resolvedBuildingId || !resolvedProjectId)) {
      const flatDoc = await Flat.findById(primaryFlatId).select('buildingId projectId');
      if (flatDoc) {
        if (!resolvedBuildingId && flatDoc.buildingId) resolvedBuildingId = flatDoc.buildingId;
        if (!resolvedProjectId && flatDoc.projectId) resolvedProjectId = flatDoc.projectId;
      }
    }

    if (!resolvedProjectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required and could not be resolved from flat unit'
      });
    }

    const grossRent = Number(rentBack?.monthlyRent) || 31000;
    const isTds = rentBack?.applyTds !== false;
    const tdsPercentage = isTds ? (rentBack?.tdsPercentage !== undefined ? Number(rentBack.tdsPercentage) : 10) : 0;
    const tdsAmount = Math.round(grossRent * (tdsPercentage / 100));
    const netMonthlyAmount = grossRent - tdsAmount;
    const tenureMonths = Number(rentBack?.tenureMonths) || 36;
    const total36MonthCommitment = netMonthlyAmount * tenureMonths;

    const uniqueSuffix = `${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const rentalContract = new RentalManagement({
      projectId: resolvedProjectId,
      buildingId: resolvedBuildingId,
      flatId: primaryFlatId,
      flatIds: allFlatIds,
      isMultiUnit: allFlatIds.length > 1,
      totalUnitsCount: allFlatIds.length || 1,
      ownerId: primaryOwnerId,
      status: status || 'active',
      rentBack: {
        enabled: true,
        agreementNumber: rentBack?.agreementNumber || `MOU-KV-${uniqueSuffix}`,
        startDate: rentBack?.startDate ? new Date(rentBack.startDate) : new Date(),
        endDate: rentBack?.endDate ? new Date(rentBack.endDate) : new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
        monthlyRent: grossRent,
        applyTds: isTds,
        tdsPercentage,
        tdsAmount,
        netMonthlyAmount,
        tenureMonths,
        total36MonthCommitment,
        rentDueDay: Number(rentBack?.rentDueDay) || 25,
        status: rentBack?.status || 'active',
        agreementDocument: rentBack?.agreementDocument || { verificationStatus: 'pending' }
      },
      allocation: {
        status: 'occupied',
        allocationDate: new Date()
      },
      remarks
    });

    await rentalContract.save();

    // Mark flat as active in rental scheme
    await Flat.findByIdAndUpdate(primaryFlatId, {
      takenForRental: true,
      'rentalDetails.guaranteedMonthlyRent': grossRent,
      'rentalDetails.applyTds': isTds,
      'rentalDetails.tdsPercentage': tdsPercentage,
      'rentalDetails.rentalStartDate': rentBack?.startDate ? new Date(rentBack.startDate) : new Date(),
      'rentalDetails.rentalEndDate': rentBack?.endDate ? new Date(rentBack.endDate) : new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000)
    });

    const populatedContract = await RentalManagement.findById(rentalContract._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber floor status')
      .populate('ownerId', 'name mobileNo email');

    return res.status(201).json({
      success: true,
      data: populatedContract,
      message: '36-Month Guaranteed Rent-Back Contract created successfully'
    });
  } catch (error) {
    console.error('Error creating rental contract:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Full Update Rental Contract
export const updateRentalContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    const updateData = req.body;

    // If tenant agreement or rent back updated, merge safely
    if (updateData.tenantAgreement) {
      contract.tenantAgreement = {
        ...contract.tenantAgreement.toObject(),
        ...updateData.tenantAgreement
      };
    }

    if (updateData.rentBack) {
      contract.rentBack = {
        ...contract.rentBack.toObject(),
        ...updateData.rentBack
      };
    }

    if (updateData.allocation) {
      contract.allocation = {
        ...contract.allocation.toObject(),
        ...updateData.allocation
      };
    }

    if (updateData.securityDeposit) {
      contract.securityDeposit = {
        ...contract.securityDeposit.toObject(),
        ...updateData.securityDeposit
      };
    }

    if (updateData.status) contract.status = updateData.status;
    if (updateData.remarks !== undefined) contract.remarks = updateData.remarks;
    if (updateData.ownerId) contract.ownerId = updateData.ownerId;
    if (updateData.tenantId) contract.tenantId = updateData.tenantId;

    await contract.save();

    const populated = await RentalManagement.findById(contract._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status takenForRental')
      .populate('flatIds', 'flatNumber status takenForRental')
      .populate('leasedUnits.flatId', 'flatNumber status')
      .populate('leasedUnits.ownerId', 'name mobileNo email')
      .populate('ownerId', 'name mobileNo email address')
      .populate('tenantId', 'name mobileNo email tenantDetails');

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error updating rental contract:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Rental Contracts with filtering & search
export const getRentalContracts = async (req, res) => {
  try {
    const { search, status, rentBack, rentBackEnabled, allocationStatus, projectId } = req.query;
    let filter = {};

    if (status) {
      filter.status = status;
    }

    const isRentBack = rentBack !== undefined ? rentBack : rentBackEnabled;
    if (isRentBack !== undefined && isRentBack !== '') {
      filter['rentBack.enabled'] = isRentBack === 'true' || isRentBack === true;
    }

    if (allocationStatus) {
      filter['allocation.status'] = allocationStatus;
    }

    if (projectId) {
      filter.projectId = projectId;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { 'rentBack.agreementNumber': regex },
        { 'tenantAgreement.agreementNumber': regex }
      ];
    }

    let contracts = await RentalManagement.find(filter)
      .populate('projectId', 'projectName projectCode buildings')
      .populate('flatId', 'flatNumber floor bhkType status takenForRental currentOwner buildingId basePrice')
      .populate('flatIds', 'flatNumber floor bhkType status takenForRental currentOwner buildingId basePrice')
      .populate('leasedUnits.flatId', 'flatNumber floor status buildingId')
      .populate('leasedUnits.ownerId', 'name mobileNo email')
      .populate('ownerId', 'name mobileNo email address')
      .populate('tenantId', 'name mobileNo email tenantDetails')
      .sort({ updatedAt: -1 });

    // In-memory customer name search fallback
    if (search) {
      const s = search.toLowerCase();
      contracts = contracts.filter((c) => 
        (c.ownerId?.name && c.ownerId.name.toLowerCase().includes(s)) ||
        (c.flatId?.currentOwner?.name && c.flatId.currentOwner.name.toLowerCase().includes(s)) ||
        (c.tenantId?.name && c.tenantId.name.toLowerCase().includes(s)) ||
        (c.flatId?.flatNumber && c.flatId.flatNumber.toLowerCase().includes(s)) ||
        (c.flatIds?.some(f => f.flatNumber && f.flatNumber.toLowerCase().includes(s))) ||
        (c.rentBack?.agreementNumber && c.rentBack.agreementNumber.toLowerCase().includes(s)) ||
        (c.tenantAgreement?.agreementNumber && c.tenantAgreement.agreementNumber.toLowerCase().includes(s))
      );
    }

    // Attach resolved tower and floor to each contract
    const formattedContracts = contracts.map((c) => {
      const doc = c.toObject();
      const flat = doc.flatId || {};
      const proj = doc.projectId || {};
      
      // Resolve building / tower name
      let towerName = 'Tower A';
      if (proj.buildings && flat.buildingId) {
        const bld = proj.buildings.find(b => b._id.toString() === flat.buildingId.toString());
        if (bld) towerName = bld.buildingName || bld.buildingCode || 'Tower A';
      }
      
      // Resolve floor
      let floorNum = flat.floor;
      if (floorNum === undefined || floorNum === null) {
        const parsed = parseInt(String(flat.flatNumber || '').replace(/\D/g, ''), 10);
        floorNum = !isNaN(parsed) && parsed >= 100 ? Math.floor(parsed / 100) : 0;
      }

      // Resolve customer / owner name
      const customerName = doc.ownerId?.name || flat.currentOwner?.name || doc.tenantAgreement?.tenantName || 'Registered Owner';
      const customerMobile = doc.ownerId?.mobileNo || flat.currentOwner?.mobileNo || doc.tenantAgreement?.tenantPhone || '';

      doc.towerName = towerName;
      doc.floorNum = floorNum;
      doc.customerName = customerName;
      doc.customerMobile = customerMobile;
      return doc;
    });

    return res.json({ success: true, count: formattedContracts.length, data: formattedContracts });
  } catch (error) {
    console.error('Error fetching rental contracts:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Rental Contract by ID
export const getRentalContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await RentalManagement.findById(id)
      .populate('projectId')
      .populate('flatId')
      .populate('flatIds')
      .populate('leasedUnits.flatId')
      .populate('leasedUnits.ownerId')
      .populate('ownerId')
      .populate('tenantId');

    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });
    return res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error fetching rental contract by id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Rent-Back Details
export const updateRentBack = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    contract.rentBack = { ...contract.rentBack.toObject(), ...updates };
    if (updates.status === 'active') {
      contract.status = 'rent_back_active';
    }

    await contract.save();
    return res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error updating rent-back:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Tenant Agreement Details
export const updateTenantAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    contract.tenantAgreement = { ...contract.tenantAgreement.toObject(), ...updates };
    await contract.save();
    return res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error updating tenant agreement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Rent-Back Agreement Document to AWS S3
export const uploadRentBackAgreementDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No document file was uploaded' });
    }

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    const uploadResult = await uploadFileToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      'rent_back_agreements'
    );

    contract.rentBack.agreementDocument = {
      fileUrl: uploadResult.documentUrl,
      fileName: uploadResult.documentName,
      uploadedAt: new Date(),
      verificationStatus: 'verified'
    };

    await contract.save();
    return res.json({
      success: true,
      message: `Rent-Back agreement uploaded successfully to ${uploadResult.storage}`,
      data: contract
    });
  } catch (error) {
    console.error('Error uploading rent-back agreement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Tenant Lease Agreement Document to AWS S3
export const uploadTenantAgreementDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No document file was uploaded' });
    }

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    const uploadResult = await uploadFileToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      'tenant_agreements'
    );

    contract.tenantAgreement.agreementDocument = {
      fileUrl: uploadResult.documentUrl,
      fileName: uploadResult.documentName,
      uploadedAt: new Date(),
      verificationStatus: 'verified'
    };

    await contract.save();
    return res.json({
      success: true,
      message: `Tenant agreement uploaded successfully to ${uploadResult.storage}`,
      data: contract
    });
  } catch (error) {
    console.error('Error uploading tenant agreement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Allocation & Move-In / Move-Out Dates
export const updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moveInDate, moveOutDate } = req.body;

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    if (status) contract.allocation.status = status;
    if (moveInDate) contract.allocation.moveInDate = new Date(moveInDate);
    if (moveOutDate) contract.allocation.moveOutDate = new Date(moveOutDate);

    if (status === 'occupied') {
      contract.status = 'occupied';
    } else if (status === 'vacated') {
      contract.status = 'vacated';
    }

    await contract.save();
    return res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error updating allocation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Record Security Deposit Payment (Tenant Deposit or Owner Deposit)
export const recordDepositPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, paidAmount } = req.body; // type: 'tenant' | 'owner'

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    const payVal = Number(paidAmount);
    if (!payVal || payVal <= 0) {
      return res.status(400).json({ success: false, message: 'Valid paidAmount is required' });
    }

    if (type === 'tenant') {
      const td = contract.securityDeposit.tenantDeposit;
      td.paidAmount = (td.paidAmount || 0) + payVal;
      td.outstandingAmount = Math.max(0, td.requiredAmount - td.paidAmount);
      td.status = td.outstandingAmount === 0 ? 'paid' : 'partially_paid';
    } else if (type === 'owner') {
      const od = contract.securityDeposit.ownerDeposit;
      od.paidAmount = (od.paidAmount || 0) + payVal;
      od.outstandingAmount = Math.max(0, od.requiredAmount - od.paidAmount);
      od.status = od.outstandingAmount === 0 ? 'paid' : 'partially_paid';
    } else {
      return res.status(400).json({ success: false, message: "type must be 'tenant' or 'owner'" });
    }

    await contract.save();
    return res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error recording deposit payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Terminate Rental Contract
export const terminateRentalContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    contract.status = 'terminated';
    contract.allocation.status = 'vacated';
    contract.allocation.moveOutDate = new Date();
    contract.tenantAgreement.status = 'terminated';
    if (contract.rentBack.enabled) {
      contract.rentBack.status = 'terminated';
    }

    await contract.save();

    // Release all flats associated with this contract
    const allFlats = contract.flatIds && contract.flatIds.length > 0 ? contract.flatIds : (contract.flatId ? [contract.flatId] : []);
    if (allFlats.length > 0) {
      await Flat.updateMany(
        { _id: { $in: allFlats } },
        { takenForRental: false, status: 'available' }
      );
    }

    return res.json({ success: true, message: 'Rental contract terminated successfully', data: contract });
  } catch (error) {
    console.error('Error terminating rental contract:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to generate 36-Month Owner Rental Ledger
export const generateDefaultRentBackLedger = (contractData) => {
  const tenureMonths = Number(contractData.tenureMonths || contractData.rentBack?.tenureMonths) || 36;
  const monthlyRent = Number(contractData.monthlyRent || contractData.rentBack?.monthlyRent) || 0;
  const dueDay = Number(contractData.dueDay || contractData.rentBack?.rentDueDay) || 25;
  const startDate = contractData.startDate ? new Date(contractData.startDate) : (contractData.rentBack?.startDate ? new Date(contractData.rentBack.startDate) : new Date());
  const mouDate = contractData.mouDate ? new Date(contractData.mouDate) : (contractData.rentBack?.mouDate ? new Date(contractData.rentBack.mouDate) : new Date(startDate.getTime() - 30 * 86400000));
  
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + tenureMonths);

  const totalTenureAmount = monthlyRent * tenureMonths;

  const entries = [];
  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), dueDay);
    entries.push({
      monthIndex: i,
      dueDate,
      paymentDate: null,
      paymentMode: 'NEFT',
      referenceNumber: '',
      grossAmount: monthlyRent,
      tdsDeducted: 0,
      netAmountPaid: 0,
      cumulativePaid: 0,
      remainingTenureBalance: totalTenureAmount,
      status: 'upcoming',
      remarks: ''
    });
  }

  return {
    mouDate,
    startDate,
    endDate,
    dueDay,
    tenureMonths,
    monthlyRent,
    totalTenureAmount,
    totalPaidToOwner: 0,
    remainingPayableToOwner: totalTenureAmount,
    entries
  };
};

// Record Monthly Owner Rental Payout & Auto-Deduct from Total Tenure Balance
export const recordOwnerRentalPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      monthIndex,
      paymentDate,
      paymentMode,
      referenceNumber,
      amountPaid,
      tdsDeducted,
      remarks
    } = req.body;

    const contract = await RentalManagement.findById(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    // If rentBackLedger doesn't exist, initialize it
    if (!contract.rentBackLedger || !contract.rentBackLedger.entries || contract.rentBackLedger.entries.length === 0) {
      contract.rentBackLedger = generateDefaultRentBackLedger(contract);
    }

    const mIdx = Number(monthIndex);
    const entry = contract.rentBackLedger.entries.find(e => e.monthIndex === mIdx);
    if (!entry) {
      return res.status(404).json({ success: false, message: `Month index #${monthIndex} not found in ledger` });
    }

    const netPaid = Number(amountPaid) || 0;
    const tds = Number(tdsDeducted) || 0;
    const grossPaid = netPaid + tds;

    entry.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    entry.paymentMode = paymentMode || 'NEFT';
    entry.referenceNumber = referenceNumber || `PAY-RENT-${contract._id.toString().slice(-4)}-M${mIdx}`;
    entry.netAmountPaid = netPaid;
    entry.tdsDeducted = tds;
    entry.grossAmount = grossPaid > 0 ? grossPaid : (entry.grossAmount || contract.rentBackLedger.monthlyRent);
    entry.status = (netPaid > 0 || grossPaid > 0) ? 'paid' : 'upcoming';
    entry.remarks = remarks || '';

    // Recalculate full ledger totals & running balances
    const totalTenure = Number(contract.rentBackLedger.totalTenureAmount) || (contract.rentBackLedger.monthlyRent * (contract.rentBackLedger.tenureMonths || 36));
    let cumPaid = 0;

    contract.rentBackLedger.entries.forEach(e => {
      const paid = Number(e.netAmountPaid || 0) + Number(e.tdsDeducted || 0);
      cumPaid += paid;
      e.cumulativePaid = cumPaid;
      e.remainingTenureBalance = Math.max(0, totalTenure - cumPaid);
      if (paid > 0) {
        e.status = 'paid';
      }
    });

    contract.rentBackLedger.totalPaidToOwner = cumPaid;
    contract.rentBackLedger.remainingPayableToOwner = Math.max(0, totalTenure - cumPaid);

    await contract.save();

    const populated = await RentalManagement.findById(contract._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status takenForRental')
      .populate('ownerId', 'name mobileNo email address');

    return res.json({
      success: true,
      message: `Month #${mIdx} payout of ₹${grossPaid.toLocaleString('en-IN')} recorded successfully. Remaining Balance: ₹${contract.rentBackLedger.remainingPayableToOwner.toLocaleString('en-IN')}`,
      data: populated
    });
  } catch (error) {
    console.error('Error recording owner payout:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk / Single Excel Import of Owner Rental Ledger
export const importOwnerRentalLedger = async (req, res) => {
  try {
    const { payload, format } = req.body;
    if (!payload) return res.status(400).json({ success: false, message: 'No payload data provided' });

    const summary = {
      totalProcessed: 0,
      totalPayoutsRecorded: 0,
      totalAmountDisbursed: 0,
      unitsUpdated: [],
      errors: []
    };

    if (format === 'single_passbook' || payload.flatNo) {
      const {
        flatNo,
        ownerName,
        mouDate,
        startDate,
        endDate,
        dueDay,
        monthlyRent,
        entries
      } = payload;

      const flatNumber = String(flatNo || '').trim();
      if (!flatNumber) return res.status(400).json({ success: false, message: 'Flat number is required' });

      const flat = await Flat.findOne({ flatNumber: new RegExp(`^${flatNumber}$`, 'i') });
      if (!flat) return res.status(404).json({ success: false, message: `Flat ${flatNumber} not found in inventory` });

      // Find or create Owner Customer
      let owner = null;
      if (ownerName) {
        owner = await Customer.findOne({ name: new RegExp(`^${ownerName}$`, 'i'), customerType: 'owner' });
        if (!owner) {
          owner = new Customer({
            customerType: 'owner',
            name: ownerName,
            mobileNo: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
            ownerDetails: { propertyIds: [flat._id], ownershipType: 'individual', ownershipPercentage: 100 },
            status: 'active'
          });
          await owner.save();
        }
      }

      let contract = await RentalManagement.findOne({ flatId: flat._id });
      if (!contract) {
        contract = new RentalManagement({
          projectId: flat.projectId,
          buildingId: flat.buildingId,
          flatId: flat._id,
          flatIds: [flat._id],
          ownerId: owner?._id || flat.ownerId,
          rentBack: {
            enabled: true,
            agreementNumber: `RB-${flatNumber}-${Date.now().toString().slice(-4)}`,
            mouDate: mouDate ? new Date(mouDate) : new Date(),
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(Date.now() + 36 * 30 * 86400000),
            monthlyRent: Number(monthlyRent) || 31000,
            rentDueDay: Number(dueDay) || 25,
            status: 'active'
          },
          status: 'rent_back_active'
        });
      }

      // Build 36 entries
      const mRent = Number(monthlyRent) || contract.rentBack?.monthlyRent || 31000;
      const tenure = 36;
      const totalTenure = mRent * tenure;
      const parsedStartDate = startDate ? new Date(startDate) : (contract.rentBack?.startDate || new Date());
      const day = Number(dueDay) || 25;

      const scheduleEntries = [];
      let totalPaid = 0;
      let cumPaid = 0;

      for (let i = 1; i <= tenure; i++) {
        const dueDate = new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth() + (i - 1), day);
        const userRow = (entries || []).find(e => Number(e.sNo || e.monthIndex) === i);

        let netPaid = 0;
        let tds = 0;
        let pDate = null;
        let pMode = 'NEFT';
        let refNo = '';
        let rem = '';
        let isPaid = false;

        if (userRow && (Number(userRow.amountPaid || userRow.netAmountPaid) > 0 || userRow.paymentDate)) {
          netPaid = Number(userRow.netAmountPaid || userRow.amountPaid) || 0;
          tds = Number(userRow.tdsDeducted) || 0;
          pDate = userRow.paymentDate ? new Date(userRow.paymentDate) : dueDate;
          pMode = userRow.paymentMode || 'NEFT';
          refNo = userRow.referenceNumber || userRow.refNo || `RCP-${flatNumber}-M${i}`;
          rem = userRow.remarks || userRow.remark || '';
          isPaid = netPaid > 0 || tds > 0;
        }

        const gross = isPaid ? (netPaid + tds) : mRent;
        const actualPaid = isPaid ? (netPaid + tds) : 0;
        cumPaid += actualPaid;
        totalPaid += actualPaid;

        scheduleEntries.push({
          monthIndex: i,
          dueDate,
          paymentDate: pDate,
          paymentMode: pMode,
          referenceNumber: refNo,
          grossAmount: gross,
          tdsDeducted: tds,
          netAmountPaid: netPaid,
          cumulativePaid: cumPaid,
          remainingTenureBalance: Math.max(0, totalTenure - cumPaid),
          status: isPaid ? 'paid' : 'upcoming',
          remarks: rem
        });
      }

      contract.rentBackLedger = {
        mouDate: mouDate ? new Date(mouDate) : new Date(),
        startDate: parsedStartDate,
        endDate: endDate ? new Date(endDate) : new Date(parsedStartDate.getTime() + 36 * 30 * 86400000),
        dueDay: day,
        tenureMonths: tenure,
        monthlyRent: mRent,
        totalTenureAmount: totalTenure,
        totalPaidToOwner: totalPaid,
        remainingPayableToOwner: Math.max(0, totalTenure - totalPaid),
        entries: scheduleEntries
      };

      contract.rentBack.enabled = true;
      contract.rentBack.monthlyRent = mRent;
      contract.rentBack.rentDueDay = day;
      if (mouDate) contract.rentBack.mouDate = new Date(mouDate);
      contract.status = 'rent_back_active';

      await contract.save();

      // Mark Flat as taken for rental
      await Flat.findByIdAndUpdate(flat._id, { takenForRental: true, isSold: true });

      summary.totalProcessed = 1;
      summary.totalPayoutsRecorded = scheduleEntries.filter(e => e.status === 'paid').length;
      summary.totalAmountDisbursed = totalPaid;
      summary.unitsUpdated.push({
        flatNumber,
        ownerName: ownerName || 'Owner',
        monthlyRent: mRent,
        totalPaid,
        remainingBalance: Math.max(0, totalTenure - totalPaid)
      });
    }

    return res.json({
      success: true,
      message: `Successfully updated Rental Ledger for Flat ${summary.unitsUpdated[0]?.flatNumber || ''}. Recorded ${summary.totalPayoutsRecorded} payouts totaling ₹${summary.totalAmountDisbursed.toLocaleString('en-IN')}.`,
      data: summary
    });
  } catch (error) {
    console.error('Error importing owner rental ledger:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Rental Contract
export const deleteRentalContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await RentalManagement.findByIdAndDelete(id);
    if (!contract) return res.status(404).json({ success: false, message: 'Rental contract not found' });

    // Release flats upon deletion
    const allFlats = contract.flatIds && contract.flatIds.length > 0 ? contract.flatIds : (contract.flatId ? [contract.flatId] : []);
    if (allFlats.length > 0) {
      await Flat.updateMany(
        { _id: { $in: allFlats } },
        { takenForRental: false, status: 'available' }
      );
    }

    return res.json({ success: true, message: 'Rental contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting rental contract:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
