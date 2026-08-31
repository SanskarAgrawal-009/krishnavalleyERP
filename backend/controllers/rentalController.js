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

// Create a new Rental Contract (with optional Rent-Back & Multi-Flat Support)
export const createRentalContract = async (req, res) => {
  try {
    let {
      projectId,
      buildingId,
      flatId,
      flatIds,
      leasedUnits,
      ownerId,
      tenantId,
      rentBack,
      allocation,
      tenantAgreement,
      securityDeposit,
      status,
      remarks
    } = req.body;

    // Resolve flat list (support multi-flat or single flat)
    const allFlatIds = Array.isArray(flatIds) && flatIds.length > 0 
      ? flatIds 
      : (flatId ? [flatId] : (Array.isArray(leasedUnits) && leasedUnits.length > 0 ? leasedUnits.map(u => u.flatId) : []));

    const primaryFlatId = flatId || allFlatIds[0];
    const primaryOwnerId = ownerId || (Array.isArray(leasedUnits) && leasedUnits[0]?.ownerId) || null;

    if (allFlatIds.length === 0 || !primaryOwnerId || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'At least one flat, owner, and tenant are required'
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

    // Prepare deposit calculations
    const tenantReq = Number(securityDeposit?.tenantDeposit?.requiredAmount) || 0;
    const tenantPaid = Number(securityDeposit?.tenantDeposit?.paidAmount) || 0;
    const tenantOut = Math.max(0, tenantReq - tenantPaid);
    const tenantStatus = tenantOut === 0 && tenantReq > 0 ? 'paid' : (tenantPaid > 0 ? 'partially_paid' : 'pending');

    const ownerReq = Number(securityDeposit?.ownerDeposit?.requiredAmount) || 0;
    const ownerPaid = Number(securityDeposit?.ownerDeposit?.paidAmount) || 0;
    const ownerOut = Math.max(0, ownerReq - ownerPaid);
    const ownerStatus = ownerOut === 0 && ownerReq > 0 ? 'paid' : (ownerPaid > 0 ? 'partially_paid' : 'pending');

    // Auto determine status
    let contractStatus = status || 'draft';
    if (!status) {
      if (allocation?.status === 'occupied') contractStatus = 'occupied';
      else if (allocation?.status === 'allocated') contractStatus = 'tenant_allocated';
      else if (rentBack?.enabled && rentBack?.status === 'active') contractStatus = 'rent_back_active';
      else contractStatus = 'tenant_pending';
    }

    const isRentBackEnabled = Boolean(rentBack?.enabled);
    const uniqueSuffix = `${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const rentalContract = new RentalManagement({
      projectId: resolvedProjectId,
      buildingId: resolvedBuildingId,
      flatId: primaryFlatId,
      flatIds: allFlatIds,
      leasedUnits: Array.isArray(leasedUnits) ? leasedUnits : [],
      isMultiUnit: allFlatIds.length > 1,
      totalUnitsCount: allFlatIds.length || 1,
      ownerId: primaryOwnerId,
      tenantId,
      rentBack: {
        enabled: isRentBackEnabled,
        agreementNumber: isRentBackEnabled ? (rentBack?.agreementNumber || `RB-${uniqueSuffix}`) : undefined,
        startDate: rentBack?.startDate ? new Date(rentBack.startDate) : null,
        endDate: rentBack?.endDate ? new Date(rentBack.endDate) : null,
        monthlyRent: Number(rentBack?.monthlyRent) || 0,
        securityDeposit: Number(rentBack?.securityDeposit) || 0,
        rentDueDay: Number(rentBack?.rentDueDay) || 5,
        status: rentBack?.status || 'pending',
        agreementDocument: rentBack?.agreementDocument || { verificationStatus: 'pending' }
      },
      allocation: {
        status: allocation?.status || 'allocated',
        allocationDate: allocation?.allocationDate ? new Date(allocation.allocationDate) : new Date(),
        moveInDate: allocation?.moveInDate ? new Date(allocation.moveInDate) : null,
        moveOutDate: allocation?.moveOutDate ? new Date(allocation.moveOutDate) : null
      },
      tenantAgreement: {
        agreementNumber: tenantAgreement?.agreementNumber || `TA-${uniqueSuffix}`,
        startDate: tenantAgreement?.startDate ? new Date(tenantAgreement.startDate) : null,
        endDate: tenantAgreement?.endDate ? new Date(tenantAgreement.endDate) : null,
        monthlyRent: Number(tenantAgreement?.monthlyRent) || 0,
        rentDueDay: Number(tenantAgreement?.rentDueDay) || 5,
        status: tenantAgreement?.status || 'active',
        agreementDocument: tenantAgreement?.agreementDocument || { verificationStatus: 'pending' }
      },
      securityDeposit: {
        tenantDeposit: {
          requiredAmount: tenantReq,
          paidAmount: tenantPaid,
          outstandingAmount: tenantOut,
          status: tenantStatus
        },
        ownerDeposit: {
          requiredAmount: ownerReq,
          paidAmount: ownerPaid,
          outstandingAmount: ownerOut,
          status: ownerStatus
        }
      },
      status: contractStatus,
      remarks: remarks || ''
    });

    const saved = await rentalContract.save();

    // Mark ALL leased flats as taken for rental
    await Flat.updateMany(
      { _id: { $in: allFlatIds } },
      { takenForRental: true, status: 'leased' }
    );

    // Auto-sync Tenant Customer record with leased flat and rental details
    if (tenantId && primaryFlatId) {
      try {
        await Customer.findByIdAndUpdate(tenantId, {
          customerType: 'tenant',
          'tenantDetails.rentalDetails.flatId': primaryFlatId,
          'tenantDetails.rentalDetails.monthlyRent': Number(tenantAgreement?.monthlyRent) || 0,
          'tenantDetails.rentalDetails.securityDeposit': Number(tenantReq) || 0,
          'tenantDetails.rentalDetails.rentDueDay': Number(tenantAgreement?.rentDueDay) || 5,
          'tenantDetails.rentalDetails.leaseStartDate': tenantAgreement?.startDate ? new Date(tenantAgreement.startDate) : new Date(),
          'tenantDetails.rentalDetails.leaseEndDate': tenantAgreement?.endDate ? new Date(tenantAgreement.endDate) : null
        });
        console.log(`[Customer Registry] Linked leased flat to tenant customer ID: ${tenantId}`);
      } catch (custErr) {
        console.error('Error linking leased flat to tenant customer:', custErr);
      }
    }

    const populated = await RentalManagement.findById(saved._id)
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status takenForRental')
      .populate('flatIds', 'flatNumber status takenForRental')
      .populate('leasedUnits.flatId', 'flatNumber status')
      .populate('leasedUnits.ownerId', 'name mobileNo email')
      .populate('ownerId', 'name mobileNo email address')
      .populate('tenantId', 'name mobileNo email tenantDetails');

    console.log(`[MongoDB] Rental contract created: ID ${saved._id} (Units: ${allFlatIds.length}, Rent-Back: ${saved.rentBack.enabled})`);
    return res.status(201).json({ success: true, data: populated });
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
      .populate('projectId', 'projectName projectCode')
      .populate('flatId', 'flatNumber status takenForRental')
      .populate('flatIds', 'flatNumber status takenForRental')
      .populate('leasedUnits.flatId', 'flatNumber status')
      .populate('leasedUnits.ownerId', 'name mobileNo email')
      .populate('ownerId', 'name mobileNo email address')
      .populate('tenantId', 'name mobileNo email tenantDetails')
      .sort({ updatedAt: -1 });

    // In-memory customer name search fallback
    if (search) {
      const s = search.toLowerCase();
      contracts = contracts.filter((c) => 
        (c.ownerId?.name && c.ownerId.name.toLowerCase().includes(s)) ||
        (c.tenantId?.name && c.tenantId.name.toLowerCase().includes(s)) ||
        (c.flatId?.flatNumber && c.flatId.flatNumber.toLowerCase().includes(s)) ||
        (c.flatIds?.some(f => f.flatNumber && f.flatNumber.toLowerCase().includes(s))) ||
        (c.rentBack?.agreementNumber && c.rentBack.agreementNumber.toLowerCase().includes(s)) ||
        (c.tenantAgreement?.agreementNumber && c.tenantAgreement.agreementNumber.toLowerCase().includes(s))
      );
    }

    return res.json({ success: true, count: contracts.length, data: contracts });
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
