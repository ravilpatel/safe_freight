/**
 * SafeFreight OS — Tier 5 Adversarial Hardening Suite (Phase 2)
 * Algorithmic Boundary Fuzzing, API Idempotency Replay & Cross-Tenant Isolation
 * Reference: PRD v4.0.0 §7, §8, §10 & Challenger Phase 2 Directives
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { calculateDeadMileageSavings } from '@/lib/algorithms/deadMileage';
import { calculate3WayRoutes } from '@/lib/algorithms/routeOptimizer';
import { calculateShipperQuote } from '@/lib/algorithms/shipperPricing';
import {
  calculateAcceptanceProbability,
  calculateBidProbability,
} from '@/lib/algorithms/acceptanceProbability';
import { calculateTripKhata } from '@/lib/algorithms/tripKhata';
import { classifyAIS140GForce } from '@/lib/algorithms/ais140Crash';
import { createSignedJwtPayload } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { POST as loadsPOST, GET as loadsGET } from '@/app/api/v1/loads/route';
import { POST as tripsPOST, GET as tripsGET } from '@/app/api/v1/trips/route';
import { POST as khataPOST, GET as khataGET } from '@/app/api/v1/khata/route';
import { SessionClaims } from '@/types/database';

describe('Tier 5: Adversarial Hardening — Phase 2 Algorithmic & API Contracts', () => {
  const tenantA: SessionClaims = {
    sub: 'adversarial-admin-alpha',
    email: 'admin@alpha-logistics.in',
    tenant_id: 'org-alpha-uuid-1111',
    role: 'fleet_admin',
  };

  const tenantB: SessionClaims = {
    sub: 'adversarial-admin-beta',
    email: 'admin@beta-freight.in',
    tenant_id: 'org-beta-uuid-2222',
    role: 'fleet_admin',
  };

  const tokenA = createSignedJwtPayload(tenantA);
  const tokenB = createSignedJwtPayload(tenantB);

  beforeEach(() => {
    dataService.clear();
    globalIdempotencyStore.clear();
  });

  // =========================================================================
  // TASK 1: Algorithmic Boundary Fuzzing
  // =========================================================================

  describe('Adversarial Probe 1: Dead Mileage Savings Boundary Fuzzing', () => {
    it('AT-DM-01: loadedKm > totalKm prevents negative empty km and zeroes all savings', () => {
      // Adversarial attack: loaded km exceeds total trip km
      const res = calculateDeadMileageSavings(100, 150);
      expect(res.emptyKmAvoided).toBe(0);
      expect(res.fuelSavedLiters).toBe(0);
      expect(res.fuelCostSavedINR).toBe(0);
      expect(res.wearTearSavedINR).toBe(0);
      expect(res.tollSavedINR).toBe(0);
      expect(res.totalMoneySavedINR).toBe(0);
      expect(res.co2SavedKg).toBe(0);
    });

    it('AT-DM-02: totalKm = 0 handles zero distance safely without negative or NaN outputs', () => {
      const res = calculateDeadMileageSavings(0, 0);
      expect(res.emptyKmAvoided).toBe(0);
      expect(res.fuelSavedLiters).toBe(0);
      expect(res.totalMoneySavedINR).toBe(0);
      expect(res.co2SavedKg).toBe(0);
    });

    it('AT-DM-03: handles negative inputs and non-finite numbers safely', () => {
      // Fuzz with negative distance and non-finite values
      const resNegative = calculateDeadMileageSavings(-500, -200);
      expect(resNegative.totalKm).toBe(0);
      expect(resNegative.loadedKm).toBe(0);
      expect(resNegative.emptyKmAvoided).toBe(0);

      const resNaN = calculateDeadMileageSavings(NaN, Infinity);
      expect(resNaN.totalKm).toBe(0);
      expect(resNaN.loadedKm).toBe(0);
      expect(resNaN.emptyKmAvoided).toBe(0);
    });

    it('AT-DM-04: zero or sub-zero fuel divisor is clamped to 0.5 km/L safe minimum', () => {
      // Division by zero attack on fuel consumption calculation
      const resZeroDivisor = calculateDeadMileageSavings(200, 100, { mileageKmPerLiter: 0 });
      expect(resZeroDivisor.emptyKmAvoided).toBe(100);
      expect(Number.isFinite(resZeroDivisor.fuelSavedLiters)).toBe(true);
      // Clamped to 0.5 km/L -> 100 / 0.5 = 200 Liters
      expect(resZeroDivisor.fuelSavedLiters).toBe(200);

      const resSubZeroDivisor = calculateDeadMileageSavings(200, 100, { mileageKmPerLiter: -3.8 });
      expect(resSubZeroDivisor.fuelSavedLiters).toBe(200);
    });

    it('AT-DM-05: enterprise scale (1,000,000 km) maintains float precision and correct CO2 math', () => {
      const totalKm = 1000000;
      const loadedKm = 700000;
      const res = calculateDeadMileageSavings(totalKm, loadedKm);
      expect(res.emptyKmAvoided).toBe(300000);
      // 300,000 / 3.8 = 78947.368... -> 78947.4 L
      expect(res.fuelSavedLiters).toBe(78947.4);
      expect(res.fuelCostSavedINR).toBe(Math.round(78947.4 * 92.0));
      expect(res.co2SavedKg).toBe(Math.round(78947.4 * 2.68 * 10) / 10);
    });
  });

  describe('Adversarial Probe 2: Route Optimizer Boundary Fuzzing', () => {
    it('AT-RO-01: negative or zero distance override falls back to baseline 480 km', () => {
      const resNegative = calculate3WayRoutes('Mumbai', 'Ahmedabad', false, -150);
      expect(resNegative).toHaveLength(3);
      expect(resNegative[0].distanceKm).toBe(480);

      const resZero = calculate3WayRoutes('Mumbai', 'Ahmedabad', false, 0);
      expect(resZero[0].distanceKm).toBe(480);
    });

    it('AT-RO-02: intrastate trip applies exactly 0 INR tax across all 3 routes', () => {
      const routes = calculate3WayRoutes('Surat', 'Vadodara', false, 150);
      for (const route of routes) {
        expect(route.stateTaxINR).toBe(0);
        expect(route.totalCostINR).toBe(route.fuelCostINR + route.fastagTollINR);
      }
    });

    it('AT-RO-03: interstate trip applies exactly 450 INR statutory tax across all 3 routes', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Vapi', true, 170);
      for (const route of routes) {
        expect(route.stateTaxINR).toBe(450);
        expect(route.totalCostINR).toBe(route.fuelCostINR + route.fastagTollINR + 450);
      }
    });

    it('AT-RO-04: enforces minimum toll plaza count clamping on short journeys', () => {
      // 10 km journey
      const routes = calculate3WayRoutes('Navi Mumbai', 'JNPT', false, 10);
      const fastest = routes.find((r) => r.type === 'fastest')!;
      const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;
      const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

      expect(fastest.tollPlazaCount).toBeGreaterThanOrEqual(3);
      expect(tollOpt.tollPlazaCount).toBeGreaterThanOrEqual(1);
      expect(ecoFuel.tollPlazaCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Adversarial Probe 3: Shipper Pricing Boundary Fuzzing', () => {
    it('AT-SP-01: clamps 0 or negative weight and volume to statutory minimums (50 kg, 0.5 cbm)', () => {
      const quoteZero = calculateShipperQuote('shared', 100, 0, 0);
      expect(quoteZero.weightKg).toBe(50);
      expect(quoteZero.volumeCbm).toBe(0.5);

      const quoteNegative = calculateShipperQuote('shared', 100, -500, -10);
      expect(quoteNegative.weightKg).toBe(50);
      expect(quoteNegative.volumeCbm).toBe(0.5);
    });

    it('AT-SP-02: massive weight/volume (50,000 kg, 500 cbm) produces valid positive integers without overflow', () => {
      const quoteShared = calculateShipperQuote('shared', 500, 50000, 500);
      expect(quoteShared.minPricingINR).toBeGreaterThan(0);
      expect(Number.isFinite(quoteShared.minPricingINR)).toBe(true);
      expect(quoteShared.gstINR).toBe(Math.round(quoteShared.subTotalINR * 0.05));
      expect(quoteShared.minPricingINR % 100).toBe(0);

      const quotePrivate = calculateShipperQuote('private', 500, 50000, 500);
      expect(quotePrivate.minPricingINR).toBeGreaterThan(0);
      expect(Number.isFinite(quotePrivate.minPricingINR)).toBe(true);
      expect(quotePrivate.gstINR).toBe(Math.round(quotePrivate.subTotalINR * 0.05));
      expect(quotePrivate.minPricingINR % 100).toBe(0);
    });

    it('AT-SP-03: strictly verifies 5% GST calculation and nearest 100 rounding behavior', () => {
      // Distance = 100, weight = 1000, volume = 5, shared
      // baseFare = 2500
      // distanceFare = 100 * 14 = 1400
      // weightFare = (1000/1000) * 650 * (100/250) = 260
      // volumeFare = 5 * 180 = 900
      // subTotal = 2500 + 1400 + 260 + 900 = 5060
      // gst = round(5060 * 0.05) = 253
      // unrounded = 5060 + 253 = 5313 -> rounded to nearest 100 = 5300
      const quote = calculateShipperQuote('shared', 100, 1000, 5);
      expect(quote.subTotalINR).toBe(5060);
      expect(quote.gstINR).toBe(253);
      expect(quote.minPricingINR).toBe(5300);
      expect(quote.recommendedPriceINR).toBe(Math.round(5300 * 1.08));
    });

    it('AT-SP-04: normalizes truck type aliases correctly (LTL -> shared, FTL -> private)', () => {
      const qLTL = calculateShipperQuote('LTL', 200, 2000, 10);
      expect(qLTL.truckType).toBe('shared');

      const qFTL = calculateShipperQuote('FTL', 200, 2000, 10);
      expect(qFTL.truckType).toBe('private');
    });
  });

  describe('Adversarial Probe 4: Acceptance Probability Boundary Fuzzing', () => {
    it('AT-AP-01: zero or negative bid addition strictly produces 48% and 2-4 hours band', () => {
      const resZero = calculateAcceptanceProbability(0, 30000);
      expect(resZero.probabilityPercent).toBe(48);
      expect(resZero.dispatchSpeedBand).toBe('2 – 4 hours');

      const resNegative = calculateAcceptanceProbability(-5000, 30000);
      expect(resNegative.probabilityPercent).toBe(48);
      expect(resNegative.dispatchSpeedBand).toBe('2 – 4 hours');
    });

    it('AT-AP-02: 10x astronomical bid addition is strictly capped at 99%', () => {
      const resMassive = calculateAcceptanceProbability(300000, 30000); // 10x base
      expect(resMassive.probabilityPercent).toBe(99);
      expect(resMassive.dispatchSpeedBand).toBe('Instant (< 10 mins)');
    });

    it('AT-AP-03: verifies exact piecewise breakpoint transitions (48%, 68%, 86%, 99%)', () => {
      const base = 10000;

      // 1. Exactly at bonusRatio = 0.00 -> 48%
      const p0 = calculateAcceptanceProbability(0, base);
      expect(p0.probabilityPercent).toBe(48);

      // 2. Exactly at bonusRatio = 0.08 (800 INR addition) -> 68%
      const p08 = calculateAcceptanceProbability(800, base);
      expect(p08.probabilityPercent).toBe(68);
      expect(p08.dispatchSpeedBand).toBe('45 – 60 mins');

      // 3. Exactly at bonusRatio = 0.18 (1800 INR addition) -> 86%
      const p18 = calculateAcceptanceProbability(1800, base);
      expect(p18.probabilityPercent).toBe(86);
      expect(p18.dispatchSpeedBand).toBe('15 – 30 mins');

      // 4. At bonusRatio = 0.31 (3100 INR addition) -> 99% cap
      const p31 = calculateAcceptanceProbability(3100, base);
      expect(p31.probabilityPercent).toBe(99);
      expect(p31.dispatchSpeedBand).toBe('Instant (< 10 mins)');
    });

    it('AT-AP-04: calculateBidProbability absolute bid convenience wrapper matches relative engine', () => {
      const minPricing = 25000;
      const totalBid = 27500; // 2500 bonus (10%)
      const resAbsolute = calculateBidProbability(totalBid, minPricing);
      const resRelative = calculateAcceptanceProbability(2500, minPricing);
      expect(resAbsolute.probabilityPercent).toBe(resRelative.probabilityPercent);
      expect(resAbsolute.dispatchSpeedBand).toBe(resRelative.dispatchSpeedBand);
    });
  });

  describe('Adversarial Probe 5: Trip Khata Settlement Boundary Fuzzing', () => {
    it('AT-TK-01: advances exceeding gross freight clamps balance due to exactly 0 (prevents negative debt)', () => {
      // Gross = 30,000, Disbursed Advances = 45,000
      const res = calculateTripKhata(30000, {
        diesel: 25000,
        fastag: 10000,
        driverBhatta: 10000,
      });

      expect(res.grossFreightINR).toBe(30000);
      expect(res.totalDisbursedAdvancesINR).toBe(45000);
      expect(res.balanceDueOnPODINR).toBe(0); // Must be clamped at 0
      expect(res.netGrossProfitINR).toBe(-15000); // Correctly negative (loss)
      expect(res.profitMarginPercent).toBe(-50.0);
    });

    it('AT-TK-02: negative advances input are clamped to 0', () => {
      const res = calculateTripKhata(50000, {
        diesel: -10000,
        fastag: -5000,
        driverBhatta: -2000,
        hamali: -1000,
      });

      expect(res.dieselAdvanceINR).toBe(0);
      expect(res.fastagAdvanceINR).toBe(0);
      expect(res.driverBhattaINR).toBe(0);
      expect(res.hamaliExpensesINR).toBe(0);
      expect(res.totalDisbursedAdvancesINR).toBe(0);
      expect(res.balanceDueOnPODINR).toBe(50000);
    });

    it('AT-TK-03: gross freight = 0 margin protection avoids division by zero', () => {
      const res = calculateTripKhata(0, { diesel: 5000 });
      expect(res.profitMarginPercent).toBe(0.0);
      expect(Number.isFinite(res.profitMarginPercent)).toBe(true);
    });

    it('AT-TK-04: 5% maintenance reserve precision and impact on net operating margins', () => {
      const gross = 60000;
      const reserve = Math.round(gross * 0.05); // 3000
      const res = calculateTripKhata(
        gross,
        { diesel: 20000, fastag: 5000, driverBhatta: 3000 },
        reserve
      );

      expect(res.maintenanceReserveINR).toBe(3000);
      expect(res.totalOperatingCostsINR).toBe(28000 + 3000); // 31000
      expect(res.netGrossProfitINR).toBe(29000); // 60000 - 31000
      expect(res.profitMarginPercent).toBe(48.3); // (29000 / 60000) * 100 = 48.333% -> 48.3%
    });
  });

  describe('Adversarial Probe 6: AIS-140 Telematics & Crash Classification Boundary Fuzzing', () => {
    it('AT-AC-01: 2.49G vs 2.50G boundary classification', () => {
      // 2.49G magnitude -> (2.49 * 9.81) = 24.4269 m/s^2
      const axNoise = 2.49 * 9.81;
      const resNoise = classifyAIS140GForce(axNoise, 0, 0);
      expect(resNoise.totalG).toBe(2.49);
      expect(resNoise.classification).toBe('ROAD_NOISE');
      expect(resNoise.isTriggerEmergency).toBe(false);

      // 2.50G magnitude -> intermediate sub-collision transient
      const ax250 = 2.50 * 9.81;
      const res250 = classifyAIS140GForce(ax250, 0, 0);
      expect(res250.totalG).toBe(2.50);
      expect(res250.classification).toBe('ROAD_NOISE');
      expect(res250.isTriggerEmergency).toBe(false);
      expect(res250.actionRequired).toContain('Sub-collision transient logged');
    });

    it('AT-AC-02: 3.99G vs 4.00G crash trigger boundary', () => {
      // 3.99G with lateral force
      const ax399 = 3.99 * 9.81;
      const res399 = classifyAIS140GForce(ax399, 0, 0);
      expect(res399.totalG).toBe(3.99);
      expect(res399.classification).toBe('ROAD_NOISE');
      expect(res399.isTriggerEmergency).toBe(false);

      // 4.00G with lateral force -> COLLISION_CRASH
      const ax400 = 4.00 * 9.81;
      const res400 = classifyAIS140GForce(ax400, 0, 0);
      expect(res400.totalG).toBe(4.00);
      expect(res400.classification).toBe('COLLISION_CRASH');
      expect(res400.isTriggerEmergency).toBe(true);
      expect(res400.actionRequired).toContain('Golden Hour T0 sequence');
    });

    it('AT-AC-03: vertical cabin drop anomaly filtering (az >= 3.0G with ax, ay < 1.0G)', () => {
      // Dropping heavy device on cabin floor: az = 4.5G (44.145 m/s^2), ax = 0.2G, ay = 0.1G
      const az = 4.5 * 9.81;
      const ax = 0.2 * 9.81;
      const ay = 0.1 * 9.81;

      const resDrop = classifyAIS140GForce(ax, ay, az);
      expect(resDrop.totalG).toBeGreaterThanOrEqual(4.5);
      expect(resDrop.classification).toBe('CABIN_DROP_ANOMALY');
      expect(resDrop.isTriggerEmergency).toBe(false);
      expect(resDrop.actionRequired).toContain('Filtered out as single-axis vertical transient');
    });

    it('AT-AC-04: rejects NaN, undefined or non-finite inputs with descriptive error', () => {
      expect(() => classifyAIS140GForce(NaN, 0, 0)).toThrow(
        /Invalid accelerometer reading/i
      );
      expect(() => classifyAIS140GForce(0, Infinity, 0)).toThrow(
        /Invalid accelerometer reading/i
      );
    });

    it('AT-AC-05: zero-G freefall (0, 0, 0) and extreme rollover (50G) handling', () => {
      // Freefall: 0G
      const resZero = classifyAIS140GForce(0, 0, 0);
      expect(resZero.totalG).toBe(0.0);
      expect(resZero.classification).toBe('ROAD_NOISE');
      expect(resZero.isTriggerEmergency).toBe(false);

      // Extreme structural impact / rollover: 50G lateral
      const ax50 = 50 * 9.81;
      const resExtreme = classifyAIS140GForce(ax50, 0, 0);
      expect(resExtreme.totalG).toBe(50.0);
      expect(resExtreme.classification).toBe('COLLISION_CRASH');
      expect(resExtreme.isTriggerEmergency).toBe(true);
    });
  });

  // =========================================================================
  // TASK 2: API & Idempotency Stress Testing
  // =========================================================================

  describe('Adversarial Probe 7: API Idempotency Replay & State Protection', () => {
    it('AT-ID-01: duplicate Idempotency-Key on POST /api/v1/loads returns identical response without duplicate records', async () => {
      const fixedKey = 'idemp-stress-load-888';
      const makeRequest = () =>
        new NextRequest('http://localhost:3000/api/v1/loads', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenA}`,
            'content-type': 'application/json',
            'idempotency-key': fixedKey,
          },
          body: JSON.stringify({
            origin_name: 'Vapi Industrial Area',
            destination_name: 'Surat Textile Market',
            weight_kg: 7500,
            distance_km: 110,
          }),
        });

      // Request 1: Fresh Creation
      const res1 = await loadsPOST(makeRequest());
      expect(res1.status).toBe(201);
      expect(res1.headers.get('Idempotency-Replayed')).toBeNull();
      const body1 = await res1.json();
      const loadId = body1.data.id;
      expect(loadId).toBeDefined();

      // Request 2: Replay Attack / Retry
      const res2 = await loadsPOST(makeRequest());
      expect(res2.status).toBe(201);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      expect(res2.headers.get('X-Cache')).toBe('HIT');
      const body2 = await res2.json();
      expect(body2.data.id).toBe(loadId);

      // Verify DB / dataService state: exactly 1 load created, exactly 1 audit entry
      const allLoads = dataService.getLoads(tenantA, {});
      expect(allLoads.data).toHaveLength(1);

      const auditTrail = dataService.getAuditTrail(tenantA, 'loads');
      expect(auditTrail).toHaveLength(1);
    });

    it('AT-ID-02: missing Idempotency-Key on mutating POST /api/v1/khata strictly rejects with HTTP 400', async () => {
      const trip = await dataService.createTrip(tenantA, { gross_freight: 45000 });

      const reqMissingKey = new NextRequest('http://localhost:3000/api/v1/khata', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          // No Idempotency-Key provided
        },
        body: JSON.stringify({
          trip_id: trip.id,
          type: 'diesel',
          amount: 8000,
        }),
      });

      const res = await khataPOST(reqMissingKey);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Idempotency-Key header is required');

      // Verify trip remains untouched
      const untouchedTrip = dataService.getTripById(tenantA, trip.id);
      expect(untouchedTrip?.total_advances).toBe(0);
      expect(untouchedTrip?.balance_due).toBe(45000);
    });

    it('AT-ID-03: duplicate Idempotency-Key on POST /api/v1/khata prevents double-disbursement of advances', async () => {
      const trip = await dataService.createTrip(tenantA, {
        gross_freight: 50000,
        maintenance_reserve: 2500,
      });

      const fixedKhataKey = 'idemp-stress-khata-disburse-999';
      const makeRequest = () =>
        new NextRequest('http://localhost:3000/api/v1/khata', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenA}`,
            'content-type': 'application/json',
            'idempotency-key': fixedKhataKey,
          },
          body: JSON.stringify({
            trip_id: trip.id,
            type: 'fastag',
            amount: 6000,
          }),
        });

      // First call
      const res1 = await khataPOST(makeRequest());
      expect(res1.status).toBe(201);
      const body1 = await res1.json();
      expect(body1.data.trip.total_advances).toBe(6000);
      expect(body1.data.trip.balance_due).toBe(44000);

      // Second call with same idempotency key (simulating network retry)
      const res2 = await khataPOST(makeRequest());
      expect(res2.status).toBe(201);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      const body2 = await res2.json();
      expect(body2.data.trip.total_advances).toBe(6000); // NOT 12,000!

      // Check final state
      const verifiedTrip = dataService.getTripById(tenantA, trip.id);
      expect(verifiedTrip?.total_advances).toBe(6000);
      expect(verifiedTrip?.balance_due).toBe(44000);

      // Verify only 1 UPDATE audit log entry for this transaction
      const auditTrail = dataService.getAuditTrail(tenantA, 'trips');
      const updateLogs = auditTrail.filter((a) => a.action === 'UPDATE');
      expect(updateLogs).toHaveLength(1);
    });

    it('AT-ID-04: identical Idempotency-Key in different tenants does not leak or replay across tenants', async () => {
      const sharedKey = 'cross-tenant-shared-idemp-key';

      // Tenant A creates a load with shared key
      const reqA = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          'idempotency-key': sharedKey,
        },
        body: JSON.stringify({
          origin_name: 'Tenant A Origin',
          destination_name: 'Tenant A Destination',
          weight_kg: 5000,
        }),
      });
      const resA = await loadsPOST(reqA);
      expect(resA.status).toBe(201);
      const jsonA = await resA.json();

      // Tenant B sends request with identical key
      const reqB = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenB}`,
          'content-type': 'application/json',
          'idempotency-key': sharedKey,
        },
        body: JSON.stringify({
          origin_name: 'Tenant B Origin',
          destination_name: 'Tenant B Destination',
          weight_kg: 9000,
        }),
      });
      const resB = await loadsPOST(reqB);
      expect(resB.status).toBe(201);
      // Tenant B must NOT get a cache hit or Tenant A's load ID!
      expect(resB.headers.get('Idempotency-Replayed')).toBeNull();
      const jsonB = await resB.json();
      expect(jsonB.data.id).not.toBe(jsonA.data.id);
      expect(jsonB.data.tenant_id).toBe(tenantB.tenant_id);
    });

    it('AT-ID-04b: duplicate Idempotency-Key on POST /api/v1/trips replays without duplicate trip creation', async () => {
      const tripKey = 'idemp-stress-trip-777';
      const makeTripReq = () =>
        new NextRequest('http://localhost:3000/api/v1/trips', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenA}`,
            'content-type': 'application/json',
            'idempotency-key': tripKey,
          },
          body: JSON.stringify({
            gross_freight: 55000,
            maintenance_reserve: 2750,
          }),
        });

      const res1 = await tripsPOST(makeTripReq());
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.data.id).toBeDefined();

      const res2 = await tripsPOST(makeTripReq());
      expect(res2.status).toBe(201);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      const json2 = await res2.json();
      expect(json2.data.id).toBe(json1.data.id);

      const trips = dataService.getTrips(tenantA, {});
      expect(trips.data).toHaveLength(1);
    });

    it('AT-ID-05: handles SQL injection and weird strings safely in Idempotency-Key header', async () => {
      const sqlInjectionKey = "'; DROP TABLE audit_log; -- ' OR '1'='1";
      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          'idempotency-key': sqlInjectionKey,
        },
        body: JSON.stringify({
          origin_name: 'Secure Origin',
          destination_name: 'Secure Destination',
          weight_kg: 4000,
        }),
      });

      const res = await loadsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();

      // Second request with same SQL injection key replays cleanly without crashing or corrupting
      const reqReplay = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          'idempotency-key': sqlInjectionKey,
        },
        body: JSON.stringify({
          origin_name: 'Secure Origin',
          destination_name: 'Secure Destination',
          weight_kg: 4000,
        }),
      });

      const resReplay = await loadsPOST(reqReplay);
      expect(resReplay.status).toBe(201);
      expect(resReplay.headers.get('Idempotency-Replayed')).toBe('true');
      const jsonReplay = await resReplay.json();
      expect(jsonReplay.data.id).toBe(json.data.id);
    });

    it('AT-ID-06: rapid sequential retry bursts with identical Idempotency-Key converge on identical single result', async () => {
      const burstKey = 'burst-sequential-idemp-key-555';
      const makeSequentialReq = () =>
        new NextRequest('http://localhost:3000/api/v1/loads', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenA}`,
            'content-type': 'application/json',
            'idempotency-key': burstKey,
          },
          body: JSON.stringify({
            origin_name: 'Surat Textile City',
            destination_name: 'Mumbai Kalamboli',
            weight_kg: 10000,
          }),
        });

      // Fire 5 sequential retries (network retry loop)
      const responses: Response[] = [];
      for (let i = 0; i < 5; i++) {
        responses.push(await loadsPOST(makeSequentialReq()));
      }

      for (const res of responses) {
        expect(res.status).toBe(201);
      }

      // First request is a fresh creation; subsequent 4 must be replayed from cache
      expect(responses[0].headers.get('Idempotency-Replayed')).toBeNull();
      for (let i = 1; i < 5; i++) {
        expect(responses[i].headers.get('Idempotency-Replayed')).toBe('true');
      }

      // Verify that all responses return the exact same load ID
      const bodies = await Promise.all(responses.map((r) => r.json()));
      const firstId = bodies[0].data.id;
      for (const b of bodies) {
        expect(b.data.id).toBe(firstId);
      }

      // Exactly 1 load created
      const currentLoads = dataService.getLoads(tenantA, {});
      expect(currentLoads.data).toHaveLength(1);
    });
  });

  describe('Adversarial Probe 8: Cursor Pagination Boundary & Continuity', () => {
    it('AT-PG-01: handles invalid, non-existent cursors without crashing (500)', async () => {
      // Create 3 loads
      for (let i = 1; i <= 3; i++) {
        await dataService.createLoad(tenantA, {
          origin_name: `Origin ${i}`,
          destination_name: `Destination ${i}`,
          weight_kg: 2000 * i,
        });
      }

      // Query with non-existent cursor
      const req = new NextRequest(
        'http://localhost:3000/api/v1/loads?cursor=bogus-non-existent-cursor-id&limit=2',
        { headers: { authorization: `Bearer ${tokenA}` } }
      );
      const res = await loadsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // Should gracefully start from beginning or return items without 500 error
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeLessThanOrEqual(2);
    });

    it('AT-PG-02: clamps excessive limit (>100) to 100 and negative limit to 1', async () => {
      // Test limit clamping via GET
      const reqExcessive = new NextRequest('http://localhost:3000/api/v1/loads?limit=5000', {
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resExcessive = await loadsGET(reqExcessive);
      expect(resExcessive.status).toBe(200);
      const jsonExcessive = await resExcessive.json();
      expect(jsonExcessive.pagination.limit).toBe(100);

      const reqNegative = new NextRequest('http://localhost:3000/api/v1/loads?limit=-10', {
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resNegative = await loadsGET(reqNegative);
      expect(resNegative.status).toBe(200);
      const jsonNegative = await resNegative.json();
      expect(jsonNegative.pagination.limit).toBe(1);
    });

    it('AT-PG-03: traverses 25 items across sequential pages without missing or duplicating items', async () => {
      // Create 25 loads
      const createdIds: string[] = [];
      for (let i = 1; i <= 25; i++) {
        const load = await dataService.createLoad(tenantA, {
          origin_name: `Origin City ${i}`,
          destination_name: `Destination City ${i}`,
          weight_kg: 1000 + i * 100,
        });
        createdIds.push(load.id);
      }

      const traversedIds: string[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < 10) {
        pageCount++;
        const url: string = cursor
          ? `http://localhost:3000/api/v1/loads?limit=10&cursor=${cursor}`
          : 'http://localhost:3000/api/v1/loads?limit=10';

        const req = new NextRequest(url, {
          headers: { authorization: `Bearer ${tokenA}` },
        });
        const res = await loadsGET(req);
        expect(res.status).toBe(200);
        const json = await res.json();

        for (const item of json.data) {
          traversedIds.push(item.id);
        }

        hasMore = json.pagination.has_more;
        cursor = json.pagination.next_cursor;
      }

      // 3 pages: 10 + 10 + 5 = 25
      expect(pageCount).toBe(3);
      expect(traversedIds).toHaveLength(25);
      // All traversed IDs must be unique (no duplicates)
      const uniqueTraversed = new Set(traversedIds);
      expect(uniqueTraversed.size).toBe(25);
      // Every created ID was traversed
      for (const id of createdIds) {
        expect(uniqueTraversed.has(id)).toBe(true);
      }
    });
  });

  describe('Adversarial Probe 9: Cross-Tenant Isolation Across All Endpoints', () => {
    it('AT-CT-01: Tenant B cannot view or disburse advances on Tenant A trips', async () => {
      // Tenant A creates trip
      const tripA = await dataService.createTrip(tenantA, {
        gross_freight: 65000,
        maintenance_reserve: 3250,
      });

      // Tenant B tries to query Khata settlement for Tenant A trip
      const reqGetKhata = new NextRequest(
        `http://localhost:3000/api/v1/khata?trip_id=${tripA.id}`,
        { headers: { authorization: `Bearer ${tokenB}` } }
      );
      const resGetKhata = await khataGET(reqGetKhata);
      expect(resGetKhata.status).toBe(404);

      // Tenant B tries to disburse advance on Tenant A trip
      const reqPostKhata = new NextRequest('http://localhost:3000/api/v1/khata', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenB}`,
          'content-type': 'application/json',
          'idempotency-key': 'malicious-b-advance-key',
        },
        body: JSON.stringify({
          trip_id: tripA.id,
          type: 'diesel',
          amount: 10000,
        }),
      });
      const resPostKhata = await khataPOST(reqPostKhata);
      expect(resPostKhata.status).toBe(404);

      // Tenant A trip remains untouched
      const originalTrip = dataService.getTripById(tenantA, tripA.id);
      expect(originalTrip?.total_advances).toBe(0);
      expect(originalTrip?.balance_due).toBe(65000);
    });

    it('AT-CT-02: Tenant B cannot view Tenant A loads or trips via GET endpoints', async () => {
      await dataService.createLoad(tenantA, {
        origin_name: 'Tenant A Secret Hub',
        destination_name: 'Tenant A Secret Drop',
        weight_kg: 14000,
      });

      await dataService.createTrip(tenantA, { gross_freight: 42000 });

      // Tenant B queries loads
      const reqLoads = new NextRequest('http://localhost:3000/api/v1/loads', {
        headers: { authorization: `Bearer ${tokenB}` },
      });
      const resLoads = await loadsGET(reqLoads);
      const jsonLoads = await resLoads.json();
      expect(jsonLoads.data).toHaveLength(0);
      expect(jsonLoads.pagination.total).toBe(0);

      // Tenant B queries trips
      const reqTrips = new NextRequest('http://localhost:3000/api/v1/trips', {
        headers: { authorization: `Bearer ${tokenB}` },
      });
      const resTrips = await tripsGET(reqTrips);
      const jsonTrips = await resTrips.json();
      expect(jsonTrips.data).toHaveLength(0);
      expect(jsonTrips.pagination.total).toBe(0);
    });
  });
});
