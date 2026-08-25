import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import DigitalSignature from '../models/DigitalSignature.js';
import RentalManagement from '../models/RentalManagement.js';
import Flat from '../models/Flat.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/krishna_valley_erp';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // 1. Patch Digital Signatures
    const sigs = await DigitalSignature.find();
    console.log(`Found ${sigs.length} digital signatures`);
    for (const s of sigs) {
      let changed = false;
      if (!s.signerRole || s.signerRole === 'undefined') {
        s.signerRole = 'seller_authorized_signatory';
        changed = true;
      }
      if (!s.referenceId || s.referenceId === 'undefined') {
        s.referenceId = `AGR-${s._id.toString().slice(-6).toUpperCase()}`;
        changed = true;
      }
      if (!s.documentTitle || s.documentTitle === 'Agreement Document') {
        s.documentTitle = 'Builder-Buyer Agreement (Flat 101)';
        changed = true;
      }
      if (changed) {
        await s.save();
        console.log(`Patched signature ${s._id}: role=${s.signerRole}, ref=${s.referenceId}`);
      }
    }

    // 2. Patch Rental Contracts
    const rentals = await RentalManagement.find().populate('flatId', 'flatNumber');
    console.log(`Found ${rentals.length} rental records`);
    for (const r of rentals) {
      let changed = false;
      const flatNo = r.flatId?.flatNumber || '101';
      if (!r.tenantAgreement || !r.tenantAgreement.agreementNumber) {
        if (!r.tenantAgreement) r.tenantAgreement = {};
        r.tenantAgreement.agreementNumber = `TL-${flatNo}-${r._id.toString().slice(-4).toUpperCase()}`;
        changed = true;
      }
      if (!r.rentBack || !r.rentBack.agreementNumber) {
        if (!r.rentBack) r.rentBack = {};
        r.rentBack.agreementNumber = `RB-${flatNo}-${r._id.toString().slice(-4).toUpperCase()}`;
        changed = true;
      }
      if (changed) {
        await r.save();
        console.log(`Patched rental ${r._id}: TL=${r.tenantAgreement?.agreementNumber}, RB=${r.rentBack?.agreementNumber}`);
      }
    }

    console.log('Migration & patch finished successfully!');
  } catch (err) {
    console.error('Error during patch:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
