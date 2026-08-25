import Flat from '../models/Flat.js';
import Project from '../models/Project.js';
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

// Get Flat By ID
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

    return res.json({ success: true, data: obj });
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
