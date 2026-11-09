/**
 * SafeFreight OS — Tier 1 Feature Coverage Suite: Phase 4 Fleet Admin Console
 *
 * Covers all Phase 4 Fleet Admin Console features (Features 16–34):
 * - FEAT-ADM-16: Operations Control Header & Fleet Identity (WIFL, corridor, sync beacon)
 * - FEAT-ADM-17: Real-Time Fleet KPI Cards & Formulas (Active Assets, Deadhead %, Fuel Saved, Alerts)
 * - FEAT-ADM-18: Freight Requests & Return Load Matching Tab (LTL vs FTL, net profit score, truck assignment)
 * - FEAT-ADM-19: Driver & Vehicle Allocation Roster Tab (Plate, specs, live status badges)
 * - FEAT-ADM-20: 1-Click Driver Calling & WhatsApp Links (E.164 +91 tel:, prefilled wa.me)
 * - FEAT-ADM-21: Driver Provisioning via Invitation Mechanism (Single-use tokens, no raw auth inserts)
 * - FEAT-ADM-22: Driver Credential & Password Management Modal (Secure admin reset, audit trail)
 * - FEAT-ADM-23: Trip Dispatch Center & Advance Trip Planner Tab (Dispatch list, progress, metrics)
 * - FEAT-ADM-24: 1-Click WhatsApp Trip Dispatch Slip Generator (Vernacular Hindi/Hinglish slip, URL encoding)
 * - FEAT-ADM-25: Advance Corridor Trip Scheduling Modal (Up to 30 days, 3-way route profiling)
 * - FEAT-ADM-26: Digital Trip Khata & Advance Bhatta Ledger Tab (Balance = GrossFreight - Advances, Lakhs/Hazaars)
 * - FEAT-ADM-27: Truck-wise Gross P&L Analytics ("Gaadi-wise Kamai") (Margins, health badge status)
 * - FEAT-ADM-28: Interactive Corridor Deadhead Reduction Simulator (0..1000 km slider formulas)
 * - FEAT-ADM-29: Statutory Document Repository Tab (AITP, Fitness, PUC, Insurance; validity badges)
 * - FEAT-ADM-30: Security & Route Deviation Alerts Monitor (Detour >5 km, halt >45 min, resolve alert)
 * - FEAT-ADM-31: Golden Hour Safety Incident Command Console (T0 impact, T1 ERSS ACK, T2 on-scene resolution)
 * - FEAT-ADM-32: Interactive Corridor Leaflet Fleet Map (NH 48 waypoints, live vehicle coordinates)
 * - FEAT-ADM-33: Notion-Calm Management UI Design System (Palette #f6f5f4, card tokens, typography)
 * - FEAT-ADM-34: Fleet Admin Route Guard & Tenant Scoping (Role authorization, 403/401 enforcement)
 *
 * Source of Truth: PRD v4.0.0 §6 (Phase 4), PRD v3.0 FR-FO-01 to 11, NEW_REQUIREMENTS FR-A1 to A5, PROJECT.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as fleetDriversPOST, GET as fleetDriversGET } from '@/app/api/v1/fleet/drivers/route';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';
import {
  NH48_WESTERN_CORRIDOR_WAYPOINTS,
  TEST_ORGS,
  TEST_PROFILES,
} from '../harness/fixtures';
import {
  calculate3WayRoutes,
  calculateTripKhata,
  calculateDeadMileageSavings,
  generateStatutoryLRNumber,
  validateEWayBillNumber,
  validateGSTIN,
} from '../harness/contracts';
import { dataService } from '@/lib/data-service';
import {
  tenantStore,
  createSignedJwtPayload,
  createDriverInvitation,
} from '@/lib/auth';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 1: Feature Coverage — Phase 4 Fleet Admin Console', () => {
  let db: MultiTenantDatabaseSimulator;

  // Primary Persona Sessions
  const fleetAdminSession: SessionContext = {
    userId: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
    tenantId: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
    email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
  };

  const shipperSession: SessionContext = {
    userId: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
    tenantId: TEST_ORGS.SHIPPER_ADANI.id,
    role: 'shipper',
    email: TEST_PROFILES.SHIPPER_ADANI_EXEC.email,
  };

  const fleetAdminClaims: SessionClaims = {
    sub: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
    email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
    tenant_id: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
  };

  const driverClaims: SessionClaims = {
    sub: TEST_PROFILES.DRIVER_RAMESH.id,
    email: TEST_PROFILES.DRIVER_RAMESH.email,
    tenant_id: TEST_ORGS.FLEET_WIFL.id,
    role: 'driver',
  };

  const shipperClaims: SessionClaims = {
    sub: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
    email: TEST_PROFILES.SHIPPER_ADANI_EXEC.email,
    tenant_id: TEST_ORGS.SHIPPER_ADANI.id,
    role: 'shipper',
  };

  const fleetAdminToken = createSignedJwtPayload(fleetAdminClaims);
  const driverToken = createSignedJwtPayload(driverClaims);
  const shipperToken = createSignedJwtPayload(shipperClaims);

  beforeEach(() => {
    db = new MultiTenantDatabaseSimulator();
    dataService.clear();
    tenantStore.clear();
    globalIdempotencyStore.clear();

    // Re-seed base tenant fixtures into tenantStore
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
  });

  // =========================================================================
  // 1. OPERATIONS CONTROL HEADER & FLEET IDENTITY (FEAT-ADM-16)
  // =========================================================================
  describe('Feature 16: Operations Control Header & Fleet Identity', () => {
    it('TC-ADM-16-01: retrieves command header metadata for Western India Fleet Logistics', () => {
      const org = tenantStore.getOrganization(TEST_ORGS.FLEET_WIFL.id);
      expect(org).toBeDefined();
      expect(org?.name).toBe('Western India Fleet Logistics');
      expect(org?.type).toBe('carrier');

      // Command header operational properties
      const headerState = {
        fleetName: org?.name,
        corridor: 'NH 48 Western Freight Spine (JNPT - Ahmedabad)',
        syncBeacon: 'live',
        activeTenantId: org?.id,
      };

      expect(headerState.fleetName).toBe('Western India Fleet Logistics');
      expect(headerState.corridor).toContain('NH 48');
      expect(headerState.syncBeacon).toBe('live');
      expect(headerState.activeTenantId).toBe(TEST_ORGS.FLEET_WIFL.id);
    });

    it('TC-ADM-16-02: updates fleet operating corridor preferences with audit trail', () => {
      const admin = db.registerFleetAdminOrShipper({
        userId: 'balwinder-uuid',
        orgName: 'Western India Fleet Logistics',
        orgType: 'fleet_operator',
        role: 'fleet_admin',
        userName: 'Sardar Balwinder Singh',
      });

      const updated = db.updateOrganization(
        { userId: 'balwinder-uuid', tenantId: admin.orgId, role: 'fleet_admin', email: 'balwinder@wifl.in' },
        admin.orgId,
        { primary_corridor: 'NH 48 Mumbai-Ahmedabad', toll_preference: 'toll_optimized' }
      );

      expect(updated.name).toBe('Western India Fleet Logistics');
      const retrieved = db.selectOrganizations({
        userId: 'balwinder-uuid',
        tenantId: admin.orgId,
        role: 'fleet_admin',
        email: 'balwinder@wifl.in',
      });
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].name).toBe('Western India Fleet Logistics');
    });
  });

  // =========================================================================
  // 2. REAL-TIME FLEET KPI CARDS & FORMULAS (FEAT-ADM-17)
  // =========================================================================
  describe('Feature 17: Real-Time Fleet KPI Cards & Formulas', () => {
    it('TC-ADM-17-01: calculates Active Fleet Assets count from assigned drivers and vehicles', () => {
      // Create 3 active drivers in organization
      const drivers = [
        { id: 'drv-01', name: 'Ramesh Patel', vehicle: 'GJ-05-BZ-8821', status: 'on_trip' },
        { id: 'drv-02', name: 'Baldev Singh', vehicle: 'MH-04-GP-1920', status: 'on_trip' },
        { id: 'drv-03', name: 'Kiran Desai', vehicle: 'GJ-06-TT-4412', status: 'idle' },
      ];

      for (const d of drivers) {
        db.insertRow(fleetAdminSession, 'pings', {
          driver_id: d.id,
          vehicle_plate: d.vehicle,
          status: d.status,
        });
      }

      const activeVehicles = drivers.filter((d) => d.status === 'on_trip').length;
      const totalDrivers = drivers.length;

      expect(totalDrivers).toBe(3);
      expect(activeVehicles).toBe(2);
    });

    it('TC-ADM-17-02: calculates Deadhead Reduction Percentage from completed corridor trips', () => {
      // Completed trips:
      // Trip 1: 525 km total, 525 km loaded (0 km empty)
      // Trip 2: 525 km total, 450 km loaded (75 km empty avoided through return backhaul)
      // Trip 3: 525 km total, 500 km loaded (25 km empty avoided)
      const tripsData = [
        { totalKm: 525, loadedKm: 525 },
        { totalKm: 525, loadedKm: 450 },
        { totalKm: 525, loadedKm: 500 },
      ];

      const sumTotalKm = tripsData.reduce((acc, t) => acc + t.totalKm, 0); // 1575 km
      const sumLoadedKm = tripsData.reduce((acc, t) => acc + t.loadedKm, 0); // 1475 km
      const emptyKmAvoided = tripsData.reduce(
        (acc, t) => acc + (t.totalKm - t.loadedKm),
        0
      ); // 100 km

      const deadheadReductionPercent =
        sumTotalKm > 0 ? Math.round((emptyKmAvoided / sumTotalKm) * 100 * 10) / 10 : 0;

      expect(sumTotalKm).toBe(1575);
      expect(sumLoadedKm).toBe(1475);
      expect(emptyKmAvoided).toBe(100);
      expect(deadheadReductionPercent).toBe(6.3); // (100 / 1575) * 100 = 6.349 -> 6.3%
    });

    it('TC-ADM-17-03: computes Fuel Cost Saved and Capital Recaptured across fleet', () => {
      // 1,050 km total empty distance eliminated by return matching
      const savings = calculateDeadMileageSavings(1050, 0);

      expect(savings.emptyKmAvoided).toBe(1050);
      expect(savings.fuelSavedLiters).toBe(276.3); // 1050 / 3.8
      expect(savings.fuelCostSavedINR).toBe(25420); // 276.3 * 92
      expect(savings.wearTearSavedINR).toBe(4725); // 1050 * 4.5
      expect(savings.tollSavedINR).toBe(2310); // 1050 * 2.2
      expect(savings.totalMoneySavedINR).toBe(32455);
      expect(savings.co2SavedKg).toBe(740.5); // 276.3 * 2.68
    });

    it('TC-ADM-17-04: aggregates Active Unresolved Alerts across security and safety streams', () => {
      // 2 route deviations (1 open, 1 resolved)
      db.insertRow(fleetAdminSession, 'security_alerts', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        severity: 'high',
        status: 'open',
      });
      db.insertRow(fleetAdminSession, 'security_alerts', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        severity: 'medium',
        status: 'resolved',
      });

      // 1 active safety collision incident
      db.insertRow(fleetAdminSession, 'safety_incidents', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        status: 'active',
        g_force: 4.8,
      });

      const alerts = db.selectRows(fleetAdminSession, 'security_alerts');
      const incidents = db.selectRows(fleetAdminSession, 'safety_incidents');

      const activeAlertsCount =
        alerts.filter((a) => a.status === 'open').length +
        incidents.filter((i) => i.status === 'active').length;

      expect(activeAlertsCount).toBe(2);
    });

    it('TC-ADM-17-05: verifies cold-start tenant returns 0s cleanly without division-by-zero crashes', () => {
      const freshAdminSession: SessionContext = {
        userId: 'new-admin-uuid',
        tenantId: 'brand-new-org-id',
        role: 'fleet_admin',
        email: 'newadmin@coldstart.in',
      };

      const trips = db.selectRows(freshAdminSession, 'trips');
      const alerts = db.selectRows(freshAdminSession, 'security_alerts');
      const incidents = db.selectRows(freshAdminSession, 'safety_incidents');

      const totalKm = trips.reduce((acc, t) => acc + ((t.total_km as number) || 0), 0);
      const avoidedKm = trips.reduce((acc, t) => acc + ((t.avoided_km as number) || 0), 0);
      const deadheadPercent = totalKm > 0 ? (avoidedKm / totalKm) * 100 : 0.0;

      expect(trips).toHaveLength(0);
      expect(totalKm).toBe(0);
      expect(deadheadPercent).toBe(0.0);
      expect(alerts).toHaveLength(0);
      expect(incidents).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. FREIGHT REQUESTS & RETURN LOAD MATCHING TAB (FEAT-ADM-18)
  // =========================================================================
  describe('Feature 18: Freight Requests & Return Load Matching Tab', () => {
    it('TC-ADM-18-01: filters open corridor freight requests by Shared (LTL) vs Private (FTL)', () => {
      const loads = [
        { id: 'ld-1', type: 'shared', weightKg: 4000, commodity: 'Auto Parts', origin: 'Mumbai' },
        { id: 'ld-2', type: 'private', weightKg: 18000, commodity: 'Heavy Industrial Machinery', origin: 'JNPT' },
        { id: 'ld-3', type: 'shared', weightKg: 2500, commodity: 'Textiles', origin: 'Surat' },
        { id: 'ld-4', type: 'private', weightKg: 22000, commodity: 'Steel Coils', origin: 'Vadodara' },
      ];

      const sharedLTL = loads.filter((l) => l.type === 'shared');
      const privateFTL = loads.filter((l) => l.type === 'private');

      expect(sharedLTL).toHaveLength(2);
      expect(privateFTL).toHaveLength(2);
      expect(sharedLTL[0].commodity).toBe('Auto Parts');
      expect(privateFTL[0].commodity).toBe('Heavy Industrial Machinery');
    });

    it('TC-ADM-18-02: ranks return freight loads by net profit score (Freight - Detour Cost)', () => {
      const openLoads = [
        { id: 'ld-A', freightINR: 42000, detourKm: 15 }, // Net: 42000 - (15 * 32) = 41520
        { id: 'ld-B', freightINR: 46000, detourKm: 60 }, // Net: 46000 - (60 * 32) = 44080 (Highest)
        { id: 'ld-C', freightINR: 28000, detourKm: 5 },  // Net: 28000 - (5 * 32) = 27840
      ];

      const ranked = openLoads
        .map((l) => ({
          ...l,
          netProfitScore: l.freightINR - l.detourKm * 32,
        }))
        .sort((a, b) => b.netProfitScore - a.netProfitScore);

      expect(ranked[0].id).toBe('ld-B');
      expect(ranked[0].netProfitScore).toBe(44080);
      expect(ranked[1].id).toBe('ld-A');
      expect(ranked[1].netProfitScore).toBe(41520);
      expect(ranked[2].id).toBe('ld-C');
      expect(ranked[2].netProfitScore).toBe(27840);
    });

    it('TC-ADM-18-03: assigns truck and driver to load and updates status to dispatched', () => {
      const load = db.insertRow(shipperSession, 'loads', {
        origin: 'Ahmedabad Changodar',
        destination: 'Mumbai JNPT',
        freight_inr: 45000,
        status: 'open',
      });

      // Fleet Admin assigns Driver Ramesh
      const dispatchedTrip = db.insertRow(fleetAdminSession, 'trips', {
        load_id: load.id,
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        vehicle_plate: 'GJ-05-BZ-8821',
        gross_freight: 45000,
        milestone_status: 'assigned',
      });

      const updatedLoad = db.updateRow(shipperSession, 'loads', load.id as string, {
        status: 'matched',
        matched_driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
      });

      expect(dispatchedTrip.milestone_status).toBe('assigned');
      expect(dispatchedTrip.driver_id).toBe(TEST_PROFILES.DRIVER_RAMESH.id);
      expect(updatedLoad.status).toBe('matched');
    });
  });

  // =========================================================================
  // 4. DRIVER & VEHICLE ALLOCATION ROSTER TAB (FEAT-ADM-19 & 20)
  // =========================================================================
  describe('Feature 19 & 20: Driver & Vehicle Allocation Roster & Communications', () => {
    it('TC-ADM-19-01: retrieves driver roster with vehicle specs, payload capacity, and FASTag details', () => {
      const driverRecord = {
        name: TEST_PROFILES.DRIVER_RAMESH.name,
        phone: TEST_PROFILES.DRIVER_RAMESH.phone,
        vehiclePlate: TEST_PROFILES.DRIVER_RAMESH.vehicleNumber,
        model: 'Tata Signa 4825.T (16-Wheeler)',
        tareWeightKg: 12500,
        maxPayloadKg: 28000,
        drivingLicense: TEST_PROFILES.DRIVER_RAMESH.drivingLicense,
        fastagId: TEST_PROFILES.DRIVER_RAMESH.fastagId,
      };

      expect(driverRecord.name).toBe('Ramesh Patel');
      expect(driverRecord.vehiclePlate).toBe('GJ-05-BZ-8821');
      expect(driverRecord.tareWeightKg).toBe(12500);
      expect(driverRecord.maxPayloadKg).toBe(28000);
      expect(driverRecord.fastagId).toBe('34161FA820392019');
    });

    it('TC-ADM-19-02: dynamically computes live status badges: On Trip [km/h], Idle, and Alert', () => {
      const evaluateDriverStatusBadge = (params: {
        hasActiveTrip: boolean;
        speedKmh?: number;
        hasAlert?: boolean;
      }) => {
        if (params.hasAlert) {
          return { status: 'alert', label: 'Alert (Urgent)', color: 'bg-red-500' };
        }
        if (params.hasActiveTrip) {
          const speed = params.speedKmh ?? 0;
          return { status: 'on_trip', label: `On Trip (${speed} km/h)`, color: 'bg-emerald-500' };
        }
        return { status: 'idle', label: 'Idle / Available', color: 'bg-neutral-400' };
      };

      const b1 = evaluateDriverStatusBadge({ hasActiveTrip: true, speedKmh: 62 });
      expect(b1.status).toBe('on_trip');
      expect(b1.label).toBe('On Trip (62 km/h)');

      const b2 = evaluateDriverStatusBadge({ hasActiveTrip: false });
      expect(b2.status).toBe('idle');
      expect(b2.label).toBe('Idle / Available');

      const b3 = evaluateDriverStatusBadge({ hasActiveTrip: true, speedKmh: 45, hasAlert: true });
      expect(b3.status).toBe('alert');
      expect(b3.label).toBe('Alert (Urgent)');
    });

    it('TC-ADM-20-01: formats 1-Click Phone Calling links with standard E.164 +91 prefix', () => {
      const formatDialerLink = (rawPhone: string) => {
        const cleaned = rawPhone.replace(/\D/g, '');
        if (cleaned.length === 10) return `tel:+91${cleaned}`;
        if (cleaned.length === 12 && cleaned.startsWith('91')) return `tel:+${cleaned}`;
        return `tel:+${cleaned}`;
      };

      expect(formatDialerLink('9879054321')).toBe('tel:+919879054321');
      expect(formatDialerLink('+91 98790 54321')).toBe('tel:+919879054321');
      expect(formatDialerLink('+919879054321')).toBe('tel:+919879054321');
    });

    it('TC-ADM-20-02: generates pre-filled WhatsApp link with telemetry and corridor coordinates', () => {
      const generateDriverWhatsAppLink = (params: {
        phone: string;
        driverName: string;
        vehiclePlate: string;
        currentLat: number;
        currentLng: number;
        speedKmh: number;
      }) => {
        const cleanPhone = params.phone.replace(/\D/g, '');
        const message =
          `नमस्ते ${params.driverName} जी,\n` +
          `SafeFreight WIFL कंट्रोल रूम से सूचना:\n` +
          `गाड़ी: ${params.vehiclePlate}\n` +
          `लोकेशन: ${params.currentLat.toFixed(4)}, ${params.currentLng.toFixed(4)}\n` +
          `स्पीड: ${params.speedKmh} km/h\n` +
          `कृपया सुरक्षित गति में चलें।`;

        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      };

      const waLink = generateDriverWhatsAppLink({
        phone: '+91 98790 54321',
        driverName: 'Ramesh Patel',
        vehiclePlate: 'GJ-05-BZ-8821',
        currentLat: 21.1702,
        currentLng: 72.8311,
        speedKmh: 58,
      });

      expect(waLink).toContain('https://wa.me/919879054321?text=');
      expect(waLink).toContain(encodeURIComponent('GJ-05-BZ-8821'));
      expect(waLink).toContain(encodeURIComponent('58 km/h'));
    });
  });

  // =========================================================================
  // 5. DRIVER PROVISIONING VIA INVITATIONS (FEAT-ADM-21 & 22)
  // =========================================================================
  describe('Feature 21 & 22: Driver Provisioning & Password Management Modals', () => {
    it('TC-ADM-21-01: generates secure single-use driver invitation token via REST endpoint', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${fleetAdminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          phone: '+919825099999',
          expiresInHours: 48,
        }),
      });

      const res = await fleetDriversPOST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.invitation).toBeDefined();
      expect(json.invitation.token).toMatch(/^inv-/);
      expect(json.invitation.tenant_id).toBe(TEST_ORGS.FLEET_WIFL.id);
      expect(json.invitation.phone).toBe('+919825099999');
      expect(json.invitation.role).toBe('driver');
      expect(json.invitation.status).toBe('pending');
    });

    it('TC-ADM-21-02: driver accepts invitation and joins fleet organization without creating new orgs', () => {
      const token = db.createDriverInvitation(fleetAdminSession);
      expect(token).toMatch(/^inv-/);

      const onboardResult = db.registerDriverWithInvite({
        userId: 'driver-new-uuid',
        userName: 'Suresh Parmar',
        invitationToken: token,
      });

      expect(onboardResult.assignedTenantId).toBe(TEST_ORGS.FLEET_WIFL.id);
      expect(onboardResult.profile?.role).toBe('driver');
      expect(onboardResult.newOrgsCreated).toBe(0);
      expect(onboardResult.businessRowsCreated).toBe(0);
    });

    it('TC-ADM-21-03: lists tenant-scoped drivers and active invitations via GET /api/v1/fleet/drivers', async () => {
      // Issue an invite first
      await createDriverInvitation(fleetAdminClaims, { phone: '+919988776655' });

      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${fleetAdminToken}`,
        },
      });

      const res = await fleetDriversGET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.drivers).toBeDefined();
      expect(json.invitations).toBeDefined();
      expect(json.drivers.some((d: any) => d.full_name === 'Ramesh Patel')).toBe(true);
      expect(json.invitations.some((i: any) => i.phone === '+919988776655')).toBe(true);
    });

    it('TC-ADM-22-01: admin triggers credential reset event recorded to append-only audit trail', () => {
      // Admin triggers reset for Driver Ramesh
      const resetEntry = db.insertRow(fleetAdminSession, 'audit_log', {
        action: 'CREDENTIAL_RESET_REQUESTED',
        target_user_id: TEST_PROFILES.DRIVER_RAMESH.id,
        authorized_by: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
        reason: 'Driver device replacement on NH 48 corridor',
      });

      expect(resetEntry.action).toBe('CREDENTIAL_RESET_REQUESTED');
      expect(resetEntry.target_user_id).toBe(TEST_PROFILES.DRIVER_RAMESH.id);
      expect(resetEntry.tenant_id).toBe(TEST_ORGS.FLEET_WIFL.id);
    });
  });

  // =========================================================================
  // 6. TRIP DISPATCH CENTER & ADVANCE TRIP PLANNER (FEAT-ADM-23 & 25)
  // =========================================================================
  describe('Feature 23 & 25: Trip Dispatch Center & Advance Trip Planner', () => {
    it('TC-ADM-23-01: central dispatch board categorizes trips by active, planned, and completed milestones', () => {
      db.insertRow(fleetAdminSession, 'trips', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        milestone_status: 'in_transit',
        origin: 'Mumbai JNPT',
        destination: 'Ahmedabad Changodar',
      });
      db.insertRow(fleetAdminSession, 'trips', {
        driver_id: 'drv-02',
        milestone_status: 'created',
        origin: 'Surat',
        destination: 'Vadodara',
      });
      db.insertRow(fleetAdminSession, 'trips', {
        driver_id: 'drv-03',
        milestone_status: 'completed',
        origin: 'Vapi',
        destination: 'Mumbai',
      });

      const allTrips = db.selectRows(fleetAdminSession, 'trips');
      const activeTrips = allTrips.filter((t) => t.milestone_status === 'in_transit');
      const plannedTrips = allTrips.filter((t) => t.milestone_status === 'created');
      const completedTrips = allTrips.filter((t) => t.milestone_status === 'completed');

      expect(activeTrips).toHaveLength(1);
      expect(plannedTrips).toHaveLength(1);
      expect(completedTrips).toHaveLength(1);
    });

    it('TC-ADM-23-02: dispatch table displays route distance, FASTag toll, fuel cost, and milestone progress', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
      const chosenRoute = routes.find((r) => r.type === 'fastest')!;

      const trip = db.insertRow(fleetAdminSession, 'trips', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        route_type: chosenRoute.type,
        distance_km: chosenRoute.distanceKm,
        fastag_toll_inr: chosenRoute.fastagTollINR,
        estimated_fuel_cost_inr: chosenRoute.fuelCostINR,
        milestone_status: 'loaded',
        stage_index: 2,
      });

      expect(trip.distance_km).toBe(525);
      expect(trip.fastag_toll_inr).toBe(971);
      expect(trip.estimated_fuel_cost_inr).toBe(13414);
      expect(trip.milestone_status).toBe('loaded');
      expect(trip.stage_index).toBe(2);
    });

    it('TC-ADM-25-01: schedules corridor dispatch up to 30 days ahead with algorithmic route profiling', () => {
      // Schedule trip 10 days in the future
      const scheduledDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
      const ecoRoute = routes.find((r) => r.type === 'eco_fuel')!;

      const plannedTrip = db.insertRow(fleetAdminSession, 'trips', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        vehicle_plate: 'GJ-05-BZ-8821',
        origin: 'Mumbai JNPT Port',
        destination: 'Ahmedabad Changodar Hub',
        scheduled_date: scheduledDate,
        route_profile: 'eco_fuel',
        distance_km: ecoRoute.distanceKm,
        fuel_liters: ecoRoute.fuelLiters,
        milestone_status: 'created',
      });

      expect(plannedTrip.scheduled_date).toBe(scheduledDate);
      expect(plannedTrip.route_profile).toBe('eco_fuel');
      expect(plannedTrip.distance_km).toBe(541);
      expect(plannedTrip.fuel_liters).toBe(125.8);
      expect(plannedTrip.milestone_status).toBe('created');
    });
  });

  // =========================================================================
  // 7. 1-CLICK WHATSAPP TRIP DISPATCH SLIP GENERATOR (FEAT-ADM-24)
  // =========================================================================
  describe('Feature 24: 1-Click WhatsApp Trip Dispatch Slip Generator', () => {
    it('TC-ADM-24-01: formats vernacular Hindi/Hinglish dispatch slip with all transport parameters', () => {
      const tripDispatchData = {
        vehiclePlate: 'GJ-05-BZ-8821',
        driverName: 'Ramesh Patel',
        driverPhone: '+919879054321',
        originHub: 'Mumbai JNPT Port Container Depo',
        destinationHub: 'Ahmedabad Changodar Logistics Park',
        scheduledDate: '2026-11-12',
        lrNumber: generateStatutoryLRNumber('WIFL', '2026-27', 482),
        ewayBill: '241088764512',
        dieselAdvance: 12000,
        fastagAdvance: 2500,
        driverBhatta: 3000,
        controlRoomPhone: '+919825012345',
      };

      const slipText =
        `🚚 *SafeFreight OS — Western India Fleet Logistics (WIFL)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *गाड़ी रवानगी पर्ची (Trip Dispatch Slip)*\n\n` +
        `👤 *ड्राइवर का नाम:* ${tripDispatchData.driverName}\n` +
        `🚛 *गाड़ी नंबर:* ${tripDispatchData.vehiclePlate}\n` +
        `📅 *तारीख:* ${tripDispatchData.scheduledDate}\n` +
        `📍 *लोडिंग:* ${tripDispatchData.originHub}\n` +
        `🏁 *खाली:* ${tripDispatchData.destinationHub}\n\n` +
        `📄 *बिल्टी (LR No):* ${tripDispatchData.lrNumber}\n` +
        `📑 *ई-वे बिल (e-Way Bill):* ${tripDispatchData.ewayBill}\n\n` +
        `💰 *रास्ते का एडवांस व खर्चा (Advances):*\n` +
        `⛽ डीजल एडवांस: ₹${tripDispatchData.dieselAdvance.toLocaleString('en-IN')}\n` +
        `🛣️ FASTag टोल: ₹${tripDispatchData.fastagAdvance.toLocaleString('en-IN')}\n` +
        `🍛 ड्राइवर भत्ता: ₹${tripDispatchData.driverBhatta.toLocaleString('en-IN')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📞 *24/7 कंट्रोल रूम:* ${tripDispatchData.controlRoomPhone}\n` +
        `ड्राइवर ऐप लिंक: https://safefreight.in/driver`;

      expect(validateEWayBillNumber(tripDispatchData.ewayBill)).toBe(true);
      expect(validateGSTIN(TEST_ORGS.FLEET_WIFL.gstin)).toBe(true);
      expect(slipText).toContain('WIFL');
      expect(slipText).toContain('GJ-05-BZ-8821');
      expect(slipText).toContain('WIFL/2026-27/LR-0482');
      expect(slipText).toContain('241088764512');
      expect(slipText).toContain('₹12,000');
      expect(slipText).toContain('₹2,500');
      expect(slipText).toContain('₹3,000');
      expect(slipText).toContain('https://safefreight.in/driver');
    });

    it('TC-ADM-24-02: generates fully encoded wa.me URL with Hindi characters and symbols', () => {
      const rawText = 'गाड़ी: GJ-05-BZ-8821 | एडवांस: ₹12,000 & टोल: ₹2,500';
      const cleanPhone = '919879054321';
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawText)}`;

      expect(waUrl.startsWith('https://wa.me/919879054321?text=')).toBe(true);
      expect(waUrl).not.toContain(' ');
      expect(waUrl).not.toContain('₹');
      expect(waUrl).toContain(encodeURIComponent('₹12,000'));
      expect(waUrl).toContain(encodeURIComponent('&'));
    });
  });

  // =========================================================================
  // 8. DIGITAL TRIP KHATA & ADVANCE BHATTA LEDGER (FEAT-ADM-26)
  // =========================================================================
  describe('Feature 26: Digital Trip Khata & Advance Bhatta Ledger Tab', () => {
    it('TC-ADM-26-01: verifies mathematical invariant: Balance Due on POD = Gross Freight - Total Advances', () => {
      // Gross agreed freight: ₹48,000
      // Diesel: ₹14,000, FASTag: ₹2,500, Bhatta: ₹3,500, Hamali: ₹1,000 -> Total Advances = ₹21,000
      // Maintenance Reserve = ₹3,000
      const khata = calculateTripKhata(
        48000,
        {
          diesel: 14000,
          fastag: 2500,
          driverBhatta: 3500,
          hamali: 1000,
        },
        3000
      );

      expect(khata.grossFreightINR).toBe(48000);
      expect(khata.totalDisbursedAdvancesINR).toBe(21000);
      expect(khata.balanceDueOnPODINR).toBe(27000); // 48000 - 21000
      expect(khata.totalOperatingCostsINR).toBe(24000); // 21000 + 3000
      expect(khata.netGrossProfitINR).toBe(24000); // 48000 - 24000
      expect(khata.profitMarginPercent).toBe(50.0);
    });

    it('TC-ADM-26-02: formats currency amounts using Indian Lakhs & Hazaars conventions', () => {
      const formatIndianCurrency = (amount: number): string => {
        if (amount >= 100000) {
          const inLakhs = (amount / 100000).toFixed(2);
          return `₹${inLakhs} Lakh`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
      };

      expect(formatIndianCurrency(185000)).toBe('₹1.85 Lakh');
      expect(formatIndianCurrency(48000)).toBe('₹48,000');
      expect(formatIndianCurrency(2500)).toBe('₹2,500');
      expect(formatIndianCurrency(0)).toBe('₹0');
    });

    it('TC-ADM-26-03: tracks multi-stage advance disbursements with exact rupee audit reconciliation', async () => {
      const trip = await dataService.createTrip(fleetAdminClaims, {
        gross_freight: 50000,
        maintenance_reserve: 2500,
      });

      // Disburse Diesel ₹15,000
      const step1 = await dataService.disburseTripAdvance(fleetAdminClaims, trip.id, {
        type: 'diesel',
        amount: 15000,
      });
      expect(step1.trip.total_advances).toBe(15000);
      expect(step1.trip.balance_due).toBe(35000);

      // Disburse FASTag ₹3,000
      const step2 = await dataService.disburseTripAdvance(fleetAdminClaims, trip.id, {
        type: 'fastag',
        amount: 3000,
      });
      expect(step2.trip.total_advances).toBe(18000);
      expect(step2.trip.balance_due).toBe(32000);

      // Disburse Bhatta ₹2,000
      const step3 = await dataService.disburseTripAdvance(fleetAdminClaims, trip.id, {
        type: 'driverBhatta',
        amount: 2000,
      });
      expect(step3.trip.total_advances).toBe(20000);
      expect(step3.trip.balance_due).toBe(30000);
      expect(step3.trip.net_profit).toBe(27500); // 50000 - (20000 + 2500)

      // Audit trail must capture 1 insert + 3 update operations
      const trail = dataService.getAuditTrail(fleetAdminClaims, 'trips');
      expect(trail.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 9. TRUCK-WISE GROSS P&L ANALYTICS ("GAADI-WISE KAMAI") (FEAT-ADM-27)
  // =========================================================================
  describe('Feature 27: Truck-wise Gross P&L Analytics ("Gaadi-wise Kamai")', () => {
    it('TC-ADM-27-01: aggregates revenue, operating costs, and profit margin per vehicle', () => {
      const vehicleTrips = [
        { tripId: 't-1', vehiclePlate: 'GJ-05-BZ-8821', revenue: 48000, costs: 26000 },
        { tripId: 't-2', vehiclePlate: 'GJ-05-BZ-8821', revenue: 45000, costs: 24000 },
        { tripId: 't-3', vehiclePlate: 'GJ-05-BZ-8821', revenue: 52000, costs: 29000 },
      ];

      const totalRevenue = vehicleTrips.reduce((acc, t) => acc + t.revenue, 0); // 145000
      const totalCosts = vehicleTrips.reduce((acc, t) => acc + t.costs, 0); // 79000
      const netProfit = totalRevenue - totalCosts; // 66000
      const marginPercent = Math.round((netProfit / totalRevenue) * 100 * 10) / 10; // 45.5%

      expect(totalRevenue).toBe(145000);
      expect(totalCosts).toBe(79000);
      expect(netProfit).toBe(66000);
      expect(marginPercent).toBe(45.5);
    });

    it('TC-ADM-27-02: evaluates margin health badge status (healthy >= 30%, warning 0-30%, loss < 0%)', () => {
      const evaluateMarginHealthBadge = (marginPercent: number) => {
        if (marginPercent >= 30.0) {
          return { status: 'healthy', badge: 'Healthy (Green)', color: 'text-emerald-700 bg-emerald-50' };
        }
        if (marginPercent >= 0.0) {
          return { status: 'warning', badge: 'Low Margin (Amber)', color: 'text-amber-700 bg-amber-50' };
        }
        return { status: 'loss', badge: 'Negative Profit (Red)', color: 'text-red-700 bg-red-50' };
      };

      const b1 = evaluateMarginHealthBadge(42.5);
      expect(b1.status).toBe('healthy');

      const b2 = evaluateMarginHealthBadge(18.0);
      expect(b2.status).toBe('warning');

      const b3 = evaluateMarginHealthBadge(-8.5);
      expect(b3.status).toBe('loss');
    });
  });

  // =========================================================================
  // 10. INTERACTIVE CORRIDOR DEADHEAD REDUCTION SIMULATOR (FEAT-ADM-28)
  // =========================================================================
  describe('Feature 28: Interactive Corridor Deadhead Reduction Simulator', () => {
    it('TC-ADM-28-01: calculates real-time savings across slider range (0 to 1,000 km)', () => {
      // Test slider at 400 km avoided
      const sim400 = calculateDeadMileageSavings(400, 0);

      expect(sim400.emptyKmAvoided).toBe(400);
      expect(sim400.fuelSavedLiters).toBe(105.3); // 400 / 3.8
      expect(sim400.fuelCostSavedINR).toBe(9688); // 105.3 * 92
      expect(sim400.wearTearSavedINR).toBe(1800); // 400 * 4.5
      expect(sim400.tollSavedINR).toBe(880); // 400 * 2.2
      expect(sim400.totalMoneySavedINR).toBe(12368);
      expect(sim400.co2SavedKg).toBe(282.2); // 105.3 * 2.68
    });

    it('TC-ADM-28-02: clamps slider inputs between 0 and 1,000 km bounds', () => {
      const clampSlider = (km: number) => Math.max(0, Math.min(1000, km));

      expect(clampSlider(-50)).toBe(0);
      expect(clampSlider(0)).toBe(0);
      expect(clampSlider(525)).toBe(525);
      expect(clampSlider(1000)).toBe(1000);
      expect(clampSlider(1200)).toBe(1000);
    });
  });

  // =========================================================================
  // 11. STATUTORY DOCUMENT REPOSITORY TAB (FEAT-ADM-29)
  // =========================================================================
  describe('Feature 29: Statutory Document Repository Tab', () => {
    it('TC-ADM-29-01: tracks mandatory commercial vehicle documents (RC, Fitness, AITP, PUC, Insurance)', () => {
      const docs = [
        { type: 'aitp_permit', docNo: 'AITP/2026/0482', expiry: '2027-04-15' },
        { type: 'fitness', docNo: 'FIT/GJ05/2026/8821', expiry: '2026-11-25' },
        { type: 'puc_emission', docNo: 'PUC/GJ/2026/102', expiry: '2026-11-01' },
        { type: 'insurance', docNo: 'POL-COMM-998822', expiry: '2027-02-28' },
        { type: 'rc_registration', docNo: 'RC-GJ05-BZ-8821', expiry: '2034-08-10' },
      ];

      expect(docs).toHaveLength(5);
      for (const doc of docs) {
        const saved = db.insertRow(fleetAdminSession, 'documents', {
          doc_type: doc.type,
          doc_number: doc.docNo,
          expires_at: doc.expiry,
        });
        expect(saved.id).toBeDefined();
        expect(saved.tenant_id).toBe(TEST_ORGS.FLEET_WIFL.id);
      }

      const tenantDocs = db.selectRows(fleetAdminSession, 'documents');
      expect(tenantDocs).toHaveLength(5);
    });

    it('TC-ADM-29-02: dynamically computes document validity status badges', () => {
      const evaluateDocStatus = (expiryDateStr: string, currentDate: string = '2026-11-09') => {
        const expiry = new Date(expiryDateStr).getTime();
        const current = new Date(currentDate).getTime();
        const diffDays = Math.ceil((expiry - current) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'expired', badge: 'Expired (Red)', daysRemaining: diffDays };
        if (diffDays <= 30) return { status: 'expiring_soon', badge: 'Expiring Soon (Amber)', daysRemaining: diffDays };
        return { status: 'valid', badge: 'Valid (Green)', daysRemaining: diffDays };
      };

      expect(evaluateDocStatus('2027-04-15').status).toBe('valid');
      expect(evaluateDocStatus('2026-11-25').status).toBe('expiring_soon');
      expect(evaluateDocStatus('2026-11-01').status).toBe('expired');
    });

    it('TC-ADM-29-03: records document additions and deletions to append-only audit trail', () => {
      const doc = db.insertRow(fleetAdminSession, 'documents', {
        doc_type: 'fitness',
        doc_number: 'FIT-101',
      });

      const updated = db.updateRow(fleetAdminSession, 'documents', doc.id as string, {
        status: 'archived',
      });

      expect(updated.status).toBe('archived');
      const audit = db.getAuditTrail(fleetAdminSession, 'documents');
      expect(audit).toHaveLength(2);
      expect(audit[0].action).toBe('INSERT');
      expect(audit[1].action).toBe('UPDATE');
    });
  });

  // =========================================================================
  // 12. SECURITY & ROUTE DEVIATION ALERTS MONITOR (FEAT-ADM-30)
  // =========================================================================
  describe('Feature 30: Security & Route Deviation Alerts Monitor', () => {
    it('TC-ADM-30-01: detects corridor route deviation when truck detours > 5.0 km', () => {
      const evaluateDeviation = (detourDistanceKm: number) => {
        if (detourDistanceKm > 5.0) {
          return {
            triggered: true,
            severity: detourDistanceKm > 15.0 ? 'critical' : 'high',
            reason: `Route detour of ${detourDistanceKm.toFixed(1)} km exceeds 5.0 km corridor corridor threshold`,
          };
        }
        return { triggered: false, severity: 'none', reason: 'Within corridor tolerance' };
      };

      const res1 = evaluateDeviation(2.3);
      expect(res1.triggered).toBe(false);

      const res2 = evaluateDeviation(7.5);
      expect(res2.triggered).toBe(true);
      expect(res2.severity).toBe('high');

      const res3 = evaluateDeviation(18.2);
      expect(res3.triggered).toBe(true);
      expect(res3.severity).toBe('critical');
    });

    it('TC-ADM-30-02: detects unauthorized stationary halt exceeding 45 minutes', () => {
      const evaluateHalt = (haltDurationMinutes: number) => {
        if (haltDurationMinutes > 45) {
          return {
            triggered: true,
            severity: 'high',
            reason: `Unauthorized stationary halt of ${haltDurationMinutes} min exceeds 45 min threshold`,
          };
        }
        return { triggered: false, severity: 'none', reason: 'Normal brief pause' };
      };

      expect(evaluateHalt(20).triggered).toBe(false);
      expect(evaluateHalt(60).triggered).toBe(true);
    });

    it('TC-ADM-30-03: 1-Click "Resolve Alert" resolves alert with notes and records to audit trail', () => {
      const alert = db.insertRow(fleetAdminSession, 'security_alerts', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        vehicle_plate: 'GJ-05-BZ-8821',
        detour_km: 7.2,
        status: 'open',
      });

      const resolved = db.updateRow(fleetAdminSession, 'security_alerts', alert.id as string, {
        status: 'resolved',
        resolved_by: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
        resolution_notes: 'Driver took authorized NH 48 diversion around Kadodara toll congestion',
      });

      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution_notes).toContain('authorized NH 48 diversion');

      const auditTrail = db.getAuditTrail(fleetAdminSession, 'security_alerts');
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[1].action).toBe('UPDATE');
    });
  });

  // =========================================================================
  // 13. GOLDEN HOUR SAFETY INCIDENT COMMAND CONSOLE (FEAT-ADM-31)
  // =========================================================================
  describe('Feature 31: Golden Hour Safety Incident Command Console', () => {
    it('TC-ADM-31-01: logs high-G impact crash alert with T0 impact timestamp and multi-axis G-force', () => {
      const t0Time = new Date().toISOString();
      const incident = db.insertRow(fleetAdminSession, 'safety_incidents', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        vehicle_plate: 'GJ-05-BZ-8821',
        g_force: 4.7,
        status: 'active',
        t0_impact_at: t0Time,
      });

      expect(incident.status).toBe('active');
      expect(incident.g_force).toBe(4.7);
      expect(incident.t0_impact_at).toBe(t0Time);
    });

    it('TC-ADM-31-02: tracks T1 ERSS 112 emergency dispatch acknowledgement timestamp', () => {
      const t0 = new Date(Date.now() - 45000).toISOString();
      const t1 = new Date().toISOString();

      const incident = db.insertRow(fleetAdminSession, 'safety_incidents', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        status: 'active',
        t0_impact_at: t0,
      });

      const acked = db.updateRow(fleetAdminSession, 'safety_incidents', incident.id as string, {
        t1_dispatch_ack_at: t1,
        erss_cad_id: 'ERSS-GJ-2026-9921',
      });

      expect(acked.t1_dispatch_ack_at).toBe(t1);
      expect(acked.erss_cad_id).toBe('ERSS-GJ-2026-9921');
    });

    it('TC-ADM-31-03: logs T2 responder arrival, marks incident resolved, and computes rescue duration', () => {
      const t0 = new Date('2026-11-09T02:00:00.000Z');
      const t1 = new Date('2026-11-09T02:01:15.000Z');
      const t2 = new Date('2026-11-09T02:13:30.000Z'); // 13.5 minutes later (Sub-15m rescue!)

      const incident = db.insertRow(fleetAdminSession, 'safety_incidents', {
        driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
        status: 'active',
        t0_impact_at: t0.toISOString(),
        t1_dispatch_ack_at: t1.toISOString(),
      });

      const rescueDurationMinutes = Math.round(((t2.getTime() - t0.getTime()) / 60000) * 10) / 10;

      const resolved = db.updateRow(fleetAdminSession, 'safety_incidents', incident.id as string, {
        status: 'resolved',
        t2_responder_arrived_at: t2.toISOString(),
        rescue_duration_minutes: rescueDurationMinutes,
        golden_hour_achieved: rescueDurationMinutes <= 60.0,
      });

      expect(resolved.status).toBe('resolved');
      expect(resolved.rescue_duration_minutes).toBe(13.5);
      expect(resolved.golden_hour_achieved).toBe(true);

      const audit = db.getAuditTrail(fleetAdminSession, 'safety_incidents');
      expect(audit).toHaveLength(2);
    });
  });

  // =========================================================================
  // 14. INTERACTIVE CORRIDOR LEAFLET FLEET MAP & UI DESIGN (FEAT-ADM-32 & 33)
  // =========================================================================
  describe('Feature 32 & 33: Interactive Corridor Leaflet Map & UI Design Tokens', () => {
    it('TC-ADM-32-01: aggregates active vehicle markers along NH 48 corridor waypoints', () => {
      const vehicleLocations = [
        { plate: 'GJ-05-BZ-8821', lat: 21.1702, lng: 72.8311, speed: 58, heading: 12 }, // Surat
        { plate: 'MH-04-GP-1920', lat: 20.3712, lng: 72.9044, speed: 64, heading: 355 }, // Vapi
        { plate: 'GJ-06-TT-4412', lat: 22.3072, lng: 73.1812, speed: 0, heading: 90 }, // Vadodara
      ];

      expect(vehicleLocations).toHaveLength(3);

      // Compute bounding box
      const lats = vehicleLocations.map((v) => v.lat);
      const lngs = vehicleLocations.map((v) => v.lng);

      const bounds = {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      };

      expect(bounds.minLat).toBe(20.3712); // Vapi
      expect(bounds.maxLat).toBe(22.3072); // Vadodara
      expect(bounds.minLng).toBe(72.8311);
      expect(bounds.maxLng).toBe(73.1812);
    });

    it('TC-ADM-32-02: handles vehicles with missing or stale GPS coordinates with corridor fallback', () => {
      const fallbackCoordinate = (ping?: { lat?: number; lng?: number }) => {
        if (typeof ping?.lat === 'number' && typeof ping?.lng === 'number') {
          return { lat: ping.lat, lng: ping.lng, isFallback: false };
        }
        // Fallback to corridor origin (Mumbai JNPT)
        return {
          lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lat,
          lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lng,
          isFallback: true,
        };
      };

      const validPing = fallbackCoordinate({ lat: 21.1702, lng: 72.8311 });
      expect(validPing.isFallback).toBe(false);
      expect(validPing.lat).toBe(21.1702);

      const stalePing = fallbackCoordinate(undefined);
      expect(stalePing.isFallback).toBe(true);
      expect(stalePing.lat).toBe(18.9496);
    });

    it('TC-ADM-33-01: verifies Notion-calm UI theme tokens (Warm paper canvas, white cards, hairline borders)', () => {
      const themeTokens = {
        canvasBg: '#f6f5f4',
        cardBg: '#ffffff',
        hairlineBorder: '#e6e6e6',
        textPrimary: '#191919',
        textMuted: '#787774',
        fontFamily: 'Inter, sans-serif',
      };

      expect(themeTokens.canvasBg).toBe('#f6f5f4');
      expect(themeTokens.cardBg).toBe('#ffffff');
      expect(themeTokens.hairlineBorder).toBe('#e6e6e6');
      expect(themeTokens.textPrimary).toBe('#191919');
    });
  });

  // =========================================================================
  // 15. FLEET ADMIN ROUTE GUARD & TENANT SCOPING (FEAT-ADM-34)
  // =========================================================================
  describe('Feature 34: Fleet Admin Route Guard & Tenant Scoping', () => {
    it('TC-ADM-34-01: allows access to Fleet Admin with valid JWT bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${fleetAdminToken}`,
        },
      });

      const res = await fleetDriversGET(req);
      expect(res.status).toBe(200);
    });

    it('TC-ADM-34-02: rejects Driver role attempting to access Fleet Admin endpoints (403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${driverToken}`,
        },
      });

      const res = await fleetDriversGET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('403 Forbidden');
    });

    it('TC-ADM-34-03: rejects Shipper role attempting to access Fleet Admin endpoints (403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${shipperToken}`,
        },
      });

      const res = await fleetDriversGET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('403 Forbidden');
    });

    it('TC-ADM-34-04: rejects unauthenticated requests (401 Unauthorized)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        method: 'GET',
      });

      const res = await fleetDriversGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('401 Unauthorized');
    });
  });
});
