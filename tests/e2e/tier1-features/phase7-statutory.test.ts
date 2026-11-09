/**
 * Tier 1: Feature Coverage — Phase 7: Statutory & Regulatory Compliance
 * Features 60 through 68:
 * - Feature 60: Server-Side Tenant-Unique e-Bilti (LR) Generator
 * - Feature 61: High-Contrast Highway e-Bilti Scannable QR Code & Checkpoint Verification
 * - Feature 62: CGST Rule 54(3) Consignment Note Enforcement
 * - Feature 63: 12-Digit Inter-State e-Way Bill Validation & Distance Duration
 * - Feature 64: Income Tax Act Section 194C TDS Exemption Engine
 * - Feature 65: MoRTH VAHAN Vehicle Compliance Verification & Grounding
 * - Feature 66: MoRTH SARATHI Commercial DL Verification
 * - Feature 67: Statutory Document Expiry Engine & Badges
 * - Feature 68: NETC FASTag Plazas & Toll Calculation Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  generateTenantUniqueLRNumber,
  validateCGSTRule54ConsignmentNote,
  calculateEWayBillValidity,
  validateEWayBillNumber,
  calculateSection194CTDS,
  validateMoRTHRegistrationPlate,
  validateVAHANCompliance,
  validateSARATHICommercialDL,
  computeDocumentExpiryBadge,
  calculateFASTagCorridorToll,
  generateEBiltiVerificationToken,
  verifyEBiltiVerificationToken,
  getCurrentFinancialYear,
} from '@/lib/algorithms/statutory';
import { dataService } from '@/lib/data-service';
import { SessionClaims } from '@/types/database';
import { POST as createEBiltiRoute, GET as listEBiltiRoute } from '@/app/api/v1/statutory/ebilti/route';
import { GET as getEBiltiByIdRoute } from '@/app/api/v1/statutory/ebilti/[id]/route';
import { GET as verifyGetRoute, POST as verifyPostRoute } from '@/app/api/v1/statutory/verify/route';
import { POST as tdsRoute } from '@/app/api/v1/statutory/tds/route';
import { POST as vahanRoute } from '@/app/api/v1/statutory/vahan/route';
import { POST as sarathiRoute } from '@/app/api/v1/statutory/sarathi/route';
import { GET as fastagGetRoute, POST as fastagPostRoute } from '@/app/api/v1/statutory/fastag/route';

const TENANT_ALPHA_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_BETA_ID = '00000000-0000-4000-8000-000000000002';

const mockClaimsAlpha: SessionClaims = {
  sub: 'usr-admin-alpha',
  tenant_id: TENANT_ALPHA_ID,
  role: 'fleet_admin',
  email: 'admin@alpha-logistics.in',
};

function createMockRequest(
  url: string,
  method: string,
  claims?: SessionClaims,
  body?: unknown,
  headers?: Record<string, string>
): NextRequest {
  const reqHeaders = new Headers();
  reqHeaders.set('Content-Type', 'application/json');

  if (claims) {
    const payload = {
      sub: claims.sub,
      tenant_id: claims.tenant_id,
      role: claims.role,
      user_role: claims.role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    // Using default test JWT secret
    const cryptoMod = require('crypto');
    const sig = cryptoMod
      .createHmac('sha256', 'safefreight-enterprise-secret')
      .update(`${headerB64}.${b64}`)
      .digest('base64url');
    reqHeaders.set('Authorization', `Bearer ${headerB64}.${b64}.${sig}`);
  }

  if (headers) {
    Object.entries(headers).forEach(([k, v]) => reqHeaders.set(k, v));
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Tier 1: Feature Coverage — Phase 7: Statutory & Regulatory Compliance', () => {
  beforeEach(() => {
    dataService.clear();
  });

  // ==========================================================================
  // FEATURE 60: SERVER-SIDE TENANT-UNIQUE e-BILTI (LR) GENERATOR
  // ==========================================================================
  describe('Feature 60: Server-Side Tenant-Unique e-Bilti (LR) Generator', () => {
    it('TC-STAT-60-01: generates server-side tenant-unique LR numbering compliant with Carriage by Road Act 2007', async () => {
      const fy = getCurrentFinancialYear();
      const lr1 = generateTenantUniqueLRNumber('ALPHA', 1, fy);
      const lr2 = generateTenantUniqueLRNumber('ALPHA', 2, fy);
      const lrBeta = generateTenantUniqueLRNumber('BETA', 1, fy);

      expect(lr1).toBe(`ALPHA/${fy}/LR-0001`);
      expect(lr2).toBe(`ALPHA/${fy}/LR-0002`);
      expect(lrBeta).toBe(`BETA/${fy}/LR-0001`);
      expect(lr1).not.toBe(lrBeta);
    });

    it('TC-STAT-60-02: creates official e-Bilti consignment note via REST endpoint with atomic sequence', async () => {
      const payload = {
        vehicle_plate: 'GJ05BZ8821',
        consignor_name: 'Western Logistics Forwarders Ltd',
        consignor_address: 'JNPT Port Container Terminal, Nhava Sheva, Maharashtra',
        consignor_gstin: '27AAACW1234F1Z1',
        consignee_name: 'Gujarat Steel & Machinery Works',
        consignee_address: 'Plot 48, GIDC Changodar, Ahmedabad, Gujarat',
        consignee_gstin: '24AAACW5678G1Z2',
        origin: 'Mumbai JNPT Port, Maharashtra',
        destination: 'Ahmedabad Changodar Hub, Gujarat',
        cargo_description: 'Precision Industrial Machine Components',
        packages_count: 42,
        gross_weight_kg: 24500,
        tare_weight_kg: 8500,
        freight_amount_inr: 48500,
        eway_bill_number: '241098234512',
        tenant_prefix: 'ALPHA',
      };

      const req = createMockRequest('http://localhost:3000/api/v1/statutory/ebilti', 'POST', mockClaimsAlpha, payload);
      const res = await createEBiltiRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.ebilti).toBeDefined();
      expect(json.ebilti.lr_number).toMatch(/^ALPHA\/\d{4}-\d{2}\/LR-0001$/);
      expect(json.ebilti.net_weight_kg).toBe(16000); // 24500 - 8500
      expect(json.ebilti.verification_hash).toMatch(/^SF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(json.ebilti.verification_token).toBeDefined();
    });

    it('TC-STAT-60-03: fetches tenant-scoped e-Bilti by id via GET /api/v1/statutory/ebilti/[id]', async () => {
      const ebilti = await dataService.createEBiltiConsignmentNote(mockClaimsAlpha, {
        vehicle_plate: 'GJ05BZ8821',
        consignor_name: 'Consignor Hub',
        consignor_address: 'Mumbai',
        consignee_name: 'Consignee Hub',
        consignee_address: 'Ahmedabad',
        origin: 'Mumbai',
        destination: 'Ahmedabad',
        cargo_description: 'Auto Parts',
        packages_count: 10,
        gross_weight_kg: 5000,
        freight_amount_inr: 25000,
      });

      const req = createMockRequest(`http://localhost:3000/api/v1/statutory/ebilti/${ebilti.id}`, 'GET', mockClaimsAlpha);
      const res = await getEBiltiByIdRoute(req, { params: { id: ebilti.id } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ebilti.id).toBe(ebilti.id);
      expect(json.ebilti.lr_number).toBe(ebilti.lr_number);
    });

    it('TC-STAT-60-04: paginates tenant e-Bilti list via GET /api/v1/statutory/ebilti', async () => {
      for (let i = 1; i <= 3; i++) {
        await dataService.createEBiltiConsignmentNote(mockClaimsAlpha, {
          vehicle_plate: `MH04AB100${i}`,
          consignor_name: `Consignor ${i}`,
          consignor_address: 'Mumbai',
          consignee_name: `Consignee ${i}`,
          consignee_address: 'Surat',
          origin: 'Mumbai',
          destination: 'Surat',
          cargo_description: 'Industrial Parts',
          packages_count: 5 * i,
          gross_weight_kg: 3000 * i,
          freight_amount_inr: 15000 * i,
        });
      }

      const req = createMockRequest('http://localhost:3000/api/v1/statutory/ebilti?limit=2&offset=0', 'GET', mockClaimsAlpha);
      const res = await listEBiltiRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.pagination.total).toBe(3);
      expect(json.pagination.has_more).toBe(true);
    });
  });

  // ==========================================================================
  // FEATURE 61: HIGH-CONTRAST HIGHWAY e-BILTI SCANNABLE QR CODE & CHECKPOINT
  // ==========================================================================
  describe('Feature 61: Scannable QR Code & Checkpoint Verification', () => {
    it('TC-STAT-61-01: generates cryptographic verification token and verifies in constant time', () => {
      const payload = {
        lrNumber: 'SF/2026-27/ALPHA/0001',
        tenantId: TENANT_ALPHA_ID,
        vehiclePlate: 'GJ05BZ8821',
        ewayBillNumber: '241098234512',
        grossWeightKg: 24500,
        issuedAt: new Date().toISOString(),
      };

      const { verificationToken, verificationHash } = generateEBiltiVerificationToken(payload);
      expect(verificationToken).toContain('.');
      expect(verificationHash).toMatch(/^SF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

      const verification = verifyEBiltiVerificationToken(verificationToken);
      expect(verification.isValid).toBe(true);
      expect(verification.payload?.lrNumber).toBe(payload.lrNumber);
      expect(verification.payload?.tenantId).toBe(payload.tenantId);
      expect(verification.payload?.vehiclePlate).toBe(payload.vehiclePlate);
    });

    it('TC-STAT-61-02: verifies consignment at RTO checkpoint via GET /api/v1/statutory/verify', async () => {
      const ebilti = await dataService.createEBiltiConsignmentNote(mockClaimsAlpha, {
        vehicle_plate: 'GJ05BZ8821',
        consignor_name: 'Tata Steel Processing Ltd',
        consignor_address: 'Tarapur MIDC, Maharashtra',
        consignee_name: 'Ahmedabad Fabricators',
        consignee_address: 'Vatva GIDC, Gujarat',
        origin: 'Tarapur',
        destination: 'Ahmedabad',
        cargo_description: 'Steel Coils',
        packages_count: 8,
        gross_weight_kg: 28000,
        freight_amount_inr: 52000,
        eway_bill_number: '241088492019',
      });

      // RTO Checkpoint scanner scans the QR token
      const req = createMockRequest(
        `http://localhost:3000/api/v1/statutory/verify?token=${encodeURIComponent(ebilti.verification_token)}`,
        'GET'
      );
      const res = await verifyGetRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.verified).toBe(true);
      expect(json.consignment.lrNumber).toBe(ebilti.lr_number);
      expect(json.consignment.vehiclePlate).toBe('GJ05BZ8821');
      expect(json.consignment.ewayBillNumber).toBe('241088492019');
    });

    it('TC-STAT-61-03: supports checkpoint verification via POST /api/v1/statutory/verify with verification hash', async () => {
      const ebilti = await dataService.createEBiltiConsignmentNote(mockClaimsAlpha, {
        vehicle_plate: 'GJ05BZ8821',
        consignor_name: 'Gujarat Industrial Chemicals',
        consignor_address: 'Ankleshwar GIDC',
        consignee_name: 'Mumbai Paint Manufactures',
        consignee_address: 'Taloja MIDC',
        origin: 'Ankleshwar',
        destination: 'Taloja',
        cargo_description: 'Industrial Solvents',
        packages_count: 50,
        gross_weight_kg: 18000,
        freight_amount_inr: 35000,
      });

      const req = createMockRequest('http://localhost:3000/api/v1/statutory/verify', 'POST', undefined, {
        hash: ebilti.verification_hash,
      });
      const res = await verifyPostRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.verified).toBe(true);
      expect(json.consignment.lrNumber).toBe(ebilti.lr_number);
    });
  });

  // ==========================================================================
  // FEATURE 62: CGST RULE 54(3) CONSIGNMENT NOTE ENFORCEMENT
  // ==========================================================================
  describe('Feature 62: CGST Rule 54(3) Consignment Note Enforcement', () => {
    it('TC-STAT-62-01: enforces all 6 mandatory statutory fields under CGST Rule 54(3)', () => {
      // Missing gross weight and consignee address
      const invalidNote = {
        consignorName: 'Western Express Logistics',
        consignorAddress: 'JNPT Port, Navi Mumbai',
        consigneeName: 'Ahmedabad Retailers',
        vehiclePlate: 'GJ05BZ8821',
        cargoDescription: 'Consumer Goods',
        packagesCount: 100,
        origin: 'Mumbai',
        destination: 'Ahmedabad',
      };

      const result = validateCGSTRule54ConsignmentNote(invalidNote);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('grossWeightKg');
      expect(result.missingFields).toContain('consigneeAddress');
    });

    it('TC-STAT-62-02: calculates GTA SAC 9965 tax liability under Reverse Charge Mechanism (RCM)', () => {
      const validNote = {
        grossWeightKg: 18000,
        consignorName: 'Tata Motors GIDC Sanand',
        consignorAddress: 'Sanand Industrial Estate, Gujarat',
        consigneeName: 'Jindal Panvel Hub',
        consigneeAddress: 'Panvel, Maharashtra',
        vehiclePlate: 'GJ05BZ8821',
        cargoDescription: 'Automobile Axles',
        packagesCount: 30,
        origin: 'Sanand, Gujarat',
        destination: 'Panvel, Maharashtra',
        freightAmountINR: 40000,
        taxPayerRole: 'CONSIGNOR' as const,
        isGtaForwardCharge: false, // RCM
      };

      const result = validateCGSTRule54ConsignmentNote(validNote);
      expect(result.isValid).toBe(true);
      expect(result.taxBreakdown.sacCode).toBe('9965');
      expect(result.taxBreakdown.gstRatePct).toBe(5.0);
      expect(result.taxBreakdown.gstAmountINR).toBe(2000); // 5% of 40,000
      expect(result.taxBreakdown.isReverseChargeApplicable).toBe(true);
      expect(result.taxBreakdown.liableParty).toBe('CONSIGNOR');
    });

    it('TC-STAT-62-03: rejects e-Bilti creation via API with HTTP 400 when Rule 54(3) fields are missing', async () => {
      const incompletePayload = {
        vehicle_plate: 'GJ05BZ8821',
        consignor_name: 'Incomplete Sender',
        // Missing consignee, origin, destination, etc.
      };

      const req = createMockRequest('http://localhost:3000/api/v1/statutory/ebilti', 'POST', mockClaimsAlpha, incompletePayload);
      const res = await createEBiltiRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('CGST Rule 54(3) mandatory fields missing');
    });
  });

  // ==========================================================================
  // FEATURE 63: 12-DIGIT e-WAY BILL VALIDATION & DISTANCE DURATION
  // ==========================================================================
  describe('Feature 63: 12-Digit e-Way Bill Validation & Distance Duration', () => {
    it('TC-STAT-63-01: validates 12-digit numeric e-Way bill requirement', () => {
      expect(validateEWayBillNumber('241088492019')).toBe(true);
      expect(validateEWayBillNumber('123456789012')).toBe(true);

      // Invalid lengths and alpha characters
      expect(validateEWayBillNumber('24108849201')).toBe(false); // 11
      expect(validateEWayBillNumber('2410884920199')).toBe(false); // 13
      expect(validateEWayBillNumber('24108849201A')).toBe(false); // letter
      expect(validateEWayBillNumber('')).toBe(false);
    });

    it('TC-STAT-63-02: calculates statutory validity duration according to CGST Rule 138(10)', () => {
      // Normal cargo: 1 day per 200 km
      const corridor525 = calculateEWayBillValidity(525);
      expect(corridor525.daysValid).toBe(3); // ceil(525/200) = 3
      expect(corridor525.status).toBe('VALID');

      const short150 = calculateEWayBillValidity(150);
      expect(short150.daysValid).toBe(1); // ceil(150/200) = 1

      // Over Dimensional Cargo (ODC): 1 day per 20 km
      const odc525 = calculateEWayBillValidity(525, true);
      expect(odc525.daysValid).toBe(27); // ceil(525/20) = 27
    });
  });

  // ==========================================================================
  // FEATURE 64: SECTION 194C TDS EXEMPTION & WITHHOLDING ENGINE
  // ==========================================================================
  describe('Feature 64: Section 194C TDS Exemption & Withholding Engine', () => {
    it('TC-STAT-64-01: applies 0% TDS when transporter declares <= 10 goods carriages with valid PAN under Section 194C(6)', () => {
      const result = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 4,
        hasDeclarationSubSection6: true,
        grossPaymentINR: 75000,
        financialYearAggregateINR: 250000,
      });

      expect(result.tdsRatePct).toBe(0);
      expect(result.tdsAmountINR).toBe(0);
      expect(result.netDisbursementINR).toBe(75000);
      expect(result.exemptionApplied).toBe(true);
      expect(result.exemptionClause).toBe('Section 194C(6)');
    });

    it('TC-STAT-64-02: exempts payment under Section 194C(5) monetary threshold (single <= 30k, aggregate <= 100k)', () => {
      const result = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 15, // > 10, no 194C(6)
        hasDeclarationSubSection6: false,
        grossPaymentINR: 25000,
        financialYearAggregateINR: 50000, // total 75k <= 100k
      });

      expect(result.tdsRatePct).toBe(0);
      expect(result.tdsAmountINR).toBe(0);
      expect(result.exemptionClause).toBe('Section 194C(5)');
    });

    it('TC-STAT-64-03: withholds 1% TDS for individual and 2% for corporate transporters above threshold', () => {
      // Individual: 1%
      const indResult = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 15,
        hasDeclarationSubSection6: false,
        grossPaymentINR: 50000, // > 30k
      });
      expect(indResult.tdsRatePct).toBe(1.0);
      expect(indResult.tdsAmountINR).toBe(500);
      expect(indResult.netDisbursementINR).toBe(49500);

      // Corporate: 2%
      const corpResult = calculateSection194CTDS({
        transporterPan: 'AAACC1234K',
        transporterType: 'company',
        goodsCarriagesOwnedCount: 15,
        hasDeclarationSubSection6: false,
        grossPaymentINR: 50000,
      });
      expect(corpResult.tdsRatePct).toBe(2.0);
      expect(corpResult.tdsAmountINR).toBe(1000);
      expect(corpResult.netDisbursementINR).toBe(49000);
    });

    it('TC-STAT-64-04: penalizes missing or invalid PAN with 20% higher withholding rate under Section 206AA', () => {
      const result = calculateSection194CTDS({
        transporterPan: '', // No PAN
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 3,
        hasDeclarationSubSection6: true,
        grossPaymentINR: 60000,
      });

      expect(result.tdsRatePct).toBe(20.0);
      expect(result.tdsAmountINR).toBe(12000);
      expect(result.netDisbursementINR).toBe(48000);
      expect(result.exemptionClause).toContain('Section 206AA');
    });

    it('TC-STAT-64-05: provides TDS calculation via POST /api/v1/statutory/tds REST endpoint', async () => {
      const req = createMockRequest('http://localhost:3000/api/v1/statutory/tds', 'POST', mockClaimsAlpha, {
        transporterPan: 'BBBPK5555L',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 8,
        hasDeclarationSubSection6: true,
        grossPaymentINR: 80000,
      });

      const res = await tdsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.tdsRatePct).toBe(0);
      expect(json.data.exemptionClause).toBe('Section 194C(6)');
    });
  });

  // ==========================================================================
  // FEATURE 65: MoRTH VAHAN VEHICLE COMPLIANCE VERIFICATION & GROUNDING
  // ==========================================================================
  describe('Feature 65: MoRTH VAHAN Compliance Verification & Vehicle Grounding', () => {
    it('TC-STAT-65-01: validates MoRTH Indian registration plate format across states', () => {
      const validPlates = ['GJ05BZ8821', 'MH04AB1234', 'DL01A9999', 'RJ14GB5678', 'KA01MJ4321'];
      for (const plate of validPlates) {
        const res = validateMoRTHRegistrationPlate(plate);
        expect(res.isValid).toBe(true);
        expect(res.stateName).toBeDefined();
      }

      // Invalid plates
      expect(validateMoRTHRegistrationPlate('XX05BZ8821').isValid).toBe(false); // Invalid state
      expect(validateMoRTHRegistrationPlate('GJ05BZ').isValid).toBe(false); // Too short
      expect(validateMoRTHRegistrationPlate('GJ05BZ8821123').isValid).toBe(false); // Too long
    });

    it('TC-STAT-65-02: grounds vehicle immediately if commercial fitness certificate has expired', () => {
      const today = new Date('2026-11-09');
      const compliance = validateVAHANCompliance({
        registrationPlate: 'GJ05BZ8821',
        fitnessExpiryDate: '2026-10-01', // Expired
        nationalPermitExpiryDate: '2027-06-30',
        insuranceExpiryDate: '2027-03-31',
        pucExpiryDate: '2027-01-15',
        referenceDate: today,
      });

      expect(compliance.isDispatchAllowed).toBe(false);
      expect(compliance.groundingReason).toContain('VEHICLE_GROUNDED_EXPIRED_FITNESS');
      expect(compliance.documentBadges.fitness.status).toBe('expired');
    });

    it('TC-STAT-65-03: grounds vehicle immediately if National Permit (AITP) has expired', () => {
      const today = new Date('2026-11-09');
      const compliance = validateVAHANCompliance({
        registrationPlate: 'GJ05BZ8821',
        fitnessExpiryDate: '2027-10-01',
        nationalPermitExpiryDate: '2026-09-15', // Expired permit
        insuranceExpiryDate: '2027-03-31',
        pucExpiryDate: '2027-01-15',
        referenceDate: today,
      });

      expect(compliance.isDispatchAllowed).toBe(false);
      expect(compliance.groundingReason).toContain('VEHICLE_GROUNDED_EXPIRED_PERMIT');
      expect(compliance.documentBadges.permit.status).toBe('expired');
    });

    it('TC-STAT-65-04: passes compliance check when all certificates are valid', async () => {
      const req = createMockRequest('http://localhost:3000/api/v1/statutory/vahan', 'POST', mockClaimsAlpha, {
        registrationPlate: 'GJ05BZ8821',
        fitnessExpiryDate: '2027-10-01',
        nationalPermitExpiryDate: '2027-06-30',
        insuranceExpiryDate: '2027-03-31',
        pucExpiryDate: '2027-01-15',
      });

      const res = await vahanRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isCompliant).toBe(true);
      expect(json.data.isDispatchAllowed).toBe(true);
    });
  });

  // ==========================================================================
  // FEATURE 66: MoRTH SARATHI COMMERCIAL DL VERIFICATION
  // ==========================================================================
  describe('Feature 66: MoRTH SARATHI Commercial DL Verification', () => {
    it('TC-STAT-66-01: validates MoRTH SARATHI 16-character commercial license format', () => {
      const validDl = 'GJ0520180012345';
      const result = validateSARATHICommercialDL({
        dlNumber: validDl,
        endorsements: ['TRANS', 'HMV'],
        expiryDate: '2030-05-15',
      });

      expect(result.isValid).toBe(true);
      expect(result.isCommercialEndorsed).toBe(true);
      expect(result.isAssignmentAllowed).toBe(true);
      expect(result.stateCode).toBe('GJ');
      expect(result.issueYear).toBe(2018);
    });

    it('TC-STAT-66-02: rejects non-commercial licenses without heavy transport endorsement', () => {
      const nonCommercialDl = 'MH0420200054321';
      const result = validateSARATHICommercialDL({
        dlNumber: nonCommercialDl,
        endorsements: ['LMV-NT'], // Non-transport only
        expiryDate: '2035-01-01',
      });

      expect(result.isValid).toBe(true);
      expect(result.isCommercialEndorsed).toBe(false);
      expect(result.isAssignmentAllowed).toBe(false);
      expect(result.error).toContain('Commercial transport endorsement');
    });

    it('TC-STAT-66-03: validates driver license via POST /api/v1/statutory/sarathi', async () => {
      const req = createMockRequest('http://localhost:3000/api/v1/statutory/sarathi', 'POST', mockClaimsAlpha, {
        dlNumber: 'GJ0520180012345',
        endorsements: ['TRANS'],
        expiryDate: '2030-01-01',
      });

      const res = await sarathiRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isAssignmentAllowed).toBe(true);
    });
  });

  // ==========================================================================
  // FEATURE 67: STATUTORY DOCUMENT EXPIRY ENGINE & BADGES
  // ==========================================================================
  describe('Feature 67: Statutory Document Expiry Engine & Badges', () => {
    it('TC-STAT-67-01: computes dynamic badge status (valid > 30d, expiring_soon <= 30d, expired <= 0d)', () => {
      const refDate = new Date('2026-11-09');

      // Valid (> 30 days)
      const validBadge = computeDocumentExpiryBadge('2026-12-25', refDate);
      expect(validBadge.status).toBe('valid');
      expect(validBadge.badgeColor).toBe('green');
      expect(validBadge.alertRequired).toBe(false);

      // Expiring soon (10 days remaining)
      const expiringSoonBadge = computeDocumentExpiryBadge('2026-11-19', refDate);
      expect(expiringSoonBadge.status).toBe('expiring_soon');
      expect(expiringSoonBadge.badgeColor).toBe('amber');
      expect(expiringSoonBadge.alertRequired).toBe(true);

      // Expired (-5 days)
      const expiredBadge = computeDocumentExpiryBadge('2026-11-04', refDate);
      expect(expiredBadge.status).toBe('expired');
      expect(expiredBadge.badgeColor).toBe('red');
      expect(expiredBadge.alertRequired).toBe(true);

      // Missing
      const missingBadge = computeDocumentExpiryBadge(null, refDate);
      expect(missingBadge.status).toBe('missing');
      expect(missingBadge.badgeColor).toBe('gray');
      expect(missingBadge.alertRequired).toBe(true);
    });
  });

  // ==========================================================================
  // FEATURE 68: NETC FASTAG PLAZAS & TOLL CALCULATION ENGINE
  // ==========================================================================
  describe('Feature 68: NETC FASTag Plazas & Toll Calculation Engine', () => {
    it('TC-STAT-68-01: calculates plaza-by-plaza fees along NH-48 Western Corridor', () => {
      const toll4Axle = calculateFASTagCorridorToll(0, 525, '4_6_AXLE');
      expect(toll4Axle.plazaCount).toBe(8);
      expect(toll4Axle.totalTollINR).toBeGreaterThan(2500);
      expect(toll4Axle.plazas[0].name).toContain('Kharbao');

      const toll2Axle = calculateFASTagCorridorToll(0, 525, '2_AXLE');
      expect(toll2Axle.totalTollINR).toBeLessThan(toll4Axle.totalTollINR);
    });

    it('TC-STAT-68-02: returns FASTag toll breakdown via GET and POST /api/v1/statutory/fastag', async () => {
      const getReq = createMockRequest('http://localhost:3000/api/v1/statutory/fastag?startKm=0&endKm=250&axleType=3_AXLE', 'GET');
      const getRes = await fastagGetRoute(getReq);
      const getJson = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getJson.success).toBe(true);
      expect(getJson.data.plazaCount).toBeGreaterThan(0);

      const postReq = createMockRequest('http://localhost:3000/api/v1/statutory/fastag', 'POST', mockClaimsAlpha, {
        startKm: 0,
        endKm: 525,
        axleType: '4_6_AXLE',
      });
      const postRes = await fastagPostRoute(postReq);
      const postJson = await postRes.json();

      expect(postRes.status).toBe(200);
      expect(postJson.data.totalTollINR).toBe(tollForCorridor('4_6_AXLE'));
    });
  });
});

function tollForCorridor(axle: string): number {
  return calculateFASTagCorridorToll(0, 525, axle as any).totalTollINR;
}
