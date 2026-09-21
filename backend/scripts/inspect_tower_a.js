import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../models/Project.js';
import Flat from '../models/Flat.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const projects = await Project.find();
    console.log(`Found ${projects.length} projects:`);
    let towerABuildingIds = [];

    projects.forEach(p => {
      console.log(`Project: "${p.name}" (ID: ${p._id})`);
      (p.buildings || []).forEach(b => {
        console.log(`   Building: "${b.buildingName}" (Code: ${b.buildingCode}, ID: ${b._id})`);
        if (b.buildingName.toLowerCase().includes('tower a') || b.buildingCode.toLowerCase().includes('tower a') || b.buildingCode === 'A') {
          towerABuildingIds.push(b._id);
        }
      });
    });

    console.log('Tower A Building IDs:', towerABuildingIds);

    const flats = await Flat.find();
    console.log(`Total Flats in DB: ${flats.length}`);

    // Check flats matching tower A
    const towerAFlats = flats.filter(f => 
      towerABuildingIds.some(id => id.toString() === f.buildingId?.toString()) ||
      (f.flatNumber && (f.flatNumber.startsWith('A-') || f.flatNumber.startsWith('A')))
    );

    console.log(`Matched Tower A Flats: ${towerAFlats.length}`);
    if (towerAFlats.length > 0) {
      console.log('Sample Flat 1:', {
        flatNumber: towerAFlats[0].flatNumber,
        bhkType: towerAFlats[0].bhkType,
        carpetArea: towerAFlats[0].carpetArea,
        superBuiltUpArea: towerAFlats[0].superBuiltUpArea,
        buildingId: towerAFlats[0].buildingId
      });

      // Distinct bhkTypes in Tower A
      const bhkTypes = [...new Set(towerAFlats.map(f => f.bhkType))];
      console.log('Distinct bhkTypes in Tower A:', bhkTypes);

      // Distinct carpetArea & superBuiltUpArea
      const carpetAreas = [...new Set(towerAFlats.map(f => f.carpetArea))];
      const superAreas = [...new Set(towerAFlats.map(f => f.superBuiltUpArea))];
      console.log('Distinct carpetAreas:', carpetAreas);
      console.log('Distinct superAreas:', superAreas);
    }

    // Also check all flats in DB distinct bhkTypes
    const allBhkTypes = [...new Set(flats.map(f => f.bhkType))];
    console.log('All Flats bhkTypes:', allBhkTypes);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
