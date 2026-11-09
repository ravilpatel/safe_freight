/**
 * SafeFreight OS — Tier 5 Adversarial Hardening Suite (Milestone 1 / Phase 3)
 * Multi-Tenancy Cross-Tenant Isolation, Concurrent Backhaul Acceptance Race Conditions & Idempotency Replay
 * Reference: PRD v4.0.0 §4, §5, §8, PROJECT.md Interface Contracts §1-§2, Milestone 1 Challenger Directives
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loadsAcceptPOST } from '@/app/api/v1/loads/accept/route';
import { GET as loadsGET } from '@/app/api/v1/loads/route';
import { GET as tripsGET, PATCH as tripsPATCH } from '@/app/api/v1/trips/route';
import { createSignedJwtPayload, tenantStore } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims, MilestoneStatus } from '@/types/database';

describe('Tier 5: Adversarial Hardening — Milestone 1 (Multi-Tenancy, Concurrency & Idempotency)', () => {
  // Org Alpha (Western India Fleet Logistics)
  const tenantAlphaAdmin: SessionClaims = {
    sub: 'balwinder-admin-alpha',
    email: 'balwinder@wifl-logistics.in',
    tenant_id: 'org-alpha-wifl-uuid',
    role: 'fleet_admin',
  };

  const tenantAlphaDriver1: SessionClaims = {
    sub: 'ramesh-driver-alpha-1',
    email: 'ramesh@wifl-logistics.in',
    tenant_id: 'org-alpha-wifl-uuid',
    role: 'driver',
  };

  const tenantAlphaDriver2: SessionClaims = {
    sub: 'suresh-driver-alpha-2',
    email: 'suresh@wifl-logistics.in',
    tenant_id: 'org-alpha-wifl-uuid',
    role: 'driver',
  };

  const tenantAlphaDriver3: SessionClaims = {
    sub: 'kiran-driver-alpha-3',
    email: 'kiran@wifl-logistics.in',
    tenant_id: 'org-alpha-wifl-uuid',
    role: 'driver',
  };

  const tenantAlphaDriver4: SessionClaims = {
    sub: 'deepak-driver-alpha-4',
    email: 'deepak@wifl-logistics.in',
    tenant_id: 'org-alpha-wifl-uuid',
    role: 'driver',
  };

  const tenantAlphaDriver5: SessionClaims = {
    sub: 'amit-driver-alpha-5',
    email: 'amit@wifl-logistics.in',
    tenant_id: 'org-alpha-wifl-uuid',
    role: 'driver',
  };

  // Org Beta (Northern Star Express)
  const tenantBetaAdmin: SessionClaims = {
    sub: 'harpreet-admin-beta',
    email: 'harpreet@northernstar.in',
    tenant_id: 'org-beta-northern-uuid',
    role: 'fleet_admin',
  };

  const tenantBetaDriver1: SessionClaims = {
    sub: 'gurpreet-driver-beta-1',
    email: 'gurpreet@northernstar.in',
    tenant_id: 'org-beta-northern-uuid',
    role: 'driver',
  };

  // Org Gamma (Shipper Adani Logistics)
  const tenantGammaShipper: SessionClaims = {
    sub: 'adani-shipper-gamma',
    email: 'logistics@adani-freight.in',
    tenant_id: 'org-gamma-adani-uuid',
    role: 'shipper',
  };

  // JWT Tokens
  let _tokenAlphaAdmin: string;
  let tokenAlphaDriver1: string;
  let tokenAlphaDriver2: string;
  let tokenAlphaDriver3: string;
  let tokenAlphaDriver4: string;
  let tokenAlphaDriver5: string;
  let _tokenBetaAdmin: string;
  let tokenBetaDriver1: string;
  let tokenGammaShipper: string;

  beforeEach(() => {
    dataService.clear();
    tenantStore.clear();
    globalIdempotencyStore.clear();

    _tokenAlphaAdmin = createSignedJwtPayload(tenantAlphaAdmin);
    tokenAlphaDriver1 = createSignedJwtPayload(tenantAlphaDriver1);
    tokenAlphaDriver2 = createSignedJwtPayload(tenantAlphaDriver2);
    tokenAlphaDriver3 = createSignedJwtPayload(tenantAlphaDriver3);
    tokenAlphaDriver4 = createSignedJwtPayload(tenantAlphaDriver4);
    tokenAlphaDriver5 = createSignedJwtPayload(tenantAlphaDriver5);
    _tokenBetaAdmin = createSignedJwtPayload(tenantBetaAdmin);
    tokenBetaDriver1 = createSignedJwtPayload(tenantBetaDriver1);
    tokenGammaShipper = createSignedJwtPayload(tenantGammaShipper);
  });

  // =========================================================================
  // SUITE 1: CROSS-TENANT ISOLATION ATTACKS
  // =========================================================================
  describe('Adversarial Group 1: Cross-Tenant Isolation Attacks', () => {
    it('TC-ADV-TEN-01: Driver in Org A cannot accept a load owned by Org B (returns 404 Not Found, never 200 or 500)', async () => {
      // 1. Create a load in Org Beta
      const loadBeta = await dataService.createLoad(tenantBetaAdmin, {
        origin_name: 'Delhi Transport Nagar',
        destination_name: 'Jaipur VKIA',
        weight_kg: 18000,
        pricing_inr: 32000,
        status: 'posted',
      });
      expect(loadBeta.id).toBeDefined();
      expect(loadBeta.tenant_id).toBe(tenantBetaAdmin.tenant_id);

      // 2. Driver Ramesh from Org Alpha maliciously attempts to accept Org Beta's load
      const req = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
          'idempotency-key': 'malicious-cross-tenant-accept-01',
        },
        body: JSON.stringify({ load_id: loadBeta.id }),
      });

      const res = await loadsAcceptPOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);

      // 3. Confirm Org Beta load was NOT altered or matched to Org Alpha driver
      const persistedLoadBeta = dataService.getLoadById(tenantBetaAdmin, loadBeta.id);
      expect(persistedLoadBeta).not.toBeNull();
      expect(persistedLoadBeta?.status).toBe('posted');
      expect(persistedLoadBeta?.matched_driver_id).toBeNull();

      // 4. Confirm no trip was created in Org Alpha
      const alphaTrips = dataService.getTrips(tenantAlphaDriver1, {});
      expect(alphaTrips.data).toHaveLength(0);
    });

    it('TC-ADV-TEN-02: Driver in Org A cannot enumerate loads from Org B via GET /api/v1/loads', async () => {
      // Create 3 loads in Org Beta
      for (let i = 1; i <= 3; i++) {
        await dataService.createLoad(tenantBetaAdmin, {
          origin_name: `Beta Depot ${i}`,
          destination_name: `Beta Delivery Hub ${i}`,
          weight_kg: 10000 + i * 1000,
        });
      }

      // Create 1 load in Org Alpha
      await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Alpha Hub Surat',
        destination_name: 'Alpha Hub Vapi',
        weight_kg: 8500,
      });

      // Driver Ramesh in Org Alpha queries loads
      const reqAlpha = new NextRequest('http://localhost:3000/api/v1/loads', {
        headers: { authorization: `Bearer ${tokenAlphaDriver1}` },
      });
      const resAlpha = await loadsGET(reqAlpha);
      expect(resAlpha.status).toBe(200);
      const jsonAlpha = await resAlpha.json();

      // Must strictly see only the 1 load in Org Alpha, 0 from Org Beta
      expect(jsonAlpha.data).toHaveLength(1);
      expect(jsonAlpha.data[0].tenant_id).toBe(tenantAlphaAdmin.tenant_id);
      expect(jsonAlpha.data[0].origin_name).toBe('Alpha Hub Surat');
    });

    it('TC-ADV-TEN-03: Driver in Org A cannot update milestone of a trip belonging to Org B via PATCH /api/v1/trips (returns 404 Not Found)', async () => {
      // Create a trip in Org Beta
      const tripBeta = await dataService.createTrip(tenantBetaAdmin, {
        gross_freight: 45000,
        maintenance_reserve: 2250,
      });
      expect(tripBeta.id).toBeDefined();
      expect(tripBeta.tenant_id).toBe(tenantBetaAdmin.tenant_id);

      // Driver Ramesh in Org Alpha attempts to PATCH Org Beta's trip milestone
      const req = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
          'idempotency-key': 'cross-tenant-patch-attempt-01',
        },
        body: JSON.stringify({
          trip_id: tripBeta.id,
          milestone_status: 'completed',
        }),
      });

      const res = await tripsPATCH(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);

      // Verify Org Beta's trip milestone remains unchanged
      const freshBetaTrip = dataService.getTripById(tenantBetaAdmin, tripBeta.id);
      expect(freshBetaTrip?.milestone_status).toBe('created');
    });

    it('TC-ADV-TEN-04: Driver in Org A cannot enumerate trips belonging to Org B via GET /api/v1/trips', async () => {
      // Create 2 trips in Org Beta
      await dataService.createTrip(tenantBetaAdmin, { gross_freight: 30000 });
      await dataService.createTrip(tenantBetaAdmin, { gross_freight: 40000 });

      // Create 1 trip in Org Alpha
      await dataService.createTrip(tenantAlphaAdmin, { gross_freight: 50000 });

      // Driver Ramesh queries trips
      const req = new NextRequest('http://localhost:3000/api/v1/trips', {
        headers: { authorization: `Bearer ${tokenAlphaDriver1}` },
      });
      const res = await tripsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data).toHaveLength(1);
      expect(json.data[0].tenant_id).toBe(tenantAlphaAdmin.tenant_id);
      expect(json.data[0].gross_freight).toBe(50000);
    });

    it('TC-ADV-TEN-05: Non-driver/non-fleet_admin role (e.g. shipper) is blocked from accepting loads with 403 Forbidden', async () => {
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Mumbai Kalamboli',
        destination_name: 'Vapi GIDC',
        weight_kg: 14000,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenGammaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ load_id: load.id }),
      });

      const res = await loadsAcceptPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-TEN-06: Unauthenticated request to /api/v1/loads/accept is rejected with 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ load_id: 'some-load-id' }),
      });

      const res = await loadsAcceptPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/401 Unauthorized/i);
    });

    it('TC-ADV-TEN-07: Unauthenticated request to PATCH /api/v1/trips is rejected with 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip_id: 'trip-123', milestone_status: 'loaded' }),
      });

      const res = await tripsPATCH(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/401 Unauthorized/i);
    });

    it('TC-ADV-TEN-08: Forged JWT with tampered signature is rejected with 401 Unauthorized', async () => {
      const forgedToken = `${tokenAlphaDriver1.slice(0, -10)}corrupted123`;
      const req = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${forgedToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ load_id: 'any-load-id' }),
      });

      const res = await loadsAcceptPOST(req);
      expect(res.status).toBe(401);
    });

    it('TC-ADV-TEN-09: Audit log isolation — load acceptance in Org A produces audit entries visible only to Org A, zero to Org B', async () => {
      // Create and accept load in Org Alpha
      const loadAlpha = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Ankleshwar GIDC',
        destination_name: 'Ahmedabad Naroda',
        weight_kg: 22000,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
          'idempotency-key': 'audit-test-key-alpha-01',
        },
        body: JSON.stringify({ load_id: loadAlpha.id }),
      });

      const res = await loadsAcceptPOST(req);
      expect(res.status).toBe(200);

      // Verify Org Alpha audit trail contains load and trip records
      const alphaAudit = dataService.getAuditTrail(tenantAlphaAdmin);
      expect(alphaAudit.length).toBeGreaterThanOrEqual(3); // Load INSERT, Load UPDATE, Trip INSERT

      // Verify Org Beta audit trail is completely empty
      const betaAudit = dataService.getAuditTrail(tenantBetaAdmin);
      expect(betaAudit).toHaveLength(0);
    });
  });

  // =========================================================================
  // SUITE 2: CONCURRENT BACKHAUL ACCEPTANCE RACE CONDITIONS
  // =========================================================================
  describe('Adversarial Group 2: Concurrent Backhaul Acceptance Race Conditions', () => {
    it('TC-ADV-RACE-01: Two concurrent drivers in Org A racing for the same open load resolve atomically to exactly one 200 OK and one 409 Conflict', async () => {
      // 1. Create open load in Org Alpha
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Mumbai JNPT Yard 4',
        destination_name: 'Vadodara Makarpura',
        weight_kg: 24000,
        pricing_inr: 58000,
      });

      // 2. Both Driver 1 (Ramesh) and Driver 2 (Suresh) attempt to accept concurrently
      const makeReq = (token: string, key: string) =>
        new NextRequest('http://localhost:3000/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            'idempotency-key': key,
          },
          body: JSON.stringify({ load_id: load.id }),
        });

      const [res1, res2] = await Promise.all([
        loadsAcceptPOST(makeReq(tokenAlphaDriver1, 'race-driver1-key')),
        loadsAcceptPOST(makeReq(tokenAlphaDriver2, 'race-driver2-key')),
      ]);

      const statuses = [res1.status, res2.status].sort((a, b) => a - b);
      // Invariant: Exactly one 200 OK and exactly one 409 Conflict
      expect(statuses).toEqual([200, 409]);

      // Check which driver won
      const winnerRes = res1.status === 200 ? res1 : res2;
      const loserRes = res1.status === 409 ? res1 : res2;

      const winnerJson = await winnerRes.json();
      const loserJson = await loserRes.json();

      expect(winnerJson.success).toBe(true);
      expect(winnerJson.trip_id).toBeDefined();

      expect(loserJson.error).toMatch(/409 Conflict|already accepted/i);

      // Verify persisted load state
      const verifiedLoad = dataService.getLoadById(tenantAlphaAdmin, load.id);
      expect(verifiedLoad?.status).toBe('matched');
      expect([tenantAlphaDriver1.sub, tenantAlphaDriver2.sub]).toContain(verifiedLoad?.matched_driver_id);

      // Verify exactly 1 trip exists in Org Alpha for this load
      const trips = dataService.getTrips(tenantAlphaAdmin, {});
      expect(trips.data).toHaveLength(1);
      expect(trips.data[0].load_id).toBe(load.id);
      expect(trips.data[0].driver_id).toBe(verifiedLoad?.matched_driver_id);
    });

    it('TC-ADV-RACE-02: 5-way concurrent driver storm for a single open load results in exactly 1 winner (200 OK) and 4 conflicts (409 Conflict)', async () => {
      // 1. Create open load
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Surat Diamond Bourse',
        destination_name: 'Ahmedabad Sanand GIDC',
        weight_kg: 15000,
        pricing_inr: 42000,
      });

      // 2. Prepare 5 concurrent driver requests
      const drivers = [
        { token: tokenAlphaDriver1, key: 'storm-d1' },
        { token: tokenAlphaDriver2, key: 'storm-d2' },
        { token: tokenAlphaDriver3, key: 'storm-d3' },
        { token: tokenAlphaDriver4, key: 'storm-d4' },
        { token: tokenAlphaDriver5, key: 'storm-d5' },
      ];

      const responses = await Promise.all(
        drivers.map((d) =>
          loadsAcceptPOST(
            new NextRequest('http://localhost:3000/api/v1/loads/accept', {
              method: 'POST',
              headers: {
                authorization: `Bearer ${d.token}`,
                'content-type': 'application/json',
                'idempotency-key': d.key,
              },
              body: JSON.stringify({ load_id: load.id }),
            })
          )
        )
      );

      const statusCounts = responses.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>
      );

      // Exactly 1 winner (200 OK) and 4 losers (409 Conflict)
      expect(statusCounts[200]).toBe(1);
      expect(statusCounts[409]).toBe(4);
      expect(statusCounts[500] || 0).toBe(0);

      // Exactly one trip was created
      const allTrips = dataService.getTrips(tenantAlphaAdmin, {});
      expect(allTrips.data).toHaveLength(1);
    });

    it('TC-ADV-RACE-03: Post-acceptance double-booking attempt receives 409 Conflict with descriptive error', async () => {
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Vapi Chemical Zone',
        destination_name: 'Bharuch Ankleshwar',
        weight_kg: 19000,
      });

      // Driver 1 accepts load first
      const req1 = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
          'idempotency-key': 'first-accept-key',
        },
        body: JSON.stringify({ load_id: load.id }),
      });
      const res1 = await loadsAcceptPOST(req1);
      expect(res1.status).toBe(200);

      // Driver 2 attempts to accept the already matched load
      const req2 = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver2}`,
          'content-type': 'application/json',
          'idempotency-key': 'second-accept-key',
        },
        body: JSON.stringify({ load_id: load.id }),
      });
      const res2 = await loadsAcceptPOST(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error).toMatch(/already accepted/i);
    });

    it('TC-ADV-RACE-04: Attempting to accept a load in in_transit or delivered status returns 409 Conflict', async () => {
      // Create load in in_transit status
      const loadTransit = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Mumbai Port',
        destination_name: 'Ahmedabad Ring Road',
        weight_kg: 20000,
        status: 'in_transit',
      });

      const reqTransit = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ load_id: loadTransit.id }),
      });
      const resTransit = await loadsAcceptPOST(reqTransit);
      expect(resTransit.status).toBe(409);

      // Create load in delivered status
      const loadDelivered = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Surat Hub',
        destination_name: 'Navsari Highway',
        weight_kg: 12000,
        status: 'delivered',
      });

      const reqDelivered = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ load_id: loadDelivered.id }),
      });
      const resDelivered = await loadsAcceptPOST(reqDelivered);
      expect(resDelivered.status).toBe(409);
    });

    it('TC-ADV-RACE-05: Independent concurrent acceptances in separate tenants (Org A & Org B) proceed with zero cross-tenant crosstalk', async () => {
      const loadA = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Mumbai Kalamboli',
        destination_name: 'Surat Textile Market',
        weight_kg: 16000,
      });

      const loadB = await dataService.createLoad(tenantBetaAdmin, {
        origin_name: 'Jaipur Transport Hub',
        destination_name: 'Delhi Azadpur',
        weight_kg: 14000,
      });

      const [resA, resB] = await Promise.all([
        loadsAcceptPOST(
          new NextRequest('http://localhost:3000/api/v1/loads/accept', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${tokenAlphaDriver1}`,
              'content-type': 'application/json',
              'idempotency-key': 'concurrent-tenant-a-key',
            },
            body: JSON.stringify({ load_id: loadA.id }),
          })
        ),
        loadsAcceptPOST(
          new NextRequest('http://localhost:3000/api/v1/loads/accept', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${tokenBetaDriver1}`,
              'content-type': 'application/json',
              'idempotency-key': 'concurrent-tenant-b-key',
            },
            body: JSON.stringify({ load_id: loadB.id }),
          })
        ),
      ]);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const jsonA = await resA.json();
      const jsonB = await resB.json();

      expect(jsonA.success).toBe(true);
      expect(jsonB.success).toBe(true);
      expect(jsonA.trip_id).not.toBe(jsonB.trip_id);

      // Verify tenant scoping of created trips
      const tripsA = dataService.getTrips(tenantAlphaDriver1, {});
      const tripsB = dataService.getTrips(tenantBetaDriver1, {});

      expect(tripsA.data).toHaveLength(1);
      expect(tripsB.data).toHaveLength(1);
      expect(tripsA.data[0].id).toBe(jsonA.trip_id);
      expect(tripsB.data[0].id).toBe(jsonB.trip_id);
    });
  });

  // =========================================================================
  // SUITE 3: IDEMPOTENCY KEY REPLAY & NAMESPACE HARDENING
  // =========================================================================
  describe('Adversarial Group 3: Idempotency Key Replay & Multi-Tenant Namespace Hardening', () => {
    it('TC-ADV-IDEM-01: Idempotent replay on POST /api/v1/loads/accept returns cached 200 OK without creating duplicate trips', async () => {
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Bharuch Chemical Complex',
        destination_name: 'Anand Milk Hub',
        weight_kg: 22000,
      });

      const idempotencyKey = 'unique-accept-key-001';
      const makeReq = () =>
        new NextRequest('http://localhost:3000/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({ load_id: load.id }),
        });

      // Request 1: Fresh execution
      const res1 = await loadsAcceptPOST(makeReq());
      expect(res1.status).toBe(200);
      expect(res1.headers.get('Idempotency-Replayed')).toBeNull();
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.trip_id).toBeDefined();

      // Request 2: Idempotent replay
      const res2 = await loadsAcceptPOST(makeReq());
      expect(res2.status).toBe(200);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      const json2 = await res2.json();
      expect(json2.trip_id).toBe(json1.trip_id);
      expect(json2.message).toBe(json1.message);

      // Verify that dataService still only contains exactly 1 trip
      const trips = dataService.getTrips(tenantAlphaDriver1, {});
      expect(trips.data).toHaveLength(1);
      expect(trips.data[0].id).toBe(json1.trip_id);
    });

    it('TC-ADV-IDEM-02: Identical Idempotency-Key across two different organizations does not cause cache collision', async () => {
      const sharedKey = 'shared-idempotency-key-across-tenants-999';

      const loadAlpha = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Alpha Source Mumbai',
        destination_name: 'Alpha Dest Surat',
        weight_kg: 10000,
      });

      const loadBeta = await dataService.createLoad(tenantBetaAdmin, {
        origin_name: 'Beta Source Delhi',
        destination_name: 'Beta Dest Gurgaon',
        weight_kg: 12000,
      });

      // Org Alpha accepts load with sharedKey
      const reqAlpha = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
          'idempotency-key': sharedKey,
        },
        body: JSON.stringify({ load_id: loadAlpha.id }),
      });
      const resAlpha = await loadsAcceptPOST(reqAlpha);
      expect(resAlpha.status).toBe(200);
      const jsonAlpha = await resAlpha.json();

      // Org Beta sends accept request with the EXACT SAME idempotency key
      const reqBeta = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenBetaDriver1}`,
          'content-type': 'application/json',
          'idempotency-key': sharedKey,
        },
        body: JSON.stringify({ load_id: loadBeta.id }),
      });
      const resBeta = await loadsAcceptPOST(reqBeta);
      expect(resBeta.status).toBe(200);

      // Org Beta must NOT receive replayed cache from Org Alpha!
      expect(resBeta.headers.get('Idempotency-Replayed')).toBeNull();
      const jsonBeta = await resBeta.json();

      expect(jsonBeta.trip_id).not.toBe(jsonAlpha.trip_id);
      expect(jsonBeta.load.id).toBe(loadBeta.id);
      expect(jsonBeta.load.tenant_id).toBe(tenantBetaAdmin.tenant_id);
    });

    it('TC-ADV-IDEM-03: Rapid 10-request network burst with identical Idempotency-Key on /api/v1/loads/accept converges on single trip', async () => {
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Surat Textile City',
        destination_name: 'Mumbai Kalamboli Iron Yard',
        weight_kg: 26000,
      });

      const burstKey = 'burst-accept-key-10x';
      const makeReq = () =>
        new NextRequest('http://localhost:3000/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': burstKey,
          },
          body: JSON.stringify({ load_id: load.id }),
        });

      // Fire 10 sequential calls (simulating rapid network retries)
      const responses: Response[] = [];
      for (let i = 0; i < 10; i++) {
        responses.push(await loadsAcceptPOST(makeReq()));
      }

      // All 10 must succeed with HTTP 200
      for (const res of responses) {
        expect(res.status).toBe(200);
      }

      // First call was fresh, remaining 9 were replayed
      expect(responses[0].headers.get('Idempotency-Replayed')).toBeNull();
      for (let i = 1; i < 10; i++) {
        expect(responses[i].headers.get('Idempotency-Replayed')).toBe('true');
      }

      // All responses return the identical trip_id
      const bodies = await Promise.all(responses.map((r) => r.json()));
      const firstTripId = bodies[0].trip_id;
      for (const b of bodies) {
        expect(b.trip_id).toBe(firstTripId);
      }

      // Exactly 1 trip created in total
      const trips = dataService.getTrips(tenantAlphaDriver1, {});
      expect(trips.data).toHaveLength(1);
    });

    it('TC-ADV-IDEM-04: Idempotent replay on PATCH /api/v1/trips returns cached milestone response with Idempotency-Replayed header', async () => {
      // Create initial trip and advance to at_pickup so sequential progression allows 'loaded'
      const trip = await dataService.createTrip(tenantAlphaDriver1, {
        gross_freight: 48000,
        maintenance_reserve: 2400,
      });
      await dataService.updateTripMilestone(tenantAlphaDriver1, trip.id, 'at_pickup');

      const patchKey = 'milestone-patch-replay-key-01';
      const makePatchReq = (status: MilestoneStatus) =>
        new NextRequest('http://localhost:3000/api/v1/trips', {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': patchKey,
          },
          body: JSON.stringify({
            trip_id: trip.id,
            milestone_status: status,
          }),
        });

      // Step 1: Patch milestone to 'loaded'
      const res1 = await tripsPATCH(makePatchReq('loaded'));
      expect(res1.status).toBe(200);
      expect(res1.headers.get('Idempotency-Replayed')).toBeNull();
      const json1 = await res1.json();
      expect(json1.trip.milestone_status).toBe('loaded');

      // Step 2: Replay identical request with same key
      const res2 = await tripsPATCH(makePatchReq('loaded'));
      expect(res2.status).toBe(200);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      const json2 = await res2.json();
      expect(json2.trip.id).toBe(json1.trip.id);
      expect(json2.trip.milestone_status).toBe('loaded');
    });

    it('TC-ADV-IDEM-05: Sequential milestone state transitions with distinct idempotency keys progress cleanly and support historical replay', async () => {
      const trip = await dataService.createTrip(tenantAlphaDriver1, {
        gross_freight: 52000,
      });

      const milestones: MilestoneStatus[] = [
        'at_pickup',
        'loaded',
        'in_transit',
        'halt',
        'at_unloading',
        'completed',
      ];

      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        const stepKey = `milestone-step-key-${i}`;

        const req = new NextRequest('http://localhost:3000/api/v1/trips', {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': stepKey,
          },
          body: JSON.stringify({
            trip_id: trip.id,
            milestone_status: milestone,
          }),
        });

        const res = await tripsPATCH(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.trip.milestone_status).toBe(milestone);

        // Replaying this step key returns the milestone at this step
        const replayReq = new NextRequest('http://localhost:3000/api/v1/trips', {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': stepKey,
          },
          body: JSON.stringify({
            trip_id: trip.id,
            milestone_status: milestone,
          }),
        });
        const replayRes = await tripsPATCH(replayReq);
        expect(replayRes.status).toBe(200);
        expect(replayRes.headers.get('Idempotency-Replayed')).toBe('true');
      }

      // Verify completed trip has recorded end_time
      const finishedTrip = dataService.getTripById(tenantAlphaDriver1, trip.id);
      expect(finishedTrip?.milestone_status).toBe('completed');
      expect(finishedTrip?.end_time).toBeDefined();
    });

    it('TC-ADV-IDEM-06: 409 Conflict response on load accept is cached idempotently so driver retry gets consistent 409 Conflict', async () => {
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Navsari Highway',
        destination_name: 'Valsad GIDC',
        weight_kg: 11000,
      });

      // Driver 1 accepts load
      await loadsAcceptPOST(
        new NextRequest('http://localhost:3000/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': 'driver1-win-key',
          },
          body: JSON.stringify({ load_id: load.id }),
        })
      );

      // Driver 2 attempts to accept already matched load with an idempotency key
      const retryKey = 'driver2-retry-conflict-key';
      const makeReq2 = () =>
        new NextRequest('http://localhost:3000/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver2}`,
            'content-type': 'application/json',
            'idempotency-key': retryKey,
          },
          body: JSON.stringify({ load_id: load.id }),
        });

      const resConflict1 = await loadsAcceptPOST(makeReq2());
      expect(resConflict1.status).toBe(409);
      expect(resConflict1.headers.get('Idempotency-Replayed')).toBeNull();

      // Retry should serve cached 409 cleanly
      const resConflict2 = await loadsAcceptPOST(makeReq2());
      expect(resConflict2.status).toBe(409);
      expect(resConflict2.headers.get('Idempotency-Replayed')).toBe('true');
    });

    it('TC-ADV-IDEM-07: Handles malicious SQL injection / XSS strings safely in Idempotency-Key header', async () => {
      const load = await dataService.createLoad(tenantAlphaAdmin, {
        origin_name: 'Security Test Origin',
        destination_name: 'Security Test Destination',
        weight_kg: 5000,
      });

      const maliciousKeys = [
        "'; DROP TABLE audit_log; --",
        '<script>alert(1)</script>',
        '../../../../etc/passwd',
        'key-with-percent-encoded-%F0%9F%9A%80',
        '--select * from profiles where 1=1',
      ];

      for (const key of maliciousKeys) {
        const req = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenAlphaDriver1}`,
            'content-type': 'application/json',
            'idempotency-key': key,
          },
          body: JSON.stringify({ load_id: load.id }),
        });

        // Even with adversarial key strings, should not crash with 500
        const res = await loadsAcceptPOST(req);
        expect([200, 409]).toContain(res.status);
      }
    });

    it('TC-ADV-IDEM-08: Missing body or missing load_id on /api/v1/loads/accept returns 400 Bad Request', async () => {
      // Empty body
      const reqEmpty = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
        },
        body: '',
      });
      const resEmpty = await loadsAcceptPOST(reqEmpty);
      expect(resEmpty.status).toBe(400);

      // Missing load_id
      const reqNoId = new NextRequest('http://localhost:3000/api/v1/loads/accept', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ some_other_field: 'value' }),
      });
      const resNoId = await loadsAcceptPOST(reqNoId);
      expect(resNoId.status).toBe(400);
      const jsonNoId = await resNoId.json();
      expect(jsonNoId.error).toMatch(/load_id is required/i);
    });

    it('TC-ADV-IDEM-09: Missing body or missing parameters on PATCH /api/v1/trips returns 400 Bad Request', async () => {
      // Missing milestone_status
      const reqNoMilestone = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ trip_id: 'some-trip-id' }),
      });
      const resNoMilestone = await tripsPATCH(reqNoMilestone);
      expect(resNoMilestone.status).toBe(400);
      const jsonNoMilestone = await resNoMilestone.json();
      expect(jsonNoMilestone.error).toMatch(/Both trip_id and milestone_status are required/i);

      // Missing trip_id
      const reqNoTripId = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver1}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ milestone_status: 'loaded' }),
      });
      const resNoTripId = await tripsPATCH(reqNoTripId);
      expect(resNoTripId.status).toBe(400);
    });
  });
});
