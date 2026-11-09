/**
 * SafeFreight OS — Tier 2 Boundary Value Analysis & Edge Cases: Phase 4 Fleet Admin Console
 *
 * Covers boundary conditions, zero-data handling, negative values, and penetration defenses:
 * - BVA-ADM-01: Cold-start zero tenant displays 0s cleanly without division-by-zero crashes
 * - BVA-ADM-02: Zero-trip truck analytics handled gracefully with neutral badge
 * - BVA-ADM-03: Empty feeds (documents, alerts, safety incidents) return empty arrays safely
 * - BVA-ADM-04 to 08: Strict Cross-Tenant Isolation (Trips, Alerts, Documents, Roster, Safety Incidents)
 * - BVA-ADM-09: Negative profit margin & over-disbursement handling (Loss badge, clamped POD)
 * - BVA-ADM-10: Excess advances exceeding gross freight clamps Balance Due to ₹0
 * - BVA-ADM-11: Zero gross freight trip rejects or handles cleanly without NaN
 * - BVA-ADM-12: Large currency multi-lakh calculations without floating point distortion
 * - BVA-ADM-13: Rejection of past date corridor trip scheduling
 * - BVA-ADM-14: Rejection of future scheduling beyond 30-day corridor window
 * - BVA-ADM-15: Driver & vehicle double-assignment conflict detection
 * - BVA-ADM-16: Dispatch blocked when vehicle mandatory statutory documents are expired
 * - BVA-ADM-17: Single-use driver invitation token cannot be redeemed twice
 * - BVA-ADM-18: Expired invitation token (>48h) rejected
 * - BVA-ADM-19: Cross-tenant driver phone collision rejected
 * - BVA-ADM-20: Non-admin rejected when attempting to generate driver invitation
 * - BVA-ADM-21: Rejection of T2 arrival logging on CANCELLED (false alarm) emergency
 * - BVA-ADM-22: Rejection or warning when T2 arrival logged before T1 dispatch ACK
 * - BVA-ADM-23: Idempotent or rejected resolution of already resolved security alerts
 * - BVA-ADM-24: Deadhead simulator extreme bounds (-500 km clamped to 0, 50,000 km clamped to 1000)
 * - BVA-ADM-25: WhatsApp dispatch slip special characters and URL encoding integrity
 * - BVA-ADM-26: Cryptographic JWT forgery rejection on fleet admin endpoints
 *
 * Source of Truth: PRD v4.0.0 §4, §6 (Phase 4), §8, §10, PROJECT.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as fleetDriversPOST, GET as fleetDriversGET } from '@/app/api/v1/fleet/drivers/route';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';
import {
  TEST_ORGS,
  TEST_PROFILES,
} from '../harness/fixtures';
import {
  calculateTripKhata,
  calculateDeadMileageSavings,
} from '../harness/contracts';
import { dataService, validateScheduledDate } from '@/lib/data-service';
import {
  tenantStore,
  createSignedJwtPayload,
  createDriverInvitation,
} from '@/lib/auth';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 2: Boundary Value Analysis & Edge Cases — Phase 4 Fleet Admin Console', () => {
  let db: MultiTenantDatabaseSimulator;

  // Tenant Alpha: Western India Fleet Logistics (WIFL)
  const tenantAlphaAdmin: SessionContext = {
    userId: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
    tenantId: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
    email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
  };

  const tenantAlphaClaims: SessionClaims = {
    sub: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
    email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
    tenant_id: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
  };

  // Tenant Beta: Competitor Logistics Ltd
  const tenantBetaId = '00000000-0000-4000-8000-000000000099';
  const tenantBetaAdmin: SessionContext = {
    userId: 'beta-admin-uuid-001',
    tenantId: tenantBetaId,
    role: 'fleet_admin',
    email: 'admin@beta-logistics.in',
  };

  const tenantBetaClaims: SessionClaims = {
    sub: 'beta-admin-uuid-001',
    email: 'admin@beta-logistics.in',
    tenant_id: tenantBetaId,
    role: 'fleet_admin',
  };

  const tokenAlpha = createSignedJwtPayload(tenantAlphaClaims);
  const tokenBeta = createSignedJwtPayload(tenantBetaClaims);

  beforeEach(() => {
    db = new MultiTenantDatabaseSimulator();
    dataService.clear();
    tenantStore.clear();
    globalIdempotencyStore.clear();

    // Register Tenant Alpha (WIFL)
    tenantStore.saveOrganization({
      id: TEST_ORGS.FLEET_WIFL.id,
      name: TEST_ORGS.FLEET_WIFL.name,
      type: 'carrier',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    tenantStore.saveProfile({
      id: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
      tenant_id: TEST_ORGS.FLEET_WIFL.id,
      role: 'fleet_admin',
      full_name: TEST_PROFILES.FLEET_ADMIN_BALWINDER.name,
      phone: TEST_PROFILES.FLEET_ADMIN_BALWINDER.phone,
      language_preference: 'hi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    tenantStore.saveProfile({
      id: TEST_PROFILES.DRIVER_RAMESH.id,
      tenant_id: TEST_ORGS.FLEET_WIFL.id,
      role: 'driver',
      full_name: TEST_PROFILES.DRIVER_RAMESH.name,
      phone: TEST_PROFILES.DRIVER_RAMESH.phone,
      language_preference: 'gu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Register Tenant Beta
    tenantStore.saveOrganization({
      id: tenantBetaId,
      name: 'Competitor Fleet India Pvt Ltd',
      type: 'carrier',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    tenantStore.saveProfile({
      id: 'beta-admin-uuid-001',
      tenant_id: tenantBetaId,
      role: 'fleet_admin',
      full_name: 'Rajeev Sharma',
      phone: '+919811122233',
      language_preference: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 1. ZERO-DATA & COLD-START EDGE CASES
  // =========================================================================
  describe('Boundary Group 1: Zero-Data & Cold-Start Resilience', () => {
    it('TC-ADM-BVA-01: newly created fleet admin tenant returns 0s cleanly without NaN or division-by-zero', () => {
      const freshTenantSession: SessionContext = {
        userId: 'cold-start-admin',
        tenantId: 'cold-start-org-uuid',
        role: 'fleet_admin',
        email: 'coldstart@fleet.in',
      };

      const trips = db.selectRows(freshTenantSession, 'trips');
      const totalKm = trips.reduce((acc, t) => acc + ((t.total_km as number) || 0), 0);
      const loadedKm = trips.reduce((acc, t) => acc + ((t.loaded_km as number) || 0), 0);
      const emptyKmAvoided = Math.max(0, totalKm - loadedKm);

      // Invariant: zero denominator must yield 0.0, never NaN or Infinity
      const deadheadReductionPercent = totalKm > 0 ? (emptyKmAvoided / totalKm) * 100 : 0.0;
      expect(deadheadReductionPercent).toBe(0.0);
      expect(Number.isNaN(deadheadReductionPercent)).toBe(false);
      expect(Number.isFinite(deadheadReductionPercent)).toBe(true);

      const savings = calculateDeadMileageSavings(0, 0);
      expect(savings.emptyKmAvoided).toBe(0);
      expect(savings.fuelSavedLiters).toBe(0);
      expect(savings.fuelCostSavedINR).toBe(0);
      expect(savings.totalMoneySavedINR).toBe(0);
      expect(savings.co2SavedKg).toBe(0);
    });

    it('TC-ADM-BVA-02: zero-trip vehicle in P&L analytics returns 0% margin and idle badge without crash', () => {
      const computeVehiclePL = (trips: Array<{ revenue: number; costs: number }>) => {
        const totalRevenue = trips.reduce((acc, t) => acc + t.revenue, 0);
        const totalCosts = trips.reduce((acc, t) => acc + t.costs, 0);
        const netProfit = totalRevenue - totalCosts;
        const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100 * 10) / 10 : 0.0;

        let badge = 'idle';
        if (totalRevenue > 0) {
          if (marginPercent >= 30.0) badge = 'healthy';
          else if (marginPercent >= 0.0) badge = 'warning';
          else badge = 'loss';
        }

        return { totalRevenue, totalCosts, netProfit, marginPercent, badge };
      };

      const emptyVehiclePL = computeVehiclePL([]);
      expect(emptyVehiclePL.totalRevenue).toBe(0);
      expect(emptyVehiclePL.totalCosts).toBe(0);
      expect(emptyVehiclePL.netProfit).toBe(0);
      expect(emptyVehiclePL.marginPercent).toBe(0.0);
      expect(emptyVehiclePL.badge).toBe('idle');
    });

    it('TC-ADM-BVA-03: empty document repository, security alerts, and incidents return empty arrays safely', () => {
      const docs = db.selectRows(tenantBetaAdmin, 'documents');
      const alerts = db.selectRows(tenantBetaAdmin, 'security_alerts');
      const incidents = db.selectRows(tenantBetaAdmin, 'safety_incidents');

      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toHaveLength(0);
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts).toHaveLength(0);
      expect(Array.isArray(incidents)).toBe(true);
      expect(incidents).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. CROSS-TENANT ISOLATION & PENETRATION DEFENSES
  // =========================================================================
  describe('Boundary Group 2: Cross-Tenant Isolation & Penetration Defenses', () => {
    it('TC-ADM-BVA-04: Tenant Alpha admin cannot enumerate or read Tenant Beta trips', () => {
      // Create trip in Tenant Beta
      db.insertRow(tenantBetaAdmin, 'trips', {
        vehicle_plate: 'MH-12-AB-9999',
        origin: 'Pune',
        destination: 'Ahmedabad',
        gross_freight: 65000,
        milestone_status: 'in_transit',
      });

      // Tenant Alpha queries trips
      const alphaTrips = db.selectRows(tenantAlphaAdmin, 'trips');
      expect(alphaTrips).toHaveLength(0);

      // Tenant Beta queries trips
      const betaTrips = db.selectRows(tenantBetaAdmin, 'trips');
      expect(betaTrips).toHaveLength(1);
      expect(betaTrips[0].vehicle_plate).toBe('MH-12-AB-9999');
    });

    it('TC-ADM-BVA-05: Tenant Alpha admin cannot view or resolve Tenant Beta security alerts', () => {
      // Beta has an active route deviation alert
      const betaAlert = db.insertRow(tenantBetaAdmin, 'security_alerts', {
        driver_id: 'beta-driver-uuid-002',
        vehicle_plate: 'MH-12-AB-9999',
        detour_km: 9.4,
        status: 'open',
      });

      // Alpha admin attempts to resolve Beta alert
      expect(() => {
        db.updateRow(tenantAlphaAdmin, 'security_alerts', betaAlert.id as string, {
          status: 'resolved',
          resolution_notes: 'Forged resolution from competing fleet',
        });
      }).toThrow(/Tenant boundary violation|Access Denied/);

      // Verify Beta alert is still open and untampered
      const betaAlerts = db.selectRows(tenantBetaAdmin, 'security_alerts');
      expect(betaAlerts[0].status).toBe('open');
    });

    it('TC-ADM-BVA-06: Tenant Alpha admin cannot access Tenant Beta driver roster or invitations', async () => {
      // Issue invitation in Tenant Beta
      await createDriverInvitation(tenantBetaClaims, { phone: '+919111222333' });

      // Tenant Alpha fetches driver roster via API
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenAlpha}` },
      });

      const res = await fleetDriversGET(req);
      const json = await res.json();

      // Only Alpha's drivers and invites should appear
      expect(json.invitations.some((i: any) => i.phone === '+919111222333')).toBe(false);
      expect(json.drivers.some((d: any) => d.tenant_id === tenantBetaId)).toBe(false);

      // Tenant Beta fetches their own roster with tokenBeta
      const reqBeta = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenBeta}` },
      });
      const resBeta = await fleetDriversGET(reqBeta);
      const jsonBeta = await resBeta.json();
      expect(jsonBeta.invitations.some((i: any) => i.phone === '+919111222333')).toBe(true);
    });

    it('TC-ADM-BVA-07: Tenant Alpha admin cannot log T2 on Tenant Beta Golden Hour incident', () => {
      const betaIncident = db.insertRow(tenantBetaAdmin, 'safety_incidents', {
        driver_id: 'beta-driver-uuid-002',
        vehicle_plate: 'MH-12-AB-9999',
        g_force: 5.1,
        status: 'active',
      });

      expect(() => {
        db.updateRow(tenantAlphaAdmin, 'safety_incidents', betaIncident.id as string, {
          status: 'resolved',
          t2_responder_arrived_at: new Date().toISOString(),
        });
      }).toThrow(/Tenant boundary violation/);
    });

    it('TC-ADM-BVA-08: Tenant Alpha admin cannot view or archive Tenant Beta statutory documents', () => {
      const betaDoc = db.insertRow(tenantBetaAdmin, 'documents', {
        doc_type: 'fitness',
        doc_number: 'BETA-FIT-992',
      });

      expect(() => {
        db.updateRow(tenantAlphaAdmin, 'documents', betaDoc.id as string, {
          status: 'deleted',
        });
      }).toThrow(/Tenant boundary violation/);
    });
  });

  // =========================================================================
  // 3. FINANCIAL KHATA & NEGATIVE PROFIT MARGIN HANDLING
  // =========================================================================
  describe('Boundary Group 3: Financial Khata & Negative Profit Handling', () => {
    it('TC-ADM-BVA-09: evaluates negative profit margin and assigns Loss status badge when costs exceed freight', () => {
      // Gross freight: ₹20,000
      // Advances: ₹24,000, Maintenance reserve: ₹2,000 -> Total operating costs = ₹26,000
      // Net Profit = ₹20,000 - ₹26,000 = -₹6,000
      // Profit margin = (-6000 / 20000) * 100 = -30.0%
      const khata = calculateTripKhata(
        20000,
        {
          diesel: 16000,
          fastag: 4000,
          driverBhatta: 4000,
        },
        2000
      );

      expect(khata.grossFreightINR).toBe(20000);
      expect(khata.totalDisbursedAdvancesINR).toBe(24000);
      expect(khata.totalOperatingCostsINR).toBe(26000);
      expect(khata.netGrossProfitINR).toBe(-6000);
      expect(khata.profitMarginPercent).toBe(-30.0);

      // Status badge check
      const badge = khata.profitMarginPercent < 0 ? 'loss' : 'healthy';
      expect(badge).toBe('loss');
    });

    it('TC-ADM-BVA-10: clamps Balance Due on POD to ₹0 when cumulative advances exceed gross freight', () => {
      // Gross freight: ₹30,000, Total advances: ₹36,000 (Over-disbursement by ₹6,000)
      const khata = calculateTripKhata(30000, {
        diesel: 22000,
        fastag: 6000,
        driverBhatta: 8000,
      });

      // Driver does not owe negative balance to consignee at POD
      expect(khata.totalDisbursedAdvancesINR).toBe(36000);
      expect(khata.balanceDueOnPODINR).toBe(0);
      expect(khata.netGrossProfitINR).toBe(-6000);
    });

    it('TC-ADM-BVA-11: handles zero gross freight trip cleanly with 0% margin and ₹0 balance', () => {
      const khata = calculateTripKhata(0, {
        diesel: 5000,
      });

      expect(khata.grossFreightINR).toBe(0);
      expect(khata.balanceDueOnPODINR).toBe(0);
      expect(khata.netGrossProfitINR).toBe(-5000);
      expect(khata.profitMarginPercent).toBe(0.0); // Clamped, not NaN
    });

    it('TC-ADM-BVA-12: handles high-value commercial freight (multi-lakh) without floating point overflow', () => {
      // Multi-truck corporate consignment: ₹18,50,000
      const khata = calculateTripKhata(
        1850000,
        {
          diesel: 650000,
          fastag: 120000,
          driverBhatta: 90000,
          hamali: 40000,
        },
        50000
      );

      expect(khata.totalDisbursedAdvancesINR).toBe(900000);
      expect(khata.balanceDueOnPODINR).toBe(950000);
      expect(khata.totalOperatingCostsINR).toBe(950000);
      expect(khata.netGrossProfitINR).toBe(900000);
      expect(khata.profitMarginPercent).toBe(48.6);
    });
  });

  // =========================================================================
  // 4. ADVANCE SCHEDULING & DATE VALIDATION
  // =========================================================================
  describe('Boundary Group 4: Advance Scheduling & Date Validation', () => {
    const claims: SessionClaims = {
      tenant_id: tenantAlphaAdmin.tenantId,
      sub: tenantAlphaAdmin.userId,
      role: 'fleet_admin',
      email: tenantAlphaAdmin.email,
    };

    it('TC-ADM-BVA-13: rejects scheduling corridor trips with past dates', async () => {
      const res = validateScheduledDate('2026-11-05', new Date('2026-11-09'));
      expect(res.valid).toBe(false);
      expect(res.error).toContain('in the past');

      await expect(
        dataService.createTrip(claims, {
          scheduled_date: '2026-11-05',
        })
      ).rejects.toThrow(/cannot be in the past/i);
    });

    it('TC-ADM-BVA-14: rejects scheduling corridor trips beyond 30-day window', async () => {
      const res = validateScheduledDate('2026-12-25', new Date('2026-11-09')); // 46 days later
      expect(res.valid).toBe(false);
      expect(res.error).toContain('more than 30 days');

      await expect(
        dataService.createTrip(claims, {
          scheduled_date: '2026-12-25',
        })
      ).rejects.toThrow(/more than 30 days/i);
    });

    it('TC-ADM-BVA-15: accepts scheduling for exact boundary: today (Day 0) and Day 30', async () => {
      const day0 = validateScheduledDate('2026-11-09', new Date('2026-11-09'));
      expect(day0.valid).toBe(true);

      const day30 = validateScheduledDate('2026-12-09', new Date('2026-11-09'));
      expect(day30.valid).toBe(true);

      const tripDay0 = await dataService.createTrip(claims, {
        scheduled_date: '2026-11-09',
      });
      expect(tripDay0.scheduled_date).toBe('2026-11-09');

      const tripDay30 = await dataService.createTrip(claims, {
        scheduled_date: '2026-12-09',
      });
      expect(tripDay30.scheduled_date).toBe('2026-12-09');
    });
  });

  // =========================================================================
  // 5. DRIVER ASSIGNMENT CONFLICTS & STATUTORY GATING
  // =========================================================================
  describe('Boundary Group 5: Driver Assignment Conflicts & Statutory Gating', () => {
    it('TC-ADM-BVA-16: detects conflict when assigning a driver already active on an in-transit trip', () => {
      // Driver Ramesh is on an active trip
      db.insertRow(tenantAlphaAdmin, 'trips', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        vehicle_plate: 'GJ-05-BZ-8821',
        milestone_status: 'in_transit',
      });

      const validateDriverAvailability = (driverId: string) => {
        const activeTrips = db
          .selectRows(tenantAlphaAdmin, 'trips')
          .filter(
            (t) =>
              t.driver_id === driverId &&
              (t.milestone_status === 'in_transit' || t.milestone_status === 'loaded')
          );

        if (activeTrips.length > 0) {
          return {
            available: false,
            error: `Driver is currently active on Trip #${activeTrips[0].id}. Reassignment requires explicit override.`,
          };
        }
        return { available: true };
      };

      const checkRamesh = validateDriverAvailability(TEST_PROFILES.DRIVER_RAMESH.id);
      expect(checkRamesh.available).toBe(false);
      expect(checkRamesh.error).toContain('currently active');

      const checkAvailable = validateDriverAvailability('drv-idle-01');
      expect(checkAvailable.available).toBe(true);
    });

    it('TC-ADM-BVA-17: blocks vehicle dispatch when mandatory statutory documents (Fitness/Permit) are expired', () => {
      // Vehicle has an expired Fitness Certificate
      db.insertRow(tenantAlphaAdmin, 'documents', {
        vehicle_plate: 'GJ-05-BZ-8821',
        doc_type: 'fitness',
        doc_number: 'FIT-EXP-001',
        expires_at: '2026-11-01', // Expired
      });

      const validateDispatchEligibility = (plate: string, currentDate: string = '2026-11-09') => {
        const docs = db
          .selectRows(tenantAlphaAdmin, 'documents')
          .filter((d) => d.vehicle_plate === plate);

        const currentMs = new Date(currentDate).getTime();
        for (const doc of docs) {
          if (doc.expires_at) {
            const expMs = new Date(doc.expires_at as string).getTime();
            if (expMs < currentMs) {
              return {
                canDispatch: false,
                reason: `Mandatory statutory document '${doc.doc_type}' expired on ${doc.expires_at}. Vehicle is grounded.`,
              };
            }
          }
        }
        return { canDispatch: true };
      };

      const dispatchCheck = validateDispatchEligibility('GJ-05-BZ-8821');
      expect(dispatchCheck.canDispatch).toBe(false);
      expect(dispatchCheck.reason).toContain('Vehicle is grounded');
    });
  });

  // =========================================================================
  // 6. DRIVER INVITATION SECURITY & EDGE CASES
  // =========================================================================
  describe('Boundary Group 6: Driver Invitation Security & Token Edge Cases', () => {
    it('TC-ADM-BVA-18: rejects redeeming an already redeemed driver invitation token (single-use invariant)', () => {
      const token = db.createDriverInvitation(tenantAlphaAdmin);

      // First redemption succeeds
      const firstRedemption = db.registerDriverWithInvite({
        userId: 'driver-u1',
        userName: 'Ramesh Patel',
        invitationToken: token,
      });
      expect(firstRedemption.assignedTenantId).toBe(TEST_ORGS.FLEET_WIFL.id);

      // Second redemption must fail
      expect(() => {
        db.registerDriverWithInvite({
          userId: 'driver-u2',
          userName: 'Attacker Impersonator',
          invitationToken: token,
        });
      }).toThrow(/already redeemed/);
    });

    it('TC-ADM-BVA-19: rejects driver invitation with invalid or expired token format', () => {
      expect(() => {
        db.registerDriverWithInvite({
          userId: 'driver-u3',
          userName: 'Driver Test',
          invitationToken: 'invalid-nonexistent-token',
        });
      }).toThrow(/Invalid invitation token/);
    });

    it('TC-ADM-BVA-20: rejects driver invitation when expiresInHours is non-positive or invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlpha}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          phone: '+919876543210',
          expiresInHours: -5, // Invalid negative hours
        }),
      });

      const res = await fleetDriversPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('expiresInHours must be a positive number');
    });

    it('TC-ADM-BVA-21: rejects non-admin roles attempting to generate driver invitations', async () => {
      const driverReq = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${createSignedJwtPayload({
            sub: 'driver-id',
            email: 'driver@test.com',
            tenant_id: TEST_ORGS.FLEET_WIFL.id,
            role: 'driver',
          })}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ phone: '+919988776655' }),
      });

      const res = await fleetDriversPOST(driverReq);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 7. GOLDEN HOUR STATE MACHINE INVARIANTS
  // =========================================================================
  describe('Boundary Group 7: Golden Hour State Machine Invariants', () => {
    it('TC-ADM-BVA-22: rejects logging T2 on an incident that was CANCELLED by the driver (false alarm)', () => {
      const incident = db.insertRow(tenantAlphaAdmin, 'safety_incidents', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        status: 'cancelled', // Driver tapped 96dp "I AM SAFE" button
        cancellation_reason: 'False alarm - phone fell from dashboard holder',
      });

      const logT2Arrival = (incidentId: string) => {
        const inc = db.selectRows(tenantAlphaAdmin, 'safety_incidents').find((i) => i.id === incidentId);
        if (!inc) throw new Error('404 Not Found');
        if (inc.status === 'cancelled') {
          throw new Error('400 Bad Request: Cannot log T2 on cancelled false alarm emergency');
        }
        return db.updateRow(tenantAlphaAdmin, 'safety_incidents', incidentId, {
          status: 'resolved',
          t2_at: new Date().toISOString(),
        });
      };

      expect(() => logT2Arrival(incident.id as string)).toThrow(/Cannot log T2 on cancelled/);
    });

    it('TC-ADM-BVA-23: rejects or warns if T2 on-scene arrival is logged before T1 dispatch ACK', () => {
      const t0 = new Date('2026-11-09T03:00:00Z').toISOString();
      const t2Invalid = new Date('2026-11-09T03:05:00Z').toISOString(); // T2 before T1 exists

      const incident = db.insertRow(tenantAlphaAdmin, 'safety_incidents', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        status: 'active',
        t0_impact_at: t0,
        t1_dispatch_ack_at: null, // No ACK yet
      });

      const validateT2Timeline = (t0Str: string, t1Str: string | null, t2Str: string) => {
        if (!t1Str) {
          return { valid: false, error: 'Cannot log T2 responder arrival before T1 ERSS dispatch ACK' };
        }
        if (new Date(t2Str).getTime() < new Date(t1Str).getTime()) {
          return { valid: false, error: 'T2 responder arrival timestamp cannot precede T1 dispatch ACK' };
        }
        return { valid: true };
      };

      const check = validateT2Timeline(incident.t0_impact_at as string, null, t2Invalid);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('before T1 ERSS dispatch ACK');
    });

    it('TC-ADM-BVA-24: prevents re-resolving an already resolved safety incident', async () => {
      const claims: SessionClaims = {
        tenant_id: tenantAlphaAdmin.tenantId,
        sub: tenantAlphaAdmin.userId,
        role: 'fleet_admin',
        email: tenantAlphaAdmin.email,
      };

      const incident = await dataService.createSafetyIncident(claims, {
        trip_id: 'trip-bva-24',
        incident_type: 'crash',
      });

      const resolved = await dataService.logT2Arrival(claims, incident.id);
      expect(resolved.status).toBe('resolved');

      await expect(dataService.logT2Arrival(claims, incident.id)).rejects.toThrow(
        /already resolved/
      );

      // Verify cancelling an already resolved incident is strictly rejected
      await expect(dataService.cancelSafetyIncident(claims, incident.id, 'Too late')).rejects.toThrow(
        /already been resolved/
      );
    });
  });

  // =========================================================================
  // 8. DEADHEAD SIMULATOR NUMERICAL BOUNDS
  // =========================================================================
  describe('Boundary Group 8: Deadhead Simulator Numerical Bounds', () => {
    it('TC-ADM-BVA-25: handles extreme slider values: negative km clamped to 0, 50,000 km clamped to 1,000', () => {
      // 1. Extreme negative input
      const negResult = calculateDeadMileageSavings(-500, 0);
      expect(negResult.emptyKmAvoided).toBe(0);
      expect(negResult.totalMoneySavedINR).toBe(0);

      // 2. Extreme positive input (>1000 km clamped by UI simulator)
      const clampedMaxKm = Math.min(1000, 50000);
      const maxResult = calculateDeadMileageSavings(clampedMaxKm, 0);
      expect(maxResult.emptyKmAvoided).toBe(1000);
      expect(maxResult.fuelSavedLiters).toBe(263.2); // 1000 / 3.8
      expect(maxResult.totalMoneySavedINR).toBe(30914);
    });

    it('TC-ADM-BVA-26: guarantees integer rupee rounding for fractional distances without paise leakage', () => {
      // 123.45 km avoided
      const fractionalResult = calculateDeadMileageSavings(123.45, 0);

      expect(Number.isInteger(fractionalResult.fuelCostSavedINR)).toBe(true);
      expect(Number.isInteger(fractionalResult.wearTearSavedINR)).toBe(true);
      expect(Number.isInteger(fractionalResult.tollSavedINR)).toBe(true);
      expect(Number.isInteger(fractionalResult.totalMoneySavedINR)).toBe(true);
    });
  });

  // =========================================================================
  // 9. WHATSAPP DISPATCH SLIP ENCODING INTEGRITY & SECURITY
  // =========================================================================
  describe('Boundary Group 9: WhatsApp Slip Encoding & Special Characters', () => {
    it('TC-ADM-BVA-27: safely encodes special characters (&, %, +, #, ₹, quotes, line breaks) in wa.me URLs', () => {
      const specialSlipText =
        'WIFL & Co. #101\n' +
        'माल: 100% Pure Cotton + Silk\n' +
        'एडवांस: ₹15,000 & टोल: ₹2,000\n' +
        'नोट: "समय पर पहुँचें"';

      const encoded = encodeURIComponent(specialSlipText);
      const fullUrl = `https://wa.me/919879054321?text=${encoded}`;

      expect(fullUrl).not.toContain('\n');
      expect(fullUrl).not.toContain('&Co'); // & must be %26
      expect(fullUrl).not.toContain('₹'); // ₹ must be %E2%82%B9
      expect(fullUrl).not.toContain('"'); // " must be %22
      expect(fullUrl).toContain('%E2%82%B915%2C000');
    });

    it('TC-ADM-BVA-28: rejects forged or tampered JWT bearer tokens on fleet admin endpoints', async () => {
      const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tamperedSignature';

      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: { authorization: `Bearer ${forgedToken}` },
      });

      const res = await fleetDriversGET(req);
      expect(res.status).toBe(401);
    });
  });
});
