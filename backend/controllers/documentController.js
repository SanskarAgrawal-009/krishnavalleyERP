import SalesLead from '../models/SalesLead.js';
import RentalManagement from '../models/RentalManagement.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Employee from '../models/hr/Employee.js';
import LegalDocument from '../models/LegalDocument.js';
import DigitalSignature from '../models/DigitalSignature.js';
import { uploadFileToS3 } from '../config/s3.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

// =========================================================
// 1. UNIFIED DOCUMENT VAULT AGGREGATOR
// =========================================================

export const getUnifiedDocumentVault = async (req, res) => {
  try {
    const [
      salesLeads,
      rentals,
      flatsWithBlueprints,
      legalDocs,
      customers,
      employees,
      signatures,
      flatsWithDocs
    ] = await Promise.all([
      SalesLead.find().populate('flatId', 'flatNumber').populate('projectId', 'projectName').sort({ createdAt: -1 }),
      RentalManagement.find()
        .populate('flatId', 'flatNumber')
        .populate('projectId', 'projectName')
        .populate('ownerId', 'name mobileNo')
        .populate('tenantId', 'name mobileNo customerType')
        .sort({ createdAt: -1 }),
      Flat.find({ 'blueprints.0': { $exists: true } }).populate('projectId', 'projectName').sort({ flatNumber: 1 }),
      LegalDocument.find().populate('projectId', 'projectName').sort({ createdAt: -1 }),
      Customer.find({ 'documents.0': { $exists: true } }),
      Employee.find({ 'documents.0': { $exists: true } }),
      DigitalSignature.find().sort({ signedAt: -1 }),
      Flat.find({
        $or: [
          { 'rentalDetails.registryDocument.fileUrl': { $exists: true, $ne: '' } },
          { 'rentalDetails.agreementDocument.fileUrl': { $exists: true, $ne: '' } },
          { 'currentOwner.registryDocument.fileUrl': { $exists: true, $ne: '' } }
        ]
      }).populate('projectId', 'projectName').sort({ flatNumber: 1 })
    ]);

    // 1. Sale Agreements
    const saleAgreements = [];
    salesLeads.forEach((sl) => {
      const fileUrl = sl.bbaDocument?.fileUrl || sl.agreement?.documentUrl;
      if (fileUrl) {
        const isSigned = Boolean(sl.bbaDocument?.isSigned || sl.agreement?.verificationStatus === 'verified');
        saleAgreements.push({
          id: sl._id,
          documentTitle: `Builder-Buyer Agreement (BBA) — Flat ${sl.flatId?.flatNumber || 'Unit'}`,
          fileUrl: fileUrl,
          fileName: sl.bbaDocument?.fileName || sl.agreement?.documentName || 'Sales_Agreement.pdf',
          agreementNumber: sl.agreement?.agreementNumber || `BBA-${sl._id.toString().slice(-6)}`,
          buyerName: sl.name,
          partyName: sl.name,
          mobileNo: sl.mobileNo,
          projectName: sl.projectId?.projectName || 'Krishna Valley Project',
          project: sl.projectId?.projectName || 'Krishna Valley Project',
          flatNumber: sl.flatId?.flatNumber || 'N/A',
          totalAmount: sl.finalPrice,
          uploadedAt: sl.bbaDocument?.uploadedAt || sl.agreement?.uploadedAt || sl.createdAt,
          verificationStatus: isSigned ? 'verified' : 'pending_signature',
          signed: isSigned,
          isSigned: isSigned,
          sourceType: 'sale'
        });
      }
    });

    // 2. Rental Agreements
    const rentalAgreements = [];
    rentals.forEach((r) => {
      const flatNum = r.flatId?.flatNumber || r.leasedUnits?.[0]?.flatNumber || '101';
      const projName = r.projectId?.projectName || 'Krishna Valley';

      if (r.rentBack && (r.rentBack.enabled || r.rentBack.agreementDocument?.fileUrl)) {
        const fileUrl = r.rentBack.agreementDocument?.fileUrl;
        const ownerName = r.ownerId?.name || 'Property Owner';
        const code = r.rentBack.agreementNumber || `RB-FLAT-${flatNum}`;
        rentalAgreements.push({
          id: r._id,
          documentTitle: `Owner Rent-Back Agreement — Flat ${flatNum}`,
          fileUrl: fileUrl,
          fileName: r.rentBack.agreementDocument?.fileName || 'Owner_RentBack_Agreement.pdf',
          tenantName: ownerName,
          partyName: ownerName,
          contractCode: code,
          agreementNumber: code,
          type: 'Owner Rent-Back',
          projectName: projName,
          project: projName,
          flatNumber: flatNum,
          monthlyRent: r.rentBack.monthlyRent || r.rentBack.monthlyPayout || 0,
          monthlyAmount: r.rentBack.monthlyRent || r.rentBack.monthlyPayout || 0,
          uploadedAt: r.rentBack.agreementDocument?.uploadedAt || r.createdAt,
          verificationStatus: r.rentBack.agreementDocument?.verificationStatus || 'verified',
          sourceType: 'rental_owner'
        });
      }

      if (r.tenantAgreement && (r.tenantAgreement.monthlyRent || r.tenantAgreement.agreementDocument?.fileUrl || r.tenantId)) {
        const fileUrl = r.tenantAgreement.agreementDocument?.fileUrl;
        const tenantName = r.tenantId?.name || 'Tenant Resident';
        const code = r.tenantAgreement.agreementNumber || `TL-FLAT-${flatNum}`;
        const tType = r.tenantId?.customerType || 'Standard Lease';
        rentalAgreements.push({
          id: r._id,
          documentTitle: `Tenant Lease Agreement — Flat ${flatNum}`,
          fileUrl: fileUrl,
          fileName: r.tenantAgreement.agreementDocument?.fileName || 'Tenant_Lease_Agreement.pdf',
          tenantName: tenantName,
          partyName: tenantName,
          contractCode: code,
          agreementNumber: code,
          type: `Tenant Lease (${tType})`,
          projectName: projName,
          project: projName,
          flatNumber: flatNum,
          monthlyRent: r.tenantAgreement.monthlyRent || 0,
          monthlyAmount: r.tenantAgreement.monthlyRent || 0,
          uploadedAt: r.tenantAgreement.agreementDocument?.uploadedAt || r.createdAt,
          verificationStatus: r.tenantAgreement.agreementDocument?.verificationStatus || 'verified',
          sourceType: 'rental_tenant'
        });
      }
    });

    // 2B. Flat-Specific Registry Documents & Direct Rental Agreements
    const registryDocuments = [];
    (flatsWithDocs || []).forEach((f) => {
      const projName = f.projectId?.projectName || 'Krishna Valley Heritage';
      const ownerName = f.currentOwner?.name || 'Owner';

      // 1. Owner Registry Document
      const regDoc = f.rentalDetails?.registryDocument || f.currentOwner?.registryDocument;
      if (regDoc && regDoc.fileUrl) {
        const item = {
          id: `${f._id}_reg`,
          flatId: f._id,
          documentTitle: `Owner Registry Document (Sale Deed) — Flat ${f.flatNumber}`,
          fileUrl: regDoc.fileUrl,
          fileName: regDoc.fileName || `Registry_Flat_${f.flatNumber}.pdf`,
          partyName: ownerName,
          tenantName: ownerName,
          agreementNumber: `REG-FLAT-${f.flatNumber}`,
          contractCode: `REG-FLAT-${f.flatNumber}`,
          type: 'Owner Registry Document',
          documentType: 'Registry Document',
          projectName: projName,
          project: projName,
          flatNumber: f.flatNumber,
          monthlyRent: f.rentalDetails?.guaranteedMonthlyRent || 0,
          uploadedAt: regDoc.uploadedAt || f.createdAt,
          verificationStatus: regDoc.verificationStatus || 'verified',
          sourceType: 'registry_document'
        };
        registryDocuments.push(item);
        rentalAgreements.push(item);
      }

      // 2. Direct Flat Agreement Document
      const agDoc = f.rentalDetails?.agreementDocument;
      if (agDoc && agDoc.fileUrl && !rentalAgreements.some(ra => ra.flatNumber === f.flatNumber && ra.sourceType === 'rental_owner')) {
        rentalAgreements.push({
          id: `${f._id}_rental_agree`,
          flatId: f._id,
          documentTitle: `Guaranteed Rental Agreement — Flat ${f.flatNumber}`,
          fileUrl: agDoc.fileUrl,
          fileName: agDoc.fileName || `Rental_Agreement_Flat_${f.flatNumber}.pdf`,
          partyName: ownerName,
          tenantName: ownerName,
          agreementNumber: `RB-FLAT-${f.flatNumber}`,
          contractCode: `RB-FLAT-${f.flatNumber}`,
          type: 'Owner Rent-Back Agreement',
          projectName: projName,
          project: projName,
          flatNumber: f.flatNumber,
          monthlyRent: f.rentalDetails?.guaranteedMonthlyRent || 0,
          uploadedAt: agDoc.uploadedAt || f.createdAt,
          verificationStatus: agDoc.verificationStatus || 'verified',
          sourceType: 'rental_owner'
        });
      }
    });

    // 3. Maintenance Agreements
    const maintenanceAgreements = legalDocs.filter((d) => d.documentType === 'maintenance_bylaws');

    // 4. Blueprints & Floorplans
    const blueprints = [];
    flatsWithBlueprints.forEach((f) => {
      (f.blueprints || []).forEach((b) => {
        blueprints.push({
          id: b._id,
          flatId: f._id,
          flatNumber: f.flatNumber,
          project: f.projectId?.projectName || 'Krishna Valley',
          title: b.title,
          fileUrl: b.fileUrl,
          fileName: b.fileName,
          floorPlanType: b.floorPlanType,
          uploadedAt: b.uploadedAt
        });
      });
    });

    // 5. Legal Master Documents
    const legalMasterDocs = legalDocs.filter((d) => d.documentType !== 'maintenance_bylaws');

    // 6. Digital Signatures Formatted
    const formattedSignatures = signatures.map((ds) => ({
      id: ds._id,
      signerName: ds.signerName,
      signerRole: ds.signerRole || 'seller_authorized_signatory',
      role: ds.signerRole || 'seller_authorized_signatory',
      agreementType: ds.agreementType,
      referenceId: ds.referenceId,
      documentTitle: ds.documentTitle || 'Agreement Document',
      documentType: ds.agreementType === 'sale_agreement' ? 'Sale Agreement' : (ds.agreementType === 'rental_agreement' ? 'Rental Lease' : 'Legal Master'),
      documentId: ds.referenceId || ds.certificateNumber,
      certificateCode: ds.certificateNumber,
      certificateNumber: ds.certificateNumber,
      signedAt: ds.signedAt,
      signatureHash: ds.signatureHash,
      documentUrl: ds.documentUrl,
      verificationStatus: ds.verificationStatus
    }));

    // 6. KYC Vault (Customers + Employees)
    const kycDocuments = [];
    customers.forEach((c) => {
      (c.documents || []).forEach((d) => {
        kycDocuments.push({
          id: d._id,
          entityType: `Customer (${c.customerType})`,
          name: c.name,
          mobileNo: c.mobileNo,
          documentType: d.documentType,
          documentNumber: d.documentNumber || 'N/A',
          fileUrl: d.fileUrl,
          verificationStatus: d.verificationStatus || 'verified',
          uploadedAt: d.uploadedAt
        });
      });
    });

    employees.forEach((e) => {
      (e.documents || []).forEach((d) => {
        kycDocuments.push({
          id: d._id,
          entityType: 'Staff / Employee',
          name: `${e.firstName} ${e.lastName}`,
          mobileNo: e.mobileNo,
          documentType: d.documentType,
          documentNumber: e.employeeCode,
          fileUrl: d.fileUrl,
          verificationStatus: d.verificationStatus || 'verified',
          uploadedAt: d.uploadedAt
        });
      });
    });

    return res.json({
      success: true,
      data: {
        saleAgreements,
        rentalAgreements,
        registryDocuments,
        maintenanceAgreements,
        blueprints,
        legalDocuments: legalMasterDocs,
        kycDocuments,
        digitalSignatures: formattedSignatures,
        counts: {
          saleAgreements: saleAgreements.length,
          rentalAgreements: rentalAgreements.length,
          registryDocuments: registryDocuments.length,
          maintenanceAgreements: maintenanceAgreements.length,
          blueprints: blueprints.length,
          legalDocuments: legalMasterDocs.length,
          kycDocuments: kycDocuments.length,
          digitalSignatures: formattedSignatures.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching unified document vault:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 2. UPLOAD LEGAL DOCUMENT (RERA, TITLE DEEDS, NOCs)
// =========================================================

export const uploadLegalDocument = async (req, res) => {
  try {
    const { title, documentType, projectId, issueDate, expiryDate, issuingAuthority, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No legal document file provided' });
    }

    const uploadResult = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'legal_documents');

    const docCode = `LEG-${Date.now().toString().slice(-6)}`;

    const validProjectId = projectId && mongoose.Types.ObjectId.isValid(projectId) ? projectId : undefined;

    const legalDoc = new LegalDocument({
      documentNumber: docCode,
      title: title || file.originalname,
      documentType: documentType || 'rera_registration',
      projectId: validProjectId,
      fileUrl: uploadResult.documentUrl,
      fileName: file.originalname,
      fileSize: file.size,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      issuingAuthority: issuingAuthority || 'Government Authority',
      verificationStatus: 'verified',
      description: description || ''
    });

    const saved = await legalDoc.save();
    return res.status(201).json({ success: true, message: 'Legal document saved in S3', data: saved });
  } catch (error) {
    console.error('Error uploading legal document:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 3. DIGITAL SIGNATURE / E-SIGN VERIFICATION
// =========================================================

export const createDigitalSignature = async (req, res) => {
  try {
    const {
      agreementType,
      referenceId,
      documentTitle,
      documentUrl,
      signerName,
      signerEmail,
      signerRole,
      signatureDataUrl
    } = req.body;

    if (!signerName || !signatureDataUrl || !documentUrl) {
      return res.status(400).json({ success: false, message: 'Missing required signature payload' });
    }

    const certCode = `CERT-SIG-${Date.now().toString().slice(-8)}`;

    // Generate SHA-256 cryptographic hash of the signature payload
    const hashData = `${certCode}|${documentUrl}|${signerName}|${signerRole}|${Date.now()}`;
    const signatureHash = crypto.createHash('sha256').update(hashData).digest('hex');

    const sig = new DigitalSignature({
      certificateNumber: certCode,
      agreementType: agreementType || 'sale_agreement',
      referenceId: referenceId || `REF-${Date.now().toString().slice(-4)}`,
      documentTitle: documentTitle || 'Agreement Document',
      documentUrl,
      signerName,
      signerEmail: signerEmail || '',
      signerRole: signerRole || 'seller_authorized_signatory',
      signatureDataUrl,
      signatureHash,
      ipAddress: req.ip || '127.0.0.1',
      signedAt: new Date(),
      verificationStatus: 'valid'
    });

    const saved = await sig.save();

    // If it is a Sale Agreement, mark BBA as signed
    if (agreementType === 'sale_agreement' && referenceId && mongoose.Types.ObjectId.isValid(referenceId)) {
      await SalesLead.findByIdAndUpdate(referenceId, {
        "bbaDocument.isSigned": true,
        "bbaDocument.signedAt": new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Digital signature verified and cryptographic certificate issued',
      data: saved
    });
  } catch (error) {
    console.error('Error creating digital signature:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
