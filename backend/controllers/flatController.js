import Flat from '../models/Flat.js';
import Project from '../models/Project.js';
import Customer from '../models/Customer.js';
import SalesLead from '../models/SalesLead.js';
import Lead from '../models/Lead.js';
import RentalManagement from '../models/RentalManagement.js';
import { uploadFileToS3 } from '../config/s3.js';
import * as XLSX from 'xlsx';

// Helper to parse floor number from flat string if not set
const inferFloorFromFlat = (flatStr) => {
  if (!flatStr) return 1;
  const digits = flatStr.toString().replace(/\D/g, '');
  if (!digits) return 1;
  if (digits.length >= 3) {
    const fl = parseInt(digits.slice(0, -2), 10);
    return isNaN(fl) || fl === 0 ? 1 : fl;
  }
  const single = parseInt(digits[0], 10);
  return isNaN(single) || single === 0 ? 1 : single;
};

// Get Flats from MongoDB with Floor & Building Enrichment
export const getFlats = async (req, res) => {
  try {
    const { projectId, buildingId, status } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (buildingId) filter.buildingId = buildingId;
    if (status) filter.status = status;

    const flats = await Flat.find(filter).populate('projectId').sort({ floor: 1, flatNumber: 1 });
    
    // Enrich flats with resolved building details & guarantee floor is set
    const enriched = await Promise.all(
      flats.map(async (f) => {
        const obj = f.toObject();
        let needsSave = false;

        if (obj.floor === undefined || obj.floor === null || obj.floor === 0) {
          obj.floor = inferFloorFromFlat(obj.flatNumber);
          f.floor = obj.floor;
          needsSave = true;
        }

        // If flat is taken for rental, it is sold
        if (obj.takenForRental && obj.status === 'available') {
          obj.status = 'sold';
          f.status = 'sold';
          needsSave = true;
        }

        if (f.projectId && f.projectId.buildings && f.buildingId) {
          const bld = f.projectId.buildings.find(
            (b) => b._id.toString() === f.buildingId.toString()
          );
          if (bld) {
            obj.buildingName = bld.buildingName;
            obj.buildingCode = bld.buildingCode;
            obj.numberOfFloors = bld.numberOfFloors;
          }
        }

        if (needsSave) {
          await Flat.findByIdAndUpdate(f._id, { floor: obj.floor, status: obj.status });
        }

        return obj;
      })
    );

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Error in getFlats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Flat By ID with Owner, Sales, Rental, and 3-Year Lock-in Information
export const getFlatById = async (req, res) => {
  try {
    const { id } = req.params;
    const flat = await Flat.findById(id).populate('projectId');
    if (!flat) return res.status(404).json({ success: false, message: 'Flat not found' });
    
    const obj = flat.toObject();
    if (obj.floor === undefined || obj.floor === null) {
      obj.floor = inferFloorFromFlat(obj.flatNumber);
    }
    if (flat.projectId && flat.projectId.buildings && flat.buildingId) {
      const bld = flat.projectId.buildings.find(
        (b) => b._id.toString() === flat.buildingId.toString()
      );
      if (bld) {
        obj.buildingName = bld.buildingName;
        obj.buildingCode = bld.buildingCode;
      }
    }

    // 1. Fetch Sales Record (if booked, converted, agreement signed, possessed)
    const salesLead = await SalesLead.findOne({
      flatId: id,
      salesStatus: { $ne: 'cancelled' }
    }).populate('leadId', 'name mobileNo email agentId').populate('booking.bookingPaymentId');

    // 2. Fetch Owner from Customer collection
    let ownerCustomer = await Customer.findOne({
      customerType: 'owner',
      'ownerDetails.propertyIds': id
    });

    if (!ownerCustomer && salesLead?.mobileNo) {
      ownerCustomer = await Customer.findOne({ mobileNo: salesLead.mobileNo });
    }

    // 3. Fetch Rental Contracts for this Flat
    const rentalContracts = await RentalManagement.find({
      $or: [
        { flatId: id },
        { flatIds: id },
        { 'leasedUnits.flatId': id }
      ]
    }).populate('ownerId', 'name mobileNo email address')
      .populate('tenantId', 'name mobileNo email address')
      .sort({ createdAt: -1 });

    const activeRental = rentalContracts.find(r => r.status !== 'terminated') || rentalContracts[0] || null;

    // 4. Calculate 3-Year Mandatory Rental Period & Possession Availability
    // Business Rule: If a flat is sold or enrolled in rental program, the 36-month rental lock-in is confirmed.
    const isSoldOrEnrolled = obj.status === 'sold' || obj.status === 'leased' || flat.takenForRental || !!salesLead || !!ownerCustomer || !!activeRental;
    
    if (isSoldOrEnrolled) {
      obj.status = 'sold';
      obj.takenForRental = true;
      if (flat.status !== 'sold' && flat.status !== 'leased') {
        await Flat.findByIdAndUpdate(flat._id, { status: 'sold', takenForRental: true });
      }
    }
    
    let rentalStartDate = null;
    if (activeRental?.rentBack?.startDate) {
      rentalStartDate = new Date(activeRental.rentBack.startDate);
    } else if (activeRental?.tenantAgreement?.startDate) {
      rentalStartDate = new Date(activeRental.tenantAgreement.startDate);
    } else if (activeRental?.createdAt) {
      rentalStartDate = new Date(activeRental.createdAt);
    } else if (salesLead?.booking?.bookingDate) {
      rentalStartDate = new Date(salesLead.booking.bookingDate);
    } else if (flat.createdAt) {
      rentalStartDate = new Date(flat.createdAt);
    } else {
      rentalStartDate = new Date();
    }

    // Calculate exact 3 years (36 months) from rental start date
    const lockInEndDate = new Date(rentalStartDate);
    lockInEndDate.setFullYear(lockInEndDate.getFullYear() + 3);

    const now = new Date();
    const diffMs = lockInEndDate.getTime() - now.getTime();
    const totalMs = lockInEndDate.getTime() - rentalStartDate.getTime();
    
    const isLocked = isSoldOrEnrolled && diffMs > 0;

    const remainingDays = isLocked ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : (isSoldOrEnrolled ? 0 : 1095);
    const remainingMonths = isLocked ? Math.ceil(remainingDays / 30.4375) : (isSoldOrEnrolled ? 0 : 36);
    const elapsedDays = isSoldOrEnrolled ? Math.max(0, Math.floor((now.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const totalDays = Math.max(1, Math.floor(totalMs / (1000 * 60 * 60 * 24)));
    const progressPercentage = isSoldOrEnrolled ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : 0;

    let possessionStatus = 'available_for_sale';
    let possessionMessage = 'Unit is currently available for sale. Upon sale, a confirmed 36-month guaranteed rental lock-in applies.';

    if (isSoldOrEnrolled) {
      if (salesLead?.possession?.status === 'completed' || salesLead?.salesStatus === 'possessed') {
        possessionStatus = 'possession_completed';
        possessionMessage = `Possession has already been completed on ${salesLead.possession?.possessionDate ? new Date(salesLead.possession.possessionDate).toLocaleDateString('en-IN') : 'record'}.`;
      } else if (isLocked || remainingMonths > 0) {
        possessionStatus = 'possession_locked_3yr';
        possessionMessage = `Flat is SOLD with a confirmed 36-Month Rental Lock-in. Physical possession will be available on ${lockInEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${remainingMonths} months / ${remainingDays} days remaining).`;
      } else {
        possessionStatus = 'possession_eligible';
        possessionMessage = `3-Year rental lock-in term fulfilled on ${lockInEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Unit is now fully eligible for physical possession and key handover!`;
      }
    }

    const lockInDetails = {
      isEnrolledInRental: isSoldOrEnrolled,
      rentalStartDate: isSoldOrEnrolled ? rentalStartDate : null,
      lockInEndDate: isSoldOrEnrolled ? lockInEndDate : null,
      mandatoryTenureYears: 3,
      mandatoryTenureMonths: 36,
      elapsedDays,
      totalDays,
      remainingDays,
      remainingMonths,
      progressPercentage,
      isLocked,
      possessionStatus,
      possessionMessage,
      actualPossession: salesLead?.possession || null
    };

    // Resolve Owner Details
    let resolvedOwner = ownerCustomer;
    if (!resolvedOwner && activeRental?.ownerId) {
      resolvedOwner = typeof activeRental.ownerId === 'object' ? activeRental.ownerId : await Customer.findById(activeRental.ownerId);
    }
    if (!resolvedOwner && salesLead) {
      resolvedOwner = {
        name: salesLead.name,
        mobileNo: salesLead.mobileNo,
        email: salesLead.email,
        customerType: 'owner',
        source: 'sales_lead'
      };
    }

    // Resolve Sales Lead & Commercial Terms
    let resolvedSalesLead = salesLead;
    if (!resolvedSalesLead && (isSoldOrEnrolled || activeRental)) {
      resolvedSalesLead = {
        name: resolvedOwner?.name || 'Registered Property Owner',
        mobileNo: resolvedOwner?.mobileNo || 'On File',
        email: resolvedOwner?.email || 'owner@krishnavalley.com',
        salesStatus: 'agreement_completed',
        convertedAt: rentalStartDate,
        finalPrice: flat.basePrice || 2500000,
        booking: {
          isBooked: true,
          bookingDate: rentalStartDate,
          bookingAmount: Math.round((flat.basePrice || 2500000) * 0.1) || 100000,
          agreedDealPrice: flat.basePrice || 2500000,
          bookingStatus: 'confirmed'
        },
        agreement: {
          required: true,
          uploaded: true,
          isSigned: true,
          agreementNumber: activeRental?.rentBack?.agreementNumber || `BBA-${flat.flatNumber || '001'}`,
          agreementDate: rentalStartDate,
          verificationStatus: 'verified'
        },
        paymentPlan: {
          type: '36-month_rent_back_linked',
          totalAmount: flat.basePrice || 2500000,
          bookingAmount: Math.round((flat.basePrice || 2500000) * 0.1) || 100000,
          remainingAmount: Math.max(0, (flat.basePrice || 2500000) - 100000),
          numberOfInstallments: 1
        }
      };
    }

    return res.json({
      success: true,
      data: {
        ...obj,
        salesLead: resolvedSalesLead,
        owner: resolvedOwner,
        rentalContract: activeRental,
        allRentalContracts: rentalContracts,
        rentalLockIn: lockInDetails
      }
    });
  } catch (error) {
    console.error('Error in getFlatById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Manual Flat Creation in MongoDB
export const createFlat = async (req, res) => {
  try {
    const {
      flatNumber,
      buildingId,
      projectId,
      floor,
      bhkType,
      carpetArea,
      basePrice,
      facing,
      status,
      buybackCount,
      takenForRental
    } = req.body;

    if (!flatNumber || !buildingId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'flatNumber, buildingId, and projectId are required'
      });
    }

    const calculatedFloor = floor !== undefined && floor !== null ? Number(floor) : inferFloorFromFlat(flatNumber);

    const flat = new Flat({
      flatNumber,
      buildingId,
      projectId,
      floor: calculatedFloor,
      bhkType: bhkType || '2BHK',
      carpetArea: carpetArea ? Number(carpetArea) : 950,
      basePrice: basePrice ? Number(basePrice) : 4500000,
      facing: facing || 'East',
      status: status || 'available',
      buybackCount: buybackCount ? Number(buybackCount) : 0,
      takenForRental: takenForRental === true || takenForRental === 'true',
      blueprints: []
    });

    const savedFlat = await flat.save();

    // Push flat _id into the project's building.flats array and adjust floor count
    const project = await Project.findById(projectId);
    if (project) {
      const bld = project.buildings.id(buildingId);
      if (bld) {
        bld.flats.push(savedFlat._id);
        if (calculatedFloor > (bld.numberOfFloors || 0)) {
          bld.numberOfFloors = calculatedFloor;
        }
        await project.save();
      }
    }

    console.log(`[MongoDB] Flat "${flatNumber}" (Floor ${calculatedFloor}) created and linked to building ${buildingId} in project ${projectId}`);
    return res.status(201).json({ success: true, data: savedFlat });
  } catch (error) {
    console.error('Error creating flat in MongoDB:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Flat in MongoDB
export const updateFlat = async (req, res) => {
  try {
    const { id } = req.params;
    const flat = await Flat.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!flat) return res.status(404).json({ success: false, message: 'Flat not found' });
    return res.json({ success: true, data: flat });
  } catch (error) {
    console.error('Error updating flat in MongoDB:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Flat from MongoDB (with Full Cascading Deletion of Sales & Rentals)
export const deleteFlat = async (req, res) => {
  try {
    const { id } = req.params;
    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({ success: false, message: 'Flat not found' });

    const deletedFlatSnapshot = flat.toObject();

    // 1. Delete associated Sales Allotment / Leads
    const salesDeleteRes = await SalesLead.deleteMany({ flatId: flat._id });

    // 2. Delete associated Rental Management Contracts / Ledgers
    const rentalDeleteRes = await RentalManagement.deleteMany({
      $or: [{ flatId: flat._id }, { flatIds: flat._id }]
    });

    // 3. Unlink flat from Customer ownership & tenancy registries
    await Customer.updateMany(
      {
        $or: [
          { 'ownerDetails.propertyIds': flat._id },
          { 'tenantDetails.leasedPropertyIds': flat._id }
        ]
      },
      {
        $pull: {
          'ownerDetails.propertyIds': flat._id,
          'tenantDetails.leasedPropertyIds': flat._id
        }
      }
    );

    // 4. Remove flat _id from project building flats
    if (flat.projectId && flat.buildingId) {
      await Project.updateOne(
        { _id: flat.projectId, "buildings._id": flat.buildingId },
        { $pull: { "buildings.$.flats": flat._id } }
      );
    }

    // 5. Delete the flat record itself
    await Flat.findByIdAndDelete(id);

    console.log(`[MongoDB] Cascading delete for Flat ${flat.flatNumber}: ${salesDeleteRes.deletedCount} sales, ${rentalDeleteRes.deletedCount} rentals deleted.`);

    return res.json({
      success: true,
      message: `Flat ${flat.flatNumber} and all its sales records (${salesDeleteRes.deletedCount}) and rental contracts (${rentalDeleteRes.deletedCount}) deleted successfully`,
      data: deletedFlatSnapshot,
      cascaded: {
        salesDeleted: salesDeleteRes.deletedCount,
        rentalsDeleted: rentalDeleteRes.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting flat in MongoDB:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk Delete Multiple Selected Flats from MongoDB (with Full Cascading Deletions)
export const bulkDeleteFlats = async (req, res) => {
  try {
    const { flatIds } = req.body;
    if (!flatIds || !Array.isArray(flatIds) || flatIds.length === 0) {
      return res.status(400).json({ success: false, message: 'flatIds array is required' });
    }

    const objectIds = flatIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id);

    // 1. Delete associated Sales Allotments
    const salesDeleteRes = await SalesLead.deleteMany({ flatId: { $in: objectIds } });

    // 2. Delete associated Rental Contracts
    const rentalDeleteRes = await RentalManagement.deleteMany({
      $or: [
        { flatId: { $in: objectIds } },
        { flatIds: { $in: objectIds } }
      ]
    });

    // 3. Unlink from Customers
    await Customer.updateMany(
      {
        $or: [
          { 'ownerDetails.propertyIds': { $in: objectIds } },
          { 'tenantDetails.leasedPropertyIds': { $in: objectIds } }
        ]
      },
      {
        $pull: {
          'ownerDetails.propertyIds': { $in: objectIds },
          'tenantDetails.leasedPropertyIds': { $in: objectIds }
        }
      }
    );

    // 4. Pull from Project buildings
    await Project.updateMany(
      {},
      { $pull: { "buildings.$[].flats": { $in: objectIds } } }
    );

    // 5. Delete Flats
    const flatDeleteRes = await Flat.deleteMany({ _id: { $in: objectIds } });

    console.log(`[MongoDB] Bulk deleted ${flatDeleteRes.deletedCount} flats, ${salesDeleteRes.deletedCount} sales, ${rentalDeleteRes.deletedCount} rentals.`);

    return res.json({
      success: true,
      message: `Successfully deleted ${flatDeleteRes.deletedCount} flat(s), ${salesDeleteRes.deletedCount} sales record(s), and ${rentalDeleteRes.deletedCount} rental contract(s).`,
      deletedFlats: flatDeleteRes.deletedCount,
      deletedSales: salesDeleteRes.deletedCount,
      deletedRentals: rentalDeleteRes.deletedCount
    });
  } catch (error) {
    console.error('Error in bulkDeleteFlats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Blueprint to Flat (Saved in S3)
export const uploadFlatBlueprint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, floorPlanType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No blueprint file uploaded' });
    }

    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({ success: false, message: 'Flat not found' });

    const uploadResult = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'blueprints');

    flat.blueprints.push({
      title: title || file.originalname,
      fileUrl: uploadResult.documentUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      floorPlanType: floorPlanType || '2d_layout',
      uploadedAt: new Date()
    });

    await flat.save();
    return res.json({ success: true, message: 'Blueprint uploaded to S3', data: flat });
  } catch (error) {
    console.error('Error uploading blueprint to S3:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// HELPER: Flexible Date & Numeric Parsers for Excel Imports
// =========================================================================
const parseExcelDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    // Excel base date (Dec 30, 1899)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = val * 86400 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
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

const cleanNumeric = (val, defaultVal = 0) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? defaultVal : n;
};

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

// =========================================================================
// BULK IMPORT EXCEL: Flats, Owners, 3-Year Rental & Rent-Back Contracts
// =========================================================================
export const importFlatsFromExcel = async (req, res) => {
  try {
    let rows = [];

    // 1. Check if raw file was uploaded via multipart/form-data
    if (req.file && req.file.buffer) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else if (req.body.items && Array.isArray(req.body.items)) {
      rows = req.body.items;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or data items provided for import.'
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded sheet is empty or contains no readable rows.'
      });
    }

    // 2. Resolve default or target Project
    let targetProject = null;
    const requestedProjId = req.body.projectId || req.query.projectId;
    if (requestedProjId) {
      targetProject = await Project.findById(requestedProjId);
    }
    if (!targetProject) {
      targetProject = await Project.findOne().sort({ createdAt: -1 });
    }
    if (!targetProject) {
      targetProject = await Project.create({
        projectName: 'Krishna Valley Township',
        projectCode: 'KV-MATHURA',
        address: {
          addressLine1: 'NH-19, Vrindavan Road',
          city: 'Mathura',
          state: 'Uttar Pradesh',
          pincode: '281001'
        },
        status: 'ongoing',
        buildings: []
      });
    }

    const summary = {
      totalRows: rows.length,
      createdFlats: 0,
      updatedFlats: 0,
      createdOwners: 0,
      createdRentals: 0,
      errors: [],
      importedRecords: []
    };

    // 3. Process each row sequentially
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // Accounting for 1-based indexing and header row

      try {
        const rawFlatNo = getRowVal(row, 'flat no', 'flat_no', 'flat no.', 'flat number', 'flat_number', 'unit no', 'unit', 'flat');
        if (!rawFlatNo) {
          summary.errors.push(`Row ${rowNumber}: Skipped (Missing Flat No).`);
          continue;
        }

        const flatNumber = String(rawFlatNo).trim();
        const rawFloor = getRowVal(row, 'floor', 'floor no', 'floor_no', 'floor number');
        const floor = rawFloor !== '' ? cleanNumeric(rawFloor, 1) : inferFloorFromFlat(flatNumber);
        
        const rawBuilding = getRowVal(row, 'building', 'tower', 'building name', 'block', 'wing');
        const buildingName = String(rawBuilding || 'Tower A').trim();

        const rawOwner = getRowVal(row, 'owner name', 'owner_name', 'owner', 'buyer name', 'customer name', 'name');
        const ownerName = String(rawOwner || '').trim();
        const hasOwner = !!ownerName && !ownerName.toLowerCase().includes('vacant');

        const rawPhone = getRowVal(row, 'owner mobile', 'owner phone', 'mobile', 'phone', 'contact', 'mobile no');
        let ownerMobile = String(rawPhone || '').trim();

        const rawAgreementDate = getRowVal(row, 'date of aggreement', 'date of agreement', 'agreement date', 'booking date', 'agreement_date');
        const agreementDate = parseExcelDate(rawAgreementDate);

        const rawRentalStart = getRowVal(row, 'date of the rental starts', 'rental start date', 'rental start', 'start date', 'rental_start_date');
        const rentalStartDate = parseExcelDate(rawRentalStart) || agreementDate || new Date();

        // Tenure: default 36 months if empty, 0, or not specified
        const rawTenure = getRowVal(row, 'tenure', 'tenure (months)', 'tenure months', 'lease tenure', 'duration');
        let tenure = cleanNumeric(rawTenure, 36);
        if (tenure <= 0) tenure = 36;

        // Amount Per Month
        const rawMonthlyRent = getRowVal(row, 'amount per month', 'monthly rent', 'rent per month', 'monthly amount', 'rent', 'monthly_rent');
        const monthlyRent = cleanNumeric(rawMonthlyRent, 0);

        // Amount for the Total Tenure
        const rawTotalTenureAmount = getRowVal(row, 'amount for the total tenure', 'total tenure amount', 'total amount', 'total rental amount', 'total rent');
        let totalTenureAmount = cleanNumeric(rawTotalTenureAmount, 0);
        if (totalTenureAmount <= 0 && monthlyRent > 0) {
          totalTenureAmount = monthlyRent * tenure;
        }

        const rawRentDueDay = getRowVal(row, 'rent due day', 'due day', 'due date', 'actual due date', 'due_date');
        const parsedDueDay = rawRentDueDay ? parseInt(String(rawRentDueDay).replace(/\D/g, ''), 10) : 25;
        const rentDueDay = parsedDueDay || 25;

        const bankName = getRowVal(row, 'bank name', 'bank');
        const bankBranch = getRowVal(row, 'bank branch', 'branch');
        const ifscCode = getRowVal(row, 'ifsc code', 'ifsc');
        const accountNumber = getRowVal(row, 'account number', 'account no', 'account no.', 'ac no');
        const panNumber = getRowVal(row, 'pan number', 'pan', 'pan no');

        const rawBhk = getRowVal(row, 'flat type', 'bhk type', 'unit type', 'type', 'bhk');
        const bhkType = String(rawBhk || 'Service Apartment').trim();

        const rawArea = getRowVal(row, 'carpet area', 'area', 'sqft', 'super builtup area');
        const carpetArea = cleanNumeric(rawArea, 850);

        // Previous Payments & Deal Price Made by Buyer
        const rawDealPrice = getRowVal(row, 'agreed deal price', 'deal price', 'sale price', 'total price', 'flat price', 'base price');
        let agreedDealPrice = cleanNumeric(rawDealPrice, 0);
        if (agreedDealPrice <= 0) {
          agreedDealPrice = totalTenureAmount > 0 ? totalTenureAmount * 3 : 4500000;
        }

        const rawPaidAmount = getRowVal(row, 'previous payment', 'previous payments', 'paid amount', 'amount paid', 'booking amount', 'advance paid', 'token amount', 'payment made');
        let previousPaidAmount = cleanNumeric(rawPaidAmount, 0);
        if (previousPaidAmount <= 0 && rawPaidAmount === '') {
          // Default booking advance if not explicitly zero
          previousPaidAmount = Math.min(agreedDealPrice, 100000);
        }

        // A. Resolve or Create Building in Target Project
        if (!targetProject.buildings) targetProject.buildings = [];
        let building = targetProject.buildings.find(
          (b) => b.buildingName && b.buildingName.toLowerCase() === buildingName.toLowerCase()
        );

        if (!building) {
          const buildingCode = buildingName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10) || `BLD-${Date.now().toString().slice(-4)}`;
          targetProject.buildings.push({
            buildingName,
            buildingCode,
            numberOfFloors: Math.max(floor, 1),
            flats: [],
            status: 'completed'
          });
          await targetProject.save();
          building = targetProject.buildings[targetProject.buildings.length - 1];
        } else if (floor > (building.numberOfFloors || 0)) {
          building.numberOfFloors = floor;
          await targetProject.save();
        }

        // B. Resolve or Create Flat in MongoDB
        let flat = await Flat.findOne({
          projectId: targetProject._id,
          buildingId: building._id,
          flatNumber
        });

        // Determine flat status
        const rawStatus = String(getRowVal(row, 'status', 'flat status', 'unit status') || '').toLowerCase().trim();
        let targetStatus = 'available';
        if (rawStatus.includes('resell') || rawStatus.includes('resold')) {
          targetStatus = 'resell';
        } else if (rawStatus.includes('buyback') || rawStatus.includes('buy_back') || rawStatus.includes('buy back')) {
          targetStatus = 'buy_back';
        } else if (rawStatus.includes('possession') || rawStatus.includes('renewal')) {
          targetStatus = 'possession_renewal';
        } else if (rawStatus.includes('leased')) {
          targetStatus = 'leased';
        } else if (rawStatus.includes('hold') || rawStatus.includes('booked')) {
          targetStatus = 'hold';
        } else if (rawStatus.includes('sold') || hasOwner) {
          targetStatus = 'sold';
        }

        const isFlatSold = ['sold', 'resell', 'buy_back', 'possession_renewal', 'leased'].includes(targetStatus);
        const hasRental = monthlyRent > 0 || !!rawRentalStart;
        let isNewFlat = false;

        if (!flat) {
          isNewFlat = true;
          flat = new Flat({
            projectId: targetProject._id,
            buildingId: building._id,
            flatNumber,
            floor,
            bhkType,
            carpetArea,
            basePrice: agreedDealPrice,
            status: targetStatus,
            isSold: isFlatSold,
            takenForRental: hasRental,
            facing: 'East'
          });
          await flat.save();
          building.flats.push(flat._id);
          await targetProject.save();
          summary.createdFlats++;
        } else {
          flat.floor = floor;
          if (bhkType) flat.bhkType = bhkType;
          if (carpetArea) flat.carpetArea = carpetArea;
          if (agreedDealPrice > 0) flat.basePrice = agreedDealPrice;
          flat.status = targetStatus;
          flat.isSold = isFlatSold;
          if (hasRental) flat.takenForRental = true;
          await flat.save();
          summary.updatedFlats++;
        }

        // C. Resolve or Create Owner (Customer & SalesLead with Recorded Previous Payments)
        let ownerCustomer = null;
        if (hasOwner) {
          if (!ownerMobile || ownerMobile.length < 10) {
            // Generate clean unique deterministic phone number if missing
            const seedDigits = Math.abs(flatNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000));
            ownerMobile = `+91 98${String(seedDigits).padEnd(8, '0').slice(0, 8)}`;
          }

          ownerCustomer = await Customer.findOne({
            customerType: 'owner',
            $or: [{ mobileNo: ownerMobile }, { name: ownerName }]
          });

          if (!ownerCustomer) {
            ownerCustomer = new Customer({
              customerType: 'owner',
              name: ownerName,
              mobileNo: ownerMobile,
              email: `${ownerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}.${flatNumber}@krishnavalley.com`,
              panNumber: panNumber || '',
              bankingDetails: {
                bankName: bankName || '',
                branchName: bankBranch || '',
                accountNumber: accountNumber || '',
                ifscCode: ifscCode || ''
              },
              ownerDetails: {
                propertyIds: [flat._id],
                ownershipType: 'individual',
                ownershipPercentage: 100
              }
            });
            await ownerCustomer.save();
            summary.createdOwners++;
          } else {
            if (!ownerCustomer.ownerDetails) ownerCustomer.ownerDetails = { propertyIds: [] };
            if (!ownerCustomer.ownerDetails.propertyIds) ownerCustomer.ownerDetails.propertyIds = [];
            if (!ownerCustomer.ownerDetails.propertyIds.some((pId) => pId.toString() === flat._id.toString())) {
              ownerCustomer.ownerDetails.propertyIds.push(flat._id);
            }
            if (bankName || accountNumber) {
              if (!ownerCustomer.bankingDetails) ownerCustomer.bankingDetails = {};
              if (bankName) ownerCustomer.bankingDetails.bankName = bankName;
              if (bankBranch) ownerCustomer.bankingDetails.branchName = bankBranch;
              if (ifscCode) ownerCustomer.bankingDetails.ifscCode = ifscCode;
              if (accountNumber) ownerCustomer.bankingDetails.accountNumber = accountNumber;
            }
            if (panNumber) ownerCustomer.panNumber = panNumber;
            await ownerCustomer.save();
          }

          // Ensure Lead & SalesLead exist with full payment & booking history
          let lead = await Lead.findOne({ mobileNo: ownerCustomer.mobileNo });
          if (!lead) {
            lead = new Lead({
              name: ownerCustomer.name,
              mobileNo: ownerCustomer.mobileNo,
              email: ownerCustomer.email,
              requirement: `${bhkType} Unit`,
              status: 'converted',
              leadSource: 'direct',
              assignedFlat: flat._id
            });
            await lead.save();
          }

          let salesLead = await SalesLead.findOne({ flatId: flat._id, salesStatus: { $ne: 'cancelled' } });
          const isFullyPaid = previousPaidAmount >= agreedDealPrice && agreedDealPrice > 0;
          const salesStatus = isFullyPaid ? 'fully_paid' : (previousPaidAmount > 0 ? 'agreement_completed' : 'agreement_completed');
          const bbaNumber = `BBA-${flatNumber}-${Date.now().toString().slice(-4)}`;
          const receiptNumber = `RCP-LEGACY-${flatNumber}-${Date.now().toString().slice(-4)}`;

          if (!salesLead) {
            salesLead = new SalesLead({
              leadId: lead._id,
              customerId: ownerCustomer._id,
              name: ownerCustomer.name,
              mobileNo: ownerCustomer.mobileNo,
              email: ownerCustomer.email,
              projectId: targetProject._id,
              buildingId: building._id,
              flatId: flat._id,
              salesStatus,
              booking: {
                isBooked: true,
                bookingDate: agreementDate || rentalStartDate,
                agreedDealPrice,
                bookingAmount: previousPaidAmount,
                bookingStatus: 'confirmed'
              },
              agreement: {
                required: true,
                uploaded: true,
                isSigned: true,
                agreementDate: agreementDate || rentalStartDate,
                agreementNumber: bbaNumber,
                verificationStatus: 'verified'
              },
              paymentPlan: {
                type: isFullyPaid ? 'full_payment' : 'installment',
                totalAmount: agreedDealPrice,
                bookingAmount: previousPaidAmount,
                remainingAmount: Math.max(0, agreedDealPrice - previousPaidAmount),
                numberOfInstallments: isFullyPaid ? 1 : 2,
                decidedAt: agreementDate || rentalStartDate
              },
              receipts: previousPaidAmount > 0 ? [{
                receiptNumber,
                amount: previousPaidAmount,
                generatedAt: agreementDate || rentalStartDate
              }] : [],
              installments: [
                {
                  installmentNumber: 1,
                  dueDate: agreementDate || rentalStartDate,
                  amount: previousPaidAmount > 0 ? previousPaidAmount : agreedDealPrice,
                  paidAmount: previousPaidAmount,
                  remainingAmount: Math.max(0, (previousPaidAmount > 0 ? previousPaidAmount : agreedDealPrice) - previousPaidAmount),
                  status: previousPaidAmount > 0 ? 'paid' : 'due',
                  paidAt: previousPaidAmount > 0 ? (agreementDate || rentalStartDate) : null
                },
                ...(agreedDealPrice > previousPaidAmount && previousPaidAmount > 0 ? [{
                  installmentNumber: 2,
                  dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                  amount: agreedDealPrice - previousPaidAmount,
                  paidAmount: 0,
                  remainingAmount: agreedDealPrice - previousPaidAmount,
                  status: 'upcoming'
                }] : [])
              ]
            });
            await salesLead.save();

            ownerCustomer.salesAllotment = {
              salesLeadId: salesLead._id,
              agreedDealPrice,
              bookingAmount: previousPaidAmount,
              paymentMode: 'bank_transfer',
              allotmentDate: agreementDate || rentalStartDate,
              agreementDate: agreementDate || rentalStartDate,
              salesStatus
            };
            await ownerCustomer.save();
          } else {
            salesLead.customerId = ownerCustomer._id;
            salesLead.name = ownerCustomer.name;
            salesLead.mobileNo = ownerCustomer.mobileNo;
            salesLead.salesStatus = salesStatus;
            salesLead.booking.agreedDealPrice = agreedDealPrice;
            salesLead.booking.bookingAmount = previousPaidAmount;
            salesLead.booking.isBooked = true;
            salesLead.agreement.agreementDate = agreementDate || rentalStartDate;
            salesLead.agreement.isSigned = true;
            if (previousPaidAmount > 0 && (!salesLead.receipts || salesLead.receipts.length === 0)) {
              salesLead.receipts = [{ receiptNumber, amount: previousPaidAmount, generatedAt: agreementDate || rentalStartDate }];
            }
            await salesLead.save();

            ownerCustomer.salesAllotment = {
              salesLeadId: salesLead._id,
              agreedDealPrice,
              bookingAmount: previousPaidAmount,
              paymentMode: 'bank_transfer',
              allotmentDate: agreementDate || rentalStartDate,
              agreementDate: agreementDate || rentalStartDate,
              salesStatus
            };
            await ownerCustomer.save();
          }
        }

        // D. Resolve or Create 3-Year Guaranteed Rental Contract
        if (hasRental && ownerCustomer) {
          const rentalEndDate = new Date(rentalStartDate);
          rentalEndDate.setMonth(rentalEndDate.getMonth() + tenure);

          let rental = await RentalManagement.findOne({
            flatId: flat._id,
            status: { $ne: 'terminated' }
          });

          const codeSuffix = `${flatNumber}-${Date.now().toString().slice(-4)}`;

          if (!rental) {
            rental = new RentalManagement({
              projectId: targetProject._id,
              buildingId: building._id,
              flatId: flat._id,
              ownerId: ownerCustomer._id,
              tenantId: ownerCustomer._id,
              contractCode: `RENT-${codeSuffix}`,
              contractNumber: `RENT-${codeSuffix}`,
              status: 'rent_back_active',
              rentBack: {
                enabled: true,
                agreementNumber: `RB-${codeSuffix}`,
                startDate: rentalStartDate,
                endDate: rentalEndDate,
                monthlyRent,
                securityDeposit: monthlyRent * 2,
                rentDueDay,
                status: 'active'
              },
              tenantAgreement: {
                agreementNumber: `TA-${codeSuffix}`,
                startDate: rentalStartDate,
                endDate: rentalEndDate,
                monthlyRent,
                rentDueDay,
                status: 'active'
              },
              securityDeposit: {
                tenantDeposit: {
                  requiredAmount: monthlyRent * 2,
                  paidAmount: monthlyRent * 2,
                  status: 'paid'
                },
                ownerDeposit: {
                  requiredAmount: monthlyRent * 2,
                  paidAmount: monthlyRent * 2,
                  status: 'paid'
                }
              },
              allocation: {
                status: 'occupied',
                allocationDate: rentalStartDate,
                moveInDate: rentalStartDate
              },
              remarks: `Imported via Excel. Tenure: ${tenure} Months. Previous Payment: ₹${previousPaidAmount}`
            });
            await rental.save();
            summary.createdRentals++;
          } else {
            rental.rentBack.enabled = true;
            rental.rentBack.startDate = rentalStartDate;
            rental.rentBack.endDate = rentalEndDate;
            rental.rentBack.monthlyRent = monthlyRent;
            rental.tenantAgreement.monthlyRent = monthlyRent;
            rental.tenantAgreement.startDate = rentalStartDate;
            rental.tenantAgreement.endDate = rentalEndDate;
            rental.status = 'rent_back_active';
            await rental.save();
          }
        }

        // E. Synchronize Unified Flat Document
        if (ownerCustomer) {
          flat.currentOwner = {
            customerId: ownerCustomer._id,
            name: ownerCustomer.name,
            mobileNo: ownerCustomer.mobileNo,
            email: ownerCustomer.email,
            ownershipStartDate: agreementDate || rentalStartDate,
            ownershipType: 'individual'
          };
          flat.isSold = true;
        }

        if (hasOwner) {
          const isFull = previousPaidAmount >= agreedDealPrice && agreedDealPrice > 0;
          flat.salesDetails = {
            buyerName: ownerCustomer?.name || ownerName,
            bookingDate: agreementDate || rentalStartDate,
            agreedDealPrice,
            bookingAmountPaid: previousPaidAmount,
            totalAmountPaid: previousPaidAmount,
            balanceAmountDue: Math.max(0, agreedDealPrice - previousPaidAmount),
            paymentPlanType: isFull ? 'full_payment' : 'installment',
            agreementDate: agreementDate || rentalStartDate,
            salesStatus: isFull ? 'fully_paid' : 'agreement_completed'
          };
        }

        if (hasRental) {
          const totalCommitment = totalTenureAmount || (monthlyRent * tenure);
          const rentalEndDate = new Date(rentalStartDate);
          rentalEndDate.setMonth(rentalEndDate.getMonth() + tenure);

          flat.rentalDetails = {
            isRentBackActive: true,
            mouDate: agreementDate || rentalStartDate,
            startDate: rentalStartDate,
            endDate: rentalEndDate,
            tenureMonths: tenure,
            dueDayOfMonth: rentDueDay,
            guaranteedMonthlyRent: monthlyRent,
            total36MonthCommitment: totalCommitment,
            totalDisbursedToOwner: 0,
            remainingPayableToOwner: totalCommitment
          };
          flat.takenForRental = true;
          flat.status = 'leased';
        } else if (hasOwner) {
          flat.status = 'sold';
        }

        await flat.save();

        summary.importedRecords.push({
          row: rowNumber,
          flatNumber,
          buildingName,
          floor,
          ownerName: ownerName || 'N/A',
          monthlyRent,
          tenureMonths: tenure,
          totalTenureAmount,
          previousPaidAmount,
          rentalStartDate: rentalStartDate ? rentalStartDate.toISOString().slice(0, 10) : 'N/A'
        });

      } catch (rowErr) {
        console.error(`Error processing row ${rowNumber}:`, rowErr);
        summary.errors.push(`Row ${rowNumber}: ${rowErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${summary.importedRecords.length} records (${summary.createdFlats} new flats, ${summary.updatedFlats} updated, ${summary.createdOwners} owners, ${summary.createdRentals} rental contracts).`,
      data: summary
    });

  } catch (error) {
    console.error('Error importing flats from Excel:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// BULK ENROLL SELECTED FLATS: 3-Year Rental & Sales Allotment
// =========================================================================
export const bulkEnrollRentalSales = async (req, res) => {
  try {
    const {
      flatIds,
      ownerName,
      ownerMobile,
      ownerEmail,
      agreedDealPrice,
      previousPaidAmount,
      paymentMode,
      transactionReference,
      agreementDate: rawAgreementDate,
      rentalStartDate: rawRentalStartDate,
      tenureMonths,
      monthlyRent,
      bhkType
    } = req.body;

    if (!flatIds || !Array.isArray(flatIds) || flatIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one flat to enroll.' });
    }

    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ success: false, message: 'Owner name is required for sales allotment.' });
    }

    const cleanOwnerName = ownerName.trim();
    const cleanPhone = (ownerMobile && ownerMobile.trim().length >= 10)
      ? ownerMobile.trim()
      : `+91 98${String(Math.abs(cleanOwnerName.split('').reduce((a, c) => a + c.charCodeAt(0), 1000))).padEnd(8, '0').slice(0, 8)}`;

    const agreementDate = parseExcelDate(rawAgreementDate) || new Date();
    const rentalStartDate = parseExcelDate(rawRentalStartDate) || agreementDate;
    const tenure = (tenureMonths && Number(tenureMonths) > 0) ? Number(tenureMonths) : 36;
    const rentPerMonth = Number(monthlyRent) || 0;
    const dealPrice = Number(agreedDealPrice) || 4500000;
    const paidAmount = Number(previousPaidAmount) || 0;
    const isFullyPaid = paidAmount >= dealPrice && dealPrice > 0;
    const salesStatus = isFullyPaid ? 'fully_paid' : (paidAmount > 0 ? 'agreement_completed' : 'agreement_completed');

    // 1. Resolve or Create Owner Customer
    let customer = await Customer.findOne({
      customerType: 'owner',
      $or: [{ mobileNo: cleanPhone }, { name: cleanOwnerName }]
    });

    if (!customer) {
      customer = new Customer({
        customerType: 'owner',
        name: cleanOwnerName,
        mobileNo: cleanPhone,
        email: ownerEmail || `${cleanOwnerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@krishnavalley.com`,
        ownerDetails: {
          propertyIds: [],
          ownershipType: 'individual',
          ownershipPercentage: 100
        }
      });
      await customer.save();
    }

    if (!customer.ownerDetails) customer.ownerDetails = { propertyIds: [] };
    if (!customer.ownerDetails.propertyIds) customer.ownerDetails.propertyIds = [];

    // Lead for CRM linking
    let lead = await Lead.findOne({ mobileNo: customer.mobileNo });
    if (!lead) {
      lead = new Lead({
        name: customer.name,
        mobileNo: customer.mobileNo,
        email: customer.email,
        requirement: `${bhkType || '2BHK'} Unit`,
        stage: 'WON',
        status: 'WON',
        source: 'Bulk Inventory Allotment'
      });
      await lead.save();
    }

    const updatedFlats = [];
    const createdSales = [];
    const createdRentals = [];

    for (const flatId of flatIds) {
      const flat = await Flat.findById(flatId);
      if (!flat) continue;

      // Add to customer propertyIds
      if (!customer.ownerDetails.propertyIds.some((p) => p.toString() === flat._id.toString())) {
        customer.ownerDetails.propertyIds.push(flat._id);
      }

      // Update Flat status
      flat.status = 'sold';
      flat.takenForRental = true;
      if (bhkType) flat.bhkType = bhkType;
      if (dealPrice > 0) flat.basePrice = dealPrice;
      await flat.save();
      updatedFlats.push(flat);

      // Create / Update SalesLead
      let salesLead = await SalesLead.findOne({ flatId: flat._id, salesStatus: { $ne: 'cancelled' } });
      const bbaNumber = `BBA-${flat.flatNumber}-${Date.now().toString().slice(-4)}`;
      const receiptNumber = `RCP-PREV-${flat.flatNumber}-${Date.now().toString().slice(-4)}`;

      if (!salesLead) {
        salesLead = new SalesLead({
          leadId: lead._id,
          customerId: customer._id,
          name: customer.name,
          mobileNo: customer.mobileNo,
          email: customer.email,
          projectId: flat.projectId,
          buildingId: flat.buildingId,
          flatId: flat._id,
          salesStatus,
          booking: {
            isBooked: true,
            bookingDate: agreementDate,
            agreedDealPrice: dealPrice,
            bookingAmount: paidAmount,
            bookingStatus: 'confirmed'
          },
          agreement: {
            required: true,
            uploaded: true,
            isSigned: true,
            agreementDate,
            agreementNumber: bbaNumber,
            verificationStatus: 'verified'
          },
          paymentPlan: {
            type: isFullyPaid ? 'full_payment' : 'installment',
            totalAmount: dealPrice,
            bookingAmount: paidAmount,
            remainingAmount: Math.max(0, dealPrice - paidAmount),
            numberOfInstallments: isFullyPaid ? 1 : 2,
            decidedAt: agreementDate
          },
          receipts: paidAmount > 0 ? [{
            receiptNumber,
            amount: paidAmount,
            generatedAt: agreementDate
          }] : [],
          installments: [
            {
              installmentNumber: 1,
              dueDate: agreementDate,
              amount: paidAmount > 0 ? paidAmount : dealPrice,
              paidAmount: paidAmount,
              remainingAmount: Math.max(0, (paidAmount > 0 ? paidAmount : dealPrice) - paidAmount),
              status: paidAmount > 0 ? 'paid' : 'due',
              paidAt: paidAmount > 0 ? agreementDate : null
            },
            ...(dealPrice > paidAmount && paidAmount > 0 ? [{
              installmentNumber: 2,
              dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              amount: dealPrice - paidAmount,
              paidAmount: 0,
              remainingAmount: dealPrice - paidAmount,
              status: 'upcoming'
            }] : [])
          ]
        });
        await salesLead.save();
        createdSales.push(salesLead);
      } else {
        salesLead.customerId = customer._id;
        salesLead.name = customer.name;
        salesLead.mobileNo = customer.mobileNo;
        salesLead.salesStatus = salesStatus;
        salesLead.booking.agreedDealPrice = dealPrice;
        salesLead.booking.bookingAmount = paidAmount;
        salesLead.booking.isBooked = true;
        salesLead.agreement.agreementDate = agreementDate;
        salesLead.agreement.isSigned = true;
        if (paidAmount > 0 && (!salesLead.receipts || salesLead.receipts.length === 0)) {
          salesLead.receipts = [{ receiptNumber, amount: paidAmount, generatedAt: agreementDate }];
        }
        await salesLead.save();
        createdSales.push(salesLead);
      }

      // Create / Update 3-Year Rental Contract
      if (rentPerMonth > 0 || rentalStartDate) {
        const rentalEndDate = new Date(rentalStartDate);
        rentalEndDate.setMonth(rentalEndDate.getMonth() + tenure);

        let rental = await RentalManagement.findOne({
          flatId: flat._id,
          status: { $ne: 'terminated' }
        });

        const codeSuffix = `${flat.flatNumber}-${Date.now().toString().slice(-4)}`;

        if (!rental) {
          rental = new RentalManagement({
            projectId: flat.projectId,
            buildingId: flat.buildingId,
            flatId: flat._id,
            ownerId: customer._id,
            tenantId: customer._id,
            contractCode: `RENT-${codeSuffix}`,
            contractNumber: `RENT-${codeSuffix}`,
            status: 'rent_back_active',
            rentBack: {
              enabled: true,
              agreementNumber: `RB-${codeSuffix}`,
              startDate: rentalStartDate,
              endDate: rentalEndDate,
              monthlyRent: rentPerMonth,
              securityDeposit: rentPerMonth * 2,
              rentDueDay: 5,
              status: 'active'
            },
            tenantAgreement: {
              agreementNumber: `TA-${codeSuffix}`,
              startDate: rentalStartDate,
              endDate: rentalEndDate,
              monthlyRent: rentPerMonth,
              rentDueDay: 5,
              status: 'active'
            },
            securityDeposit: {
              tenantDeposit: {
                requiredAmount: rentPerMonth * 2,
                paidAmount: rentPerMonth * 2,
                status: 'paid'
              },
              ownerDeposit: {
                requiredAmount: rentPerMonth * 2,
                paidAmount: rentPerMonth * 2,
                status: 'paid'
              }
            },
            allocation: {
              status: 'occupied',
              allocationDate: rentalStartDate,
              moveInDate: rentalStartDate
            },
            remarks: `Bulk Enrolled. Tenure: ${tenure} Months. Previous Payment: ₹${paidAmount}`
          });
          await rental.save();
          createdRentals.push(rental);
        } else {
          rental.rentBack.enabled = true;
          rental.rentBack.startDate = rentalStartDate;
          rental.rentBack.endDate = rentalEndDate;
          rental.rentBack.monthlyRent = rentPerMonth;
          rental.tenantAgreement.monthlyRent = rentPerMonth;
          rental.status = 'rent_back_active';
          await rental.save();
          createdRentals.push(rental);
        }
      }
    }

    // Update customer's sales allotment
    if (createdSales.length > 0) {
      customer.salesAllotment = {
        salesLeadId: createdSales[0]._id,
        agreedDealPrice: dealPrice * flatIds.length,
        bookingAmount: paidAmount * flatIds.length,
        paymentMode: paymentMode || 'bank_transfer',
        transactionReference: transactionReference || '',
        allotmentDate: agreementDate,
        agreementDate,
        salesStatus
      };
    }
    await customer.save();

    return res.json({
      success: true,
      message: `Enrolled ${updatedFlats.length} flat(s) under 3-Year Rental Management and Sales Allotments with ₹${paidAmount.toLocaleString('en-IN')} payment credited.`,
      data: {
        customer,
        updatedFlatsCount: updatedFlats.length,
        createdSalesCount: createdSales.length,
        createdRentalsCount: createdRentals.length
      }
    });

  } catch (error) {
    console.error('Error in bulkEnrollRentalSales:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// RECORD BUYBACK / RESALE / TRANSFER FOR SINGLE FLAT
// =========================================================================
export const recordFlatBuybackOrResale = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transferType, // 'buyback' | 'resale' | 'surrender'
      transferDealValue,
      transferDate,
      remarks,
      newOwner // { name, mobileNo, email, agreedDealPrice, bookingAmountPaid, paymentPlanType }
    } = req.body;

    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({ success: false, message: 'Flat not found' });

    const effDate = transferDate ? new Date(transferDate) : new Date();
    const effDealValue = Number(transferDealValue) || 0;

    // 1. Archive Current Owner into ownershipHistory if owner exists
    if (flat.currentOwner && flat.currentOwner.name) {
      if (!flat.ownershipHistory) flat.ownershipHistory = [];

      flat.ownershipHistory.push({
        previousOwnerId: flat.currentOwner.customerId,
        name: flat.currentOwner.name,
        mobileNo: flat.currentOwner.mobileNo,
        email: flat.currentOwner.email,
        ownershipStartDate: flat.currentOwner.ownershipStartDate || flat.createdAt,
        ownershipEndDate: effDate,
        transferDate: effDate,
        transferReason: transferType || 'buyback',
        transferDealValue: effDealValue,
        remarks: remarks || `Flat ${transferType || 'transferred'} on ${effDate.toLocaleDateString()}`
      });
    }

    flat.buybackCount = (flat.buybackCount || 0) + 1;

    // 2. Branch: If Buyback (Company repurchased flat)
    if (transferType === 'buyback' || !newOwner || !newOwner.name) {
      flat.currentOwner = undefined;
      flat.status = 'available';
      flat.isSold = false;
      flat.takenForRental = false;
      flat.salesDetails = undefined;
      flat.rentalDetails = undefined;

      // Mark active sales lead as archived_buyback
      await SalesLead.updateMany(
        { flatId: flat._id, salesStatus: { $ne: 'cancelled' } },
        { salesStatus: 'cancelled', remarks: `Buyback completed on ${effDate.toLocaleDateString()}` }
      );

      // Terminate active rental contract
      await RentalManagement.updateMany(
        { flatId: flat._id, status: { $ne: 'terminated' } },
        { status: 'terminated', remarks: `Buyback completed. Rental terminated on ${effDate.toLocaleDateString()}` }
      );

      await flat.save();

      return res.json({
        success: true,
        message: `Flat ${flat.flatNumber} bought back by company. Previous owner archived in Chain of Title. Flat is now AVAILABLE for new sale.`,
        data: flat
      });
    }

    // 3. Branch: If Resold to New Buyer (Owner B)
    let newCustomer = await Customer.findOne({
      customerType: 'owner',
      mobileNo: newOwner.mobileNo.trim()
    });

    if (!newCustomer) {
      newCustomer = new Customer({
        name: newOwner.name.trim(),
        mobileNo: newOwner.mobileNo.trim(),
        email: newOwner.email || '',
        customerType: 'owner',
        ownerDetails: {
          propertyIds: [flat._id],
          ownershipType: 'individual',
          ownershipPercentage: 100
        }
      });
      await newCustomer.save();
    } else {
      if (!newCustomer.ownerDetails?.propertyIds?.some((p) => p.toString() === flat._id.toString())) {
        if (!newCustomer.ownerDetails) newCustomer.ownerDetails = { propertyIds: [] };
        newCustomer.ownerDetails.propertyIds.push(flat._id);
        await newCustomer.save();
      }
    }

    // Set new active owner
    flat.currentOwner = {
      customerId: newCustomer._id,
      name: newCustomer.name,
      mobileNo: newCustomer.mobileNo,
      email: newCustomer.email,
      ownershipStartDate: effDate,
      ownershipType: 'individual'
    };

    const newDealPrice = Number(newOwner.agreedDealPrice) || effDealValue || flat.basePrice;
    const newPaidAmount = Number(newOwner.bookingAmountPaid) || 0;
    const isFull = newPaidAmount >= newDealPrice && newDealPrice > 0;

    flat.salesDetails = {
      buyerName: newCustomer.name,
      bookingDate: effDate,
      agreedDealPrice: newDealPrice,
      bookingAmountPaid: newPaidAmount,
      totalAmountPaid: newPaidAmount,
      balanceAmountDue: Math.max(0, newDealPrice - newPaidAmount),
      paymentPlanType: newOwner.paymentPlanType || (isFull ? 'full_payment' : 'installment'),
      agreementDate: effDate,
      salesStatus: isFull ? 'fully_paid' : 'agreement_completed'
    };

    flat.status = 'sold';
    flat.isSold = true;
    await flat.save();

    return res.json({
      success: true,
      message: `Flat ${flat.flatNumber} resold to ${newCustomer.name}. Previous ownership recorded in Chain of Title.`,
      data: flat
    });

  } catch (error) {
    console.error('Error in recordFlatBuybackOrResale:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// BULK IMPORT OWNERSHIP & RESALE HISTORY (CHAIN OF TITLE) FROM EXCEL
// =========================================================================
export const importOwnershipHistoryFromExcel = async (req, res) => {
  try {
    let rows = [];

    if (req.file && req.file.buffer) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const historySheetName = workbook.SheetNames.find(
        (n) => n.toLowerCase().includes('history') || n.toLowerCase().includes('resale') || n.toLowerCase().includes('ownership')
      ) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[historySheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else if (req.body.items && Array.isArray(req.body.items)) {
      rows = req.body.items;
    } else {
      return res.status(400).json({ success: false, message: 'No Excel file or data rows provided' });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty' });
    }

    const summary = {
      totalRows: rows.length,
      historyRecordsAppended: 0,
      activeOwnersUpdated: 0,
      flatsUpdated: 0,
      errors: [],
      processedFlats: []
    };

    // Resolve default project if needed
    let defaultProj = await Project.findOne().sort({ createdAt: -1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const rawFlatNo = getRowVal(row, 'flat no', 'flat_no', 'flat number', 'unit no', 'unit', 'flat');
        if (!rawFlatNo) {
          summary.errors.push(`Row ${rowNum}: Missing Flat No.`);
          continue;
        }

        const flatNumber = String(rawFlatNo).trim();
        const rawBuilding = getRowVal(row, 'tower', 'building', 'building name', 'block', 'wing');
        const buildingName = String(rawBuilding || 'Tower A').trim();

        let flat = await Flat.findOne({ flatNumber });
        if (!flat) {
          if (!defaultProj) {
            defaultProj = await Project.create({
              projectName: 'Krishna Valley Township',
              projectCode: 'KV-MATHURA',
              status: 'ongoing',
              buildings: []
            });
          }

          if (!defaultProj.buildings) defaultProj.buildings = [];
          let building = defaultProj.buildings.find(
            (b) => b.buildingName && b.buildingName.toLowerCase() === buildingName.toLowerCase()
          );

          if (!building) {
            defaultProj.buildings.push({
              buildingName,
              buildingCode: buildingName.toUpperCase().slice(0, 8),
              numberOfFloors: 5,
              flats: [],
              status: 'completed'
            });
            await defaultProj.save();
            building = defaultProj.buildings[defaultProj.buildings.length - 1];
          }

          flat = new Flat({
            projectId: defaultProj._id,
            buildingId: building._id,
            flatNumber,
            floor: inferFloorFromFlat(flatNumber),
            bhkType: 'Service Apartment',
            status: 'available',
            basePrice: 5000000,
            facing: 'East'
          });
          await flat.save();
          building.flats.push(flat._id);
          await defaultProj.save();
        }

        // Previous / Historical Owner Fields
        const prevOwnerName = getRowVal(row, 'previous owner name', 'old owner', 'seller name', 'previous owner', 'seller', 'old owner name');
        const prevPhone = getRowVal(row, 'previous owner phone', 'old phone', 'seller phone', 'previous mobile', 'old mobile');
        const rawPurchaseDate = getRowVal(row, 'previous purchase date', 'original date', 'start date', 'old agreement date', 'purchase date');
        const rawTransferDate = getRowVal(row, 'transfer date', 'exit date', 'buyback date', 'resale date', 'end date');
        const rawReason = getRowVal(row, 'transfer reason', 'reason', 'type', 'event');
        const rawTransferValue = getRowVal(row, 'transfer deal value', 'buyback price', 'resale price', 'deal value', 'transfer value');
        const remarks = getRowVal(row, 'remarks', 'notes', 'comments');

        const purchaseDate = parseExcelDate(rawPurchaseDate) || new Date('2024-01-01');
        const transferDate = parseExcelDate(rawTransferDate) || new Date();
        const transferDealValue = cleanNumeric(rawTransferValue, 0);
        const transferReason = ['resale', 'buyback', 'surrender', 'inheritance', 'family_transfer'].includes(String(rawReason).toLowerCase().trim())
          ? String(rawReason).toLowerCase().trim()
          : 'resale';

        if (prevOwnerName) {
          if (!flat.ownershipHistory) flat.ownershipHistory = [];

          // Avoid duplicate history entries
          const isDup = flat.ownershipHistory.some(
            (h) => h.name && h.name.toLowerCase() === prevOwnerName.toLowerCase() &&
                   Math.abs(new Date(h.transferDate).getTime() - transferDate.getTime()) < 86400000
          );

          if (!isDup) {
            flat.ownershipHistory.push({
              name: prevOwnerName.trim(),
              mobileNo: prevPhone ? String(prevPhone).trim() : '+91 9800000000',
              ownershipStartDate: purchaseDate,
              ownershipEndDate: transferDate,
              transferDate,
              transferReason,
              transferDealValue,
              remarks: remarks || `Imported historical owner record`
            });
            flat.buybackCount = (flat.buybackCount || 0) + 1;
            summary.historyRecordsAppended++;
          }
        }

        // Optional: Current / Active Owner Fields (New Buyer)
        const currentOwnerName = getRowVal(row, 'current owner name', 'new owner', 'buyer name', 'active owner', 'new owner name', 'current owner');
        const currentPhone = getRowVal(row, 'current owner phone', 'new phone', 'buyer phone', 'current mobile', 'new mobile');
        const rawCurrentPrice = getRowVal(row, 'current deal price', 'new deal price', 'current price', 'new price');
        const rawCurrentPaid = getRowVal(row, 'current paid amount', 'new paid amount', 'current paid');

        if (currentOwnerName) {
          let currentCust = await Customer.findOne({
            customerType: 'owner',
            $or: [{ name: currentOwnerName.trim() }, ...(currentPhone ? [{ mobileNo: String(currentPhone).trim() }] : [])]
          });

          if (!currentCust) {
            currentCust = new Customer({
              name: currentOwnerName.trim(),
              mobileNo: currentPhone ? String(currentPhone).trim() : `+91 98${flatNumber.padStart(8, '0').slice(0, 8)}`,
              customerType: 'owner',
              ownerDetails: {
                propertyIds: [flat._id],
                ownershipType: 'individual',
                ownershipPercentage: 100
              }
            });
            await currentCust.save();
          }

          flat.currentOwner = {
            customerId: currentCust._id,
            name: currentCust.name,
            mobileNo: currentCust.mobileNo,
            email: currentCust.email,
            ownershipStartDate: transferDate,
            ownershipType: 'individual'
          };

          const currentPrice = cleanNumeric(rawCurrentPrice, flat.basePrice);
          const currentPaid = cleanNumeric(rawCurrentPaid, currentPrice);
          const isFull = currentPaid >= currentPrice && currentPrice > 0;

          flat.salesDetails = {
            buyerName: currentCust.name,
            bookingDate: transferDate,
            agreedDealPrice: currentPrice,
            bookingAmountPaid: currentPaid,
            totalAmountPaid: currentPaid,
            balanceAmountDue: Math.max(0, currentPrice - currentPaid),
            paymentPlanType: isFull ? 'full_payment' : 'installment',
            agreementDate: transferDate,
            salesStatus: isFull ? 'fully_paid' : 'agreement_completed'
          };

          flat.status = 'sold';
          flat.isSold = true;
          summary.activeOwnersUpdated++;
        }

        await flat.save();
        summary.flatsUpdated++;
        if (!summary.processedFlats.includes(flat.flatNumber)) {
          summary.processedFlats.push(flat.flatNumber);
        }

      } catch (rowErr) {
        summary.errors.push(`Row ${rowNum}: ${rowErr.message}`);
      }
    }

    return res.json({
      success: true,
      message: `Processed ${summary.flatsUpdated} flat(s). Appended ${summary.historyRecordsAppended} historical ownership record(s) and updated ${summary.activeOwnersUpdated} active owner(s).`,
      data: summary
    });

  } catch (error) {
    console.error('Error importing ownership history:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Wipe / Delete All Flats & Associated Property References
export const deleteAllFlats = async (req, res) => {
  try {
    const flatDeleteRes = await Flat.deleteMany({});
    
    // Clear building flats array in Projects
    await Project.updateMany({}, { $set: { "buildings.$[].flats": [] } });

    // Clean rental contracts & sales leads associated with flats
    const rentalDeleteRes = await RentalManagement.deleteMany({});
    const salesDeleteRes = await SalesLead.deleteMany({});

    // Clean customer property links
    await Customer.updateMany(
      {},
      {
        $set: {
          'ownerDetails.propertyIds': [],
          'tenantDetails.leasedPropertyIds': []
        },
        $unset: {
          salesAllotment: ''
        }
      }
    );

    return res.json({
      success: true,
      message: `Successfully removed all flat inventory (${flatDeleteRes.deletedCount} units), ${rentalDeleteRes.deletedCount} rental contracts, and ${salesDeleteRes.deletedCount} sales records.`,
      deletedFlats: flatDeleteRes.deletedCount,
      deletedRentals: rentalDeleteRes.deletedCount,
      deletedSales: salesDeleteRes.deletedCount
    });
  } catch (error) {
    console.error('Error in deleteAllFlats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


