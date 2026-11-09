/**
 * Tier 5: Adversarial Probes & Penetration Tests — Phase 7: Statutory & Regulatory Compliance
 * Security, Fraud & Cross-Tenant Boundary Probes:
 * - TC-ADV-STAT-01: Cross-Tenant e-Bilti Read Isolation (403 Forbidden)
 * - TC-ADV-STAT-02: Non-Sequential Cross-Tenant LR Numbering Invariant (Zero competitor enumeration)
 * - TC-ADV-STAT-03: Cryptographic QR Checkpoint Token Tampering Defense (Constant-time HMAC rejection)
 * - TC-ADV-STAT-04: Checkpoint Verification Zero Information Disclosure (No internal tenant secrets leaked)
 * - TC-ADV-STAT-05: Transporter Section 194C Declaration Fraud & 20% Section 206AA Penalty
 * - TC-ADV-STAT-06: Expired Vehicle Grounding Dispatch Enforcement
 * - TC-ADV-STAT-07: Checkpoint Endpoint Read-Only Immutability Guard
 * - TC-ADV-STAT-08: SARATHI Commercial Endorsement Impersonation Defense
 * - TC-ADV-STAT-09: Idempotent e-Bilti Replay Under Network Retry (No sequence advancement)
 * - TC-ADV-STAT-10: MoRTH State Spoofing & Malformed Injection Defense
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { dataService } from '@/lib/data-service';
import { SessionClaims } from '@/types/database';
import {
  calculateSection194CTDS,
  validateMoRTHRegistrationPlate,
  validateSARATHICommercialDL,
  generateEBiltiVerificationToken,
  verifyEBiltiVerificationToken,
} from '@/lib/algorithms/statutory';
import { POST as createEBiltiRoute } from '@/app/api/v1/statutory/ebilti/route';
import { GET as getEBiltiByIdRoute } from '@/app/api/v1/statutory/ebilti/[id]/route';
import { GET as verifyGetRoute, POST as verifyPostRoute } from '@/app/api/v1/statutory/verify/route';

const TENANT_ALPHA_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_BETA_ID = '00000000-0000-4000-8000-000000000002';

const claimsAlpha: SessionClaims = {
  sub: 'usr-admin-alpha',
  tenant_id: TENANT_ALPHA_ID,
  role: 'fleet_admin',
  email: 'admin@alpha-logistics.in',
};

const claimsBeta: SessionClaims = {
  sub: 'usr-admin-beta',
  tenant_id: TENANT_BETA_ID,
  role: 'fleet_admin',
  email: 'admin@beta-freight.in',
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

describe('Tier 5: Adversarial Probes & Penetration Tests — Phase 7: Statutory & Regulatory Compliance', () => {
  beforeEach(() => {
    dataService.clear();
  });

  // ==========================================================================
  // TC-ADV-STAT-01: CROSS-TENANT e-BILTI READ ISOLATION
  // ==========================================================================
  it('TC-ADV-STAT-01: Tenant Beta is blocked with 403 Forbidden when attempting to read Tenant Alpha e-Bilti', async () => {
    const ebiltiAlpha = await dataService.createEBiltiConsignmentNote(claimsAlpha, {
      vehicle_plate: 'GJ05BZ8821',
      consignor_name: 'Alpha Consignor',
      consignor_address: 'Mumbai JNPT',
      consignee_name: 'Alpha Consignee',
      consignee_address: 'Ahmedabad Changodar',
      origin: 'Mumbai',
      destination: 'Ahmedabad',
      cargo_description: 'Confidential Cargo',
      packages_count: 50,
      gross_weight_kg: 20000,
      freight_amount_inr: 45000,
    });

    // Malicious attempt by Tenant Beta to access Alpha's e-Bilti
    const req = createMockRequest(
      `http://localhost:3000/api/v1/statutory/ebilti/${ebiltiAlpha.id}`,
      'GET',
      claimsBeta
    );
    const res = await getEBiltiByIdRoute(req, { params: { id: ebiltiAlpha.id } });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('Cross-tenant access denied');
  });

  // ==========================================================================
  // TC-ADV-STAT-02: NON-SEQUENTIAL CROSS-TENANT LR NUMBERING INVARIANT
  // ==========================================================================
  it('TC-ADV-STAT-02: Tenant Alpha generating 15 e-Biltis does NOT advance Tenant Beta sequence; prevents competitor volume enumeration', async () => {
    // Tenant Alpha creates 15 consignments
    for (let i = 0; i < 15; i++) {
      await dataService.createEBiltiConsignmentNote(claimsAlpha, {
        vehicle_plate: 'MH04AB1234',
        consignor_name: 'Alpha Hub',
        consignor_address: 'Mumbai',
        consignee_name: 'Alpha Drop',
        consignee_address: 'Surat',
        origin: 'Mumbai',
        destination: 'Surat',
        cargo_description: 'Parts',
        packages_count: 10,
        gross_weight_kg: 5000,
        freight_amount_inr: 15000,
        tenant_prefix: 'ALPHA',
      });
    }

    // Tenant Beta creates its very first consignment
    const ebiltiBeta = await dataService.createEBiltiConsignmentNote(claimsBeta, {
      vehicle_plate: 'GJ01CD5678',
      consignor_name: 'Beta Hub',
      consignor_address: 'Vadodara',
      consignee_name: 'Beta Drop',
      consignee_address: 'Rajkot',
      origin: 'Vadodara',
      destination: 'Rajkot',
      cargo_description: 'Chemicals',
      packages_count: 20,
      gross_weight_kg: 8000,
      freight_amount_inr: 25000,
      tenant_prefix: 'BETA',
    });

    // Invariant: Tenant Beta LR number starts strictly at LR-0001
    expect(ebiltiBeta.lr_number).toMatch(/^BETA\/\d{4}-\d{2}\/LR-0001$/);
    expect(ebiltiBeta.lr_number).not.toContain('0016'); // Must NOT be 16
  });

  // ==========================================================================
  // TC-ADV-STAT-03: CRYPTOGRAPHIC QR CHECKPOINT TOKEN TAMPERING DEFENSE
  // ==========================================================================
  it('TC-ADV-STAT-03: tampered payload bytes or forged cryptographic token are rejected by constant-time verification', async () => {
    const validPayload = {
      lrNumber: 'ALPHA/2026-27/LR-0001',
      tenantId: TENANT_ALPHA_ID,
      vehiclePlate: 'GJ05BZ8821',
      ewayBillNumber: '241088492019',
      grossWeightKg: 15000,
      issuedAt: new Date().toISOString(),
    };

    const { verificationToken } = generateEBiltiVerificationToken(validPayload);
    const [payloadB64, signature] = verificationToken.split('.');

    // Tamper 1: Alter payload bytes (change gross weight to 45,000 kg)
    const tamperedPayloadStr = JSON.stringify({
      ...validPayload,
      grossWeightKg: 45000,
    });
    const tamperedB64 = Buffer.from(tamperedPayloadStr).toString('base64url');
    const tamperedToken = `${tamperedB64}.${signature}`;

    const checkTampered = verifyEBiltiVerificationToken(tamperedToken);
    expect(checkTampered.isValid).toBe(false);
    expect(checkTampered.error).toContain('Invalid cryptographic verification signature');

    // Tamper 2: Forged signature
    const forgedToken = `${payloadB64}.forged_fake_signature_abc123`;
    const checkForged = verifyEBiltiVerificationToken(forgedToken);
    expect(checkForged.isValid).toBe(false);

    // REST Endpoint probe
    const req = createMockRequest(`http://localhost:3000/api/v1/statutory/verify?token=${encodeURIComponent(tamperedToken)}`, 'GET');
    const res = await verifyGetRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.verified).toBe(false);
  });

  // ==========================================================================
  // TC-ADV-STAT-04: CHECKPOINT VERIFICATION ZERO INFORMATION DISCLOSURE
  // ==========================================================================
  it('TC-ADV-STAT-04: Checkpoint verification endpoint reveals zero tenant internal secrets or database IDs', async () => {
    const ebilti = await dataService.createEBiltiConsignmentNote(claimsAlpha, {
      vehicle_plate: 'GJ05BZ8821',
      consignor_name: 'Tata Steel Processing Ltd',
      consignor_address: 'Tarapur MIDC',
      consignee_name: 'Ahmedabad Fabricators',
      consignee_address: 'Vatva GIDC',
      origin: 'Tarapur',
      destination: 'Ahmedabad',
      cargo_description: 'Industrial Steel Coils',
      packages_count: 12,
      gross_weight_kg: 32000,
      freight_amount_inr: 68000,
      eway_bill_number: '241088492019',
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/statutory/verify?token=${encodeURIComponent(ebilti.verification_token)}`,
      'GET'
    );
    const res = await verifyGetRoute(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);
    // Public details present
    expect(json.consignment.lrNumber).toBe(ebilti.lr_number);
    expect(json.consignment.vehiclePlate).toBe('GJ05BZ8821');

    // Sensitive internal secrets MUST NOT be exposed
    expect(json.consignment.tenant_id).toBeUndefined();
    expect(json.consignment.tenantId).toBeUndefined();
    expect(json.consignment.created_by).toBeUndefined();
    expect(json.consignment.id).toBeUndefined();
    expect(json.consignment.freight_amount_inr).toBeUndefined(); // Commercial financial terms hidden from checkpoint
  });

  // ==========================================================================
  // TC-ADV-STAT-05: TRANSPORTER SECTION 194C DECLARATION FRAUD & PENALTY
  // ==========================================================================
  it('TC-ADV-STAT-05: fraudulent transporter claiming 0% TDS without PAN is immediately penalized with 20% Section 206AA rate', () => {
    // Attempted fraud: claiming 194C(6) declaration with <= 10 carriages but providing no PAN
    const fraudulentInput = {
      transporterPan: '', // Blank PAN
      transporterType: 'individual' as const,
      goodsCarriagesOwnedCount: 4,
      hasDeclarationSubSection6: true,
      grossPaymentINR: 120000,
    };

    const res = calculateSection194CTDS(fraudulentInput);

    expect(res.tdsRatePct).toBe(20.0);
    expect(res.tdsAmountINR).toBe(24000); // 20% of 120,000
    expect(res.netDisbursementINR).toBe(96000);
    expect(res.exemptionApplied).toBe(false);
    expect(res.isDeclarationValid).toBe(false);
    expect(res.exemptionClause).toContain('Section 206AA');
  });

  // ==========================================================================
  // TC-ADV-STAT-06: EXPIRED VEHICLE GROUNDING TRIP DISPATCH ENFORCEMENT
  // ==========================================================================
  it('TC-ADV-STAT-06: blocks trip dispatch when vehicle fitness certificate is expired (Vehicle Grounded)', async () => {
    const expiredDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(); // 5 days ago

    // Register vehicle with expired fitness certificate in fleet repository
    await dataService.createDocument(claimsAlpha, {
      vehicle_number: 'GJ05BZ8821',
      doc_type: 'fitness',
      expiry_date: expiredDate,
    });

    // Attempting to dispatch a trip with this vehicle must throw grounding error
    await expect(
      dataService.createTrip(claimsAlpha, {
        vehicle_plate: 'GJ05BZ8821',
        gross_freight: 45000,
      })
    ).rejects.toThrow('VEHICLE_GROUNDED_FITNESS');
  });

  // ==========================================================================
  // TC-ADV-STAT-07: CHECKPOINT ENDPOINT READ-ONLY IMMUTABILITY GUARD
  // ==========================================================================
  it('TC-ADV-STAT-07: Checkpoint verify POST endpoint is strictly read-only and ignores mutation attempts', async () => {
    const ebilti = await dataService.createEBiltiConsignmentNote(claimsAlpha, {
      vehicle_plate: 'GJ05BZ8821',
      consignor_name: 'Sender',
      consignor_address: 'Address',
      consignee_name: 'Receiver',
      consignee_address: 'Address',
      origin: 'Mumbai',
      destination: 'Surat',
      cargo_description: 'Goods',
      packages_count: 10,
      gross_weight_kg: 5000,
      freight_amount_inr: 20000,
    });

    // Malicious caller sends mutation payload to checkpoint endpoint
    const maliciousBody = {
      hash: ebilti.verification_hash,
      status: 'CANCELLED', // Attempting to cancel consignment
      gross_weight_kg: 99999,
    };

    const req = createMockRequest('http://localhost:3000/api/v1/statutory/verify', 'POST', undefined, maliciousBody);
    const res = await verifyPostRoute(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);

    // Verify stored consignment status was NOT mutated
    const fetched = await dataService.getEBiltiById(claimsAlpha, ebilti.id);
    expect(fetched?.status).toBe('ISSUED'); // Unchanged
    expect(fetched?.gross_weight_kg).toBe(5000); // Unchanged
  });

  // ==========================================================================
  // TC-ADV-STAT-08: SARATHI COMMERCIAL ENDORSEMENT IMPERSONATION DEFENSE
  // ==========================================================================
  it('TC-ADV-STAT-08: driver presenting non-commercial license is rejected from commercial goods transport', () => {
    const nonCommercialDl = 'GJ0520210098765';
    const result = validateSARATHICommercialDL({
      dlNumber: nonCommercialDl,
      endorsements: ['MCWG', 'LMV-NT'], // Motorcycle and private car only
    });

    expect(result.isValid).toBe(true);
    expect(result.isCommercialEndorsed).toBe(false);
    expect(result.isAssignmentAllowed).toBe(false);
    expect(result.error).toContain('Commercial transport endorsement');
  });

  // ==========================================================================
  // TC-ADV-STAT-09: IDEMPOTENT e-BILTI REPLAY UNDER NETWORK RETRY
  // ==========================================================================
  it('TC-ADV-STAT-09: network retry with identical Idempotency-Key replays e-Bilti without generating duplicate LR numbers', async () => {
    const idempotencyKey = 'retry-ebilti-key-4401';
    const payload = {
      vehicle_plate: 'GJ05BZ8821',
      consignor_name: 'Western Dispatch Ltd',
      consignor_address: 'Mumbai JNPT',
      consignee_name: 'Gujarat Hub Ltd',
      consignee_address: 'Ahmedabad',
      origin: 'Mumbai',
      destination: 'Ahmedabad',
      cargo_description: 'Industrial Machinery',
      packages_count: 25,
      gross_weight_kg: 18000,
      freight_amount_inr: 42000,
      tenant_prefix: 'ALPHA',
    };

    // First call
    const req1 = createMockRequest(
      'http://localhost:3000/api/v1/statutory/ebilti',
      'POST',
      claimsAlpha,
      payload,
      { 'idempotency-key': idempotencyKey }
    );
    const res1 = await createEBiltiRoute(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(201);
    const firstLr = json1.ebilti.lr_number;

    // Simulated network retry with identical idempotency key
    const req2 = createMockRequest(
      'http://localhost:3000/api/v1/statutory/ebilti',
      'POST',
      claimsAlpha,
      payload,
      { 'idempotency-key': idempotencyKey }
    );
    const res2 = await createEBiltiRoute(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(201);
    expect(json2.ebilti.lr_number).toBe(firstLr); // Exactly identical LR number replayed
    expect(json2.ebilti.id).toBe(json1.ebilti.id); // Identical record
  });

  // ==========================================================================
  // TC-ADV-STAT-10: MoRTH STATE SPOOFING & MALFORMED INJECTION DEFENSE
  // ==========================================================================
  it('TC-ADV-STAT-10: rejects non-existent state codes and SQL injection payloads in vehicle registration plates', () => {
    const maliciousPlates = [
      'ZZ05BZ8821', // Non-existent state
      '99AA1234', // Numeric state
      "GJ05' OR '1'='1", // SQL injection probe
      '<script>alert(1)</script>', // XSS probe
      'GJ-05-BZ-8821-EXTRA-CHARS', // Overflow probe
    ];

    for (const plate of maliciousPlates) {
      const res = validateMoRTHRegistrationPlate(plate);
      expect(res.isValid).toBe(false);
    }
  });
});
