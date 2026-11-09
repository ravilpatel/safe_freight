/**
 * SafeFreight OS — Tier 2 Boundary Value Analysis & Edge Cases: Phase 5 Shipper Portal & National Gateway
 *
 * Covers boundary conditions, edge cases, zero-data handling, and adversarial penetration defenses:
 * - Boundary Group 1: Extreme Distance & Payload Vectors (0 km, 10,000 km, 0 kg, 100 tonnes, NaN)
 * - Boundary Group 2: Public Endpoint Rate Limit Burst Defenses (60 req/min boundary, 61st burst rejection, IP isolation)
 * - Boundary Group 3: Advance Scheduling Calendar Boundaries (Day 0, Day 30, yesterday rejected, Day 31 rejected)
 * - Boundary Group 4: Statutory GSTIN Format & Checksum Boundaries (14 chars underflow, 16 chars overflow, invalid states)
 * - Boundary Group 5: Statutory 12-Digit e-Way Bill Format Boundaries (11 underflow, 13 overflow, alphabetic, validity formula)
 * - Boundary Group 6: Acceptance Probability Bidding Slider Extremes (₹0 bonus, negative bonus, +₹100,000 bonus, zero base)
 * - Boundary Group 7: Strict Cross-Tenant Multi-Tenancy Isolation (load visibility, cancellation, invoice isolation)
 * - Boundary Group 8: Shipper Load Cancellation State Machine Boundaries (in_transit/delivered rejection, idempotency, 404)
 * - Boundary Group 9: Official GST Invoice SAC 9965 Computation Boundaries (intra vs inter-state, high-value, currency format)
 * - Boundary Group 10: Shipper Route Guard & Cryptographic JWT Boundaries (forged signature, expired token, driver 403, missing 401)
 *
 * Source of Truth: PRD v4.0.0 §3, §4, §6 (Phase 5), §8, §10, PROJECT.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as quotesPOST } from '@/app/api/v1/quotes/route';
import { POST as loadsPOST, GET as loadsGET } from '@/app/api/v1/loads/route';
import { GET as loadByIdGET, DELETE as loadByIdDELETE, PATCH as loadByIdPATCH } from '@/app/api/v1/loads/[id]/route';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';
import { TEST_ORGS, TEST_PROFILES } from '../harness/fixtures';
import {
  calculateShipperQuote,
  calculateAcceptanceProbability,
  validateGSTIN,
  validateEWayBillNumber,
  formatINR,
  generateGSTInvoice,
  calculateEWayBillValidity,
} from '../harness/contracts';
import {
  calculateDynamicFreightQuote,
} from '@/lib/algorithms/quoteEstimator';
import { dataService, validateScheduledDate } from '@/lib/data-service';
import { tenantStore, createSignedJwtPayload } from '@/lib/auth';
import { checkRateLimit, resetRateLimiter } from '@/lib/rateLimit';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 2: Boundary Value Analysis & Edge Cases — Phase 5 Shipper Portal & National Gateway', () => {
  let db: MultiTenantDatabaseSimulator;

  // Tenant Alpha: Adani Logistics Forwarders
  const tenantAlphaClaims: SessionClaims = {
    sub: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
    email: TEST_PROFILES.SHIPPER_ADANI_EXEC.email,
    tenant_id: TEST_ORGS.SHIPPER_ADANI.id,
    role: 'shipper',
  };

  // Tenant Beta: Ultratech Cement Hub
  const tenantBetaId = '00000000-0000-4000-8000-000000000003';
  const tenantBetaClaims: SessionClaims = {
    sub: 'beta-shipper-uuid-001',
    email: 'dispatch@ultratech-cement.in',
    tenant_id: tenantBetaId,
    role: 'shipper',
  };

  // Fleet Carrier Admin: Western India Fleet Logistics
  const fleetCarrierClaims: SessionClaims = {
    sub: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
    email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
    tenant_id: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
  };

  // Driver: Ramesh Patel
  const driverClaims: SessionClaims = {
    sub: TEST_PROFILES.DRIVER_RAMESH.id,
    email: TEST_PROFILES.DRIVER_RAMESH.email,
    tenant_id: TEST_ORGS.FLEET_WIFL.id,
    role: 'driver',
  };

  const tokenAlpha = createSignedJwtPayload(tenantAlphaClaims);
  const tokenBeta = createSignedJwtPayload(tenantBetaClaims);
  const tokenDriver = createSignedJwtPayload(driverClaims);

  beforeEach(() => {
    db = new MultiTenantDatabaseSimulator();
    dataService.clear();
    tenantStore.clear();
    globalIdempotencyStore.clear();
    resetRateLimiter();

    // Register Tenant Alpha (Adani)
    tenantStore.saveOrganization({
      id: TEST_ORGS.SHIPPER_ADANI.id,
      name: TEST_ORGS.SHIPPER_ADANI.name,
      type: 'shipper',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tenantStore.saveProfile({
      id: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
      tenant_id: TEST_ORGS.SHIPPER_ADANI.id,
      role: 'shipper',
      full_name: TEST_PROFILES.SHIPPER_ADANI_EXEC.name,
      phone: TEST_PROFILES.SHIPPER_ADANI_EXEC.phone,
      language_preference: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Register Tenant Beta (Ultratech)
    tenantStore.saveOrganization({
      id: tenantBetaId,
      name: 'Ultratech Cement Distribution Hub',
      type: 'shipper',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tenantStore.saveProfile({
      id: 'beta-shipper-uuid-001',
      tenant_id: tenantBetaId,
      role: 'shipper',
      full_name: 'Gopal Sharma',
      phone: '+919825000000',
      language_preference: 'hi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 1: EXTREME DISTANCE & PAYLOAD VECTORS
  // =========================================================================
  describe('Boundary Group 1: Extreme Distance & Payload Vectors', () => {
    it('BVA-SH-01: clamps 0 km or negative distance to safe minimum corridor leg without division-by-zero', () => {
      const quoteZero = calculateShipperQuote('shared', 0, 2000);
      expect(quoteZero.distanceKm).toBe(1); // Clamped to min 1 km
      expect(quoteZero.subTotalINR).toBeGreaterThan(0);
      expect(isFinite(quoteZero.minPricingINR)).toBe(true);

      const quoteNeg = calculateShipperQuote('shared', -50, 2000);
      expect(quoteNeg.distanceKm).toBe(1);
      expect(quoteNeg.minPricingINR).toBeGreaterThan(0);
    });

    it('BVA-SH-02: computes extreme trans-continental distance (10,000 km) cleanly without integer overflow', () => {
      const quoteExtreme = calculateShipperQuote('private', 10000, 15000, 40);
      expect(quoteExtreme.distanceKm).toBe(10000);
      expect(quoteExtreme.distanceFareINR).toBe(10000 * 42); // ₹4,20,000
      expect(quoteExtreme.gstINR).toBe(Math.round(quoteExtreme.subTotalINR * 0.05));
      expect(isFinite(quoteExtreme.totalQuoteINR || quoteExtreme.minPricingINR)).toBe(true);
    });

    it('BVA-SH-03: clamps payload weight underflow (0 kg / negative) to safe baseline threshold', () => {
      const quoteZeroWeight = calculateShipperQuote('shared', 300, 0);
      expect(quoteZeroWeight.weightKg).toBe(50); // Clamped to min 50 kg
      expect(quoteZeroWeight.weightFareINR).toBeGreaterThanOrEqual(0);

      const quoteNegWeight = calculateShipperQuote('shared', 300, -200);
      expect(quoteNegWeight.weightKg).toBe(50);
      expect(quoteNegWeight.minPricingINR).toBeGreaterThan(0);
    });

    it('BVA-SH-04: handles extreme payload overflow (100,000 kg / 100 MT) scaling capacity tons correctly', () => {
      const quoteOverload = calculateShipperQuote('private', 500, 100000, 80);
      // Capacity tons = max(10, ceil(100000 / 1000) + 2) = 102 tons
      expect(quoteOverload.weightFareINR).toBe(102 * 400); // ₹40,800
      expect(quoteOverload.subTotalINR).toBeGreaterThan(50000);
      expect(quoteOverload.minPricingINR).toBeGreaterThan(50000);
    });

    it('BVA-SH-05: rejects non-numeric or NaN distance/weight inputs with HTTP 400 via POST /api/v1/quotes', async () => {
      const reqNaN = new NextRequest('http://localhost:3000/api/v1/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ distanceKm: NaN, weightKg: 5000 }),
      });

      const resNaN = await quotesPOST(reqNaN);
      expect(resNaN.status).toBe(400);
      const json = await resNaN.json();
      expect(json.error).toContain('400 Bad Request');
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 2: PUBLIC ENDPOINT RATE LIMIT BURST DEFENSES
  // =========================================================================
  describe('Boundary Group 2: Public Endpoint Rate Limit Burst Defenses', () => {
    it('BVA-SH-06: allows exactly 60 requests in a 60-second window from a single IP', () => {
      const burstIp = '203.0.113.88';
      for (let i = 1; i <= 60; i++) {
        const check = checkRateLimit(burstIp, 60, 60000);
        expect(check.success).toBe(true);
        expect(check.remaining).toBe(60 - i);
      }
    });

    it('BVA-SH-07: blocks 61st burst request from same IP with HTTP 429 and Retry-After header', () => {
      const burstIp = '203.0.113.89';
      for (let i = 0; i < 60; i++) {
        checkRateLimit(burstIp, 60, 60000);
      }
      const burstCheck = checkRateLimit(burstIp, 60, 60000);
      expect(burstCheck.success).toBe(false);
      expect(burstCheck.remaining).toBe(0);
      expect(burstCheck.retryAfter).toBeGreaterThan(0);
    });

    it('BVA-SH-08: ensures rate limit exhaustion on IP Alpha does not impact independent IP Beta', () => {
      const ipAlpha = '10.0.0.1';
      const ipBeta = '10.0.0.2';

      // Exhaust IP Alpha
      for (let i = 0; i < 60; i++) {
        checkRateLimit(ipAlpha, 60, 60000);
      }
      expect(checkRateLimit(ipAlpha, 60, 60000).success).toBe(false);

      // IP Beta has full allowance intact
      const betaCheck = checkRateLimit(ipBeta, 60, 60000);
      expect(betaCheck.success).toBe(true);
      expect(betaCheck.remaining).toBe(59);
    });

    it('BVA-SH-09: resets rate limit store when window expires or resetRateLimiter is invoked', () => {
      const ip = '172.16.0.5';
      for (let i = 0; i < 60; i++) {
        checkRateLimit(ip, 60, 60000);
      }
      expect(checkRateLimit(ip, 60, 60000).success).toBe(false);

      // Reset
      resetRateLimiter();
      const afterReset = checkRateLimit(ip, 60, 60000);
      expect(afterReset.success).toBe(true);
      expect(afterReset.remaining).toBe(59);
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 3: ADVANCE SCHEDULING CALENDAR BOUNDARIES
  // =========================================================================
  describe('Boundary Group 3: Advance Scheduling Calendar Boundaries', () => {
    it('BVA-SH-10: accepts Day 0 (today) as valid lower date boundary', () => {
      const today = new Date().toISOString().split('T')[0];
      const check = validateScheduledDate(today);
      expect(check.valid).toBe(true);
      expect(check.error).toBeUndefined();
    });

    it('BVA-SH-11: accepts Day 30 as valid upper date boundary', () => {
      const day30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const check = validateScheduledDate(day30);
      expect(check.valid).toBe(true);
      expect(check.error).toBeUndefined();
    });

    it('BVA-SH-12: rejects Day -1 (yesterday) with 400 Bad Request error', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const check = validateScheduledDate(yesterday);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('cannot be in the past');
    });

    it('BVA-SH-13: rejects Day 31 (exceeding 30-day window) with 400 Bad Request error', () => {
      const day31 = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const check = validateScheduledDate(day31);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('30 days');
    });

    it('BVA-SH-14: handles null or undefined scheduled date as immediate dispatch (valid: true)', () => {
      expect(validateScheduledDate(null).valid).toBe(true);
      expect(validateScheduledDate(undefined).valid).toBe(true);
      expect(validateScheduledDate('').valid).toBe(true);
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 4: STATUTORY GSTIN FORMAT & CHECKSUM BOUNDARIES
  // =========================================================================
  describe('Boundary Group 4: Statutory GSTIN Format & Checksum Boundaries', () => {
    it('BVA-SH-15: accepts valid 15-character alphanumeric GSTIN formats', () => {
      expect(validateGSTIN('24AAACA9876G1ZA')).toBe(true); // Gujarat Adani
      expect(validateGSTIN('27AAACW1234F1Z1')).toBe(true); // Maharashtra
      expect(validateGSTIN('07AAAAA0000A1Z5')).toBe(true); // Delhi (07)
    });

    it('BVA-SH-16: rejects 14-character underflow GSTIN', () => {
      expect(validateGSTIN('24AAACA9876G1Z')).toBe(false);
    });

    it('BVA-SH-17: rejects 16-character overflow GSTIN', () => {
      expect(validateGSTIN('24AAACA9876G1ZAA')).toBe(false);
    });

    it('BVA-SH-18: rejects GSTIN containing special symbols or lowercase characters', () => {
      expect(validateGSTIN('24AAACA9876G1Z@')).toBe(false);
      expect(validateGSTIN('24-AAAC-A9876-G1ZA')).toBe(false);
      expect(validateGSTIN('24aaaca9876g1za')).toBe(false);
      expect(validateGSTIN('   ')).toBe(false);
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 5: STATUTORY 12-DIGIT E-WAY BILL FORMAT BOUNDARIES
  // =========================================================================
  describe('Boundary Group 5: Statutory 12-Digit e-Way Bill Format Boundaries', () => {
    it('BVA-SH-19: accepts exactly 12-digit numeric e-Way bill identifier', () => {
      expect(validateEWayBillNumber('241098234512')).toBe(true);
      expect(validateEWayBillNumber('100000000001')).toBe(true);
    });

    it('BVA-SH-20: rejects 11-digit underflow e-Way bill identifier', () => {
      expect(validateEWayBillNumber('24109823451')).toBe(false);
    });

    it('BVA-SH-21: rejects 13-digit overflow e-Way bill identifier', () => {
      expect(validateEWayBillNumber('2410982345123')).toBe(false);
    });

    it('BVA-SH-22: rejects 12-character alphanumeric or special character e-Way bill identifier', () => {
      expect(validateEWayBillNumber('241098ABC512')).toBe(false);
      expect(validateEWayBillNumber('2410-9823-45')).toBe(false);
      expect(validateEWayBillNumber('24109823451 ')).toBe(false);
    });

    it('BVA-SH-23: evaluates CGST Rule 138(10) distance-based validity boundaries', () => {
      expect(calculateEWayBillValidity(1).daysValid).toBe(1);
      expect(calculateEWayBillValidity(200).daysValid).toBe(1);
      expect(calculateEWayBillValidity(201).daysValid).toBe(2);
      expect(calculateEWayBillValidity(400).daysValid).toBe(2);
      expect(calculateEWayBillValidity(401).daysValid).toBe(3);
      expect(calculateEWayBillValidity(525).daysValid).toBe(3); // Mumbai-Ahmedabad leg
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 6: DYNAMIC BIDDING & PROBABILITY SLIDER EXTREMES
  // =========================================================================
  describe('Boundary Group 6: Dynamic Bidding & Probability Slider Extremes', () => {
    const minPricing = 20000;

    it('BVA-SH-24: exact ₹0 bid bonus yields 48% baseline probability', () => {
      const res = calculateAcceptanceProbability(0, minPricing);
      expect(res.probabilityPercent).toBe(48);
      expect(res.bonusRatio).toBe(0);
      expect(res.dispatchSpeedBand).toBe('2 – 4 hours');
    });

    it('BVA-SH-25: negative bid bonus (-₹5,000) clamps cleanly to 48% baseline without crash', () => {
      const res = calculateAcceptanceProbability(-5000, minPricing);
      expect(res.probabilityPercent).toBe(48);
      expect(res.offeredBidINR).toBe(minPricing);
    });

    it('BVA-SH-26: extreme bid bonus (+₹100,000) ceiling clamps at 99% probability', () => {
      const res = calculateAcceptanceProbability(100000, minPricing);
      expect(res.probabilityPercent).toBe(99);
      expect(res.probabilityPercent).toBeLessThan(100);
      expect(res.dispatchSpeedBand).toBe('Instant (< 10 mins)');
    });

    it('BVA-SH-27: zero minPricingINR handled safely with fallback to 1 without division by zero', () => {
      const res = calculateAcceptanceProbability(500, 0);
      expect(isFinite(res.probabilityPercent)).toBe(true);
      expect(res.probabilityPercent).toBeGreaterThanOrEqual(48);
      expect(res.probabilityPercent).toBeLessThanOrEqual(99);
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 7: STRICT CROSS-TENANT MULTI-TENANCY ISOLATION
  // =========================================================================
  describe('Boundary Group 7: Strict Cross-Tenant Multi-Tenancy Isolation', () => {
    let alphaLoadId: string;
    let betaLoadId: string;

    beforeEach(async () => {
      const lAlpha = await dataService.createLoad(tenantAlphaClaims, {
        origin_name: 'Adani JNPT Hub',
        destination_name: 'Surat Adani Depot',
        weight_kg: 8000,
        status: 'open',
      });
      alphaLoadId = lAlpha.id;

      const lBeta = await dataService.createLoad(tenantBetaClaims, {
        origin_name: 'Ultratech Vapi Plant',
        destination_name: 'Ultratech Ahmedabad',
        weight_kg: 24000,
        status: 'open',
      });
      betaLoadId = lBeta.id;
    });

    it('BVA-SH-28: Tenant Alpha cannot list or enumerate Tenant Beta loads via GET /api/v1/loads', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenAlpha}` },
      });

      const res = await loadsGET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.every((l: any) => l.tenant_id === TEST_ORGS.SHIPPER_ADANI.id)).toBe(true);
      expect(json.data.some((l: any) => l.id === betaLoadId)).toBe(false);
    });

    it('BVA-SH-29: Tenant Alpha cannot fetch Tenant Beta single load via GET /api/v1/loads/[id] (HTTP 404)', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${betaLoadId}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenAlpha}` },
      });

      const res = await loadByIdGET(req, { params: { id: betaLoadId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('404 Not Found');
    });

    it('BVA-SH-30: Tenant Alpha cannot cancel Tenant Beta load via DELETE /api/v1/loads/[id] (HTTP 404)', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${betaLoadId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokenAlpha}` },
        body: JSON.stringify({ reason: 'Malicious cancellation attempt' }),
      });

      const res = await loadByIdDELETE(req, { params: { id: betaLoadId } });
      expect(res.status).toBe(404);

      // Verify Beta load remains uncancelled
      const betaLoad = dataService.getLoadById(tenantBetaClaims, betaLoadId);
      expect(betaLoad?.status).toBe('open');
    });

    it('BVA-SH-31: Tenant Alpha cannot patch or mutate Tenant Beta load via PATCH /api/v1/loads/[id] (HTTP 404)', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${betaLoadId}`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlpha}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const res = await loadByIdPATCH(req, { params: { id: betaLoadId } });
      expect(res.status).toBe(404);
    });

    it('BVA-SH-32: Tenant Alpha cannot generate GST tax invoice for Tenant Beta load', () => {
      expect(() => {
        dataService.generateInvoiceForLoad(tenantAlphaClaims, betaLoadId);
      }).toThrow(/404 Not Found/);
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 8: SHIPPER LOAD CANCELLATION STATE MACHINE BOUNDARIES
  // =========================================================================
  describe('Boundary Group 8: Shipper Load Cancellation State Machine Boundaries', () => {
    it('BVA-SH-33: rejects cancellation of load with status "in_transit" with HTTP 400', async () => {
      const load = await dataService.createLoad(tenantAlphaClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Ahmedabad Changodar',
        weight_kg: 10000,
        status: 'in_transit',
      });

      await expect(
        dataService.cancelLoad(tenantAlphaClaims, load.id, 'Attempt while moving')
      ).rejects.toThrow(/400 Bad Request/);

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokenAlpha}` },
      });
      const res = await loadByIdDELETE(req, { params: { id: load.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('cannot be cancelled');
    });

    it('BVA-SH-34: rejects cancellation of load with status "delivered" with HTTP 400', async () => {
      const load = await dataService.createLoad(tenantAlphaClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Surat',
        weight_kg: 6000,
        status: 'delivered',
      });

      await expect(
        dataService.cancelLoad(tenantAlphaClaims, load.id, 'Post-delivery cancel attempt')
      ).rejects.toThrow(/400 Bad Request/);
    });

    it('BVA-SH-35: re-cancellation of already cancelled load is idempotent and safe', async () => {
      const load = await dataService.createLoad(tenantAlphaClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Vapi',
        weight_kg: 5000,
        status: 'open',
      });

      const firstCancel = await dataService.cancelLoad(tenantAlphaClaims, load.id);
      expect(firstCancel.success).toBe(true);

      const secondCancel = await dataService.cancelLoad(tenantAlphaClaims, load.id);
      expect(secondCancel.success).toBe(true);
      expect(secondCancel.message).toContain('already cancelled');
    });

    it('BVA-SH-36: cancellation of non-existent UUID returns HTTP 404', async () => {
      const fakeId = '00000000-0000-4000-8000-000000009999';
      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${fakeId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokenAlpha}` },
      });

      const res = await loadByIdDELETE(req, { params: { id: fakeId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('404 Not Found');
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 9: OFFICIAL GST INVOICE SAC 9965 COMPUTATION BOUNDARIES
  // =========================================================================
  describe('Boundary Group 9: Official GST Invoice SAC 9965 Computation Boundaries', () => {
    it('BVA-SH-37: strictly computes 0% IGST and 2.5% CGST + 2.5% SGST on intra-state shipments (MH to MH)', () => {
      const invoice = generateGSTInvoice({
        consignorGstin: '27AAACW1234F1Z1', // MH
        consigneeGstin: '27AAACW9999F1Z9', // MH
        pricingInr: 52500,
      });

      expect(invoice.isInterState).toBe(false);
      expect(invoice.igstAmountINR).toBe(0);
      expect(invoice.cgstRatePct).toBe(2.5);
      expect(invoice.sgstRatePct).toBe(2.5);
      expect(invoice.cgstAmountINR).toBeGreaterThan(0);
      expect(invoice.cgstAmountINR).toBe(invoice.sgstAmountINR);
      expect(invoice.totalTaxINR).toBe(invoice.cgstAmountINR + invoice.sgstAmountINR);
    });

    it('BVA-SH-38: strictly computes 5.0% IGST and 0% CGST/SGST on inter-state shipments (MH to GJ)', () => {
      const invoice = generateGSTInvoice({
        consignorGstin: '27AAACW1234F1Z1', // MH
        consigneeGstin: '24AAACA9876G1ZA', // GJ
        pricingInr: 52500,
      });

      expect(invoice.isInterState).toBe(true);
      expect(invoice.cgstAmountINR).toBe(0);
      expect(invoice.sgstAmountINR).toBe(0);
      expect(invoice.igstRatePct).toBe(5.0);
      expect(invoice.igstAmountINR).toBe(invoice.totalTaxINR);
    });

    it('BVA-SH-39: high-value freight calculation (₹10,00,000) calculates exact rupee amounts without floating point roundoff errors', () => {
      const invoice = generateGSTInvoice({
        pricingInr: 1000000,
        distanceKm: 525,
      });

      expect(Number.isInteger(invoice.taxableFreightINR)).toBe(true);
      expect(Number.isInteger(invoice.totalTaxINR)).toBe(true);
      expect(Number.isInteger(invoice.grandTotalINR)).toBe(true);
      expect(invoice.formattedGrandTotal).toContain('₹');
    });

    it('BVA-SH-40: formats negative or zero freight pricing gracefully with formatINR', () => {
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(NaN)).toBe('₹0.00');
      expect(formatINR(-500)).toBe('-₹500.00');
    });
  });

  // =========================================================================
  // BOUNDARY GROUP 10: SHIPPER ROUTE GUARD & CRYPTOGRAPHIC JWT BOUNDARIES
  // =========================================================================
  describe('Boundary Group 10: Shipper Route Guard & Cryptographic JWT Boundaries', () => {
    it('BVA-SH-41: rejects forged or tampered JWT signature with HTTP 401', async () => {
      const tamperedToken = tokenAlpha.slice(0, -6) + 'XXXXXX';
      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'GET',
        headers: { authorization: `Bearer ${tamperedToken}` },
      });

      const res = await loadsGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('401 Unauthorized');
    });

    it('BVA-SH-42: rejects expired JWT token with HTTP 401', async () => {
      const expiredToken = createSignedJwtPayload(tenantAlphaClaims, -3600); // 1 hour in past

      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'GET',
        headers: { authorization: `Bearer ${expiredToken}` },
      });

      const res = await loadsGET(req);
      expect(res.status).toBe(401);
    });

    it('BVA-SH-43: rejects driver role attempting to cancel shipper load with HTTP 403 Forbidden', async () => {
      const load = await dataService.createLoad(tenantAlphaClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Surat',
        weight_kg: 5000,
        status: 'open',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${tokenDriver}` },
      });

      const res = await loadByIdDELETE(req, { params: { id: load.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('403 Forbidden');
    });

    it('BVA-SH-44: rejects request with missing or malformed authorization header with HTTP 401', async () => {
      const reqMissing = new NextRequest('http://localhost:3000/api/v1/loads', { method: 'GET' });
      const resMissing = await loadsGET(reqMissing);
      expect(resMissing.status).toBe(401);

      const reqMalformed = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'GET',
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });
      const resMalformed = await loadsGET(reqMalformed);
      expect(resMalformed.status).toBe(401);
    });
  });
});
