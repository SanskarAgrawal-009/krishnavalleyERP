import Customer from '../models/Customer.js';
import Flat from '../models/Flat.js';
import Lead from '../models/Lead.js';
import SalesLead from '../models/SalesLead.js';
import Project from '../models/Project.js';
import { uploadFileToS3 } from '../config/s3.js';
import { escapeRegex } from '../utils/regexUtil.js';
import { arePhoneNumbersSame } from '../utils/phoneValidator.js';
import { isValidPhone, isValidPincode, isValidEmail, isValidGovtId } from '../utils/inputValidators.js';
import mongoose from 'mongoose';

// Create a new Customer (Owner or Tenant)
export const createCustomer = async (req, res) => {
  try {
    const {
      customerType, // 'owner' | 'tenant'
      name,
      mobileNo,
      alternateMobileNo,
      email,
      address,
      ownerDetails,
      tenantDetails,
      status
    } = req.body;

    if (!customerType || !name || !mobileNo) {
      return res.status(400).json({
        success: false,
        message: 'customerType, name, and mobileNo are required fields'
      });
    }

    if (!isValidPhone(mobileNo)) {
      return res.status(400).json({
        success: false,
        message: 'Primary mobile number must contain only numbers (7-13 digits).'
      });
    }

    if (alternateMobileNo && !isValidPhone(alternateMobileNo)) {
      return res.status(400).json({
        success: false,
        message: 'Alternate mobile number must contain only numbers.'
      });
    }

    if (alternateMobileNo && arePhoneNumbersSame(mobileNo, alternateMobileNo)) {
      return res.status(400).json({
        success: false,
        message: 'Primary mobile number and alternate mobile number cannot be the same.'
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    if (address?.pincode && !isValidPincode(address.pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Pincode must be exactly 6 numeric digits.'
      });
    }

    if (customerType === 'tenant' && tenantDetails?.tenantType === 'individual' && tenantDetails?.individual?.governmentIdNumber) {
      const { governmentIdNumber, governmentIdType } = tenantDetails.individual;
      if (!isValidGovtId(governmentIdNumber, governmentIdType || 'aadhaar')) {
        const expected = governmentIdType === 'aadhaar' ? '12 numeric digits' : governmentIdType === 'pan' ? '10 alphanumeric characters (ABCDE1234F)' : 'valid format';
        return res.status(400).json({
          success: false,
          message: `Govt ID Number must be ${expected} for ${governmentIdType || 'aadhaar'}.`
        });
      }
    }

    const customer = new Customer({
      customerType,
      name,
      mobileNo,
      alternateMobileNo: alternateMobileNo || '',
      email: email || '',
      address: address || {},
      ownerDetails: customerType === 'owner' ? (ownerDetails || { propertyIds: [], ownershipType: 'individual', ownershipPercentage: 100 }) : undefined,
      tenantDetails: customerType === 'tenant' ? (tenantDetails || { tenantType: 'individual' }) : undefined,
      status: status || 'active',
      documents: [],
      communications: []
    });

    const saved = await customer.save();

    // If customer is an owner with propertyIds, mark all those flats as 'sold' and auto-create/sync Sales & Allotment deal
    if (customerType === 'owner' && ownerDetails?.propertyIds && Array.isArray(ownerDetails.propertyIds) && ownerDetails.propertyIds.length > 0) {
      const validFlatIds = ownerDetails.propertyIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validFlatIds.length > 0) {
        await Flat.updateMany({ _id: { $in: validFlatIds } }, { status: 'sold' });

        try {
          const primaryFlatId = validFlatIds[0];
          const flatDoc = await Flat.findById(primaryFlatId).select('projectId buildingId flatNumber basePrice');

          if (flatDoc) {
            // Find or create lead for SalesLead unique leadId constraint
            let lead = await Lead.findOne({ mobileNo: saved.mobileNo });
            if (!lead) {
              lead = await Lead.create({
                name: saved.name,
                mobileNo: saved.mobileNo,
                email: saved.email || '',
                status: 'converted',
                source: 'walk_in',
                assignedFlat: primaryFlatId,
                notes: `Owner customer created with Flat ${flatDoc.flatNumber} allotment`
              });
            } else {
              await Lead.findByIdAndUpdate(lead._id, { status: 'converted', assignedFlat: primaryFlatId });
            }

            const sa = ownerDetails.salesAllotment || {};
            const dealPrice = Number(sa.agreedDealPrice) || flatDoc.basePrice || 4500000;
            const bookingVal = Number(sa.bookingAmount) || 0;
            const pMode = sa.paymentMode || 'bank_transfer';
            const txRef = sa.transactionReference || '';
            const agrNum = sa.agreementNumber || `AGR-KV-${Date.now().toString().slice(-6)}`;
            const agrDate = sa.agreementDate ? new Date(sa.agreementDate) : new Date();
            const allotDate = sa.allotmentDate ? new Date(sa.allotmentDate) : new Date();
            const sStatus = sa.salesStatus || (bookingVal > 0 ? 'booked' : 'converted');
            const pPlanType = sa.paymentPlanType || 'installment';

            const receiptsArr = bookingVal > 0 ? [{
              receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
              amount: bookingVal,
              generatedAt: allotDate,
            }] : [];

            let salesLead = await SalesLead.findOne({
              $or: [{ leadId: lead._id }, { customerId: saved._id }]
            });

            if (!salesLead) {
              salesLead = await SalesLead.create({
                leadId: lead._id,
                customerId: saved._id,
                name: saved.name,
                mobileNo: saved.mobileNo,
                email: saved.email || '',
                projectId: flatDoc.projectId,
                buildingId: flatDoc.buildingId,
                flatId: primaryFlatId,
                salesStatus: sStatus,
                booking: {
                  isBooked: bookingVal > 0,
                  bookingDate: allotDate,
                  bookingAmount: bookingVal,
                  bookingStatus: bookingVal > 0 ? 'confirmed' : 'pending'
                },
                agreement: {
                  required: true,
                  uploaded: false,
                  agreementNumber: agrNum,
                  agreementDate: agrDate,
                  verificationStatus: 'verified'
                },
                paymentPlan: {
                  type: pPlanType,
                  totalAmount: dealPrice,
                  bookingAmount: bookingVal,
                  remainingAmount: Math.max(0, dealPrice - bookingVal),
                  numberOfInstallments: 0
                },
                receipts: receiptsArr
              });
            } else {
              salesLead.customerId = saved._id;
              salesLead.flatId = primaryFlatId;
              salesLead.projectId = flatDoc.projectId;
              salesLead.buildingId = flatDoc.buildingId;
              salesLead.salesStatus = sStatus;
              salesLead.paymentPlan.totalAmount = dealPrice;
              salesLead.paymentPlan.bookingAmount = bookingVal;
              salesLead.paymentPlan.remainingAmount = Math.max(0, dealPrice - bookingVal);
              await salesLead.save();
            }

            // Link salesLead back to Customer record
            saved.ownerDetails.salesAllotment = {
              salesLeadId: salesLead._id,
              agreedDealPrice: dealPrice,
              bookingAmount: bookingVal,
              paymentMode: pMode,
              transactionReference: txRef,
              allotmentDate: allotDate,
              agreementNumber: agrNum,
              agreementDate: agrDate,
              salesStatus: sStatus,
              paymentPlanType: pPlanType
            };
            await saved.save();
            console.log(`[Sales Allotment] Auto-linked SalesLead ${salesLead._id} for Owner ${saved.name}`);
          }
        } catch (salesErr) {
          console.error('Error auto-syncing SalesLead for owner:', salesErr);
        }
      }
    }

    // If tenant is allotted a flat, flag flat as takenForRental
    if (customerType === 'tenant' && tenantDetails?.rentalDetails?.flatId && mongoose.Types.ObjectId.isValid(tenantDetails.rentalDetails.flatId)) {
      await Flat.findByIdAndUpdate(tenantDetails.rentalDetails.flatId, { takenForRental: true });
    }

    const populated = await Customer.findById(saved._id)
      .populate({
        path: 'ownerDetails.propertyIds',
        select: 'flatNumber status projectId buildingId floor bhkType carpetArea basePrice',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      })
      .populate({
        path: 'ownerDetails.salesAllotment.salesLeadId'
      })
      .populate({
        path: 'tenantDetails.rentalDetails.flatId',
        select: 'flatNumber status projectId buildingId',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      });

    console.log(`[MongoDB] Customer "${saved.name}" (${saved.customerType}) created with ID: ${saved._id}`);
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error creating customer:', error);
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

// Get All Customers with search & filters
export const getCustomers = async (req, res) => {
  try {
    const { search, customerType, tenantType, status, propertyId } = req.query;
    let filter = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { name: regex },
        { mobileNo: regex },
        { email: regex },
        { 'tenantDetails.company.companyName': regex },
        { 'tenantDetails.company.gstNumber': regex },
        { 'tenantDetails.individual.governmentIdNumber': regex }
      ];
    }

    if (customerType) {
      filter.customerType = customerType;
    }

    if (tenantType) {
      filter['tenantDetails.tenantType'] = tenantType;
    }

    if (status) {
      filter.status = status;
    }

    if (propertyId) {
      filter.$or = [
        { 'ownerDetails.propertyIds': propertyId },
        { 'tenantDetails.rentalDetails.flatId': propertyId }
      ];
    }

    const customers = await Customer.find(filter)
      .populate({
        path: 'ownerDetails.propertyIds',
        select: 'flatNumber status projectId buildingId takenForRental floor bhkType carpetArea basePrice',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      })
      .populate({
        path: 'tenantDetails.rentalDetails.flatId',
        select: 'flatNumber status projectId buildingId takenForRental floor bhkType carpetArea basePrice',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      })
      .sort({ updatedAt: -1 });

    return res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    let customer = await Customer.findById(id)
      .populate({
        path: 'ownerDetails.propertyIds',
        select: 'flatNumber status projectId buildingId takenForRental floor bhkType carpetArea basePrice',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      })
      .populate({
        path: 'ownerDetails.salesAllotment.salesLeadId'
      })
      .populate({
        path: 'tenantDetails.rentalDetails.flatId',
        select: 'flatNumber status projectId buildingId takenForRental floor bhkType carpetArea basePrice',
        populate: { path: 'projectId', select: 'projectName projectCode' }
      });

    if (!customer) return res.status(404).json({ success: false, message: 'Customer record not found' });

    // Fallback: If owner has no linked salesLeadId in subdoc, dynamically find linked SalesLead
    let customerObj = customer.toObject();
    if (customer.customerType === 'owner') {
      const salesLead = await SalesLead.findOne({
        $or: [{ customerId: customer._id }, { mobileNo: customer.mobileNo }]
      }).populate('projectId', 'projectName projectCode').populate('flatId', 'flatNumber floor bhkType carpetArea basePrice');

      if (salesLead) {
        customerObj.liveSalesAllotment = salesLead;
      }
    }

    return res.json({ success: true, data: customerObj });
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Customer Details
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer record not found' });

    const effectivePrimary = updates.mobileNo || customer.mobileNo;
    const effectiveAlternate = updates.alternateMobileNo !== undefined ? updates.alternateMobileNo : customer.alternateMobileNo;

    if (updates.mobileNo && !isValidPhone(updates.mobileNo)) {
      return res.status(400).json({
        success: false,
        message: 'Primary mobile number must contain only numbers.'
      });
    }

    if (updates.alternateMobileNo && !isValidPhone(updates.alternateMobileNo)) {
      return res.status(400).json({
        success: false,
        message: 'Alternate mobile number must contain only numbers.'
      });
    }

    if (effectiveAlternate && arePhoneNumbersSame(effectivePrimary, effectiveAlternate)) {
      return res.status(400).json({
        success: false,
        message: 'Primary mobile number and alternate mobile number cannot be the same.'
      });
    }

    if (updates.email && !isValidEmail(updates.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    if (updates.address?.pincode && !isValidPincode(updates.address.pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Pincode must be exactly 6 numeric digits.'
      });
    }

    if (updates.name) customer.name = updates.name;
    if (updates.mobileNo) customer.mobileNo = updates.mobileNo;
    if (updates.alternateMobileNo !== undefined) customer.alternateMobileNo = updates.alternateMobileNo;
    if (updates.email !== undefined) customer.email = updates.email;
    if (updates.address) customer.address = { ...customer.address, ...updates.address };
    if (updates.status) customer.status = updates.status;

    if (customer.customerType === 'owner' && updates.ownerDetails) {
      customer.ownerDetails = { ...customer.ownerDetails, ...updates.ownerDetails };
      if (updates.ownerDetails.propertyIds && Array.isArray(updates.ownerDetails.propertyIds)) {
        const validFlatIds = updates.ownerDetails.propertyIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validFlatIds.length > 0) {
          await Flat.updateMany({ _id: { $in: validFlatIds } }, { status: 'sold' });

          // Sync with SalesLead
          try {
            const primaryFlatId = validFlatIds[0];
            const sa = updates.ownerDetails.salesAllotment || {};
            const dealPrice = Number(sa.agreedDealPrice);
            const bookingVal = Number(sa.bookingAmount);
            const sStatus = sa.salesStatus;

            const salesLead = await SalesLead.findOne({
              $or: [{ customerId: customer._id }, { mobileNo: customer.mobileNo }]
            });

            if (salesLead) {
              if (dealPrice) salesLead.paymentPlan.totalAmount = dealPrice;
              if (bookingVal !== undefined && !isNaN(bookingVal)) {
                salesLead.paymentPlan.bookingAmount = bookingVal;
                salesLead.booking.bookingAmount = bookingVal;
                salesLead.booking.isBooked = bookingVal > 0;
              }
              if (dealPrice && bookingVal !== undefined) {
                salesLead.paymentPlan.remainingAmount = Math.max(0, dealPrice - bookingVal);
              }
              if (sStatus) salesLead.salesStatus = sStatus;
              if (sa.agreementNumber) salesLead.agreement.agreementNumber = sa.agreementNumber;
              await salesLead.save();
            }
          } catch (salesErr) {
            console.error('Error updating SalesLead from Customer update:', salesErr);
          }
        }
      }
    }

    if (customer.customerType === 'tenant' && updates.tenantDetails) {
      customer.tenantDetails = { ...customer.tenantDetails, ...updates.tenantDetails };
      if (updates.tenantDetails.rentalDetails?.flatId && mongoose.Types.ObjectId.isValid(updates.tenantDetails.rentalDetails.flatId)) {
        await Flat.findByIdAndUpdate(updates.tenantDetails.rentalDetails.flatId, { takenForRental: true });
      }
    }

    await customer.save();

    const populated = await Customer.findById(customer._id)
      .populate('ownerDetails.propertyIds')
      .populate('ownerDetails.salesAllotment.salesLeadId')
      .populate('tenantDetails.rentalDetails.flatId');

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error updating customer:', error);
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

// Upload Customer Document to AWS S3
export const uploadCustomerDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, documentName, documentNumber, verificationStatus } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No document file was uploaded' });
    }

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // Upload file to S3 under customer_documents/
    const uploadResult = await uploadFileToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      'customer_documents'
    );

    const newDoc = {
      documentType: documentType || 'other',
      documentName: documentName || file.originalname,
      documentNumber: documentNumber || '',
      fileUrl: uploadResult.documentUrl,
      fileName: uploadResult.documentName,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
      verificationStatus: verificationStatus || 'verified'
    };

    customer.documents.push(newDoc);
    await customer.save();

    // Auto-mirror to linked SalesLead for Owners
    if (customer.customerType === 'owner') {
      try {
        const salesLead = await SalesLead.findOne({
          $or: [{ customerId: customer._id }, { mobileNo: customer.mobileNo }]
        });

        if (salesLead) {
          const lowerType = (documentType || '').toLowerCase();
          const isAgreement = ['sale_deed', 'registry', 'agreement', 'bba', 'allotment_letter', 'rental_agreement', 'lease_agreement'].includes(lowerType);
          const isReceipt = ['rent_receipt', 'payment_receipt', 'booking_receipt', 'receipt'].includes(lowerType);

          if (isAgreement) {
            salesLead.agreement.uploaded = true;
            salesLead.agreement.documentUrl = uploadResult.documentUrl;
            salesLead.agreement.documentName = uploadResult.documentName;
            salesLead.agreement.uploadedAt = new Date();
            salesLead.agreement.verificationStatus = 'verified';
            salesLead.bbaDocument = {
              fileName: uploadResult.documentName,
              fileUrl: uploadResult.documentUrl,
              fileSize: file.size,
              uploadedAt: new Date(),
              isSigned: true,
              signedAt: new Date()
            };
            if (['converted', 'booking_pending', 'booked', 'agreement_pending'].includes(salesLead.salesStatus)) {
              salesLead.salesStatus = 'agreement_completed';
            }
            await salesLead.save();
            console.log(`[Sales Allotment] Mirrored Agreement document to SalesLead ${salesLead._id}`);
          } else if (isReceipt) {
            const receiptAmt = customer.ownerDetails?.salesAllotment?.bookingAmount || 0;
            salesLead.receipts.push({
              receiptNumber: documentNumber || `REC-${Date.now().toString().slice(-6)}`,
              amount: receiptAmt,
              generatedAt: new Date(),
              documentUrl: uploadResult.documentUrl
            });
            await salesLead.save();
            console.log(`[Sales Allotment] Mirrored Payment Receipt document to SalesLead ${salesLead._id}`);
          }
        }
      } catch (mirrorErr) {
        console.error('Error mirroring document to SalesLead:', mirrorErr);
      }
    }

    console.log(`[Customer Document] Uploaded for ${customer.name}: ${uploadResult.documentUrl}`);
    return res.status(201).json({
      success: true,
      message: `Document uploaded successfully to ${uploadResult.storage}`,
      data: customer
    });
  } catch (error) {
    console.error('Error uploading customer document:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify Customer Document
export const verifyCustomerDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { verificationStatus, rejectionReason } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const doc = customer.documents.id(docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.verificationStatus = verificationStatus || 'verified';
    doc.verifiedAt = new Date();
    if (rejectionReason) doc.rejectionReason = rejectionReason;

    await customer.save();
    return res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error verifying document:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Log Communication & Call Recording
export const logCustomerCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      mode, // 'call', 'whatsapp', 'email', 'sms', 'meeting', 'site_visit', 'letter', 'other'
      direction, // 'inbound', 'outbound'
      subject,
      message,
      outcome,
      nextFollowUpDate,
      status,
      callRecordingUrl
    } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    let finalRecordingUrl = callRecordingUrl || '';
    let finalAttachmentUrl = '';

    // If an audio recording or attachment file was uploaded with request
    if (req.file) {
      const uploadResult = await uploadFileToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'call_recordings'
      );
      if (req.file.mimetype.startsWith('audio/')) {
        finalRecordingUrl = uploadResult.documentUrl;
      } else {
        finalAttachmentUrl = uploadResult.documentUrl;
      }
    }

    customer.communications.push({
      communicationDate: new Date(),
      mode: mode || 'call',
      direction: direction || 'outbound',
      subject: subject || 'Customer Interaction',
      message: message || '',
      outcome: outcome || '',
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      status: status || 'completed',
      callRecordingUrl: finalRecordingUrl,
      attachmentUrl: finalAttachmentUrl
    });

    await customer.save();
    return res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('Error logging customer communication:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Customer
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Customer not found' });

    console.log(`[MongoDB] Customer deleted: ${deleted.name} (${id})`);
    return res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// WIPE ALL CUSTOMERS (SUPER ADMIN ONLY - DANGER ZONE)
// =========================================================================
export const wipeAllCustomers = async (req, res) => {
  try {
    // Double-safety: verify confirmation phrase
    const { confirmationPhrase } = req.body;
    if (confirmationPhrase !== 'DELETE ALL CUSTOMERS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation phrase. You must type "DELETE ALL CUSTOMERS" to proceed.'
      });
    }

    // Count before deletion for audit trail
    const totalCustomers = await Customer.countDocuments();

    if (totalCustomers === 0) {
      return res.status(400).json({
        success: false,
        message: 'No customers found in the database to delete.'
      });
    }

    // Step 1: Clear all customer references from Flats
    await Flat.updateMany(
      {},
      {
        $set: {
          'currentOwner.customerId': null,
          'currentOwner.name': '',
          'currentOwner.mobileNo': '',
          'currentOwner.email': '',
          'currentOwner.panNumber': '',
        },
        $unset: {
          ownershipHistory: 1
        }
      }
    );

    // Step 2: Delete all SalesLeads tied to customers
    const salesLeadsDeleted = await SalesLead.deleteMany({});

    // Step 3: Delete all customers
    const result = await Customer.deleteMany({});

    console.log(`[DANGER ZONE] WIPE ALL CUSTOMERS executed by ${req.user?.name || req.user?.email || 'Unknown'} (Role: ${req.user?.role}). Deleted: ${result.deletedCount} customers, ${salesLeadsDeleted.deletedCount} sales leads.`);

    return res.json({
      success: true,
      message: `Successfully wiped ${result.deletedCount} customer(s), ${salesLeadsDeleted.deletedCount} sales lead(s), and cleared all flat ownership references.`,
      data: {
        customersDeleted: result.deletedCount,
        salesLeadsDeleted: salesLeadsDeleted.deletedCount,
        flatsCleared: 'All ownership references cleared'
      }
    });
  } catch (error) {
    console.error('Error in wipeAllCustomers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
