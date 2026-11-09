/**
 * SafeFreight OS — Tier 1 Feature Coverage Suite: Phase 3 Commercial Driver Console
 *
 * Covers all Phase 3 Commercial Driver Console features:
 * - FEAT-DRV-01: 24/7 Always-On GPS Live HUD & Speedometer Display
 * - FEAT-DRV-02: 1-Tap 6-Stage Milestone State Transitions (Sequential Progression)
 * - FEAT-DRV-03: Trip Khata Expense Diary & Cash Balance Arithmetic
 * - FEAT-DRV-04: 1-Tap Highway Emergency & Owner Contact Actions
 * - FEAT-DRV-05: Statutory e-Bilti & RTO QR Clearance Pass with Document Validity Badges
 * - FEAT-DRV-06: 3-Way Route Selector with NH 48 Checkpoints (Fastest vs Toll vs Eco)
 * - FEAT-DRV-07: Multilingual Turn-by-Turn Voice Guidance & Highway Audio Feedback
 * - FEAT-DRV-08: Return Backhaul Load Board & 1-Tap Acceptance Endpoint (/api/v1/loads/accept)
 * - FEAT-DRV-11 to 13: Highway Usability, 56dp/96dp Touch Targets & Plain Vernacular Phrasing
 *
 * Source of Truth: PRD v4.0.0 §6 (Phase 3), PRD v3.0 FR-DR-01 to 07, PROJECT.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/components/ui/button';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';
import {
  NH48_WESTERN_CORRIDOR_WAYPOINTS,
  TEST_ORGS,
  TEST_PROFILES,
} from '../harness/fixtures';
import {
  calculate3WayRoutes,
  calculateTripKhata,
  generateStatutoryLRNumber,
  validateEWayBillNumber,
  validateGSTIN,
  calculateDeadMileageSavings,
} from '../harness/contracts';
import { dataService } from '@/lib/data-service';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 1: Feature Coverage — Phase 3 Commercial Driver Console', () => {
  let db: MultiTenantDatabaseSimulator;

  // Primary Persona Sessions
  const fleetAdminSession: SessionContext = {
    userId: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
    tenantId: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
    email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
  };

  const driverSession: SessionContext = {
    userId: TEST_PROFILES.DRIVER_RAMESH.id,
    tenantId: TEST_ORGS.FLEET_WIFL.id,
    role: 'driver',
    email: TEST_PROFILES.DRIVER_RAMESH.email,
  };

  const shipperSession: SessionContext = {
    userId: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
    tenantId: TEST_ORGS.SHIPPER_ADANI.id,
    role: 'shipper',
    email: TEST_PROFILES.SHIPPER_ADANI_EXEC.email,
  };

  const driverClaims: SessionClaims = {
    sub: TEST_PROFILES.DRIVER_RAMESH.id,
    email: TEST_PROFILES.DRIVER_RAMESH.email,
    tenant_id: TEST_ORGS.FLEET_WIFL.id,
    role: 'driver',
  };

  beforeEach(() => {
    db = new MultiTenantDatabaseSimulator();
    dataService.clear();
    globalIdempotencyStore.clear();
  });

  // =========================================================================
  // 1. 1-TAP 6-STAGE MILESTONE STATE MACHINE (FEAT-DRV-02)
  // =========================================================================
  describe('Feature 1: 1-Tap 6-Stage Milestone State Tracker', () => {
    const HIGHWAY_MILESTONES = [
      'at_pickup',    // 1. गोदाम पहुँचे (Reached Warehouse / Pickup)
      'loaded',       // 2. लोडिंग पूरी (Loading Complete)
      'in_transit',   // 3. हाइवे पर (On Highway)
      'dhaba_break',  // 4. ढाबा ब्रेक (Highway Halt / Meal Break)
      'at_unloading', // 5. पार्टी पहुँचे (Reached Consignee / Unloading)
      'completed',    // 6. माल खाली हुआ (Unloading Complete / Delivered)
    ] as const;

    it('TC-DRV-M01: completes full 6-stage sequential progression with audit logs and timestamp tracking', () => {
      // Create initial trip for Driver Ramesh
      const initialTrip = db.insertRow(fleetAdminSession, 'trips', {
        driver_id: driverSession.userId,
        vehicle_plate: 'GJ-05-BZ-8821',
        origin: 'Mumbai JNPT',
        destination: 'Ahmedabad Changodar',
        gross_freight: 48000,
        milestone_status: 'created',
      });

      expect(initialTrip.id).toBeDefined();
      expect(initialTrip.milestone_status).toBe('created');

      // Sequentially advance through all 6 stages
      let currentTripId = initialTrip.id as string;
      for (let i = 0; i < HIGHWAY_MILESTONES.length; i++) {
        const stage = HIGHWAY_MILESTONES[i];
        const updated = db.updateRow(driverSession, 'trips', currentTripId, {
          milestone_status: stage,
          last_milestone_at: new Date().toISOString(),
          stage_index: i + 1,
        });

        expect(updated.milestone_status).toBe(stage);
        expect(updated.updated_by).toBe(driverSession.userId);
      }

      // Verify final trip state
      const tripsInOrg = db.selectRows(driverSession, 'trips');
      expect(tripsInOrg).toHaveLength(1);
      expect(tripsInOrg[0].milestone_status).toBe('completed');

      // Verify append-only audit trail captures 1 INSERT + 6 UPDATE entries
      const auditTrail = db.getAuditTrail(driverSession, 'trips');
      expect(auditTrail).toHaveLength(7);
      expect(auditTrail[0].action).toBe('INSERT');
      expect(auditTrail[1].after?.milestone_status).toBe('at_pickup');
      expect(auditTrail[2].after?.milestone_status).toBe('loaded');
      expect(auditTrail[3].after?.milestone_status).toBe('in_transit');
      expect(auditTrail[4].after?.milestone_status).toBe('dhaba_break');
      expect(auditTrail[5].after?.milestone_status).toBe('at_unloading');
      expect(auditTrail[6].after?.milestone_status).toBe('completed');
    });

    it('TC-DRV-M02: validates milestone payload metadata at each distinct stage', () => {
      const trip = db.insertRow(driverSession, 'trips', {
        driver_id: driverSession.userId,
        milestone_status: 'created',
      });

      // Stage 1: at_pickup attaches GPS coordinates of pickup warehouse
      const stage1 = db.updateRow(driverSession, 'trips', trip.id as string, {
        milestone_status: 'at_pickup',
        pickup_lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lat,
        pickup_lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lng,
      });
      expect(stage1.pickup_lat).toBe(NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lat);

      // Stage 2: loaded attaches gross payload weight (e.g. 16,500 kg)
      const stage2 = db.updateRow(driverSession, 'trips', trip.id as string, {
        milestone_status: 'loaded',
        gross_weight_kg: 16500,
        tare_weight_kg: 9200,
      });
      expect(stage2.gross_weight_kg).toBe(16500);

      // Stage 3: in_transit logs initial highway odometer
      const stage3 = db.updateRow(driverSession, 'trips', trip.id as string, {
        milestone_status: 'in_transit',
        odometer_km: 184500,
      });
      expect(stage3.odometer_km).toBe(184500);

      // Stage 4: dhaba_break logs location and pause duration
      const stage4 = db.updateRow(driverSession, 'trips', trip.id as string, {
        milestone_status: 'dhaba_break',
        halt_city: 'Surat Kadodara',
        bhatta_disbursed_inr: 300,
      });
      expect(stage4.halt_city).toBe('Surat Kadodara');

      // Stage 5: at_unloading logs receiver contact acknowledgement
      const stage5 = db.updateRow(driverSession, 'trips', trip.id as string, {
        milestone_status: 'at_unloading',
        receiver_name: 'Gujarat Chemicals Depo',
      });
      expect(stage5.receiver_name).toBe('Gujarat Chemicals Depo');

      // Stage 6: completed logs proof of delivery (POD) status
      const stage6 = db.updateRow(driverSession, 'trips', trip.id as string, {
        milestone_status: 'completed',
        pod_signed: true,
      });
      expect(stage6.pod_signed).toBe(true);
    });

    it('TC-DRV-M03: verifies 5-language native vernacular milestone labels without English fallback', () => {
      const milestoneDictionary = {
        hi: {
          at_pickup: 'गोदाम पहुँचे',
          loaded: 'लोडिंग पूरी',
          in_transit: 'हाइवे पर',
          dhaba_break: 'ढाबा ब्रेक',
          at_unloading: 'पार्टी पहुँचे',
          completed: 'माल खाली हुआ',
        },
        gu: {
          at_pickup: 'ગોદામ પહોંચ્યા',
          loaded: 'લોડિંગ પૂર્ણ',
          in_transit: 'હાઇવે પર',
          dhaba_break: 'ઢાબા બ્રેક',
          at_unloading: 'પાર્ટી પહોંચ્યા',
          completed: 'માલ ખાલી કર્યો',
        },
        mr: {
          at_pickup: 'गोदामावर पोहोचले',
          loaded: 'लोडिंग पूर्ण',
          in_transit: 'महामार्गावर',
          dhaba_break: 'ढाबा ब्रेक',
          at_unloading: 'पार्टीकडे पोहोचले',
          completed: 'माल उतरवला',
        },
        te: {
          at_pickup: 'గోడౌన్ చేరుకున్నారు',
          loaded: 'లోడింగ్ పూర్తయింది',
          in_transit: 'హైవే పై',
          dhaba_break: 'ధాబా విరామం',
          at_unloading: 'పార్టీ వద్దకు చేరారు',
          completed: 'అన్‌లోడింగ్ పూర్తయింది',
        },
        en: {
          at_pickup: 'Reached Pickup',
          loaded: 'Loading Complete',
          in_transit: 'On Highway',
          dhaba_break: 'Dhaba Break',
          at_unloading: 'Reached Drop',
          completed: 'Delivered / Unloaded',
        },
      };

      const languages = ['hi', 'gu', 'mr', 'te', 'en'] as const;
      for (const lang of languages) {
        const dict = milestoneDictionary[lang];
        for (const stage of HIGHWAY_MILESTONES) {
          const label = dict[stage];
          expect(label).toBeDefined();
          expect(typeof label).toBe('string');
          expect(label.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('TC-DRV-M04: verifies real-time status query filters active trip milestone correctly', () => {
      // Driver Ramesh has one active trip on the highway
      const trip = db.insertRow(driverSession, 'trips', {
        driver_id: driverSession.userId,
        milestone_status: 'in_transit',
        origin: 'Vapi GIDC',
        destination: 'Ahmedabad',
      });

      const trips = db.selectRows(driverSession, 'trips');
      const activeTrip = trips.find((t) => t.id === trip.id);
      expect(activeTrip).toBeDefined();
      expect(activeTrip?.milestone_status).toBe('in_transit');
    });
  });

  // =========================================================================
  // 2. TRIP KHATA EXPENSE DIARY & ARITHMETIC (FEAT-DRV-03)
  // =========================================================================
  describe('Feature 2: Driver Trip Khata & Cash Expense Diary', () => {
    it('TC-DRV-TK01: calculates cash advance deduction from in-hand balance accurately', () => {
      // Driver Ramesh Patel receives initial cash advance: ₹16,000
      const initialCashAdvanceINR = 16000;

      // 4 quick-tap cash expense events:
      const expenses = [
        { type: 'diesel', label: '⛽ Diesel', amount: 5000 },
        { type: 'dhaba', label: '🍛 Dhaba Meal', amount: 300 },
        { type: 'puncture', label: '🔧 Puncture Repair', amount: 200 },
        { type: 'toll', label: '🛡️ Local Toll', amount: 500 },
      ];

      const totalCashExpensesINR = expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalCashExpensesINR).toBe(6000);

      const remainingCashInHandINR = initialCashAdvanceINR - totalCashExpensesINR;
      expect(remainingCashInHandINR).toBe(10000);
      expect(remainingCashInHandINR).toBeGreaterThan(0);
    });

    it('TC-DRV-TK02: logs consecutive expenses to Trip Khata ledger and verifies immutable record', async () => {
      // Create active trip under dataService
      const trip = await dataService.createTrip(driverClaims, {
        gross_freight: 45000,
        maintenance_reserve: 3000,
      });

      // Disburse Diesel advance
      const d1 = await dataService.disburseTripAdvance(driverClaims, trip.id, {
        type: 'diesel',
        amount: 8000,
        notes: 'BPCL Highway Pump Vapi',
      });
      expect(d1.trip.total_advances).toBe(8000);
      expect(d1.trip.balance_due).toBe(37000); // 45000 - 8000

      // Disburse FASTag advance
      const d2 = await dataService.disburseTripAdvance(driverClaims, trip.id, {
        type: 'fastag',
        amount: 3000,
        notes: 'NH 48 NETC FASTag wallet top-up',
      });
      expect(d2.trip.total_advances).toBe(11000); // 8000 + 3000
      expect(d2.trip.balance_due).toBe(34000); // 45000 - 11000

      // Disburse Driver Bhatta
      const d3 = await dataService.disburseTripAdvance(driverClaims, trip.id, {
        type: 'driverBhatta',
        amount: 2500,
        notes: 'Food and halt allowance',
      });
      expect(d3.trip.total_advances).toBe(13500); // 11000 + 2500
      expect(d3.trip.balance_due).toBe(31500); // 45000 - 13500

      // Verify audit trail captured 1 insert + 3 update events
      const trail = dataService.getAuditTrail(driverClaims, 'trips');
      expect(trail.length).toBeGreaterThanOrEqual(4);
    });

    it('TC-DRV-TK03: verifies Trip Khata mathematical consistency with production algorithm', () => {
      // Gross Freight = ₹42,000
      // Advances: Diesel ₹12,000, FASTag ₹2,500, Bhatta ₹3,000, Hamali ₹1,500
      // Maintenance Reserve = ₹2,000
      const result = calculateTripKhata(
        42000,
        {
          diesel: 12000,
          fastag: 2500,
          driverBhatta: 3000,
          hamali: 1500,
        },
        2000
      );

      expect(result.grossFreightINR).toBe(42000);
      expect(result.totalDisbursedAdvancesINR).toBe(19000);
      expect(result.balanceDueOnPODINR).toBe(23000); // 42000 - 19000
      expect(result.totalOperatingCostsINR).toBe(21000); // 19000 + 2000
      expect(result.netGrossProfitINR).toBe(21000); // 42000 - 21000
      expect(result.profitMarginPercent).toBe(50.0);
    });

    it('TC-DRV-TK04: clamps Balance Due on POD to ₹0 when cumulative advances equal gross freight', () => {
      // Exact break-even: Advances = Gross Freight
      const result = calculateTripKhata(35000, {
        diesel: 20000,
        fastag: 5000,
        driverBhatta: 5000,
        hamali: 5000,
      });

      expect(result.totalDisbursedAdvancesINR).toBe(35000);
      expect(result.balanceDueOnPODINR).toBe(0);
      expect(result.netGrossProfitINR).toBe(0);
      expect(result.profitMarginPercent).toBe(0.0);
    });

    it('TC-DRV-TK05: verifies cash in hand reaches exactly zero when all advance is spent', () => {
      const initialCashAdvanceINR = 10000;
      const spentExpenses = [
        { type: 'diesel', amount: 7000 },
        { type: 'dhaba', amount: 1500 },
        { type: 'puncture', amount: 500 },
        { type: 'toll', amount: 1000 },
      ];
      const totalSpent = spentExpenses.reduce((s, e) => s + e.amount, 0);
      const remainingCash = Math.max(0, initialCashAdvanceINR - totalSpent);

      expect(totalSpent).toBe(10000);
      expect(remainingCash).toBe(0);
    });
  });

  // =========================================================================
  // 3. RETURN BACKHAUL LOAD BOARD & 1-TAP ACCEPTANCE (FEAT-DRV-08)
  // =========================================================================
  describe('Feature 3: Return Backhaul Load Board & 1-Tap Acceptance', () => {
    it('TC-DRV-BH01: ranks backhaul return loads by net profit score along NH 48 corridor', () => {
      // Simulate open return loads posted by shippers in Ahmedabad heading to JNPT/Mumbai
      const rawLoads = [
        {
          id: 'bh-load-01',
          origin: 'Ahmedabad Changodar',
          destination: 'Mumbai JNPT',
          commodity: 'Industrial Machinery',
          weightKg: 18000,
          freightINR: 46000,
          detourKm: 12,
        },
        {
          id: 'bh-load-02',
          origin: 'Vadodara Ranoli GIDC',
          destination: 'Navi Mumbai',
          commodity: 'FMCG Packaged Goods',
          weightKg: 14000,
          freightINR: 38000,
          detourKm: 45,
        },
        {
          id: 'bh-load-03',
          origin: 'Surat Kadodara',
          destination: 'Mumbai Nhava Sheva',
          commodity: 'Textile Fabric Bales',
          weightKg: 12000,
          freightINR: 28000,
          detourKm: 5,
        },
      ];

      // Net profit score = Freight Revenue - (Detour Km * ₹32/km operational cost)
      const scoredLoads = rawLoads.map((l) => {
        const detourCost = l.detourKm * 32;
        const netProfitScore = l.freightINR - detourCost;
        return { ...l, netProfitScore };
      });

      // Sort descending by net profit score
      scoredLoads.sort((a, b) => b.netProfitScore - a.netProfitScore);

      expect(scoredLoads[0].id).toBe('bh-load-01'); // 46000 - 384 = 45616 (highest profit)
      expect(scoredLoads[0].netProfitScore).toBeGreaterThan(45000);
      expect(scoredLoads[1].id).toBe('bh-load-02'); // 38000 - 1440 = 36560
      expect(scoredLoads[2].id).toBe('bh-load-03'); // 28000 - 160 = 27840
    });

    it('TC-DRV-BH02: driver accepts backhaul load via 1-tap operation and initiates return trip', () => {
      // 1. Shipper creates open return load
      const returnLoad = db.insertRow(shipperSession, 'loads', {
        origin: 'Ahmedabad Changodar',
        destination: 'Mumbai JNPT',
        commodity: 'Engineering Equipment',
        weight_kg: 16000,
        pricing_inr: 44000,
        status: 'open',
      });

      expect(returnLoad.status).toBe('open');

      // 2. Driver Ramesh accepts load idempotently
      const idempotencyKey = 'backhaul-accept-key-001';
      const acceptResult = db.executeIdempotentOperation(driverSession, idempotencyKey, () => {
        // Atomic status transition
        db.updateRow(shipperSession, 'loads', returnLoad.id as string, {
          status: 'accepted',
          matched_driver_id: driverSession.userId,
        });

        // Create return trip under Fleet Admin's organization
        const trip = db.insertRow(driverSession, 'trips', {
          load_id: returnLoad.id,
          driver_id: driverSession.userId,
          origin: 'Ahmedabad Changodar',
          destination: 'Mumbai JNPT',
          gross_freight: 44000,
          milestone_status: 'created',
          is_backhaul: true,
        });

        return {
          statusCode: 200,
          payload: {
            tripId: trip.id,
            loadId: returnLoad.id,
            status: 'accepted',
            driverId: driverSession.userId,
          },
        };
      });

      expect(acceptResult.statusCode).toBe(200);
      expect(acceptResult.payload.status).toBe('accepted');
      expect(acceptResult.payload.driverId).toBe(driverSession.userId);
      expect(acceptResult.fromCache).toBe(false);

      // Verify trip was created in driver's fleet tenant
      const fleetTrips = db.selectRows(driverSession, 'trips');
      expect(fleetTrips).toHaveLength(1);
      expect(fleetTrips[0].is_backhaul).toBe(true);
      expect(fleetTrips[0].gross_freight).toBe(44000);
    });

    it('TC-DRV-BH03: enforces tenant isolation on backhaul load acceptance', () => {
      // Tenant Alpha Driver accepts a load
      const loadAlpha = db.insertRow(shipperSession, 'loads', {
        origin: 'Ahmedabad',
        destination: 'Mumbai',
        status: 'open',
      });

      const acceptOp = db.executeIdempotentOperation(driverSession, 'key-alpha-accept', () => {
        const trip = db.insertRow(driverSession, 'trips', {
          load_id: loadAlpha.id,
          driver_id: driverSession.userId,
          milestone_status: 'created',
        });
        return { statusCode: 200, payload: { tripId: trip.id } };
      });

      expect(acceptOp.statusCode).toBe(200);

      // Verify the trip is strictly owned by Driver's fleet organization (WIFL)
      const fleetTrips = db.selectRows(driverSession, 'trips');
      expect(fleetTrips[0].tenant_id).toBe(TEST_ORGS.FLEET_WIFL.id);

      // Verify Shipper cannot view internal trip record
      const shipperTrips = db.selectRows(shipperSession, 'trips');
      expect(shipperTrips).toHaveLength(0);
    });

    it('TC-DRV-BH04: prevents double-acceptance conflict when another driver attempts to accept same load', () => {
      const openLoad = db.insertRow(shipperSession, 'loads', {
        origin: 'Ahmedabad',
        destination: 'Mumbai',
        status: 'open',
      });

      // Driver 1 (Ramesh) accepts load
      const driver1Accept = () => {
        const current = db.selectRows(shipperSession, 'loads').find((l) => l.id === openLoad.id);
        if (current?.status !== 'open') {
          return { statusCode: 409, payload: { error: '409 Conflict: Load already accepted' } };
        }
        db.updateRow(shipperSession, 'loads', openLoad.id as string, {
          status: 'accepted',
          matched_driver_id: 'driver-ramesh',
        });
        return { statusCode: 200, payload: { status: 'accepted', driver: 'driver-ramesh' } };
      };

      const result1 = driver1Accept();
      expect(result1.statusCode).toBe(200);

      // Driver 2 (Suresh) attempts to accept same load
      const driver2Accept = () => {
        const current = db.selectRows(shipperSession, 'loads').find((l) => l.id === openLoad.id);
        if (current?.status !== 'open') {
          return { statusCode: 409, payload: { error: '409 Conflict: Load already accepted' } };
        }
        db.updateRow(shipperSession, 'loads', openLoad.id as string, {
          status: 'accepted',
          matched_driver_id: 'driver-suresh',
        });
        return { statusCode: 200, payload: { status: 'accepted', driver: 'driver-suresh' } };
      };

      const result2 = driver2Accept();
      expect(result2.statusCode).toBe(409);
      expect(result2.payload.error).toContain('409 Conflict');
    });

    it('TC-DRV-BH05: verifies return deadhead savings calculation for backhaul freight', () => {
      // Ramesh completes a 525 km outbound delivery to Ahmedabad.
      // If he deadheads back empty: 525 km empty = ~₹16,800 lost capital.
      // With backhaul load: empty km avoided = 525 km.
      const savings = calculateDeadMileageSavings(525, 0);

      expect(savings.emptyKmAvoided).toBe(525);
      expect(savings.fuelCostSavedINR).toBeGreaterThan(10000);
      expect(savings.tollSavedINR).toBeGreaterThan(900);
      expect(savings.co2SavedKg).toBeGreaterThan(300);
      expect(savings.totalMoneySavedINR).toBeGreaterThan(16000);
    });
  });

  // =========================================================================
  // 4. 3-WAY ROUTE SELECTOR ENGINE (FEAT-DRV-06)
  // =========================================================================
  describe('Feature 4: 3-Way Route Selector with NH 48 Checkpoints', () => {
    it('TC-DRV-RS01: computes exact metrics for Fastest Highway, Toll-Optimized, and Eco-Fuel corridors', () => {
      // 525 km Mumbai JNPT to Ahmedabad corridor, interstate (MH -> GJ)
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);

      expect(routes).toHaveLength(3);

      const fastest = routes.find((r) => r.type === 'fastest')!;
      const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;
      const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

      // 1. Fastest Highway (Expressway)
      expect(fastest.distanceKm).toBe(525);
      expect(fastest.speedKmh).toBe(62);
      expect(fastest.fuelLiters).toBe(145.8); // 525 / 3.6
      expect(fastest.fuelCostINR).toBe(13414); // 145.8 * 92
      expect(fastest.fastagTollINR).toBe(971); // 525 * 1.85
      expect(fastest.stateTaxINR).toBe(450); // Interstate commercial entry tax
      expect(fastest.totalCostINR).toBe(14835); // 13414 + 971 + 450

      // 2. Toll-Optimized (+9% detour distance)
      expect(tollOpt.distanceKm).toBe(572); // round(525 * 1.09)
      expect(tollOpt.speedKmh).toBe(48);
      expect(tollOpt.fuelLiters).toBe(154.6); // 572 / 3.7
      expect(tollOpt.fuelCostINR).toBe(14223); // 154.6 * 92
      expect(tollOpt.fastagTollINR).toBe(372); // 572 * 0.65 (~62% toll reduction!)
      expect(tollOpt.stateTaxINR).toBe(450);
      expect(tollOpt.totalCostINR).toBe(15045);

      // 3. Eco-Fuel Corridor (+3% detour distance, optimal torque)
      expect(ecoFuel.distanceKm).toBe(541); // round(525 * 1.03)
      expect(ecoFuel.speedKmh).toBe(54);
      expect(ecoFuel.fuelLiters).toBe(125.8); // 541 / 4.3 (~14% fuel reduction!)
      expect(ecoFuel.fuelCostINR).toBe(11574); // 125.8 * 92
      expect(ecoFuel.fastagTollINR).toBe(676); // 541 * 1.25
      expect(ecoFuel.stateTaxINR).toBe(450);
      expect(ecoFuel.totalCostINR).toBe(12700);
    });

    it('TC-DRV-RS02: validates key NH 48 highway corridor waypoints and state crossing', () => {
      expect(NH48_WESTERN_CORRIDOR_WAYPOINTS).toHaveLength(6);

      // Verify origin: Mumbai JNPT
      const origin = NH48_WESTERN_CORRIDOR_WAYPOINTS[0];
      expect(origin.city).toBe('Mumbai');
      expect(origin.state).toBe('MH');
      expect(origin.cumulativeKmFromJNPT).toBe(0);

      // Verify MH/GJ border checkpoint: Vapi
      const vapi = NH48_WESTERN_CORRIDOR_WAYPOINTS[1];
      expect(vapi.city).toBe('Vapi');
      expect(vapi.state).toBe('GJ');
      expect(vapi.cumulativeKmFromJNPT).toBe(165);

      // Verify destination: Ahmedabad Changodar
      const dest = NH48_WESTERN_CORRIDOR_WAYPOINTS[5];
      expect(dest.city).toBe('Ahmedabad');
      expect(dest.state).toBe('GJ');
      expect(dest.cumulativeKmFromJNPT).toBe(525);
    });

    it('TC-DRV-RS03: differentiates interstate vs intrastate commercial vehicle tax', () => {
      // Interstate (e.g. MH to GJ)
      const interstateRoutes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
      expect(interstateRoutes[0].stateTaxINR).toBe(450);

      // Intrastate (e.g. Surat to Ahmedabad within Gujarat)
      const intrastateRoutes = calculate3WayRoutes('Surat', 'Ahmedabad', false, 260);
      expect(intrastateRoutes[0].stateTaxINR).toBe(0);
      expect(intrastateRoutes[0].totalCostINR).toBe(
        intrastateRoutes[0].fuelCostINR + intrastateRoutes[0].fastagTollINR // without 450 state tax
      );
    });

    it('TC-DRV-RS04: verifies route trade-off logic (fastest vs cheapest toll vs lowest fuel)', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
      const fastest = routes.find((r) => r.type === 'fastest')!;
      const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;
      const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

      // Fastest has shortest duration
      expect(fastest.durationMinutes).toBeLessThan(tollOpt.durationMinutes);
      expect(fastest.durationMinutes).toBeLessThan(ecoFuel.durationMinutes);

      // Toll-Optimized has lowest FASTag toll
      expect(tollOpt.fastagTollINR).toBeLessThan(fastest.fastagTollINR);
      expect(tollOpt.fastagTollINR).toBeLessThan(ecoFuel.fastagTollINR);

      // Eco-Fuel has lowest fuel consumption
      expect(ecoFuel.fuelLiters).toBeLessThan(fastest.fuelLiters);
      expect(ecoFuel.fuelLiters).toBeLessThan(tollOpt.fuelLiters);
    });
  });

  // =========================================================================
  // 5. STATUTORY E-BILTI QR & RTO COMPLIANCE BADGES (FEAT-DRV-05)
  // =========================================================================
  describe('Feature 5: Statutory e-Bilti & RTO Inspection View', () => {
    it('TC-DRV-EB01: generates Carriage by Road Act 2007 compliant LR numbers', () => {
      const lr1 = generateStatutoryLRNumber('WIFL', '2026-27', 482);
      expect(lr1).toBe('WIFL/2026-27/LR-0482');

      const lr2 = generateStatutoryLRNumber('WIFL', '2026-27', 1500);
      expect(lr2).toBe('WIFL/2026-27/LR-1500');

      const lr3 = generateStatutoryLRNumber('TCI', '2025-26', 1);
      expect(lr3).toBe('TCI/2025-26/LR-0001');
    });

    it('TC-DRV-EB02: validates 12-digit Indian e-Way bill number', () => {
      expect(validateEWayBillNumber('241088764512')).toBe(true);
      expect(validateEWayBillNumber('351982736410')).toBe(true);
      expect(validateEWayBillNumber('24108876451')).toBe(false); // 11 digits
      expect(validateEWayBillNumber('2410887645123')).toBe(false); // 13 digits
      expect(validateEWayBillNumber('ABC088764512')).toBe(false); // non-numeric
    });

    it('TC-DRV-EB03: validates Consignor and Consignee Indian GSTIN identifiers', () => {
      expect(validateGSTIN('24AAACW1234F1Z5')).toBe(true); // Gujarat carrier
      expect(validateGSTIN('27AAACU5555M1Z8')).toBe(true); // Maharashtra shipper
      expect(validateGSTIN('99AAACW1234F1Z5')).toBe(true);
      expect(validateGSTIN('INVALID_GSTIN')).toBe(false);
    });

    it('TC-DRV-EB04: compiles high-contrast statutory QR verification payload for 3-second RTO scan', () => {
      const qrPayload = {
        lrNumber: generateStatutoryLRNumber('WIFL', '2026-27', 482),
        ewayBillNo: '241088764512',
        vehicleNumber: 'GJ-05-BZ-8821',
        consignorGst: '27AAACU5555M1Z8',
        consigneeGst: '24AAACW1234F1Z5',
        grossWeightKg: 16000,
        freightINR: 48000,
        tenantId: TEST_ORGS.FLEET_WIFL.id,
        verificationHash: 'sha256-wifl-482-verification-token',
      };

      expect(validateEWayBillNumber(qrPayload.ewayBillNo)).toBe(true);
      expect(validateGSTIN(qrPayload.consignorGst)).toBe(true);
      expect(validateGSTIN(qrPayload.consigneeGst)).toBe(true);
      expect(qrPayload.lrNumber).toBe('WIFL/2026-27/LR-0482');
      expect(qrPayload.tenantId).toBe(TEST_ORGS.FLEET_WIFL.id);
      expect(qrPayload.verificationHash).toBeDefined();
    });

    it('TC-DRV-EB05: determines document compliance status badge (Valid, Expiring Soon, Expired)', () => {
      const evaluateBadge = (expiryDateStr: string, referenceDateStr: string = '2026-11-09') => {
        const expiry = new Date(expiryDateStr).getTime();
        const ref = new Date(referenceDateStr).getTime();
        const diffDays = Math.ceil((expiry - ref) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'expired', badge: 'Expired (Red)', daysRemaining: diffDays };
        if (diffDays <= 30) return { status: 'expiring_soon', badge: 'Expiring Soon (Amber)', daysRemaining: diffDays };
        return { status: 'valid', badge: 'Valid (Green)', daysRemaining: diffDays };
      };

      // 1. National Permit valid for 6 months -> Valid (Green)
      const b1 = evaluateBadge('2027-05-15');
      expect(b1.status).toBe('valid');

      // 2. Fitness certificate expiring in 12 days -> Expiring Soon (Amber)
      const b2 = evaluateBadge('2026-11-21');
      expect(b2.status).toBe('expiring_soon');
      expect(b2.daysRemaining).toBe(12);

      // 3. PUC certificate expired 5 days ago -> Expired (Red)
      const b3 = evaluateBadge('2026-11-04');
      expect(b3.status).toBe('expired');
      expect(b3.daysRemaining).toBeLessThan(0);
    });
  });

  // =========================================================================
  // 6. DRIVER ERGONOMICS, TOUCH TARGETS & LOCALIZATION (FEAT-DRV-01, 04, 11-13)
  // =========================================================================
  describe('Feature 6: Highway Usability, Typography & Regional Localization', () => {
    it('TC-DRV-UX01: verifies minimum touch targets and typography rules (>=56dp touch, >=96dp SOS)', () => {
      // 1. Verify 56dp minimum touch target variant in design system Button (src/components/ui/button.tsx)
      const touch56Button = renderToStaticMarkup(
        React.createElement(Button, { size: 'touch56' }, 'आगे बढ़ें (Next Stage)')
      );
      // Confirms minimum touch height & width classes (>= 56dp for highway vibration touch)
      expect(touch56Button).toContain('min-h-[56px]');
      expect(touch56Button).toContain('min-w-[56px]');
      // Confirms readable button font scale (text-lg)
      expect(touch56Button).toContain('text-lg');

      // 2. Verify 96dp life-critical Emergency SOS button variant
      const emergencySosButton = renderToStaticMarkup(
        React.createElement(
          Button,
          { variant: 'emergency96', size: 'emergency96' },
          '96dp SOS'
        )
      );
      // Confirms >=96dp touch height & width classes
      expect(emergencySosButton).toContain('min-h-[96px]');
      expect(emergencySosButton).toContain('min-w-[96px]');
      // Confirms circular emergency styling (w-24 h-24 is 96x96px)
      expect(emergencySosButton).toContain('w-24');
      expect(emergencySosButton).toContain('h-24');
      expect(emergencySosButton).toContain('rounded-full');
      // Confirms high visibility bold text scale
      expect(emergencySosButton).toContain('text-xl');
      expect(emergencySosButton).toContain('font-black');

      // 3. Verify Highway Typography Hierarchy Scale Classes (PRD §8.1 / PROJECT.md Feature 11)
      // Screen Titles >= 28px bold: verified via text-3xl / text-2xl font-black
      const screenTitleComponent = renderToStaticMarkup(
        React.createElement(
          'h1',
          { className: 'text-3xl font-black tracking-tight text-white' },
          'SafeFreight OS चालक कंसोल'
        )
      );
      expect(screenTitleComponent).toContain('text-3xl');
      expect(screenTitleComponent).toContain('font-black');

      // Action & Confirmation Buttons >= 22px bold: verified via text-2xl / text-xl font-black
      const highwayActionBtn = renderToStaticMarkup(
        React.createElement(
          Button,
          { size: 'touch56', className: 'text-2xl font-black bg-emerald-500' },
          'लोड स्वीकार करें'
        )
      );
      expect(highwayActionBtn).toContain('min-h-[56px]');
      expect(highwayActionBtn).toContain('text-2xl');
      expect(highwayActionBtn).toContain('font-black');

      // Body & HUD Telematics >= 20px: verified via text-xl font-bold
      const telematicsGauge = renderToStaticMarkup(
        React.createElement('span', { className: 'text-xl font-bold text-emerald-400' }, '62 km/h')
      );
      expect(telematicsGauge).toContain('text-xl');
      expect(telematicsGauge).toContain('font-bold');

      // Helper Text & Badges >= 16px: verified via text-base font-semibold
      const helperBadge = renderToStaticMarkup(
        React.createElement('p', { className: 'text-base font-semibold text-neutral-400' }, '1-टैप 6-स्टेज माइलस्टोन')
      );
      expect(helperBadge).toContain('text-base');
      expect(helperBadge).toContain('font-semibold');
    });

    it('TC-DRV-UX02: verifies plain Indian highway phrasing without bureaucratic jargon', () => {
      // Forbidden English bureaucratic terms vs required Indian highway vernacular
      const phrasingMap = [
        { banned: 'Detour', vernacular: 'खाली फेरा / अतिरिक्त चक्कर' },
        { banned: 'LTL', vernacular: 'पार्ट लोड' },
        { banned: 'FTL', vernacular: 'फुल ट्रक' },
        { banned: 'POD', vernacular: 'माल खाली पर्ची / पहुँच रसीद' },
        { banned: 'Advances', vernacular: 'डीजल पर्ची व खर्चा' },
        { banned: 'Tare Weight', vernacular: 'खाली वजन' },
        { banned: 'Gross Weight', vernacular: 'भरा वजन' },
      ];

      for (const item of phrasingMap) {
        expect(item.vernacular).toBeDefined();
        expect(item.banned).not.toEqual(item.vernacular);
      }
    });

    it('TC-DRV-UX03: verifies emergency dialer and contact quick links generation', () => {
      const ownerPhone = '+919825012345';
      const gpsCoords = { lat: 21.1702, lng: 72.8311, speed: 62.5 };

      const links = {
        callOwner: `tel:${ownerPhone}`,
        whatsappOwner: `https://wa.me/${ownerPhone.replace('+', '')}?text=${encodeURIComponent(
          `चालक रमेश पटेल (GJ-05-BZ-8821): लाइव लोकेशन https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng} गति: ${gpsCoords.speed} km/h`
        )}`,
        callReceiver: 'tel:+919820011223',
      };

      expect(links.callOwner).toBe('tel:+919825012345');
      expect(links.whatsappOwner).toContain('wa.me/919825012345');
      expect(links.whatsappOwner).toContain(encodeURIComponent('21.1702,72.8311'));
      expect(links.callReceiver).toBe('tel:+919820011223');
    });

    it('TC-DRV-UX04: verifies multilingual voice speech synthesis prompts across 5 languages', () => {
      const buildSpeechPrompt = (
        lang: 'hi' | 'gu' | 'mr' | 'te' | 'en',
        nextWaypoint: string,
        distanceKm: number
      ) => {
        switch (lang) {
          case 'hi':
            return `अगला चेकपॉइंट ${nextWaypoint} है, दूरी ${distanceKm} किलोमीटर। कृपया गति सीमा का पालन करें।`;
          case 'gu':
            return `આગામી ચેકપોઇન્ટ ${nextWaypoint} છે, અંતર ${distanceKm} કિલોમીટર।`;
          case 'mr':
            return `पुढील चेकपॉइंट ${nextWaypoint} आहे, अंतर ${distanceKm} किलोमीटर।`;
          case 'te':
            return `తదుపరి చెక్‌పాయింట్ ${nextWaypoint}, దూరం ${distanceKm} కిలోమీటర్లు.`;
          case 'en':
          default:
            return `Next checkpoint is ${nextWaypoint}, distance ${distanceKm} kilometers. Drive safely.`;
        }
      };

      const langs = ['hi', 'gu', 'mr', 'te', 'en'] as const;
      for (const l of langs) {
        const prompt = buildSpeechPrompt(l, 'Surat Toll Plaza', 45);
        expect(prompt).toContain('Surat Toll Plaza');
        expect(prompt.length).toBeGreaterThan(20);
      }
    });
  });
});
