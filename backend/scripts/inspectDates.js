import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Flat from '../models/Flat.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const flats = await Flat.find({ 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } }).limit(10).lean();
  console.log(`Found ${flats.length} rental flats.`);
  flats.forEach(f => {
    console.log(`Flat: ${f.flatNumber}`);
    console.log(`  mouDate:`, f.rentalDetails?.mouDate, `type:`, typeof f.rentalDetails?.mouDate);
    console.log(`  startDate:`, f.rentalDetails?.startDate, `type:`, typeof f.rentalDetails?.startDate);
    console.log(`  endDate:`, f.rentalDetails?.endDate, `type:`, typeof f.rentalDetails?.endDate);
    console.log(`  owner:`, f.currentOwner?.name, `mobile:`, f.currentOwner?.mobileNo);
  });
  await mongoose.disconnect();
}

run();
