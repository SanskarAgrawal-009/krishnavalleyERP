/**
 * Update all Tower A flats:
 * - bhkType = 'Service Apartment'
 * - carpetArea = 525
 * - superBuiltUpArea = 525
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Flat from '../models/Flat.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const TOWER_A_BUILDING_ID = '6a9ec0b267f9b1d931b1c017';

    // Find all Tower A flats
    const towerAFlats = await Flat.find({ buildingId: TOWER_A_BUILDING_ID });
    console.log(`Found ${towerAFlats.length} Tower A flats`);

    // Update all of them
    const result = await Flat.updateMany(
      { buildingId: TOWER_A_BUILDING_ID },
      {
        $set: {
          bhkType: 'Service Apartment',
          carpetArea: 525,
          superBuiltUpArea: 525
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} flats (matched: ${result.matchedCount})`);

    // Verify
    const updated = await Flat.find({ buildingId: TOWER_A_BUILDING_ID }).limit(5);
    updated.forEach(f => {
      console.log(`  Flat ${f.flatNumber}: bhkType=${f.bhkType}, carpetArea=${f.carpetArea}, superBuiltUpArea=${f.superBuiltUpArea}`);
    });

    // Check distinct values after update
    const distinctBhk = await Flat.distinct('bhkType', { buildingId: TOWER_A_BUILDING_ID });
    const distinctCarpet = await Flat.distinct('carpetArea', { buildingId: TOWER_A_BUILDING_ID });
    const distinctSuper = await Flat.distinct('superBuiltUpArea', { buildingId: TOWER_A_BUILDING_ID });
    console.log('After update - distinct bhkTypes:', distinctBhk);
    console.log('After update - distinct carpetAreas:', distinctCarpet);
    console.log('After update - distinct superBuiltUpAreas:', distinctSuper);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
