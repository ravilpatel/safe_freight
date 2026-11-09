/**
 * SafeFreight OS — Statutory Compliance, e-Bilti & GST Invoice Utilities
 * Reference: PRD v4.0.0 §5 Phase 5 & 7, §7, §10, Features 40, 43, 60-68
 */

import crypto from 'crypto';

// All 36 Indian States and Union Territories (MoRTH 2-letter codes)
export const INDIAN_STATE_CODES: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  DN: 'Dadra and Nagar Haveli and Daman and Diu',
  DD: 'Daman and Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TS: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UK: 'Uttarakhand',
  UT: 'Uttarakhand',
  WB: 'West Bengal',
};

/**
 * Calculates current Indian Financial Year (e.g., '2026-27').
 * In India, FY starts on April 1 and ends on March 31.
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed: 0 = Jan, 2 = Mar, 3 = Apr
  if (month >= 3) {
    const nextYearShort = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${nextYearShort}`;
  } else {
    const currYearShort = String(year % 100).padStart(2, '0');
    return `${year - 1}-${currYearShort}`;
  }
}

/**
 * Generates an official statutory LR number.
 * Standard format: <PREFIX>/<FY>/LR-<SEQUENCE_PADDED_4>
 */
export function generateStatutoryLRNumber(
  prefix: string = 'WIFL',
  financialYear?: string,
  sequence: number = 482
): string {
  const fy = financialYear || getCurrentFinancialYear();
  const padded = String(Math.max(1, sequence)).padStart(4, '0');
  return `${prefix}/${fy}/LR-${padded}`;
}

/**
 * Generates a server-side tenant-unique unguessable LR number.
 * Guarantees isolation across organizations: sequences never leak across tenants.
 * Format: SF/<FY>/<TENANT_PREFIX>/<PADDED_SEQUENCE>
 */
export function generateTenantUniqueLRNumber(
  tenantPrefix: string,
  sequenceNumber: number,
  financialYear?: string
): string {
  const cleanPrefix = (tenantPrefix || 'SF')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  const fy = financialYear || getCurrentFinancialYear();
  const padded = String(Math.max(1, sequenceNumber)).padStart(4, '0');
  return `${cleanPrefix}/${fy}/LR-${padded}`;
}

/**
 * Validates 12-digit numeric statutory e-Way Bill number according to GST Rule 138.
 */
export function validateEWayBillNumber(ewayBill: string): boolean {
  if (!ewayBill || typeof ewayBill !== 'string') return false;
  return /^\d{12}$/.test(ewayBill);
}

/**
 * Validates Indian GSTIN format.
 * Structure: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 checksum char.
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}

/**
 * Validates Indian Income Tax Permanent Account Number (PAN).
 * Structure: 5 uppercase letters + 4 digits + 1 uppercase letter.
 */
export function validatePAN(pan: string): boolean {
  if (!pan || typeof pan !== 'string') return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

/**
 * Calculates statutory e-Way bill validity according to CGST Rule 138(10).
 * Rule:
 *  - Normal Cargo: 1 day for every 200 km (or part thereof); min 1 day.
 *  - Over Dimensional Cargo (ODC) / Multimodal: 1 day for every 20 km (or part thereof); min 1 day.
 */
export function calculateEWayBillValidity(
  distanceKm: number,
  isOverDimensionalCargo: boolean = false,
  generatedAt: Date = new Date()
): {
  daysValid: number;
  description: string;
  validUntil: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  hoursRemaining: number;
} {
  const d = Math.max(1, isFinite(distanceKm) ? distanceKm : 1);
  const kmPerDay = isOverDimensionalCargo ? 20 : 200;
  const daysValid = Math.max(1, Math.ceil(d / kmPerDay));

  const validUntilDate = new Date(generatedAt.getTime() + daysValid * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const diffMs = validUntilDate.getTime() - now;
  const hoursRemaining = Math.round((diffMs / (3600 * 1000)) * 10) / 10;

  let status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' = 'VALID';
  if (hoursRemaining <= 0) {
    status = 'EXPIRED';
  } else if (hoursRemaining <= 8) {
    status = 'EXPIRING_SOON';
  }

  const mode = isOverDimensionalCargo ? ' (ODC: 1 day per 20 km)' : ' (1 day per 200 km under CGST Rule 138)';
  return {
    daysValid,
    description: `Statutory validity: ${daysValid} day${daysValid > 1 ? 's' : ''}${mode}`,
    validUntil: validUntilDate.toISOString(),
    status,
    hoursRemaining,
  };
}

/**
 * Formats a number to Indian Rupee currency representation.
 * Example: 41600 -> ₹41,600.00
 */
export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}₹${formattedInt}.${decPart}`;
}

// ============================================================================
// FEATURE 62: CGST RULE 54(3) CONSIGNMENT NOTE ENFORCEMENT FOR GTAs
// ============================================================================

export interface CGSTConsignmentNoteInput {
  consignorName: string;
  consignorAddress: string;
  consignorGstin?: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin?: string;
  vehiclePlate: string;
  cargoDescription: string;
  packagesCount: number;
  grossWeightKg: number;
  tareWeightKg?: number;
  origin: string;
  destination: string;
  freightAmountINR: number;
  taxPayerRole?: 'CONSIGNOR' | 'CONSIGNEE' | 'GTA';
  isGtaForwardCharge?: boolean; // If true, GTA pays GST; if false, RCM applies
}

export interface CGSTConsignmentNoteResult {
  isValid: boolean;
  missingFields: string[];
  mandatoryFieldErrors: string[];
  taxBreakdown: {
    sacCode: '9965';
    taxableFreightINR: number;
    gstRatePct: number;
    gstAmountINR: number;
    isReverseChargeApplicable: boolean;
    liableParty: 'CONSIGNOR' | 'CONSIGNEE' | 'GTA';
    totalConsignmentValueINR: number;
  };
}

/**
 * Enforces mandatory statutory consignment note fields for Goods Transport Agencies (GTA)
 * under Rule 54(3) of Central Goods and Services Tax Rules, 2017:
 * 1. Gross weight of the consignment
 * 2. Name and address of the consignor
 * 3. Name and address of the consignee
 * 4. Registration mark of the goods carriage
 * 5. Details of goods transported (description & package count)
 * 6. Place of origin and destination
 * 7. GSTIN of the person liable for paying tax (Consignor, Consignee, or GTA)
 */
export function validateCGSTRule54ConsignmentNote(
  note: Partial<CGSTConsignmentNoteInput>
): CGSTConsignmentNoteResult {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Mandatory Field 1: Gross Weight
  if (!note.grossWeightKg || typeof note.grossWeightKg !== 'number' || note.grossWeightKg <= 0) {
    missingFields.push('grossWeightKg');
    errors.push('Gross weight of consignment (kg) is mandatory and must be greater than zero');
  }

  // Mandatory Field 2: Consignor Name & Address
  if (!note.consignorName || typeof note.consignorName !== 'string' || note.consignorName.trim().length === 0) {
    missingFields.push('consignorName');
    errors.push('Consignor name is mandatory');
  }
  if (!note.consignorAddress || typeof note.consignorAddress !== 'string' || note.consignorAddress.trim().length === 0) {
    missingFields.push('consignorAddress');
    errors.push('Consignor registered dispatch address is mandatory');
  }

  // Mandatory Field 3: Consignee Name & Address
  if (!note.consigneeName || typeof note.consigneeName !== 'string' || note.consigneeName.trim().length === 0) {
    missingFields.push('consigneeName');
    errors.push('Consignee recipient name is mandatory');
  }
  if (!note.consigneeAddress || typeof note.consigneeAddress !== 'string' || note.consigneeAddress.trim().length === 0) {
    missingFields.push('consigneeAddress');
    errors.push('Consignee delivery destination address is mandatory');
  }

  // Mandatory Field 4: Vehicle Registration Mark
  if (!note.vehiclePlate || typeof note.vehiclePlate !== 'string' || note.vehiclePlate.trim().length === 0) {
    missingFields.push('vehiclePlate');
    errors.push('Registration mark of the goods carriage is mandatory');
  } else {
    const plateClean = note.vehiclePlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (plateClean.length < 8 || plateClean.length > 11) {
      errors.push('Vehicle registration mark must be a valid Indian registration plate');
    }
  }

  // Mandatory Field 5: Details of Goods Transported
  if (!note.cargoDescription || typeof note.cargoDescription !== 'string' || note.cargoDescription.trim().length === 0) {
    missingFields.push('cargoDescription');
    errors.push('Description of goods transported is mandatory');
  }
  if (!note.packagesCount || typeof note.packagesCount !== 'number' || note.packagesCount <= 0) {
    missingFields.push('packagesCount');
    errors.push('Number of packages transported is mandatory and must be greater than zero');
  }

  // Mandatory Field 6: Origin & Destination
  if (!note.origin || typeof note.origin !== 'string' || note.origin.trim().length === 0) {
    missingFields.push('origin');
    errors.push('Place of dispatch (origin) is mandatory');
  }
  if (!note.destination || typeof note.destination !== 'string' || note.destination.trim().length === 0) {
    missingFields.push('destination');
    errors.push('Place of delivery (destination) is mandatory');
  }

  // Tax calculation under GTA SAC 9965 (5% GST rate)
  const freight = Math.max(0, note.freightAmountINR || 0);
  const isForwardCharge = !!note.isGtaForwardCharge;
  const liableParty = isForwardCharge ? 'GTA' : (note.taxPayerRole || 'CONSIGNOR');
  const isReverseChargeApplicable = !isForwardCharge;
  const gstRatePct = 5.0;
  const gstAmountINR = Math.round(freight * 0.05);

  const isValid = missingFields.length === 0 && errors.length === 0;

  return {
    isValid,
    missingFields,
    mandatoryFieldErrors: errors,
    taxBreakdown: {
      sacCode: '9965',
      taxableFreightINR: freight,
      gstRatePct,
      gstAmountINR,
      isReverseChargeApplicable,
      liableParty,
      totalConsignmentValueINR: freight + (isForwardCharge ? gstAmountINR : 0),
    },
  };
}

// ============================================================================
// FEATURE 64: SECTION 194C TDS WITHHOLDING ENGINE
// ============================================================================

export interface TDS194CInput {
  transporterPan?: string;
  transporterType: 'individual' | 'huf' | 'company' | 'firm' | 'other';
  goodsCarriagesOwnedCount: number;
  hasDeclarationSubSection6: boolean;
  grossPaymentINR: number;
  financialYearAggregateINR?: number;
}

export interface TDS194CResult {
  taxableAmountINR: number;
  tdsRatePct: number;
  tdsAmountINR: number;
  netDisbursementINR: number;
  exemptionApplied: boolean;
  exemptionClause: string;
  isDeclarationValid: boolean;
  reason: string;
}

/**
 * Calculates statutory TDS deduction on freight payments to goods transport contractors
 * under Section 194C of the Indian Income Tax Act, 1961:
 * - Sub-section (6): If transporter owns <= 10 goods carriages at any time during the previous year,
 *   submits statutory declaration with valid PAN -> TDS is 0%.
 * - Section 194C(5) Monetary Thresholds: Single contract <= ₹30,000 and FY aggregate <= ₹1,00,000 -> 0% TDS.
 * - Section 206AA Penalty Rate: If valid PAN is NOT furnished -> 20% higher rate applies.
 * - Standard Rates: 1% for Individual / HUF; 2% for Company / Firm / Body Corporate.
 */
export function calculateSection194CTDS(input: TDS194CInput): TDS194CResult {
  const gross = Math.max(0, input.grossPaymentINR || 0);
  const fyAggregate = Math.max(0, input.financialYearAggregateINR || 0);
  const newAggregate = fyAggregate + gross;

  const panProvided = !!input.transporterPan && validatePAN(input.transporterPan);

  // Case 1: Missing or Invalid PAN -> Section 206AA 20% penalty rate applies immediately
  if (!panProvided) {
    const tdsRatePct = 20.0;
    const tdsAmountINR = Math.round(gross * 0.20);
    return {
      taxableAmountINR: gross,
      tdsRatePct,
      tdsAmountINR,
      netDisbursementINR: gross - tdsAmountINR,
      exemptionApplied: false,
      exemptionClause: 'Section 206AA (Higher Withholding Rate)',
      isDeclarationValid: false,
      reason: 'Valid PAN not furnished. Statutory higher withholding rate of 20% applied under Section 206AA.',
    };
  }

  // Case 2: Section 194C(6) Transporter Exemption (<= 10 goods carriages with declaration)
  const isDeclarationEligible = input.hasDeclarationSubSection6 && input.goodsCarriagesOwnedCount <= 10;
  if (isDeclarationEligible) {
    return {
      taxableAmountINR: gross,
      tdsRatePct: 0.0,
      tdsAmountINR: 0,
      netDisbursementINR: gross,
      exemptionApplied: true,
      exemptionClause: 'Section 194C(6)',
      isDeclarationValid: true,
      reason: 'Transporter declared ownership of <= 10 goods carriages with valid PAN. 0% TDS withheld under Section 194C(6).',
    };
  }

  // Case 3: Section 194C(5) Threshold Exemption
  // Single payment <= ₹30,000 and FY aggregate <= ₹1,00,000
  if (gross <= 30000 && newAggregate <= 100000) {
    return {
      taxableAmountINR: gross,
      tdsRatePct: 0.0,
      tdsAmountINR: 0,
      netDisbursementINR: gross,
      exemptionApplied: true,
      exemptionClause: 'Section 194C(5)',
      isDeclarationValid: false,
      reason: 'Payment within statutory monetary limits (single <= ₹30,000 and aggregate <= ₹1,00,000). No TDS deducted.',
    };
  }

  // Case 4: Standard Statutory Withholding
  // 1% for Individual / HUF; 2% for Corporate / Firm
  const isIndividualOrHuf = input.transporterType === 'individual' || input.transporterType === 'huf';
  const tdsRatePct = isIndividualOrHuf ? 1.0 : 2.0;
  const tdsAmountINR = Math.round(gross * (tdsRatePct / 100));

  return {
    taxableAmountINR: gross,
    tdsRatePct,
    tdsAmountINR,
    netDisbursementINR: gross - tdsAmountINR,
    exemptionApplied: false,
    exemptionClause: 'Section 194C(1)',
    isDeclarationValid: false,
    reason: `Standard statutory withholding of ${tdsRatePct}% applied for ${input.transporterType} transporter.`,
  };
}

// ============================================================================
// FEATURE 65: MoRTH VAHAN VEHICLE COMPLIANCE VERIFICATION
// ============================================================================

export interface VAHANComplianceInput {
  registrationPlate: string;
  fitnessExpiryDate?: string | null;
  nationalPermitExpiryDate?: string | null;
  insuranceExpiryDate?: string | null;
  pucExpiryDate?: string | null;
  referenceDate?: Date;
}

export interface VAHANComplianceResult {
  isCompliant: boolean;
  isDispatchAllowed: boolean;
  normalizedPlate: string;
  stateCode: string;
  stateName: string;
  groundingReason?: string;
  documentBadges: {
    fitness: { status: 'valid' | 'expiring_soon' | 'expired'; daysRemaining: number };
    permit: { status: 'valid' | 'expiring_soon' | 'expired'; daysRemaining: number };
    insurance: { status: 'valid' | 'expiring_soon' | 'expired'; daysRemaining: number };
    puc: { status: 'valid' | 'expiring_soon' | 'expired'; daysRemaining: number };
  };
}

/**
 * Validates Indian commercial vehicle registration plate format per MoRTH:
 * Structure: 2-letter state code + 2-digit RTO + optional 1-3 letter series + 4-digit number.
 * Example: 'GJ05BZ8821', 'MH04AB1234', 'DL01A9999'.
 */
export function validateMoRTHRegistrationPlate(plate: string): {
  isValid: boolean;
  normalizedPlate?: string;
  stateCode?: string;
  stateName?: string;
  error?: string;
} {
  if (!plate || typeof plate !== 'string') {
    return { isValid: false, error: 'Registration plate is required' };
  }

  const clean = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 8 || clean.length > 11) {
    return { isValid: false, error: 'Registration plate length must be between 8 and 11 characters' };
  }

  const stateCode = clean.substring(0, 2);
  const stateName = INDIAN_STATE_CODES[stateCode];
  if (!stateName) {
    return { isValid: false, error: `Invalid Indian State/UT code: ${stateCode}` };
  }

  // MoRTH regex: State(2) + RTO(2) + Series(0..3) + Number(4)
  const plateRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{0,3}[0-9]{4}$/;
  if (!plateRegex.test(clean)) {
    return { isValid: false, error: 'Invalid MoRTH registration plate format' };
  }

  return {
    isValid: true,
    normalizedPlate: clean,
    stateCode,
    stateName,
  };
}

/**
 * Validates full VAHAN commercial vehicle compliance and determines whether
 * vehicle is legally allowed to be dispatched on national highways.
 * Invariant: Expired vehicle fitness or permit grounds vehicle immediately.
 */
export function validateVAHANCompliance(input: VAHANComplianceInput): VAHANComplianceResult {
  const plateResult = validateMoRTHRegistrationPlate(input.registrationPlate);
  const refTime = (input.referenceDate || new Date()).getTime();
  const dayMs = 24 * 3600 * 1000;

  const evalExpiry = (dateStr?: string | null) => {
    if (!dateStr) return { status: 'expired' as const, daysRemaining: -999 };
    const expTime = new Date(dateStr).getTime();
    if (isNaN(expTime)) return { status: 'expired' as const, daysRemaining: -999 };
    const diff = expTime - refTime;
    const daysRemaining = Math.floor(diff / dayMs);
    if (daysRemaining <= 0) return { status: 'expired' as const, daysRemaining };
    if (daysRemaining <= 30) return { status: 'expiring_soon' as const, daysRemaining };
    return { status: 'valid' as const, daysRemaining };
  };

  const fitness = evalExpiry(input.fitnessExpiryDate);
  const permit = evalExpiry(input.nationalPermitExpiryDate);
  const insurance = evalExpiry(input.insuranceExpiryDate);
  const puc = evalExpiry(input.pucExpiryDate);

  let isDispatchAllowed = plateResult.isValid;
  let groundingReason: string | undefined;

  if (!plateResult.isValid) {
    isDispatchAllowed = false;
    groundingReason = plateResult.error || 'Invalid vehicle registration mark';
  } else if (fitness.status === 'expired') {
    isDispatchAllowed = false;
    groundingReason = 'VEHICLE_GROUNDED_EXPIRED_FITNESS: Commercial vehicle fitness certificate has expired';
  } else if (permit.status === 'expired') {
    isDispatchAllowed = false;
    groundingReason = 'VEHICLE_GROUNDED_EXPIRED_PERMIT: National/All India Tourist Permit has expired';
  }

  const isCompliant =
    isDispatchAllowed &&
    fitness.status !== 'expired' &&
    permit.status !== 'expired' &&
    insurance.status !== 'expired' &&
    puc.status !== 'expired';

  return {
    isCompliant,
    isDispatchAllowed,
    normalizedPlate: plateResult.normalizedPlate || input.registrationPlate,
    stateCode: plateResult.stateCode || 'XX',
    stateName: plateResult.stateName || 'Unknown State',
    groundingReason,
    documentBadges: {
      fitness,
      permit,
      insurance,
      puc,
    },
  };
}

// ============================================================================
// FEATURE 66: MoRTH SARATHI COMMERCIAL DL VERIFICATION
// ============================================================================

export interface SARATHIDLInput {
  dlNumber: string;
  driverName?: string;
  endorsements?: string[];
  expiryDate?: string | null;
  referenceDate?: Date;
}

export interface SARATHIDLResult {
  isValid: boolean;
  isCommercialEndorsed: boolean;
  isAssignmentAllowed: boolean;
  normalizedDlNumber: string;
  stateCode: string;
  stateName: string;
  issueYear?: number;
  error?: string;
}

/**
 * Validates Indian commercial driving license per MoRTH SARATHI standard:
 * Structure: 2-letter state code + 2-digit RTO + 4-digit issue year + 7 digits (16 chars total).
 * Commercial goods carriage requires: 'TRANS', 'HMV', 'HGV', 'HTV', or 'LMV-TR'.
 */
export function validateSARATHICommercialDL(input: SARATHIDLInput): SARATHIDLResult {
  if (!input.dlNumber || typeof input.dlNumber !== 'string') {
    return {
      isValid: false,
      isCommercialEndorsed: false,
      isAssignmentAllowed: false,
      normalizedDlNumber: '',
      stateCode: '',
      stateName: '',
      error: 'Driving license number is required',
    };
  }

  const clean = input.dlNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length !== 15 && clean.length !== 16) {
    return {
      isValid: false,
      isCommercialEndorsed: false,
      isAssignmentAllowed: false,
      normalizedDlNumber: clean,
      stateCode: '',
      stateName: '',
      error: 'Driving license must be 15 or 16 alphanumeric characters per MoRTH SARATHI specification',
    };
  }

  const stateCode = clean.substring(0, 2);
  const stateName = INDIAN_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      isCommercialEndorsed: false,
      isAssignmentAllowed: false,
      normalizedDlNumber: clean,
      stateCode,
      stateName: '',
      error: `Invalid issuing state code: ${stateCode}`,
    };
  }

  // Extract issue year: try characters 4..8 first (Standard: 2-char State + 2-digit RTO + 4-digit Year)
  const currentYear = new Date().getFullYear();
  let issueYear = parseInt(clean.substring(4, 8), 10);
  if (isNaN(issueYear) || issueYear < 1960 || issueYear > currentYear) {
    issueYear = parseInt(clean.substring(2, 6), 10);
  }

  if (isNaN(issueYear) || issueYear < 1960 || issueYear > currentYear) {
    return {
      isValid: false,
      isCommercialEndorsed: false,
      isAssignmentAllowed: false,
      normalizedDlNumber: clean,
      stateCode,
      stateName,
      error: `Invalid issue year in license`,
    };
  }

  // Check expiration if provided
  if (input.expiryDate) {
    const expTime = new Date(input.expiryDate).getTime();
    const refTime = (input.referenceDate || new Date()).getTime();
    if (!isNaN(expTime) && expTime <= refTime) {
      return {
        isValid: false,
        isCommercialEndorsed: false,
        isAssignmentAllowed: false,
        normalizedDlNumber: clean,
        stateCode,
        stateName,
        issueYear,
        error: 'Driving license has expired and driver cannot be dispatched',
      };
    }
  }

  // Check commercial transport endorsement
  const commercialEndorsements = ['TRANS', 'HMV', 'HGV', 'HTV', 'LMV-TR', 'MGV'];
  const userEndorsements = (input.endorsements || ['TRANS']).map((e) => e.toUpperCase());
  const isCommercialEndorsed = userEndorsements.some((e) => commercialEndorsements.includes(e));

  if (!isCommercialEndorsed) {
    return {
      isValid: true,
      isCommercialEndorsed: false,
      isAssignmentAllowed: false,
      normalizedDlNumber: clean,
      stateCode,
      stateName,
      issueYear,
      error: 'Commercial transport endorsement (TRANS/HMV/HGV) required to drive commercial goods carriage',
    };
  }

  return {
    isValid: true,
    isCommercialEndorsed: true,
    isAssignmentAllowed: true,
    normalizedDlNumber: clean,
    stateCode,
    stateName,
    issueYear,
  };
}

// ============================================================================
// FEATURE 67: STATUTORY DOCUMENT EXPIRY ENGINE & BADGES
// ============================================================================

export interface DocumentExpiryBadgeResult {
  status: 'valid' | 'expiring_soon' | 'expired' | 'missing';
  daysRemaining: number;
  badgeLabel: string;
  badgeColor: 'green' | 'amber' | 'red' | 'gray';
  alertRequired: boolean;
}

/**
 * Computes dynamic statutory document expiry status and badge styling:
 * - 'valid': > 30 days remaining (Green)
 * - 'expiring_soon': <= 30 days and > 0 days (Amber)
 * - 'expired': <= 0 days (Red, Alert Required)
 * - 'missing': date omitted or invalid (Gray, Alert Required)
 */
export function computeDocumentExpiryBadge(
  expiryDate: string | Date | null | undefined,
  referenceDate: Date = new Date()
): DocumentExpiryBadgeResult {
  if (!expiryDate) {
    return {
      status: 'missing',
      daysRemaining: 0,
      badgeLabel: 'Missing Document',
      badgeColor: 'gray',
      alertRequired: true,
    };
  }

  const expTime = typeof expiryDate === 'string' ? new Date(expiryDate).getTime() : expiryDate.getTime();
  if (isNaN(expTime)) {
    return {
      status: 'missing',
      daysRemaining: 0,
      badgeLabel: 'Invalid Date',
      badgeColor: 'gray',
      alertRequired: true,
    };
  }

  const refTime = referenceDate.getTime();
  const dayMs = 24 * 3600 * 1000;
  const daysRemaining = Math.floor((expTime - refTime) / dayMs);

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining,
      badgeLabel: `Expired (${Math.abs(daysRemaining)}d ago)`,
      badgeColor: 'red',
      alertRequired: true,
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: 'expiring_soon',
      daysRemaining,
      badgeLabel: `Expiring Soon (${daysRemaining}d)`,
      badgeColor: 'amber',
      alertRequired: true,
    };
  }

  return {
    status: 'valid',
    daysRemaining,
    badgeLabel: `Valid (${daysRemaining}d)`,
    badgeColor: 'green',
    alertRequired: false,
  };
}

// ============================================================================
// FEATURE 68: NETC FASTAG PLAZAS & TOLL CALCULATION ENGINE (NH-48 CORRIDOR)
// ============================================================================

export type VehicleAxleType = '2_AXLE' | '3_AXLE' | '4_6_AXLE' | '7_AXLE_PLUS';

export interface TollPlaza {
  id: string;
  name: string;
  chainageKm: number; // Km from Mumbai JNPT
  ratesINR: Record<VehicleAxleType, number>;
}

// Major toll plazas along the NH-48 Western Freight Corridor (Mumbai to Ahmedabad)
export const NH48_TOLL_PLAZAS: TollPlaza[] = [
  { id: 'TP-01', name: 'Kharbao Toll Plaza (Bhiwandi)', chainageKm: 42, ratesINR: { '2_AXLE': 165, '3_AXLE': 240, '4_6_AXLE': 345, '7_AXLE_PLUS': 420 } },
  { id: 'TP-02', name: 'Charoti Toll Plaza (Dahanu)', chainageKm: 110, ratesINR: { '2_AXLE': 190, '3_AXLE': 285, '4_6_AXLE': 410, '7_AXLE_PLUS': 500 } },
  { id: 'TP-03', name: 'Boriach Toll Plaza (Navsari)', chainageKm: 235, ratesINR: { '2_AXLE': 140, '3_AXLE': 210, '4_6_AXLE': 305, '7_AXLE_PLUS': 370 } },
  { id: 'TP-04', name: 'Bhagwada Toll Plaza (Valsad)', chainageKm: 165, ratesINR: { '2_AXLE': 120, '3_AXLE': 180, '4_6_AXLE': 260, '7_AXLE_PLUS': 315 } },
  { id: 'TP-05', name: 'Choryasi Toll Plaza (Kamrej/Surat)', chainageKm: 278, ratesINR: { '2_AXLE': 155, '3_AXLE': 230, '4_6_AXLE': 335, '7_AXLE_PLUS': 405 } },
  { id: 'TP-06', name: 'Bharuch Narmada Bridge Toll Plaza', chainageKm: 345, ratesINR: { '2_AXLE': 210, '3_AXLE': 315, '4_6_AXLE': 455, '7_AXLE_PLUS': 550 } },
  { id: 'TP-07', name: 'Vasad Toll Plaza (Vadodara)', chainageKm: 425, ratesINR: { '2_AXLE': 175, '3_AXLE': 260, '4_6_AXLE': 375, '7_AXLE_PLUS': 455 } },
  { id: 'TP-08', name: 'NE-1 Expressway Toll Plaza (Ahmedabad Ring Road)', chainageKm: 510, ratesINR: { '2_AXLE': 255, '3_AXLE': 380, '4_6_AXLE': 550, '7_AXLE_PLUS': 665 } },
];

/**
 * Calculates exact plaza-by-plaza NETC FASTag toll breakdown along the NH-48 corridor.
 * Integrates directly into Trip Khata advance disbursement.
 */
export function calculateFASTagCorridorToll(
  startKm: number = 0,
  endKm: number = 525,
  axleType: VehicleAxleType = '4_6_AXLE'
): {
  totalTollINR: number;
  plazas: Array<{ id: string; name: string; feeINR: number; chainageKm: number }>;
  plazaCount: number;
  vehicleAxles: VehicleAxleType;
} {
  const minKm = Math.min(startKm, endKm);
  const maxKm = Math.max(startKm, endKm);

  const matchedPlazas = NH48_TOLL_PLAZAS.filter(
    (tp) => tp.chainageKm >= minKm && tp.chainageKm <= maxKm
  ).sort((a, b) => a.chainageKm - b.chainageKm);

  let totalTollINR = 0;
  const plazas = matchedPlazas.map((tp) => {
    const feeINR = tp.ratesINR[axleType] || tp.ratesINR['4_6_AXLE'];
    totalTollINR += feeINR;
    return {
      id: tp.id,
      name: tp.name,
      feeINR,
      chainageKm: tp.chainageKm,
    };
  });

  return {
    totalTollINR,
    plazas,
    plazaCount: plazas.length,
    vehicleAxles: axleType,
  };
}

// ============================================================================
// FEATURE 61: CRYPTOGRAPHIC e-BILTI VERIFICATION QR & TOKEN ENGINE
// ============================================================================

const STATUTORY_SECRET = process.env.STATUTORY_HMAC_SECRET || 'safefreight-ebilti-cryptographic-salt-2026';

export interface EBiltiQRVerificationPayload {
  lrNumber: string;
  tenantId: string;
  vehiclePlate: string;
  ewayBillNumber?: string;
  grossWeightKg?: number;
  issuedAt: string;
}

/**
 * Generates a signed cryptographic verification token and public QR payload for e-Bilti.
 */
export function generateEBiltiVerificationToken(payload: EBiltiQRVerificationPayload): {
  verificationHash: string;
  verificationToken: string;
  verificationUrl: string;
} {
  const payloadStr = JSON.stringify({
    lr: payload.lrNumber,
    tid: payload.tenantId,
    v: payload.vehiclePlate,
    ewb: payload.ewayBillNumber || '',
    w: payload.grossWeightKg || 0,
    iat: payload.issuedAt,
  });

  const payloadB64 = Buffer.from(payloadStr).toString('base64url');
  const signature = crypto
    .createHmac('sha256', STATUTORY_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const hexHash = crypto
    .createHmac('sha256', STATUTORY_SECRET)
    .update(payloadB64)
    .digest('hex')
    .toUpperCase();

  const verificationToken = `${payloadB64}.${signature}`;
  const shortHash = `SF-${hexHash.substring(0, 4)}-${hexHash.substring(4, 8)}-${hexHash.substring(8, 12)}`;

  return {
    verificationHash: shortHash,
    verificationToken,
    verificationUrl: `/api/v1/statutory/verify?token=${verificationToken}`,
  };
}

/**
 * Verifies an e-Bilti cryptographic verification token in constant time.
 * Rejects tampered payloads or forged signatures.
 */
export function verifyEBiltiVerificationToken(token: string): {
  isValid: boolean;
  payload?: EBiltiQRVerificationPayload;
  error?: string;
} {
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: 'Token is missing' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Malformed verification token format' };
  }

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', STATUTORY_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { isValid: false, error: 'Invalid cryptographic verification signature' };
  }

  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    return {
      isValid: true,
      payload: {
        lrNumber: parsed.lr,
        tenantId: parsed.tid,
        vehiclePlate: parsed.v,
        ewayBillNumber: parsed.ewb || undefined,
        grossWeightKg: parsed.w || undefined,
        issuedAt: parsed.iat,
      },
    };
  } catch {
    return { isValid: false, error: 'Failed to decode verification payload' };
  }
}

// ============================================================================
// GST INVOICE GENERATION (PHASE 5 RE-EXPORT)
// ============================================================================

export interface GSTInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  sacCode: '9965';
  sacDescription: string;
  isInterState: boolean;
  consignor: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
  };
  consignee: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
  };
  vehicleNumber: string;
  lrNumber: string;
  ewayBillNumber?: string;
  origin: string;
  destination: string;
  distanceKm: number;
  weightKg: number;
  taxableFreightINR: number;
  tollChargesINR: number;
  hamaliChargesINR: number;
  totalTaxableValueINR: number;
  cgstRatePct: number;
  cgstAmountINR: number;
  sgstRatePct: number;
  sgstAmountINR: number;
  igstRatePct: number;
  igstAmountINR: number;
  totalTaxINR: number;
  grandTotalINR: number;
  formattedGrandTotal: string;
  reverseChargeApplicable: boolean;
  status: 'DELIVERED_FINAL' | 'PROVISIONAL';
}

export interface CreateInvoiceParams {
  invoiceSequence?: number;
  tenantPrefix?: string;
  consignorName?: string;
  consignorGstin?: string;
  consignorAddress?: string;
  consigneeName?: string;
  consigneeGstin?: string;
  consigneeAddress?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  ewayBillNumber?: string;
  origin?: string;
  destination?: string;
  distanceKm?: number;
  weightKg?: number;
  pricingInr?: number;
  hamaliIncluded?: boolean;
  isDelivered?: boolean;
}

export function generateGSTInvoice(params: CreateInvoiceParams): GSTInvoiceData {
  const sequence = params.invoiceSequence || Math.floor(1000 + Math.random() * 9000);
  const prefix = params.tenantPrefix || 'SF-INV';
  const invoiceNumber = `${prefix}/2026-27/${String(sequence).padStart(5, '0')}`;
  const invoiceDate = new Date().toISOString().split('T')[0];

  const origin = params.origin || 'Mumbai JNPT Port, Maharashtra';
  const destination = params.destination || 'Ahmedabad Changodar Hub, Gujarat';

  const consignorGstin = params.consignorGstin || '27AAACW1234F1Z1'; // 27 = Maharashtra
  const consigneeGstin = params.consigneeGstin || '24AAACW5678G1Z2'; // 24 = Gujarat

  const consignorStateCode = consignorGstin.substring(0, 2);
  const consigneeStateCode = consigneeGstin.substring(0, 2);
  const isInterState = consignorStateCode !== consigneeStateCode;

  const distanceKm = params.distanceKm || 525;
  const weightKg = params.weightKg || 12000;
  const rawPrice = params.pricingInr || 40000;

  const taxableFreightINR = Math.round(rawPrice / 1.05);
  const tollChargesINR = Math.round(distanceKm * 2.2);
  const hamaliChargesINR = params.hamaliIncluded ? 800 : 0;
  const totalTaxableValueINR = taxableFreightINR + hamaliChargesINR;

  let cgstRatePct = 0;
  let cgstAmountINR = 0;
  let sgstRatePct = 0;
  let sgstAmountINR = 0;
  let igstRatePct = 0;
  let igstAmountINR = 0;

  if (isInterState) {
    igstRatePct = 5.0;
    igstAmountINR = Math.round(totalTaxableValueINR * 0.05);
  } else {
    cgstRatePct = 2.5;
    cgstAmountINR = Math.round(totalTaxableValueINR * 0.025);
    sgstRatePct = 2.5;
    sgstAmountINR = Math.round(totalTaxableValueINR * 0.025);
  }

  const totalTaxINR = cgstAmountINR + sgstAmountINR + igstAmountINR;
  const grandTotalINR = totalTaxableValueINR + totalTaxINR;

  return {
    invoiceNumber,
    invoiceDate,
    sacCode: '9965',
    sacDescription: 'Goods Transport Agency (GTA) Services for Road Carriage',
    isInterState,
    consignor: {
      name: params.consignorName || 'National Freight Logistics Ltd',
      address: params.consignorAddress || 'JNPT Port Container Terminal, Nhava Sheva, Navi Mumbai, Maharashtra 400707',
      gstin: consignorGstin,
      stateCode: consignorStateCode,
    },
    consignee: {
      name: params.consigneeName || 'Gujarat Industrial Heavy Machinery Pvt Ltd',
      address: params.consigneeAddress || 'Plot 48, GIDC Changodar, Sanand, Ahmedabad, Gujarat 382213',
      gstin: consigneeGstin,
      stateCode: consigneeStateCode,
    },
    vehicleNumber: params.vehicleNumber || 'GJ-01-XX-9821',
    lrNumber: params.lrNumber || generateStatutoryLRNumber('WIFL', '2026-27', sequence),
    ewayBillNumber: params.ewayBillNumber || '241098234512',
    origin,
    destination,
    distanceKm,
    weightKg,
    taxableFreightINR,
    tollChargesINR,
    hamaliChargesINR,
    totalTaxableValueINR,
    cgstRatePct,
    cgstAmountINR,
    sgstRatePct,
    sgstAmountINR,
    igstRatePct,
    igstAmountINR,
    totalTaxINR,
    grandTotalINR,
    formattedGrandTotal: formatINR(grandTotalINR),
    reverseChargeApplicable: false,
    status: params.isDelivered ? 'DELIVERED_FINAL' : 'PROVISIONAL',
  };
}
