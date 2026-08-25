import Project from '../models/Project.js';
import Flat from '../models/Flat.js';

// Get All Projects
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate('buildings.flats').sort({ createdAt: -1 });
    return res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    console.error('Error in getProjects:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Project
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate('buildings.flats');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error in getProjectById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Manual Project Creation in MongoDB
export const createProject = async (req, res) => {
  try {
    const { projectName, projectCode, address, status, buildings } = req.body;
    
    if (!projectName || !projectCode || !address?.addressLine1 || !address?.city || !address?.state || !address?.pincode) {
      return res.status(400).json({
        success: false,
        message: 'projectName, projectCode, and address (addressLine1, city, state, pincode) are required'
      });
    }

    const project = new Project({
      projectName,
      projectCode,
      address,
      status: status || 'planning',
      buildings: buildings || []
    });

    const savedProject = await project.save();
    console.log(`[MongoDB] Project saved successfully to database with _id: ${savedProject._id}`);
    return res.status(201).json({ success: true, data: savedProject });
  } catch (error) {
    console.error('Error creating project in MongoDB:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A project with this projectCode already exists.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Project in MongoDB
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Project in MongoDB
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    
    // Also delete any flats belonging to this project
    await Flat.deleteMany({ projectId: id });
    console.log(`[MongoDB] Project ${id} and associated flats deleted.`);
    return res.json({ success: true, message: 'Project and all associated flats deleted from MongoDB' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Manual Add Building to Project
export const addBuilding = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { buildingName, buildingCode, numberOfFloors, status } = req.body;

    if (!buildingName || !buildingCode || numberOfFloors === undefined) {
      return res.status(400).json({
        success: false,
        message: 'buildingName, buildingCode, and numberOfFloors are required'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const buildingData = {
      buildingName,
      buildingCode,
      numberOfFloors: Number(numberOfFloors),
      flats: [],
      status: status || 'planned'
    };

    project.buildings.push(buildingData);
    const updated = await project.save();
    console.log(`[MongoDB] Added building "${buildingName}" to project ${projectId}`);
    return res.status(201).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error adding building to project:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Building from Project
export const deleteBuilding = async (req, res) => {
  try {
    const { projectId, buildingId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.buildings.pull({ _id: buildingId });
    const updated = await project.save();
    
    // Also delete flats associated with this building
    await Flat.deleteMany({ buildingId });
    console.log(`[MongoDB] Deleted building ${buildingId} from project ${projectId}`);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error deleting building:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add Floor & Units to Building
export const addFloorToBuilding = async (req, res) => {
  try {
    const { projectId, buildingId } = req.params;
    const { floorNumber, numberOfFlats, flatsToCreate, bhkType, carpetArea, basePrice } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const building = project.buildings.id(buildingId);
    if (!building) return res.status(404).json({ success: false, message: 'Building not found' });

    const targetFloor = floorNumber !== undefined ? Number(floorNumber) : (building.numberOfFloors || 0) + 1;
    if (targetFloor > (building.numberOfFloors || 0)) {
      building.numberOfFloors = targetFloor;
    }

    const createdFlats = [];
    const unitsToMake = flatsToCreate || [];

    // If unit list was provided
    if (unitsToMake.length > 0) {
      for (const item of unitsToMake) {
        const newFlat = new Flat({
          projectId,
          buildingId,
          flatNumber: item.flatNumber,
          floor: targetFloor,
          bhkType: item.bhkType || bhkType || '2BHK',
          carpetArea: item.carpetArea || carpetArea || 950,
          basePrice: item.basePrice || basePrice || 4500000,
          status: 'available',
          takenForRental: false
        });
        const saved = await newFlat.save();
        building.flats.push(saved._id);
        createdFlats.push(saved);
      }
    } else if (numberOfFlats && Number(numberOfFlats) > 0) {
      // Auto-generate flats on target floor: e.g. floor 2 -> 201, 202, ...
      const count = Number(numberOfFlats);
      for (let i = 1; i <= count; i++) {
        const flatNo = `${targetFloor}${String(i).padStart(2, '0')}`;
        const newFlat = new Flat({
          projectId,
          buildingId,
          flatNumber: flatNo,
          floor: targetFloor,
          bhkType: bhkType || '2BHK',
          carpetArea: carpetArea || 950,
          basePrice: basePrice || 4500000,
          status: 'available',
          takenForRental: false
        });
        const saved = await newFlat.save();
        building.flats.push(saved._id);
        createdFlats.push(saved);
      }
    }

    // Update building.floors array
    if (!building.floors) building.floors = [];
    let floorRecord = building.floors.find((fl) => fl.floorNumber === targetFloor);
    if (!floorRecord) {
      building.floors.push({
        floorNumber: targetFloor,
        numberOfFlats: createdFlats.length,
        flats: createdFlats.map((f) => f._id)
      });
    } else {
      floorRecord.numberOfFlats = (floorRecord.numberOfFlats || 0) + createdFlats.length;
      floorRecord.flats = [...(floorRecord.flats || []), ...createdFlats.map((f) => f._id)];
    }

    building.totalFlats = (building.flats || []).length;

    const updatedProject = await project.save();
    console.log(`[MongoDB] Added floor ${targetFloor} (${createdFlats.length} flats) to building ${building.buildingName}`);

    return res.status(200).json({
      success: true,
      message: `Floor ${targetFloor} with ${createdFlats.length} flat(s) created successfully!`,
      data: { project: updatedProject, createdFlats }
    });
  } catch (error) {
    console.error('Error adding floor to building:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
