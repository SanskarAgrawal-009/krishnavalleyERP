import Flat from '../models/Flat.js';
import Project from '../models/Project.js';
import Customer from '../models/Customer.js';
import SalesLead from '../models/SalesLead.js';
import Lead from '../models/Lead.js';
import RentalManagement from '../models/RentalManagement.js';
import { uploadFileToS3 } from '../config/s3.js';

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
          await Flat.findByIdAndUpdate(f._id, { floor: obj.floor });
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
    // Business Rule: All flats enrolled in rental program have 3 years (36 months) rental lock-in before possession handover.
    const hasRentalAgreement = !!(activeRental || flat.takenForRental || flat.status === 'leased');
    const isSoldOrLeased = obj.status === 'sold' || obj.status === 'leased' || !!salesLead;
    
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
    const isEnrolledOrSold = isSoldOrLeased || activeRental;
    const diffMs = lockInEndDate.getTime() - now.getTime();
    const totalMs = lockInEndDate.getTime() - rentalStartDate.getTime();
    
    // An unsold flat is NOT currently locked; its 3-year term will start upon purchase & enrollment
    const isLocked = isEnrolledOrSold && diffMs > 0;

    const remainingDays = isLocked ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : (isEnrolledOrSold ? 0 : 1095);
    const remainingMonths = isLocked ? Math.ceil(remainingDays / 30.4375) : (isEnrolledOrSold ? 0 : 36);
    const elapsedDays = isEnrolledOrSold ? Math.max(0, Math.floor((now.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const totalDays = Math.max(1, Math.floor(totalMs / (1000 * 60 * 60 * 24)));
    const progressPercentage = isEnrolledOrSold ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : 0;

    let possessionStatus = 'available_for_sale';
    let possessionMessage = 'Unit is currently available for sale. Upon purchase & enrollment, a 3-year guaranteed rental lock-in will apply prior to physical possession.';

    if (isEnrolledOrSold) {
      if (salesLead?.possession?.status === 'completed' || salesLead?.salesStatus === 'possessed') {
        possessionStatus = 'possession_completed';
        possessionMessage = `Possession has already been completed on ${salesLead.possession?.possessionDate ? new Date(salesLead.possession.possessionDate).toLocaleDateString('en-IN') : 'record'}.`;
      } else if (isLocked) {
        possessionStatus = 'possession_locked_3yr';
        possessionMessage = `Flat is currently enrolled in mandatory 3-Year Rental lock-in. Possession will become available on ${lockInEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${remainingMonths} months / ${remainingDays} days remaining).`;
      } else {
        possessionStatus = 'possession_eligible';
        possessionMessage = `3-Year rental lock-in term fulfilled on ${lockInEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Unit is now fully eligible for physical possession and key handover!`;
      }
    }

    const lockInDetails = {
      isEnrolledInRental: isEnrolledOrSold,
      rentalStartDate: isEnrolledOrSold ? rentalStartDate : null,
      lockInEndDate: isEnrolledOrSold ? lockInEndDate : null,
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

    return res.json({
      success: true,
      data: {
        ...obj,
        salesLead: salesLead || null,
        owner: ownerCustomer || (salesLead ? {
          name: salesLead.name,
          mobileNo: salesLead.mobileNo,
          email: salesLead.email,
          customerType: 'owner',
          source: 'sales_lead'
        } : null),
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

// Delete Flat from MongoDB
export const deleteFlat = async (req, res) => {
  try {
    const { id } = req.params;
    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({ success: false, message: 'Flat not found' });

    const deletedFlatSnapshot = flat.toObject();

    await Flat.findByIdAndDelete(id);

    // Remove flat _id from project building flats
    if (flat.projectId && flat.buildingId) {
      await Project.updateOne(
        { _id: flat.projectId, "buildings._id": flat.buildingId },
        { $pull: { "buildings.$.flats": flat._id } }
      );
    }

    console.log(`[MongoDB] Flat ${flat.flatNumber} (${id}) deleted.`);
    return res.json({
      success: true,
      message: `Flat ${flat.flatNumber} deleted successfully`,
      data: deletedFlatSnapshot,
    });
  } catch (error) {
    console.error('Error deleting flat in MongoDB:', error);
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
