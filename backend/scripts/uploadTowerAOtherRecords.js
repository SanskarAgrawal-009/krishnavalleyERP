/**
 * ============================================================================
 * TOWER A - OTHER RECORDS UPLOAD SCRIPT
 * ============================================================================
 * 
 * Uploads all records from "Tower -A - Other Records.pdf" into the ERP system.
 * 
 * SAFETY FEATURES:
 *   1. Flat dedup by flatNumber (skip if already exists)
 *   2. Customer matching by normalized name (case-insensitive)
 *   3. Try/catch per record (log errors, continue processing)
 *   4. Dry-run mode (--dry-run flag)
 *   5. Post-upload verification pass
 * 
 * USAGE:
 *   node scripts/uploadTowerAOtherRecords.js             # Full upload
 *   node scripts/uploadTowerAOtherRecords.js --dry-run    # Validation only
 * ============================================================================
 */

import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch { /* ignore */ }

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';

// ============================================================================
// CONFIGURATION
// ============================================================================
const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = '6a95c505d15622a0c6809ee2';
const BUILDING_ID = '6a9ec0b267f9b1d931b1c017';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Normalize flat number: "A - 006" → "A-006", "A- 1002" → "A-1002" */
function normalizeFlatNo(raw) {
  return raw.replace(/\s+/g, '').replace(/^A-?/i, 'A-');
}

/** Parse Indian currency: "18,60,000" → 1860000 */
function parseIndianCurrency(str) {
  if (!str || str === '-' || str === '' || str.includes('#')) return 0;
  const cleaned = String(str).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

/** Parse date in dd-mm-yyyy or dd/mm/yyyy format */
function parseDate(str) {
  if (!str || str === '-' || str === '' || str.includes('#')) return null;
  const cleaned = String(str).trim();
  
  // Try dd-mm-yyyy or dd/mm/yyyy
  const match = cleaned.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try yyyy-mm-dd
  const match2 = cleaned.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (match2) {
    const [, year, month, day] = match2;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}

/** Parse due day: "10th" → 10, "25th" → 25 */
function parseDueDay(str) {
  if (!str) return 25;
  const cleaned = String(str).replace(/[^0-9]/g, '');
  const num = parseInt(cleaned);
  return (num >= 1 && num <= 31) ? num : 25;
}

/** Extract floor from flat number: "A-705" → 7, "A-1012" → 10 */
function extractFloor(flatNo) {
  const match = flatNo.replace(/^A-/, '').match(/^(\d+)/);
  if (!match) return 0;
  const num = match[1];
  if (num.length <= 2) return 0; // ground floor units like 001-014
  if (num.length === 3) return parseInt(num[0]);
  if (num.length === 4) return parseInt(num.substring(0, 2));
  return 0;
}

/** Normalize name for matching: trim, lowercase, strip punctuation & connectives */
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\bkuamr\b/g, 'kumar')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Determine flat status from remark and data */
function determineFlatStatus(remark, registry) {
  const r = String(remark || '').toLowerCase().trim();
  if (r === 'resell') return 'resell';
  if (r === 'possession') return 'possession_renewal';
  if (r === 'vacant') return 'available';
  return 'sold';
}

// ============================================================================
// ALL 140+ RECORDS FROM PDF (Manually verified from all 3 pages)
// ============================================================================
const PDF_RECORDS = [
  // Page 1 (records 1-79)
  { sno: 1, flatNo: 'A-001', name: 'Ved Prakash Agarwal', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '14/06/2025', startDate: '25/07/2025', endDate: '25/06/2028', endDate2: null, totalMonths: 36, paid: 10, outstanding: 26, assuredAmt: 1116000, amtPaid: 310000, amtOutstanding: 806000, remark: '' },
  { sno: 2, flatNo: 'A-002', name: 'Yogender Singh', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: '26/03/2025', startDate: '25/04/2025', endDate: '25/03/2028', endDate2: null, totalMonths: 36, paid: 14, outstanding: 22, assuredAmt: 1116000, amtPaid: 434000, amtOutstanding: 682000, remark: '' },
  { sno: 3, flatNo: 'A-003', name: 'Shashi Moul Tiwari', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '23/06/2025', startDate: '25/07/2025', endDate: '25/06/2028', endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1116000, amtPaid: 279000, amtOutstanding: 837000, remark: '' },
  { sno: 4, flatNo: 'A-004', name: 'Harshit Gupta', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '07/04/2025', startDate: '05/10/2025', endDate: '04/10/2028', endDate2: null, totalMonths: 36, paid: 13, outstanding: 23, assuredAmt: 1116000, amtPaid: 403000, amtOutstanding: 713000, remark: '' },
  { sno: 5, flatNo: 'A-005', name: 'Padam Kumar & Nitin Kumar', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '01/11/2025', startDate: '12/10/2025', endDate: '11/10/2028', endDate2: null, totalMonths: 36, paid: 6, outstanding: 30, assuredAmt: 1116000, amtPaid: 186000, amtOutstanding: 930000, remark: 'RESELL' },
  { sno: 6, flatNo: 'A-006', name: 'Rahul Tripathi & Prajesh Nayak', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '14/11/2024', startDate: '12/10/2024', endDate: '11/10/2029', endDate2: null, totalMonths: 60, paid: 18, outstanding: 42, assuredAmt: 1860000, amtPaid: 558000, amtOutstanding: 1302000, remark: '' },
  { sno: 7, flatNo: 'A-007', name: 'Rohini Raman Kaushal', registry: 'DONE', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '31/08/2016', startDate: '10/09/2016', endDate: '10/12/2024', endDate2: '10/08/2026', totalMonths: 100, paid: 96, outstanding: 4, assuredAmt: 2500000, amtPaid: 2400000, amtOutstanding: 100000, remark: '' },
  { sno: 8, flatNo: 'A-008', name: 'Rahul Tripathi & Prajesh Nayak', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '14/11/2024', startDate: '12/10/2024', endDate: '11/10/2029', endDate2: null, totalMonths: 60, paid: 18, outstanding: 42, assuredAmt: 1860000, amtPaid: 558000, amtOutstanding: 1302000, remark: '' },
  { sno: 9, flatNo: 'A-009', name: 'Shefali Mukherji & Robi Shankar Mukherji', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '10/02/2020', startDate: '10/03/2020', endDate: '10/06/2028', endDate2: '10/02/2030', totalMonths: 100, paid: 53, outstanding: 47, assuredAmt: 3000000, amtPaid: 1590000, amtOutstanding: 1410000, remark: '' },
  { sno: 10, flatNo: 'A-010', name: 'Priyanka Gupta', registry: 'DONE', dueDay: '25th', installment: 30000, tds: 3000, net: 27000, mouDate: '11/03/2017', startDate: '25/03/2017', endDate: '25/06/2025', endDate2: '25/02/2027', totalMonths: 100, paid: 89, outstanding: 11, assuredAmt: 3000000, amtPaid: 2670000, amtOutstanding: 330000, remark: '' },
  { sno: 11, flatNo: 'A-011', name: 'Ranjana Jain', registry: 'DONE', dueDay: '25th', installment: 30000, tds: 3000, net: 27000, mouDate: '11/03/2017', startDate: '25/03/2017', endDate: '25/06/2025', endDate2: '25/02/2027', totalMonths: 100, paid: 89, outstanding: 11, assuredAmt: 3000000, amtPaid: 2670000, amtOutstanding: 330000, remark: '' },
  { sno: 12, flatNo: 'A-012', name: 'Priyanka Singh', registry: 'DONE', dueDay: '10th', installment: 28500, tds: 2850, net: 25650, mouDate: '10/12/2019', startDate: '10/01/2020', endDate: '10/04/2028', endDate2: '10/12/2029', totalMonths: 100, paid: 55, outstanding: 45, assuredAmt: 2850000, amtPaid: 1567500, amtOutstanding: 1282500, remark: '' },
  { sno: 13, flatNo: 'A-013', name: 'Jaideep Gupta', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '08/01/2025', startDate: '01/08/2025', endDate: '06/01/2031', endDate2: null, totalMonths: 72, paid: 10, outstanding: 62, assuredAmt: 2232000, amtPaid: 310000, amtOutstanding: 1922000, remark: '' },
  { sno: 14, flatNo: 'A-014', name: 'Rachna Rathore', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '30/09/2025', startDate: '25/10/2025', endDate: '25/09/2028', endDate2: null, totalMonths: 36, paid: 8, outstanding: 28, assuredAmt: 1116000, amtPaid: 248000, amtOutstanding: 868000, remark: '' },
  { sno: 15, flatNo: 'A-101', name: 'Munesh Kumar', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: '25/02/2025', startDate: '25/03/2025', endDate: '25/02/2028', endDate2: null, totalMonths: 36, paid: 15, outstanding: 21, assuredAmt: 1116000, amtPaid: 465000, amtOutstanding: 651000, remark: '' },
  { sno: 16, flatNo: 'A-102', name: 'Satyabhan Singh', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '17/06/2025', startDate: '25/07/2025', endDate: '25/06/2028', endDate2: null, totalMonths: 36, paid: 11, outstanding: 25, assuredAmt: 1116000, amtPaid: 341000, amtOutstanding: 775000, remark: '' },
  { sno: 17, flatNo: 'A-103', name: 'Babita Sharma', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '24/02/2025', startDate: '10/04/2025', endDate: '03/10/2028', endDate2: null, totalMonths: 36, paid: 14, outstanding: 22, assuredAmt: 1116000, amtPaid: 434000, amtOutstanding: 682000, remark: '' },
  { sno: 18, flatNo: 'A-104', name: 'Rishi Sethi', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '17/02/2020', startDate: '10/03/2020', endDate: '10/06/2028', endDate2: '10/02/2030', totalMonths: 100, paid: 54, outstanding: 46, assuredAmt: 3000000, amtPaid: 1635000, amtOutstanding: 1365000, remark: '' },
  { sno: 19, flatNo: 'A-105', name: 'MADAN GOPAL SARASWAT', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '14/10/2025', startDate: '25/11/2025', endDate: '25/10/2029', endDate2: null, totalMonths: 48, paid: 7, outstanding: 41, assuredAmt: 1488000, amtPaid: 217000, amtOutstanding: 1271000, remark: 'RESELL' },
  { sno: 20, flatNo: 'A-106', name: 'Pawan Kishore', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '10/10/2024', startDate: '10/10/2024', endDate: '10/09/2028', endDate2: null, totalMonths: 48, paid: 4, outstanding: 44, assuredAmt: 1488000, amtPaid: 620000, amtOutstanding: 868000, remark: '' },
  { sno: 21, flatNo: 'A-107', name: 'Neha Bansal', registry: 'DONE', dueDay: '10th', installment: 33000, tds: 3300, net: 29700, mouDate: '05/09/2023', startDate: '09/10/2023', endDate: '10/10/2027', endDate2: null, totalMonths: 50, paid: 15, outstanding: 35, assuredAmt: 1650000, amtPaid: 1089000, amtOutstanding: 561000, remark: '' },
  { sno: 22, flatNo: 'A-108', name: 'Pramod Kumar Srivastav', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '08/10/2022', startDate: '08/10/2022', endDate: '11/10/2030', endDate2: null, totalMonths: 100, paid: 45, outstanding: 55, assuredAmt: 3000000, amtPaid: 1350000, amtOutstanding: 1650000, remark: '' },
  { sno: 23, flatNo: 'A-109', name: 'Pawan Kishore', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '10/10/2024', startDate: '10/10/2024', endDate: '10/09/2028', endDate2: null, totalMonths: 48, paid: 4, outstanding: 46, assuredAmt: 1488000, amtPaid: 620000, amtOutstanding: 868000, remark: '' },
  { sno: 24, flatNo: 'A-110', name: 'Swati Srivastava', registry: 'DONE', dueDay: '10th', installment: 24000, tds: 2400, net: 21600, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 50, paid: 29, outstanding: 21, assuredAmt: 1200000, amtPaid: 696000, amtOutstanding: 504000, remark: '' },
  { sno: 25, flatNo: 'A-111', name: 'Nitin Kumar', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '01/08/2025', startDate: '09/10/2025', endDate: '10/08/2025', endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1116000, amtPaid: 279000, amtOutstanding: 837000, remark: 'RESELL' },
  { sno: 26, flatNo: 'A-112', name: 'Puneet', registry: 'DONE', dueDay: '25th', installment: 33000, tds: 3300, net: 29700, mouDate: '25/05/2023', startDate: '25/05/2023', endDate: '25/07/2027', endDate2: null, totalMonths: 50, paid: 37, outstanding: 13, assuredAmt: 1650000, amtPaid: 1221000, amtOutstanding: 429000, remark: '' },
  { sno: 27, flatNo: 'A-113', name: 'Neelam Gupta', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '01/08/2025', startDate: '01/08/2025', endDate: '06/01/2031', endDate2: null, totalMonths: 72, paid: 9, outstanding: 63, assuredAmt: 2016000, amtPaid: 279000, amtOutstanding: 1737000, remark: '' },
  { sno: 28, flatNo: 'A-114', name: 'Shivani Sharma & Arun Kumar Sharma', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '07/04/2025', startDate: '10/05/2025', endDate: '10/04/2028', endDate2: null, totalMonths: 36, paid: 13, outstanding: 23, assuredAmt: 1116000, amtPaid: 403000, amtOutstanding: 713000, remark: '' },
  // Skipped: no row 29 in PDF
  { sno: 30, flatNo: 'A-202', name: 'Rajrulari Agarwal', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '15/12/2025', startDate: '25/01/2026', endDate: '25/12/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: '' },
  { sno: 31, flatNo: 'A-203', name: 'Sarika Jain', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '13/03/2026', startDate: '25/04/2026', endDate: '25/03/2029', endDate2: null, totalMonths: 36, paid: 2, outstanding: 34, assuredAmt: 1116000, amtPaid: 62000, amtOutstanding: 1054000, remark: '' },
  { sno: 32, flatNo: 'A-204', name: 'Pratap Singh', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '29/08/2014', startDate: '10/09/2014', endDate: '10/12/2022', endDate2: '10/08/2024', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 1600000, amtPaid: 1600000, amtOutstanding: 0, remark: '' },
  // Skipped: no row 33 in PDF
  { sno: 34, flatNo: 'A-205', name: 'Nirmala Devi', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '06/05/2025', startDate: '06/10/2025', endDate: '05/10/2028', endDate2: null, totalMonths: 36, paid: 12, outstanding: 24, assuredAmt: 1116000, amtPaid: 372000, amtOutstanding: 744000, remark: '' },
  { sno: 35, flatNo: 'A-206', name: 'Sushmita Singh', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '21/05/2026', startDate: '25/06/2026', endDate: '25/05/2029', endDate2: null, totalMonths: 36, paid: 0, outstanding: 36, assuredAmt: 1116000, amtPaid: 0, amtOutstanding: 1116000, remark: '' },
  { sno: 36, flatNo: 'A-207', name: 'Sameer Gautam', registry: 'DONE', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '05/12/2016', startDate: '10/01/2017', endDate: '10/04/2025', endDate2: '10/12/2026', totalMonths: 100, paid: 92, outstanding: 8, assuredAmt: 2500000, amtPaid: 2300000, amtOutstanding: 200000, remark: '' },
  { sno: 37, flatNo: 'A-208', name: 'Ram Kumar Sharma', registry: 'DONE', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '15/04/2017', startDate: '10/10/2016', endDate: '10/01/2025', endDate2: '10/09/2026', totalMonths: 100, paid: 89, outstanding: 11, assuredAmt: 2500000, amtPaid: 2225000, amtOutstanding: 275000, remark: '' },
  { sno: 38, flatNo: 'A-209', name: 'Sunita Sharma', registry: '', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '28/08/2017', startDate: '10/09/2017', endDate: '10/12/2025', endDate2: '10/08/2027', totalMonths: 100, paid: 84, outstanding: 16, assuredAmt: 2500000, amtPaid: 2100000, amtOutstanding: 400000, remark: '' },
  { sno: 39, flatNo: 'A-210', name: 'Lord Krishna Foundation', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '10/06/2018', startDate: '10/06/2018', endDate: '10/09/2026', endDate2: '10/05/2028', totalMonths: 100, paid: 72, outstanding: 28, assuredAmt: 3000000, amtPaid: 2160000, amtOutstanding: 840000, remark: '' },
  { sno: 40, flatNo: 'A-212', name: 'Aman Sharma', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '11/11/2014', startDate: '10/02/2016', endDate: '10/05/2024', endDate2: '10/01/2026', totalMonths: 100, paid: 58, outstanding: 42, assuredAmt: 1738600, amtPaid: 928000, amtOutstanding: 810600, remark: '' },
  // Skipped: no row 41 in PDF
  { sno: 42, flatNo: 'A-301', name: 'Tarkeshwar Prasad', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '06/05/2026', startDate: '06/10/2026', endDate: '05/10/2029', endDate2: null, totalMonths: 36, paid: 0, outstanding: 36, assuredAmt: 1116000, amtPaid: 0, amtOutstanding: 1116000, remark: '' },
  { sno: 43, flatNo: 'A-303', name: 'Sumant Kumar', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '04/09/2026', startDate: '05/10/2026', endDate: '04/10/2029', endDate2: null, totalMonths: 36, paid: 1, outstanding: 35, assuredAmt: 1116000, amtPaid: 31000, amtOutstanding: 1085000, remark: '' },
  { sno: 44, flatNo: 'A-305', name: 'Kajla Dixit', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '20/11/2014', startDate: '10/03/2016', endDate: '10/09/2023', endDate2: '10/05/2025', totalMonths: 91, paid: 40, outstanding: 30, assuredAmt: 1456000, amtPaid: 640000, amtOutstanding: 816000, remark: '' },
  // Skipped: no row 45 in PDF
  { sno: 46, flatNo: 'A-307', name: 'Manoj Kumar', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '19/09/2016', startDate: '10/10/2016', endDate: '10/01/2025', endDate2: '10/09/2026', totalMonths: 100, paid: 93, outstanding: 7, assuredAmt: 2200000, amtPaid: 2046000, amtOutstanding: 154000, remark: '' },
  { sno: 47, flatNo: 'A-308', name: 'Shail Singhal', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '27/01/2016', startDate: '10/02/2016', endDate: '10/05/2024', endDate2: '10/01/2026', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 2200000, amtPaid: 2200000, amtOutstanding: 0, remark: '' },
  { sno: 48, flatNo: 'A-310', name: 'Divya Gautam', registry: '', dueDay: '10th', installment: 28000, tds: 2800, net: 25200, mouDate: '16/08/2018', startDate: '10/04/2018', endDate: '10/07/2026', endDate2: '10/03/2028', totalMonths: 100, paid: 77, outstanding: 23, assuredAmt: 2800000, amtPaid: 2156000, amtOutstanding: 644000, remark: '' },
  { sno: 49, flatNo: 'A-311', name: 'Shalini Sharma', registry: 'DONE', dueDay: '10th', installment: 28000, tds: 2800, net: 25200, mouDate: '21/04/2018', startDate: '10/04/2018', endDate: '10/07/2026', endDate2: '10/03/2028', totalMonths: 100, paid: 77, outstanding: 23, assuredAmt: 2800000, amtPaid: 2156000, amtOutstanding: 644000, remark: '' },
  { sno: 50, flatNo: 'A-312', name: 'Namita Jain', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '30/10/2014', startDate: '10/03/2016', endDate: '10/09/2023', endDate2: '10/05/2025', totalMonths: 100, paid: 60, outstanding: 40, assuredAmt: 1732000, amtPaid: 960000, amtOutstanding: 772000, remark: '' },
  // Skipped: no row 51 in PDF
  { sno: 52, flatNo: 'A-313', name: 'Anoop Kumar Gupta & Purnima Gupta', registry: 'DONE', dueDay: '25th', installment: 30000, tds: 3000, net: 27000, mouDate: '19/02/2022', startDate: '25/03/2022', endDate: '25/02/2027', endDate2: null, totalMonths: 60, paid: 51, outstanding: 9, assuredAmt: 1800000, amtPaid: 1530000, amtOutstanding: 270000, remark: '' },
  { sno: 53, flatNo: 'A-314', name: 'Gaurav Gupta', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '01/11/2025', startDate: '12/10/2025', endDate: '11/10/2028', endDate2: null, totalMonths: 36, paid: 6, outstanding: 30, assuredAmt: 1116000, amtPaid: 186000, amtOutstanding: 930000, remark: '' },
  { sno: 54, flatNo: 'A-401', name: 'Amita Ahuja', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '03/09/2026', startDate: '04/10/2026', endDate: '03/10/2029', endDate2: null, totalMonths: 36, paid: 2, outstanding: 34, assuredAmt: 1116000, amtPaid: 62000, amtOutstanding: 1054000, remark: '' },
  { sno: 55, flatNo: 'A-402', name: 'Nisha Chaturvedi', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '28/04/2015', startDate: '10/06/2015', endDate: '10/09/2023', endDate2: '10/05/2025', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 2200000, amtPaid: 2200000, amtOutstanding: 0, remark: '' },
  // Skipped: no rows 56, 57 in PDF
  { sno: 58, flatNo: 'A-403', name: 'Anita Gupta', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '14/03/2014', startDate: '10/03/2014', endDate: '10/06/2022', endDate2: '10/02/2024', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 1600000, amtPaid: 1600000, amtOutstanding: 0, remark: '' },
  // Skipped: no rows 59, 60 in PDF
  { sno: 61, flatNo: 'A-404', name: 'Vishnu Kumar Agarwal', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '25/10/2025', startDate: '12/10/2025', endDate: '11/10/2028', endDate2: null, totalMonths: 36, paid: 6, outstanding: 30, assuredAmt: 1116000, amtPaid: 186000, amtOutstanding: 930000, remark: '' },
  { sno: 62, flatNo: 'A-405', name: 'Garima Sindhu', registry: 'DONE', dueDay: '25th', installment: 21000, tds: 2100, net: 18900, mouDate: '25/12/2016', startDate: '25/01/2017', endDate: '25/04/2025', endDate2: '25/12/2026', totalMonths: 100, paid: 91, outstanding: 9, assuredAmt: 2100000, amtPaid: 1911000, amtOutstanding: 189000, remark: '' },
  { sno: 63, flatNo: 'A-407', name: 'Nita Jaggi', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '04/02/2017', startDate: '10/02/2017', endDate: '10/05/2025', endDate2: '10/01/2027', totalMonths: 100, paid: 90, outstanding: 10, assuredAmt: 3000000, amtPaid: 2700000, amtOutstanding: 300000, remark: '' },
  { sno: 64, flatNo: 'A-409', name: 'SHAYAMA SACHAN', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '23/02/2018', startDate: '10/03/2018', endDate: '10/06/2026', endDate2: '10/02/2028', totalMonths: 100, paid: 78, outstanding: 22, assuredAmt: 3000000, amtPaid: 2325000, amtOutstanding: 675000, remark: '' },
  { sno: 65, flatNo: 'A-410', name: 'Mamta Singh', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '01/08/2025', startDate: '09/10/2025', endDate: '08/10/2028', endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1116000, amtPaid: 279000, amtOutstanding: 837000, remark: 'resell' },
  { sno: 66, flatNo: 'A-411', name: 'SWATI', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '13/10/2025', startDate: '25/11/2025', endDate: '25/10/2028', endDate2: null, totalMonths: 36, paid: 7, outstanding: 29, assuredAmt: 1116000, amtPaid: 217000, amtOutstanding: 899000, remark: '' },
  { sno: 67, flatNo: 'A-412', name: 'Santosh', registry: 'DONE', dueDay: '25th', installment: 25000, tds: 2500, net: 22500, mouDate: '07/07/2016', startDate: '10/07/2016', endDate: '10/10/2024', endDate2: '10/06/2026', totalMonths: 100, paid: 85, outstanding: 3, assuredAmt: 2384800, amtPaid: 2125000, amtOutstanding: 75000, remark: '' },
  { sno: 68, flatNo: 'A-413', name: 'Geeta Giri', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '07/07/2014', startDate: '10/08/2014', endDate: '10/11/2022', endDate2: '10/07/2024', totalMonths: 100, paid: 42, outstanding: 58, assuredAmt: 1716000, amtPaid: 672000, amtOutstanding: 1044000, remark: '' },
  // Skipped: no rows 69, 70 in PDF
  { sno: 71, flatNo: 'A-414', name: 'Ramesh Kumar Jaggi', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '04/02/2017', startDate: '10/02/2017', endDate: '10/05/2025', endDate2: '10/01/2027', totalMonths: 100, paid: 90, outstanding: 10, assuredAmt: 3000000, amtPaid: 2700000, amtOutstanding: 300000, remark: '' },
  { sno: 72, flatNo: 'A-501', name: 'Sunita Gupta', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '05/12/2025', startDate: '25/12/2025', endDate: '25/11/2028', endDate2: null, totalMonths: 36, paid: 6, outstanding: 30, assuredAmt: 1116000, amtPaid: 186000, amtOutstanding: 930000, remark: '' },
  { sno: 73, flatNo: 'A-502', name: 'Jitender', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '23/04/2025', startDate: '25/05/2025', endDate: '25/04/2028', endDate2: null, totalMonths: 36, paid: 13, outstanding: 23, assuredAmt: 1116000, amtPaid: 403000, amtOutstanding: 713000, remark: '' },
  { sno: 74, flatNo: 'A-503', name: 'Manju Goyal', registry: 'DONE', dueDay: '25th', installment: 32000, tds: 0, net: 32000, mouDate: '21/01/2026', startDate: '25/02/2026', endDate: '25/02/2029', endDate2: null, totalMonths: 36, paid: 4, outstanding: 32, assuredAmt: 1152000, amtPaid: 128000, amtOutstanding: 1024000, remark: '' },
  { sno: 75, flatNo: 'A-504', name: 'Shashi Khanna', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '17/02/2020', startDate: '10/03/2020', endDate: '10/06/2028', endDate2: '10/02/2030', totalMonths: 100, paid: 54, outstanding: 46, assuredAmt: 3000000, amtPaid: 1635000, amtOutstanding: 1365000, remark: '' },
  { sno: 76, flatNo: 'A-506', name: 'Seema Srivastav', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '10/12/2021', startDate: '10/01/2022', endDate: '10/04/2030', endDate2: null, totalMonths: 100, paid: 53, outstanding: 47, assuredAmt: 3000000, amtPaid: 1590000, amtOutstanding: 1410000, remark: '' },
  { sno: 77, flatNo: 'A-507', name: 'Veena Sahani', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '05/07/2014', startDate: '10/08/2014', endDate: '10/11/2022', endDate2: '10/07/2024', totalMonths: 100, paid: 42, outstanding: 58, assuredAmt: 1716000, amtPaid: 672000, amtOutstanding: 1044000, remark: '' },
  // Skipped: no row 78 in PDF
  { sno: 79, flatNo: 'A-508', name: 'Vishnu Kumar Agarwal', registry: '', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '09/04/2025', startDate: '25/09/2025', endDate: '25/08/2028', endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1116000, amtPaid: 279000, amtOutstanding: 837000, remark: '' },

  // Page 2 (records 80-151)
  { sno: 80, flatNo: 'A-510', name: 'Rachna Parashar and Vandana Parashar', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '05/12/2014', startDate: '10/01/2015', endDate: '10/04/2023', endDate2: '10/12/2024', totalMonths: 100, paid: 48, outstanding: 52, assuredAmt: 1860000, amtPaid: 1092000, amtOutstanding: 760000, remark: '' },
  { sno: 81, flatNo: 'A-511', name: 'Usha Gandhi', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '08/11/2016', startDate: '10/12/2016', endDate: '10/03/2025', endDate2: '10/11/2026', totalMonths: 100, paid: 92, outstanding: 8, assuredAmt: 2200000, amtPaid: 2024000, amtOutstanding: 176000, remark: '' },
  { sno: 82, flatNo: 'A-512', name: 'Salman Shakeel', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '30/03/2015', startDate: '10/05/2015', endDate: '10/08/2023', endDate2: '10/04/2025', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 2200000, amtPaid: 2200000, amtOutstanding: 0, remark: '' },
  { sno: 84, flatNo: 'A-601', name: 'Rajesh Sharma & Kamlesh Sharma', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '16/09/2014', startDate: '10/10/2014', endDate: '10/01/2023', endDate2: '10/09/2024', totalMonths: 100, paid: 44, outstanding: 56, assuredAmt: 1712000, amtPaid: 1008000, amtOutstanding: 704000, remark: '' },
  { sno: 85, flatNo: 'A-602', name: 'Madhav Katara', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '16/09/2014', startDate: '10/10/2014', endDate: '10/01/2023', endDate2: '10/09/2024', totalMonths: 100, paid: 44, outstanding: 56, assuredAmt: 1712000, amtPaid: 1008000, amtOutstanding: 704000, remark: '' },
  { sno: 86, flatNo: 'A-603', name: 'Pooja Chand Dwivedi', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '09/04/2025', startDate: '25/09/2025', endDate: '25/08/2028', endDate2: null, totalMonths: 36, paid: 3, outstanding: 33, assuredAmt: 1116000, amtPaid: 93000, amtOutstanding: 1023000, remark: '' },
  { sno: 87, flatNo: 'A-604', name: 'Akhilesh Prakash Kulshreshtha', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '01/06/2015', startDate: '10/07/2015', endDate: '10/10/2023', endDate2: '10/06/2025', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 2200000, amtPaid: 2200000, amtOutstanding: 0, remark: '' },
  { sno: 88, flatNo: 'A-605', name: 'Saroj Kulshrestha', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '25/05/2015', startDate: '10/06/2015', endDate: '10/09/2023', endDate2: '10/05/2025', totalMonths: 100, paid: 90, outstanding: 10, assuredAmt: 2200000, amtPaid: 1980000, amtOutstanding: 220000, remark: '' },
  { sno: 89, flatNo: 'A-606', name: 'Praveen Tripathi', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '21/11/2025', startDate: '25/12/2025', endDate: '25/11/2028', endDate2: null, totalMonths: 36, paid: 6, outstanding: 30, assuredAmt: 1116000, amtPaid: 186000, amtOutstanding: 930000, remark: '' },
  { sno: 90, flatNo: 'A-609', name: 'Prateek Bansal', registry: 'DONE', dueDay: '25th', installment: 16000, tds: 1600, net: 14400, mouDate: '05/12/2014', startDate: '25/12/2014', endDate: '25/03/2023', endDate2: '25/11/2024', totalMonths: 100, paid: 7, outstanding: 39, assuredAmt: 1870000, amtPaid: 112000, amtOutstanding: 624000, remark: 'possession' },
  { sno: 91, flatNo: 'A-610', name: 'Sudheer Rai', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: '13/03/2026', startDate: '25/04/2026', endDate: '25/03/2029', endDate2: null, totalMonths: 36, paid: 2, outstanding: 34, assuredAmt: 1116000, amtPaid: 66000, amtOutstanding: 1050000, remark: '' },
  { sno: 92, flatNo: 'A-611', name: 'Ashok Prakash Kulshreshtha', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '10/09/2015', startDate: '10/10/2015', endDate: '10/01/2024', endDate2: '10/09/2025', totalMonths: 100, paid: 95, outstanding: 5, assuredAmt: 2200000, amtPaid: 2084000, amtOutstanding: 116000, remark: '' },
  { sno: 93, flatNo: 'A-612', name: 'Uma Shankar Prasad Singh', registry: 'DONE', dueDay: '10th', installment: 21500, tds: 2150, net: 19350, mouDate: '15/06/2015', startDate: '10/07/2015', endDate: '10/10/2023', endDate2: '10/06/2025', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 2150000, amtPaid: 2150000, amtOutstanding: 0, remark: '' },
  { sno: 95, flatNo: 'A-613', name: 'Sita Mathur', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '31/07/2014', startDate: '10/08/2014', endDate: '10/11/2022', endDate2: '10/07/2024', totalMonths: 100, paid: 42, outstanding: 58, assuredAmt: 1716000, amtPaid: 1044000, amtOutstanding: 672000, remark: '' },
  { sno: 97, flatNo: 'A-701', name: 'Vimal Tripathi & Namita Tripathi', registry: '', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '15/12/2025', startDate: '25/01/2026', endDate: '25/12/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: 'resell' },
  { sno: 98, flatNo: 'A-702', name: 'Sunil Kumar Gautam', registry: 'DONE', dueDay: '25th', installment: 25000, tds: 2500, net: 22500, mouDate: '30/06/2017', startDate: '25/07/2017', endDate: '25/10/2025', endDate2: '25/06/2027', totalMonths: 100, paid: 85, outstanding: 15, assuredAmt: 2500000, amtPaid: 2125000, amtOutstanding: 375000, remark: '' },
  { sno: 99, flatNo: 'A-703', name: 'Rashmi Rekha Sahu', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '08/01/2025', startDate: '25/08/2025', endDate: '27/07/2028', endDate2: null, totalMonths: 36, paid: 10, outstanding: 26, assuredAmt: 1116000, amtPaid: 310000, amtOutstanding: 806000, remark: 'resell' },
  { sno: 100, flatNo: 'A-704', name: 'Sandhya Madan and Sanjay Madan', registry: 'DONE', dueDay: '25th', installment: 25000, tds: 2500, net: 22500, mouDate: '30/06/2017', startDate: '25/07/2017', endDate: '25/10/2025', endDate2: '25/06/2027', totalMonths: 100, paid: 84, outstanding: 16, assuredAmt: 2500000, amtPaid: 2100000, amtOutstanding: 400000, remark: '' },
  { sno: 101, flatNo: 'A-705', name: 'Aarti Sharma', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '10/07/2014', startDate: '10/08/2014', endDate: '10/11/2022', endDate2: '10/07/2024', totalMonths: 100, paid: 41, outstanding: 59, assuredAmt: 1659000, amtPaid: 1003000, amtOutstanding: 656000, remark: '' },
  { sno: 102, flatNo: 'A-706', name: 'Brij Gopal Shah', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '12/10/2025', startDate: '01/10/2026', endDate: '12/10/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: '' },
  { sno: 103, flatNo: 'A-708', name: 'Monika Sharma', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 3100, net: 27900, mouDate: '04/04/2026', startDate: '10/05/2026', endDate: '04/10/2029', endDate2: null, totalMonths: 36, paid: 1, outstanding: 35, assuredAmt: 1116000, amtPaid: 31000, amtOutstanding: 1085000, remark: '' },
  { sno: 104, flatNo: 'A-709', name: 'Sujay Bhargava & Aman Bhargava', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '30/07/2015', startDate: '10/09/2015', endDate: '10/12/2023', endDate2: '10/08/2025', totalMonths: 100, paid: 99, outstanding: 1, assuredAmt: 2200000, amtPaid: 2178000, amtOutstanding: 22000, remark: '' },
  { sno: 105, flatNo: 'A-710', name: 'Anita Gautam and Guru Charan Gautam', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '30/07/2016', startDate: '10/08/2016', endDate: '10/11/2024', endDate2: '10/07/2026', totalMonths: 100, paid: 96, outstanding: 4, assuredAmt: 2200000, amtPaid: 2112000, amtOutstanding: 88000, remark: '' },
  { sno: 106, flatNo: 'A-711', name: 'Sangeeta Gupta and Ravi Gupta', registry: 'DONE', dueDay: '25th', installment: 25000, tds: 2500, net: 22500, mouDate: '16/04/2016', startDate: '25/05/2016', endDate: '25/08/2024', endDate2: '25/04/2026', totalMonths: 100, paid: 99, outstanding: 1, assuredAmt: 2500000, amtPaid: 2475000, amtOutstanding: 25000, remark: '' },
  { sno: 107, flatNo: 'A-712', name: 'Bharti Gambhir and Jay Gambhir', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '20/01/2017', startDate: '10/02/2017', endDate: '10/05/2025', endDate2: '10/01/2027', totalMonths: 100, paid: 90, outstanding: 10, assuredAmt: 3000000, amtPaid: 2700000, amtOutstanding: 300000, remark: '' },
  { sno: 108, flatNo: 'A-713', name: 'Lata Sharma', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '09/07/2025', startDate: '08/10/2025', endDate: '07/10/2028', endDate2: null, totalMonths: 36, paid: 10, outstanding: 26, assuredAmt: 1116000, amtPaid: 310000, amtOutstanding: 806000, remark: '' },
  { sno: 109, flatNo: 'A-714', name: 'Manish Sharma', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '15/12/2025', startDate: '25/01/2026', endDate: '25/12/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: '' },
  { sno: 110, flatNo: 'A-801', name: 'Mohini Choudhary', registry: 'DONE', dueDay: '25th', installment: 35000, tds: 0, net: 35000, mouDate: null, startDate: '25/08/2025', endDate: '25/07/2028', endDate2: null, totalMonths: 36, paid: 10, outstanding: 26, assuredAmt: 1260000, amtPaid: 350000, amtOutstanding: 910000, remark: '' },
  { sno: 111, flatNo: 'A-803', name: 'Satyajeet Sharma', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '10/11/2025', startDate: '11/10/2025', endDate: '10/10/2030', endDate2: null, totalMonths: 60, paid: 7, outstanding: 53, assuredAmt: 1860000, amtPaid: 217000, amtOutstanding: 1643000, remark: '' },
  { sno: 112, flatNo: 'A-804', name: 'Vinita Berry', registry: 'DONE', dueDay: '25th', installment: 30000, tds: 3000, net: 27000, mouDate: '30/06/2017', startDate: '25/07/2017', endDate: '25/10/2025', endDate2: '25/06/2027', totalMonths: 100, paid: 85, outstanding: 15, assuredAmt: 3000000, amtPaid: 2550000, amtOutstanding: 450000, remark: '' },
  { sno: 113, flatNo: 'A-805', name: 'Punam Kumari Thakur', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '21/11/2025', startDate: '25/12/2025', endDate: '25/11/2028', endDate2: null, totalMonths: 36, paid: 6, outstanding: 30, assuredAmt: 1116000, amtPaid: 186000, amtOutstanding: 930000, remark: '' },
  { sno: 114, flatNo: 'A-806', name: 'Ruchi Kulshreshtha', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '15/04/2015', startDate: '10/05/2015', endDate: '10/08/2023', endDate2: '10/04/2025', totalMonths: 100, paid: 100, outstanding: 0, assuredAmt: 2200000, amtPaid: 2200000, amtOutstanding: 0, remark: '' },
  { sno: 115, flatNo: 'A-808', name: 'Shubham', registry: 'DONE', dueDay: '10th', installment: 0, tds: 0, net: 0, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 0, paid: 0, outstanding: 0, assuredAmt: 0, amtPaid: 0, amtOutstanding: 0, remark: '' },
  { sno: 116, flatNo: 'A-809', name: 'Maulik Berry', registry: 'DONE', dueDay: '25th', installment: 30000, tds: 3000, net: 27000, mouDate: '30/06/2017', startDate: '25/08/2017', endDate: '25/11/2025', endDate2: '25/07/2027', totalMonths: 100, paid: 84, outstanding: 16, assuredAmt: 3000000, amtPaid: 2520000, amtOutstanding: 480000, remark: '' },
  { sno: 117, flatNo: 'A-810', name: 'Kanchan Bakshi', registry: 'DONE', dueDay: '25th', installment: 22000, tds: 2200, net: 19800, mouDate: '02/03/2016', startDate: '25/03/2016', endDate: '25/06/2024', endDate2: '25/02/2026', totalMonths: 100, paid: 99, outstanding: 1, assuredAmt: 2180816, amtPaid: 2180816, amtOutstanding: 0, remark: '' },
  { sno: 119, flatNo: 'A-811', name: 'Archana Gupta', registry: 'DONE', dueDay: '25th', installment: 28000, tds: 2800, net: 25200, mouDate: '05/10/2017', startDate: '25/10/2017', endDate: '25/01/2026', endDate2: '25/09/2027', totalMonths: 100, paid: 82, outstanding: 18, assuredAmt: 2800000, amtPaid: 2282000, amtOutstanding: 518000, remark: '' },
  { sno: 120, flatNo: 'A-812', name: 'Pramila Chauhan Indravanshi', registry: 'DONE', dueDay: '10th', installment: 28000, tds: 2800, net: 25200, mouDate: '11/01/2019', startDate: '10/01/2019', endDate: '10/04/2027', endDate2: '10/12/2028', totalMonths: 100, paid: 67, outstanding: 33, assuredAmt: 2800000, amtPaid: 1876000, amtOutstanding: 924000, remark: '' },
  { sno: 121, flatNo: 'A-901', name: 'Om Prakash Chahar and Kamlesh Chahar', registry: 'DONE', dueDay: '25th', installment: 25714, tds: 2571, net: 23143, mouDate: '19/03/2021', startDate: '25/04/2021', endDate: '25/07/2029', endDate2: null, totalMonths: 100, paid: 59, outstanding: 41, assuredAmt: 2571400, amtPaid: 1517126, amtOutstanding: 1054274, remark: '' },
  { sno: 122, flatNo: 'A-902', name: 'Shilpi Gupta', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '25/05/2026', startDate: '25/06/2026', endDate: '25/05/2029', endDate2: null, totalMonths: 36, paid: 0, outstanding: 36, assuredAmt: 1116000, amtPaid: 0, amtOutstanding: 1116000, remark: '' },
  { sno: 123, flatNo: 'A-903', name: 'Madhvendra Singh', registry: 'DONE', dueDay: '10th', installment: 28500, tds: 2850, net: 25650, mouDate: '09/09/2019', startDate: '10/09/2019', endDate: '10/12/2027', endDate2: '10/08/2029', totalMonths: 100, paid: 59, outstanding: 41, assuredAmt: 2850000, amtPaid: 1681500, amtOutstanding: 1168500, remark: '' },
  { sno: 124, flatNo: 'A-904', name: 'Madhvendra Singh', registry: 'DONE', dueDay: '10th', installment: 28500, tds: 2850, net: 25650, mouDate: '09/09/2019', startDate: '10/09/2019', endDate: '10/12/2027', endDate2: '10/08/2029', totalMonths: 100, paid: 59, outstanding: 41, assuredAmt: 2850000, amtPaid: 1681500, amtOutstanding: 1168500, remark: '' },
  { sno: 125, flatNo: 'A-905', name: 'Tapan Kumar Chanda and Ratan Chanda', registry: 'DONE', dueDay: '25th', installment: 22000, tds: 2200, net: 19800, mouDate: '06/06/2016', startDate: '25/03/2015', endDate: '25/06/2023', endDate2: '25/02/2025', totalMonths: 100, paid: 94, outstanding: 6, assuredAmt: 2194000, amtPaid: 2068000, amtOutstanding: 126000, remark: '' },
  { sno: 126, flatNo: 'A-906', name: 'Satyajeet Sharma', registry: 'DONE', dueDay: '10th', installment: 20972, tds: 2097, net: 18875, mouDate: '17/09/2015', startDate: '10/11/2014', endDate: '10/03/2022', endDate2: '10/11/2023', totalMonths: 100, paid: 70, outstanding: 30, assuredAmt: 1767200, amtPaid: 1457918, amtOutstanding: 299160, remark: '' },
  { sno: 128, flatNo: 'A-907', name: 'Sikha Srivastav', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '16/06/2025', startDate: '07/10/2025', endDate: '06/10/2028', endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1116000, amtPaid: 279000, amtOutstanding: 837000, remark: '' },
  { sno: 129, flatNo: 'A-909', name: 'Saurabh Jain', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '04/12/2015', startDate: '25/01/2016', endDate: '25/04/2024', endDate2: '25/12/2025', totalMonths: 100, paid: 91, outstanding: 9, assuredAmt: 2200000, amtPaid: 2002000, amtOutstanding: 198000, remark: '' },
  { sno: 130, flatNo: 'A-909B', name: 'Ashwar Gupta', registry: 'DONE', dueDay: '10th', installment: 9500, tds: 0, net: 9500, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 11, paid: 6, outstanding: 5, assuredAmt: 104500, amtPaid: 57000, amtOutstanding: 47500, remark: '' },
  { sno: 131, flatNo: 'A-910', name: 'Ravina Gupta', registry: 'DONE', dueDay: '10th', installment: 23000, tds: 2300, net: 20700, mouDate: '07/07/2016', startDate: '10/07/2016', endDate: '10/10/2024', endDate2: '10/06/2026', totalMonths: 100, paid: 96, outstanding: 4, assuredAmt: 2300000, amtPaid: 2208000, amtOutstanding: 92000, remark: '' },
  { sno: 132, flatNo: 'A-911', name: 'Meenu Seth', registry: 'DONE', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '25/07/2016', startDate: '10/08/2016', endDate: '10/11/2024', endDate2: '10/07/2026', totalMonths: 100, paid: 96, outstanding: 4, assuredAmt: 2500000, amtPaid: 2400000, amtOutstanding: 100000, remark: '' },
  { sno: 133, flatNo: 'A-912', name: 'Deepak Rathore', registry: 'DONE', dueDay: '25th', installment: 30000, tds: 3000, net: 27000, mouDate: '11/03/2017', startDate: '25/04/2017', endDate: '25/07/2025', endDate2: '25/03/2027', totalMonths: 96, paid: 89, outstanding: 7, assuredAmt: 2880000, amtPaid: 2670000, amtOutstanding: 210000, remark: '' },
  { sno: 134, flatNo: 'A-914', name: 'Vikas Singh', registry: 'DONE', dueDay: '10th', installment: 32500, tds: 3250, net: 29250, mouDate: '08/02/2025', startDate: '09/10/2025', endDate: '08/10/2028', endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1170000, amtPaid: 292500, amtOutstanding: 877500, remark: '' },
  { sno: 135, flatNo: 'A-1001', name: 'Raj Bala Mittal', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '30/06/2017', startDate: '10/07/2017', endDate: '10/10/2025', endDate2: '10/06/2027', totalMonths: 100, paid: 85, outstanding: 15, assuredAmt: 3000000, amtPaid: 2550000, amtOutstanding: 450000, remark: '' },
  { sno: 136, flatNo: 'A-1002', name: 'Nisha Singhal', registry: 'DONE', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1116000, amtPaid: 279000, amtOutstanding: 837000, remark: '' },
  { sno: 137, flatNo: 'A-1003', name: 'Rimpi Rani', registry: '', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '02/02/2026', startDate: '25/02/2026', endDate: '25/01/2029', endDate2: null, totalMonths: 36, paid: 4, outstanding: 32, assuredAmt: 1116000, amtPaid: 124000, amtOutstanding: 992000, remark: '' },
  { sno: 138, flatNo: 'A-1004', name: 'Laxmi Kant Bansal', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '01/11/2019', startDate: '10/11/2019', endDate: '10/02/2028', endDate2: '10/10/2029', totalMonths: 100, paid: 60, outstanding: 40, assuredAmt: 3000000, amtPaid: 1800000, amtOutstanding: 1200000, remark: '' },
  { sno: 139, flatNo: 'A-1005', name: 'Laxmi Kant Bansal', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '01/11/2019', startDate: '10/11/2019', endDate: '10/02/2028', endDate2: '10/10/2029', totalMonths: 100, paid: 59, outstanding: 41, assuredAmt: 3000000, amtPaid: 1770000, amtOutstanding: 1230000, remark: '' },
  { sno: 140, flatNo: 'A-1006', name: 'Anju Sharma', registry: '', dueDay: '10th', installment: 31000, tds: 0, net: 31000, mouDate: '10/11/2025', startDate: '11/10/2025', endDate: '10/10/2030', endDate2: null, totalMonths: 60, paid: 7, outstanding: 53, assuredAmt: 1860000, amtPaid: 217000, amtOutstanding: 1643000, remark: '' },
  { sno: 141, flatNo: 'A-1007', name: 'Deepika Singh', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '10/09/2016', startDate: '10/09/2016', endDate: '10/12/2024', endDate2: '10/08/2026', totalMonths: 100, paid: 95, outstanding: 5, assuredAmt: 2200000, amtPaid: 2090000, amtOutstanding: 110000, remark: '' },
  { sno: 142, flatNo: 'A-1008', name: 'Sangeeta Chaturvedi', registry: '', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '22/12/2025', startDate: '25/01/2026', endDate: '25/12/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: '' },
  { sno: 143, flatNo: 'A-1009', name: 'Sangeeta Chaturvedi', registry: '', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '22/12/2025', startDate: '25/01/2026', endDate: '25/12/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: '' },
  { sno: 144, flatNo: 'A-1010', name: 'Abhimanyu Raj Singh', registry: 'DONE', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '28/06/2017', startDate: '10/11/2017', endDate: '10/02/2026', endDate2: '10/10/2027', totalMonths: 100, paid: 81, outstanding: 19, assuredAmt: 2500000, amtPaid: 2025000, amtOutstanding: 475000, remark: '' },
  { sno: 145, flatNo: 'A-1011', name: 'Ashok Kumar', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '21/04/2018', startDate: '10/05/2018', endDate: '10/08/2026', endDate2: '10/04/2028', totalMonths: 100, paid: 75, outstanding: 25, assuredAmt: 3000000, amtPaid: 2250000, amtOutstanding: 750000, remark: '' },
  { sno: 146, flatNo: 'A-1012', name: 'Meera Verma', registry: 'DONE', dueDay: '10th', installment: 16000, tds: 1600, net: 14400, mouDate: '13/01/2015', startDate: '10/02/2015', endDate: null, endDate2: null, totalMonths: 100, paid: 38, outstanding: 62, assuredAmt: 1855564, amtPaid: 603146, amtOutstanding: 1187198, remark: '' },
  { sno: 147, flatNo: 'A-1013', name: 'Shilpee Srivastav', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 0, net: 31000, mouDate: '12/11/2025', startDate: '25/01/2026', endDate: '25/12/2028', endDate2: null, totalMonths: 36, paid: 5, outstanding: 31, assuredAmt: 1116000, amtPaid: 155000, amtOutstanding: 961000, remark: '' },
  { sno: 148, flatNo: 'A-1014', name: 'Nalini Singh', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '10/11/2020', startDate: '10/11/2020', endDate: '10/02/2029', endDate2: '10/10/2030', totalMonths: 100, paid: 67, outstanding: 33, assuredAmt: 3000000, amtPaid: 2010000, amtOutstanding: 990000, remark: '' },
  { sno: 149, flatNo: 'A-1101', name: 'Western Energetics Pvt Ltd', registry: 'DONE', dueDay: '10th', installment: 25000, tds: 2500, net: 22500, mouDate: '12/09/2019', startDate: '10/09/2019', endDate: '10/12/2027', endDate2: '10/08/2029', totalMonths: 100, paid: 58, outstanding: 42, assuredAmt: 2500000, amtPaid: 1437500, amtOutstanding: 1062500, remark: '' },
  { sno: 150, flatNo: 'A-1102', name: 'Vacant', registry: '', dueDay: '25th', installment: 0, tds: 0, net: 0, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 0, paid: 0, outstanding: 0, assuredAmt: 0, amtPaid: 0, amtOutstanding: 0, remark: 'vacant' },
  { sno: 151, flatNo: 'A-1103', name: 'Rahul Gupta', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 50, paid: 18, outstanding: 32, assuredAmt: 1550000, amtPaid: 558000, amtOutstanding: 992000, remark: '' },

  // Page 3 (records 152-162)
  { sno: 152, flatNo: 'A-1104', name: 'Vijay Rani', registry: 'DONE', dueDay: '25th', installment: 21000, tds: 0, net: 21000, mouDate: '15/09/2025', startDate: '25/10/2025', endDate: '25/09/2028', endDate2: null, totalMonths: 36, paid: 8, outstanding: 28, assuredAmt: 756000, amtPaid: 168000, amtOutstanding: 588000, remark: 'resell' },
  { sno: 153, flatNo: 'A-1105', name: 'Shrishti Pradhan', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '04/07/2018', startDate: '10/08/2018', endDate: '10/11/2026', endDate2: '10/07/2028', totalMonths: 100, paid: 75, outstanding: 25, assuredAmt: 3000000, amtPaid: 2250000, amtOutstanding: 750000, remark: '' },
  { sno: 154, flatNo: 'A-1106', name: 'Rahul Gupta', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: '25/10/2023', startDate: '25/11/2023', endDate: '25/11/2027', endDate2: null, totalMonths: 50, paid: 11, outstanding: 39, assuredAmt: 1451000, amtPaid: 341000, amtOutstanding: 961000, remark: '' },
  { sno: 155, flatNo: 'A-1107', name: 'Usha Gupta', registry: 'DONE', dueDay: '10th', installment: 22000, tds: 2200, net: 19800, mouDate: '30/09/2016', startDate: '10/10/2016', endDate: '10/01/2025', endDate2: '10/09/2026', totalMonths: 100, paid: 97, outstanding: 3, assuredAmt: 2200000, amtPaid: 2134000, amtOutstanding: 66000, remark: '' },
  { sno: 156, flatNo: 'A-1108', name: 'Mona Shally', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '09/03/2021', startDate: '10/04/2021', endDate: '10/07/2029', endDate2: '10/03/2031', totalMonths: 100, paid: 62, outstanding: 38, assuredAmt: 3000000, amtPaid: 1860000, amtOutstanding: 1140000, remark: '' },
  { sno: 157, flatNo: 'A-1109', name: 'Jasbir Kaur & Harsimran Singh', registry: 'DONE', dueDay: '10th', installment: 33000, tds: 3300, net: 29700, mouDate: '05/10/2023', startDate: '05/10/2023', endDate: '07/10/2027', endDate2: null, totalMonths: 50, paid: 40, outstanding: 10, assuredAmt: 1650000, amtPaid: 1320000, amtOutstanding: 330000, remark: '' },
  { sno: 158, flatNo: 'A-1110', name: 'Jasbir Kaur & Harsimran Singh', registry: 'DONE', dueDay: '10th', installment: 33000, tds: 3300, net: 29700, mouDate: '05/10/2023', startDate: '05/10/2023', endDate: '07/10/2027', endDate2: null, totalMonths: 50, paid: 40, outstanding: 18, assuredAmt: 1650000, amtPaid: 1320000, amtOutstanding: 330000, remark: '' },
  { sno: 159, flatNo: 'A-1111', name: 'Madhu Bala', registry: 'DONE', dueDay: '10th', installment: 30000, tds: 3000, net: 27000, mouDate: '12/04/2018', startDate: '10/05/2018', endDate: '10/08/2026', endDate2: '10/04/2028', totalMonths: 100, paid: 78, outstanding: 22, assuredAmt: 3000000, amtPaid: 2340000, amtOutstanding: 660000, remark: '' },
  { sno: 160, flatNo: 'A-1112', name: 'Sadhna Pachauri', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: '02/12/2026', startDate: '25/03/2026', endDate: '25/02/2029', endDate2: null, totalMonths: 36, paid: 3, outstanding: 33, assuredAmt: 1116000, amtPaid: 93000, amtOutstanding: 1023000, remark: '' },
  { sno: 161, flatNo: 'A-1113', name: 'Poonam Rani', registry: 'DONE', dueDay: '25th', installment: 31000, tds: 3100, net: 27900, mouDate: '25/05/2026', startDate: '25/06/2026', endDate: '25/05/2029', endDate2: null, totalMonths: 36, paid: 0, outstanding: 36, assuredAmt: 1116000, amtPaid: 0, amtOutstanding: 1116000, remark: '' },
  { sno: 162, flatNo: 'A-1114', name: 'Vikas Singh', registry: '', dueDay: '10th', installment: 32500, tds: 3250, net: 29250, mouDate: null, startDate: null, endDate: null, endDate2: null, totalMonths: 36, paid: 9, outstanding: 27, assuredAmt: 1170000, amtPaid: 292500, amtOutstanding: 877500, remark: '' },
];

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================
async function uploadTowerAOtherRecords() {
  try {
    await connectDB();
    console.log(`\n${'='.repeat(80)}`);
    console.log(DRY_RUN ? '  🔍 DRY RUN MODE — No data will be written' : '  🚀 LIVE UPLOAD MODE — Data will be written to database');
    console.log(`${'='.repeat(80)}\n`);

    // Verify project and building exist
    const project = await Project.findById(PROJECT_ID);
    if (!project) {
      console.error('❌ FATAL: Project not found!');
      process.exit(1);
    }
    const building = project.buildings.find(b => b._id.toString() === BUILDING_ID);
    if (!building) {
      console.error('❌ FATAL: Building (Tower A) not found in project!');
      process.exit(1);
    }
    console.log(`✅ Project: ${project.projectName} | Building: ${building.buildingName}\n`);

    // Load all existing customers for name matching
    const allCustomers = await Customer.find({ customerType: 'owner' });
    console.log(`📋 Found ${allCustomers.length} existing owner customers\n`);

    // Build name-lookup map (normalized name → customer doc)
    const customerNameMap = new Map();
    const existingMobiles = new Set();
    for (const cust of allCustomers) {
      const key = normalizeName(cust.name);
      if (!customerNameMap.has(key)) {
        customerNameMap.set(key, cust);
      }
      if (cust.mobileNo) {
        existingMobiles.add(cust.mobileNo.trim());
      }
    }

    // Check for existing flats to prevent duplicates
    const existingFlats = await Flat.find({ projectId: PROJECT_ID, buildingId: BUILDING_ID });
    const existingFlatNos = new Set(existingFlats.map(f => normalizeFlatNo(f.flatNumber)));
    console.log(`📋 Found ${existingFlats.length} existing flats\n`);

    // Tracking
    const stats = {
      total: PDF_RECORDS.length,
      created: 0,
      skippedDuplicate: 0,
      skippedVacant: 0,
      customerLinked: 0,
      customerCreated: 0,
      errors: [],
    };

    // Process each record
    for (const rec of PDF_RECORDS) {
      const flatNo = normalizeFlatNo(rec.flatNo);
      
      try {
        // Skip vacant
        if (rec.remark === 'vacant' || rec.name === 'Vacant') {
          console.log(`⬜ [${flatNo}] VACANT — creating empty flat`);
          
          if (!DRY_RUN && !existingFlatNos.has(flatNo)) {
            const vacantFlat = await Flat.create({
              flatNumber: flatNo,
              projectId: new mongoose.Types.ObjectId(PROJECT_ID),
              buildingId: new mongoose.Types.ObjectId(BUILDING_ID),
              floor: extractFloor(flatNo),
              bhkType: '2BHK',
              status: 'available',
              isSold: false,
              takenForRental: false,
            });
            
            // Add flat to project building
            building.flats.push(vacantFlat._id);
            stats.created++;
          }
          stats.skippedVacant++;
          continue;
        }

        // Skip if flat already exists
        if (existingFlatNos.has(flatNo)) {
          console.log(`⏭️  [${flatNo}] SKIP — flat already exists`);
          stats.skippedDuplicate++;
          continue;
        }

        // Determine status
        const flatStatus = determineFlatStatus(rec.remark, rec.registry);
        const isRentBack = rec.installment > 0;
        const applyTds = rec.tds > 0;
        const tdsPercentage = applyTds ? Math.round((rec.tds / rec.installment) * 100) : 0;

        // Parse dates
        const mouDate = parseDate(rec.mouDate);
        const startDate = parseDate(rec.startDate);
        const endDate = parseDate(rec.endDate);
        const endDate2 = parseDate(rec.endDate2);

        // Find matching customer
        const nameNorm = normalizeName(rec.name);
        let customer = customerNameMap.get(nameNorm);

        // Try alternate name matching for & / and variations
        if (!customer) {
          const altName = nameNorm.replace(/ and /g, ' & ');
          customer = customerNameMap.get(altName);
        }
        if (!customer) {
          const altName = nameNorm.replace(/ & /g, ' and ');
          customer = customerNameMap.get(altName);
        }

        // Try partial match for multi-line names
        if (!customer) {
          for (const [key, cust] of customerNameMap.entries()) {
            if (key.includes(nameNorm) || nameNorm.includes(key)) {
              customer = cust;
              break;
            }
          }
        }

        if (DRY_RUN) {
          const matchStatus = customer ? `✅ MATCHED: ${customer.name}` : '⚠️  NO MATCH — will create new';
          console.log(`📝 [${flatNo}] ${rec.name} → ${matchStatus} | ₹${rec.installment.toLocaleString('en-IN')}/mo | ${rec.totalMonths}mo | Paid: ${rec.paid}/${rec.totalMonths}`);
          if (!customer) stats.customerCreated++;
          else stats.customerLinked++;
          stats.created++;
          continue;
        }

        // ---- LIVE MODE: Create flat ----
        const flatDoc = await Flat.create({
          flatNumber: flatNo,
          projectId: new mongoose.Types.ObjectId(PROJECT_ID),
          buildingId: new mongoose.Types.ObjectId(BUILDING_ID),
          floor: extractFloor(flatNo),
          bhkType: '2BHK',
          status: flatStatus,
          isSold: flatStatus === 'sold' || flatStatus === 'resell' || flatStatus === 'possession_renewal',
          takenForRental: isRentBack,

          currentOwner: {
            customerId: customer?._id || undefined,
            name: rec.name,
            ownershipStartDate: mouDate || startDate || new Date(),
            ownershipType: rec.name.includes('&') || rec.name.includes('and') ? 'joint' : 'individual',
          },

          salesDetails: {
            buyerName: rec.name,
            bookingDate: mouDate || startDate,
            agreedDealPrice: rec.assuredAmt || 0,
            totalAmountPaid: rec.amtPaid || 0,
            balanceAmountDue: rec.amtOutstanding || 0,
            paymentPlanType: 'installment',
            salesStatus: rec.paid >= rec.totalMonths ? 'fully_paid' : 'payment_in_progress',
            possessionStatus: rec.registry === 'DONE' ? 'handed_over' : 'pending',
          },

          rentalDetails: {
            isRentBackActive: isRentBack,
            isPossessionRenewal: flatStatus === 'possession_renewal',
            applyTds: applyTds,
            tdsPercentage: tdsPercentage,
            mouDate: mouDate,
            startDate: startDate,
            endDate: endDate2 || endDate,
            tenureMonths: rec.totalMonths || 36,
            dueDayOfMonth: parseDueDay(rec.dueDay),
            guaranteedMonthlyRent: rec.installment || 0,
            total36MonthCommitment: rec.assuredAmt || 0,
            totalDisbursedToOwner: rec.amtPaid || 0,
            remainingPayableToOwner: rec.amtOutstanding || 0,
            prePossessionMonthlyRent: rec.installment || 0,
            prePossessionTenureMonths: rec.totalMonths || 0,
            prePossessionTotalPaid: rec.amtPaid || 0,
          },
        });

        existingFlatNos.add(flatNo);

        // Link to building
        building.flats.push(flatDoc._id);

        // Link customer
        if (customer) {
          if (!customer.ownerDetails) customer.ownerDetails = { propertyIds: [] };
          if (!customer.ownerDetails.propertyIds) customer.ownerDetails.propertyIds = [];
          
          const alreadyLinked = customer.ownerDetails.propertyIds.some(
            p => p.toString() === flatDoc._id.toString()
          );
          if (!alreadyLinked) {
            customer.ownerDetails.propertyIds.push(flatDoc._id);
            await customer.save();
          }
          
          // Update flat's currentOwner with customer reference
          flatDoc.currentOwner.customerId = customer._id;
          await flatDoc.save();
          
          stats.customerLinked++;
          console.log(`✅ [${flatNo}] Created & linked to ${customer.name} | ₹${rec.installment.toLocaleString('en-IN')}/mo`);
        } else {
          // Create new customer with unique mobile
          let newMobile = `+91 98000${flatNo.replace(/[^0-9]/g, '').padStart(5, '0')}`;
          if (existingMobiles.has(newMobile)) {
            newMobile = `+91 98000${flatNo.replace(/[^0-9]/g, '').padStart(4, '0')}1`;
          }
          existingMobiles.add(newMobile);

          const newCustomer = await Customer.create({
            customerType: 'owner',
            name: rec.name,
            mobileNo: newMobile,
            ownerDetails: {
              propertyIds: [flatDoc._id],
              ownershipType: rec.name.includes('&') || rec.name.includes('and') ? 'joint' : 'individual',
              ownershipPercentage: 100,
            },
          });
          
          flatDoc.currentOwner.customerId = newCustomer._id;
          await flatDoc.save();
          
          // Add to lookup map so subsequent flats for same owner can match
          customerNameMap.set(normalizeName(rec.name), newCustomer);
          
          stats.customerCreated++;
          console.log(`🆕 [${flatNo}] Created flat + NEW customer: ${rec.name} (${newMobile})`);
        }

        stats.created++;
      } catch (err) {
        stats.errors.push({ flatNo, name: rec.name, error: err.message });
        console.error(`❌ [${flatNo}] ERROR: ${err.message}`);
      }
    }

    // Save project (building.flats updated)
    if (!DRY_RUN && stats.created > 0) {
      building.totalFlats = building.flats.length;
      await project.save();
      console.log('\n✅ Project building flats array & totalFlats updated');
    }

    // =====================================================================
    // SUMMARY REPORT
    // =====================================================================
    console.log(`\n${'='.repeat(80)}`);
    console.log('  📊 UPLOAD SUMMARY REPORT');
    console.log(`${'='.repeat(80)}`);
    console.log(`  Total Records in PDF:    ${stats.total}`);
    console.log(`  Flats Created:           ${stats.created}`);
    console.log(`  Skipped (duplicate):     ${stats.skippedDuplicate}`);
    console.log(`  Skipped (vacant):        ${stats.skippedVacant}`);
    console.log(`  Customers Linked:        ${stats.customerLinked}`);
    console.log(`  Customers Created (new): ${stats.customerCreated}`);
    console.log(`  Errors:                  ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n  ⚠️  ERRORS:');
      stats.errors.forEach(e => console.log(`    ❌ ${e.flatNo} (${e.name}): ${e.error}`));
    }

    // =====================================================================
    // POST-UPLOAD VERIFICATION (only in live mode)
    // =====================================================================
    if (!DRY_RUN && stats.created > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log('  🔍 POST-UPLOAD VERIFICATION');
      console.log(`${'='.repeat(80)}`);

      // 1. Count flats
      const totalFlats = await Flat.countDocuments({ projectId: PROJECT_ID, buildingId: BUILDING_ID });
      console.log(`\n  Total flats in DB:       ${totalFlats}`);

      // 2. Check all flats have owners (except vacant)
      const flatsWithoutOwner = await Flat.countDocuments({
        projectId: PROJECT_ID,
        buildingId: BUILDING_ID,
        'currentOwner.customerId': { $exists: false },
        status: { $ne: 'available' },
      });
      console.log(`  Flats without owner:     ${flatsWithoutOwner} ${flatsWithoutOwner === 0 ? '✅' : '⚠️'}`);

      // 3. Check for duplicate flat numbers
      const flatNos = await Flat.find({ projectId: PROJECT_ID }).select('flatNumber');
      const flatNoSet = new Set();
      let dupes = 0;
      for (const f of flatNos) {
        if (flatNoSet.has(f.flatNumber)) {
          console.log(`    ⚠️  DUPLICATE: ${f.flatNumber}`);
          dupes++;
        }
        flatNoSet.add(f.flatNumber);
      }
      console.log(`  Duplicate flat numbers:  ${dupes} ${dupes === 0 ? '✅' : '❌'}`);

      // 4. Verify customer linkage
      const customersWithProps = await Customer.countDocuments({
        customerType: 'owner',
        'ownerDetails.propertyIds.0': { $exists: true },
      });
      console.log(`  Customers with flats:    ${customersWithProps}`);

      // 5. Spot-check 5 random flats
      console.log('\n  📌 SPOT CHECK (5 random flats):');
      const spotCheck = await Flat.find({ projectId: PROJECT_ID, buildingId: BUILDING_ID })
        .limit(5)
        .populate('currentOwner.customerId', 'name mobileNo');
      
      for (const f of spotCheck) {
        const ownerName = f.currentOwner?.customerId?.name || f.currentOwner?.name || 'N/A';
        const rent = f.rentalDetails?.guaranteedMonthlyRent || 0;
        const paid = f.rentalDetails?.totalDisbursedToOwner || 0;
        console.log(`    ${f.flatNumber} → ${ownerName} | ₹${rent.toLocaleString('en-IN')}/mo | Paid: ₹${paid.toLocaleString('en-IN')}`);
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log('  ✅ VERIFICATION COMPLETE');
      console.log(`${'='.repeat(80)}\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err);
    process.exit(1);
  }
}

uploadTowerAOtherRecords();
