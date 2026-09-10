import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import apiCache from './cacheManager.js';
import { syncRentalOwnersToCustomers } from '../scripts/syncRentalOwnersToCustomers.js';

let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 60 * 1000; // Run at most once per minute if triggered automatically

/**
 * Ensures all rental flats have an existing, linked Customer record.
 * Self-heals in real time if any rental flat owner is missing.
 */
export async function ensureRentalOwnersSynced(force = false) {
  try {
    const now = Date.now();
    if (!force && now - lastSyncTime < SYNC_THROTTLE_MS) {
      return;
    }

    const customerCount = await Customer.countDocuments({ customerType: 'owner' });

    // Check if any flats with rental or ownership have missing customerId
    const unlinkedFlatsCount = await Flat.countDocuments({
      $and: [
        {
          $or: [
            { takenForRental: true },
            { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
            { status: { $in: ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'] } }
          ]
        },
        {
          $or: [
            { 'currentOwner.customerId': { $exists: false } },
            { 'currentOwner.customerId': null }
          ]
        },
        {
          'currentOwner.name': { $exists: true, $nin: ['', null, 'Vacant', 'Unassigned', '-'] }
        }
      ]
    });

    if (customerCount === 0 || unlinkedFlatsCount > 0 || force) {
      console.log(`[CustomerSyncService] Triggering auto-sync (customerCount: ${customerCount}, unlinkedFlats: ${unlinkedFlatsCount})...`);
      await syncRentalOwnersToCustomers();
      lastSyncTime = Date.now();
      if (apiCache) {
        apiCache.invalidatePrefix('flats');
        apiCache.invalidatePrefix('customers');
        apiCache.invalidatePrefix('reports');
      }
    }
  } catch (err) {
    console.error('[CustomerSyncService] Error during ensureRentalOwnersSynced:', err);
  }
}

/**
 * Propagates updated customer profile details (Name, Contact, Address, PAN, Aadhaar, Bank Accounts)
 * to all linked Flat documents so Rentals and Passbooks reflect changes immediately.
 */
export async function syncCustomerToFlats(customerId, customerDoc) {
  try {
    if (!customerId || !customerDoc) return;

    const propertyIds = (customerDoc.ownerDetails?.propertyIds || []).map(p => (p._id || p).toString());

    // Find all flats either in propertyIds OR where currentOwner.customerId matches
    const flats = await Flat.find({
      $or: [
        { _id: { $in: propertyIds } },
        { 'currentOwner.customerId': customerId }
      ]
    });

    if (flats.length === 0) return;

    const resolvedBank = {
      bankName: customerDoc.bankDetails?.bankName || customerDoc.ownerDetails?.bankDetails?.bankName || '',
      branch: customerDoc.bankDetails?.branch || customerDoc.ownerDetails?.bankDetails?.branch || '',
      accountNumber: customerDoc.bankDetails?.accountNumber || customerDoc.bankDetails?.accountNo || customerDoc.ownerDetails?.bankDetails?.accountNumber || customerDoc.ownerDetails?.bankDetails?.accountNo || '',
      accountNo: customerDoc.bankDetails?.accountNumber || customerDoc.bankDetails?.accountNo || customerDoc.ownerDetails?.bankDetails?.accountNumber || customerDoc.ownerDetails?.bankDetails?.accountNo || '',
      ifscCode: customerDoc.bankDetails?.ifscCode || customerDoc.bankDetails?.ifsc || customerDoc.ownerDetails?.bankDetails?.ifscCode || customerDoc.ownerDetails?.bankDetails?.ifsc || '',
      ifsc: customerDoc.bankDetails?.ifscCode || customerDoc.bankDetails?.ifsc || customerDoc.ownerDetails?.bankDetails?.ifscCode || customerDoc.ownerDetails?.bankDetails?.ifsc || '',
      accountHolderName: customerDoc.bankDetails?.accountHolderName || customerDoc.name || '',
      upiId: customerDoc.bankDetails?.upiId || ''
    };

    const resolvedAddress = customerDoc.permanentAddress || (typeof customerDoc.address === 'string' ? customerDoc.address : customerDoc.address?.addressLine1 || '');

    for (const flat of flats) {
      if (!flat.currentOwner) flat.currentOwner = {};

      flat.currentOwner.customerId = customerDoc._id;
      flat.currentOwner.name = customerDoc.name;
      flat.currentOwner.mobileNo = customerDoc.mobileNo;
      if (customerDoc.email) flat.currentOwner.email = customerDoc.email;
      if (customerDoc.panNumber) flat.currentOwner.panNumber = customerDoc.panNumber;
      if (customerDoc.aadhaarNumber) flat.currentOwner.aadhaarNumber = customerDoc.aadhaarNumber;
      if (resolvedAddress) flat.currentOwner.address = resolvedAddress;

      // Update bank account details on the flat
      if (resolvedBank.accountNumber || resolvedBank.bankName || resolvedBank.ifscCode) {
        flat.currentOwner.bankDetails = resolvedBank;
      }

      await flat.save();
    }

    console.log(`[CustomerSyncService] Synced updated details of Customer "${customerDoc.name}" to ${flats.length} flats.`);

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('customers');
      apiCache.invalidatePrefix('reports');
    }
  } catch (err) {
    console.error('[CustomerSyncService] Error in syncCustomerToFlats:', err);
  }
}

export default {
  ensureRentalOwnersSynced,
  syncCustomerToFlats
};
