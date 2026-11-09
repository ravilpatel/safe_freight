/**
 * SafeFreight OS — Tier 5 Adversarial Penetration & Cross-Tenant Security Suite: Phase 4
 *
 * Verifies strict cross-tenant isolation, RBAC route guards, single-use token invariants,
 * and cryptographic JWT forgery defenses against the Phase 4 Fleet Admin Console.
 *
 * Target Endpoints:
 * - /api/v1/fleet/dead-mileage (GET)
 * - /api/v1/fleet/alerts (GET, POST, PATCH)
 * - /api/v1/fleet/documents (GET, POST, DELETE)
 * - /api/v1/safety/incidents (GET, POST, PATCH)
 * - /api/v1/fleet/drivers (GET, POST)
 * - /api/v1/trips (GET, POST, PATCH)
 * - /api/v1/khata (GET, POST)
 * - /api/v1/auth/driver-onboard (POST)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as deadMileageGET } from '@/app/api/v1/fleet/dead-mileage/route';
import { GET as alertsGET, POST as alertsPOST, PATCH as alertsPATCH } from '@/app/api/v1/fleet/alerts/route';
import { GET as docsGET, POST as docsPOST, DELETE as docsDELETE } from '@/app/api/v1/fleet/documents/route';
import { GET as safetyGET, POST as _safetyPOST, PATCH as safetyPATCH } from '@/app/api/v1/safety/incidents/route';
import { GET as driversGET, POST as driversPOST } from '@/app/api/v1/fleet/drivers/route';
import { GET as tripsGET, PATCH as tripsPATCH } from '@/app/api/v1/trips/route';
import { GET as khataGET, POST as khataPOST } from '@/app/api/v1/khata/route';
import { POST as driverOnboardPOST } from '@/app/api/v1/auth/driver-onboard/route';

import { dataService } from '@/lib/data-service';
import {
  tenantStore,
  createSignedJwtPayload,
  createDriverInvitation,
} from '@/lib/auth';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 5 Adversarial Penetration: Phase 4 Multi-Tenancy & RBAC Security Suite', () => {
  // Tenant Alpha: Alpha Logistics Pvt Ltd
  const tenantAlphaId = '00000000-0000-4000-a000-000000000001';
  const alphaAdminClaims: SessionClaims = {
    sub: 'alpha-admin-uuid-001',
    email: 'admin@alpha-logistics.in',
    tenant_id: tenantAlphaId,
    role: 'fleet_admin',
  };
  const alphaDriverClaims: SessionClaims = {
    sub: 'alpha-driver-uuid-001',
    email: 'ramesh@alpha-logistics.in',
    tenant_id: tenantAlphaId,
    role: 'driver',
  };
  const alphaShipperClaims: SessionClaims = {
    sub: 'alpha-shipper-uuid-001',
    email: 'shipper@alpha-logistics.in',
    tenant_id: tenantAlphaId,
    role: 'shipper',
  };

  // Tenant Beta: Beta Transport Carriers
  const tenantBetaId = '00000000-0000-4000-b000-000000000002';
  const betaAdminClaims: SessionClaims = {
    sub: 'beta-admin-uuid-002',
    email: 'admin@beta-transport.in',
    tenant_id: tenantBetaId,
    role: 'fleet_admin',
  };

  let tokenAlphaAdmin: string;
  let tokenAlphaDriver: string;
  let tokenAlphaShipper: string;
  let tokenBetaAdmin: string;

  beforeEach(() => {
    dataService.clear();
    tenantStore.clear();
    globalIdempotencyStore.clear();

    // Register Organizations
    tenantStore.saveOrganization({
      id: tenantAlphaId,
      name: 'Alpha Logistics Pvt Ltd',
      type: 'carrier',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tenantStore.saveOrganization({
      id: tenantBetaId,
      name: 'Beta Transport Carriers',
      type: 'carrier',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Register Profiles
    tenantStore.saveProfile({
      id: alphaAdminClaims.sub,
      tenant_id: tenantAlphaId,
      role: 'fleet_admin',
      full_name: 'Alpha Admin',
      phone: '+919800000001',
      language_preference: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tenantStore.saveProfile({
      id: alphaDriverClaims.sub,
      tenant_id: tenantAlphaId,
      role: 'driver',
      full_name: 'Alpha Driver Ramesh',
      phone: '+919800000002',
      language_preference: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tenantStore.saveProfile({
      id: betaAdminClaims.sub,
      tenant_id: tenantBetaId,
      role: 'fleet_admin',
      full_name: 'Beta Admin',
      phone: '+919800000003',
      language_preference: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    tokenAlphaAdmin = createSignedJwtPayload(alphaAdminClaims);
    tokenAlphaDriver = createSignedJwtPayload(alphaDriverClaims);
    tokenAlphaShipper = createSignedJwtPayload(alphaShipperClaims);
    tokenBetaAdmin = createSignedJwtPayload(betaAdminClaims);
  });

  // =========================================================================
  // 1. MULTI-TENANT CROSS-CONTAMINATION & ISOLATION PROBES
  // =========================================================================
  describe('Penetration Vector 1: Cross-Tenant Data Leaks & Unauthorized Mutations', () => {
    it('AT-SEC-01: Tenant B cannot read Tenant A dead-mileage metrics or fleet KPIs', async () => {
      // Populate Tenant A with active trips
      await dataService.createTrip(alphaAdminClaims, {
        gross_freight: 85000,
        maintenance_reserve: 8500,
      });
      await dataService.createTrip(alphaAdminClaims, {
        gross_freight: 65000,
        maintenance_reserve: 6500,
      });

      // Populate Tenant A with security alerts & incidents
      await dataService.createSecurityAlert(alphaAdminClaims, {
        alert_type: 'route_deviation',
        message: 'Tenant A unauthorized detour 9.2 km',
      });
      await dataService.createSafetyIncident(alphaAdminClaims, {
        incident_type: 'rollover',
        g_force: 5.5,
      });

      // Tenant A queries metrics
      const alphaReq = new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
        headers: { authorization: `Bearer ${tokenAlphaAdmin}` },
      });
      const alphaRes = await deadMileageGET(alphaReq);
      const alphaJson = await alphaRes.json();
      expect(alphaRes.status).toBe(200);
      expect(alphaJson.data.summary.activeAssets).toBe(2);
      expect(alphaJson.data.summary.activeAlertsCount).toBe(2);
      expect(alphaJson.data.totalMoneySavedINR).toBeGreaterThan(0);

      // Tenant B queries metrics with Tenant B token
      const betaReq = new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
        headers: { authorization: `Bearer ${tokenBetaAdmin}` },
      });
      const betaRes = await deadMileageGET(betaReq);
      const betaJson = await betaRes.json();
      expect(betaRes.status).toBe(200);

      // Invariant: 0 records leaked from Tenant A
      expect(betaJson.data.summary.activeAssets).toBe(0);
      expect(betaJson.data.summary.activeAlertsCount).toBe(0);
      expect(betaJson.data.summary.fuelSavedINR).toBe(0);
      expect(betaJson.data.summary.totalMoneySavedINR).toBe(0);
      expect(betaJson.data.summary.co2SavedKg).toBe(0);
      expect(betaJson.data.totalKm).toBe(0);
    });

    it('AT-SEC-02: Tenant B cannot read or resolve Tenant A security alerts', async () => {
      // Create security alert in Tenant A
      const alphaAlert = await dataService.createSecurityAlert(alphaAdminClaims, {
        alert_type: 'unauthorized_stop',
        message: 'Tenant A truck stopped at unauthorized motel for 65 mins',
        severity: 'critical',
      });

      // Tenant B attempts to read alerts
      const betaReadReq = new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
        headers: { authorization: `Bearer ${tokenBetaAdmin}` },
      });
      const betaReadRes = await alertsGET(betaReadReq);
      const betaReadJson = await betaReadRes.json();
      expect(betaReadRes.status).toBe(200);
      expect(betaReadJson.data).toHaveLength(0);
      expect(betaReadJson.pagination.total).toBe(0);

      // Tenant B attempts to resolve Tenant A alert
      const betaResolveReq = new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenBetaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          alert_id: alphaAlert.id,
          notes: 'Malicious competitor unauthorized dismissal',
        }),
      });
      const betaResolveRes = await alertsPATCH(betaResolveReq);
      expect(betaResolveRes.status).toBe(404);

      // Verify Tenant A alert remains unresolved and unmodified
      const alphaAlerts = dataService.getSecurityAlerts(alphaAdminClaims);
      expect(alphaAlerts.data[0].resolved).toBe(false);
      expect(alphaAlerts.data[0].message).not.toContain('Malicious competitor');
    });

    it('AT-SEC-03: Tenant B cannot read or delete Tenant A statutory documents', async () => {
      // Create document in Tenant A
      const alphaDoc = await dataService.createDocument(alphaAdminClaims, {
        vehicle_number: 'MH-04-AZ-9999',
        doc_type: 'national_permit',
        expiry_date: '2027-12-31',
        document_url: 'https://cdn.alpha.in/permits/9999.pdf',
      });

      // Tenant B attempts to read documents
      const betaReadReq = new NextRequest('http://localhost:3000/api/v1/fleet/documents', {
        headers: { authorization: `Bearer ${tokenBetaAdmin}` },
      });
      const betaReadRes = await docsGET(betaReadReq);
      const betaReadJson = await betaReadRes.json();
      expect(betaReadRes.status).toBe(200);
      expect(betaReadJson.data).toHaveLength(0);
      expect(betaReadJson.pagination.total).toBe(0);

      // Tenant B attempts to delete Tenant A document via query param
      const betaDeleteReq = new NextRequest(
        `http://localhost:3000/api/v1/fleet/documents?id=${alphaDoc.id}`,
        {
          method: 'DELETE',
          headers: { authorization: `Bearer ${tokenBetaAdmin}` },
        }
      );
      const betaDeleteRes = await docsDELETE(betaDeleteReq);
      expect(betaDeleteRes.status).toBe(404);

      // Tenant B attempts to delete Tenant A document via request body
      const betaDeleteBodyReq = new NextRequest('http://localhost:3000/api/v1/fleet/documents', {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${tokenBetaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id: alphaDoc.id }),
      });
      const betaDeleteBodyRes = await docsDELETE(betaDeleteBodyReq);
      expect(betaDeleteBodyRes.status).toBe(404);

      // Verify Tenant A document still exists intact
      const alphaDocs = dataService.getDocuments(alphaAdminClaims);
      expect(alphaDocs.data).toHaveLength(1);
      expect(alphaDocs.data[0].id).toBe(alphaDoc.id);
    });

    it('AT-SEC-04: Tenant B cannot read or mutate Tenant A safety incidents', async () => {
      // Create safety incident in Tenant A
      const alphaIncident = await dataService.createSafetyIncident(alphaAdminClaims, {
        incident_type: 'crash',
        g_force: 6.8,
        status: 'triggered',
      });

      // Tenant B attempts to read safety incidents
      const betaReadReq = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        headers: { authorization: `Bearer ${tokenBetaAdmin}` },
      });
      const betaReadRes = await safetyGET(betaReadReq);
      const betaReadJson = await betaReadRes.json();
      expect(betaReadRes.status).toBe(200);
      expect(betaReadJson.data).toHaveLength(0);
      expect(betaReadJson.pagination.total).toBe(0);

      // Tenant B attempts to log T2 on Tenant A incident
      const betaPatchReq = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenBetaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: alphaIncident.id,
          action: 'log_t2',
        }),
      });
      const betaPatchRes = await safetyPATCH(betaPatchReq);
      expect(betaPatchRes.status).toBe(404);

      // Tenant B attempts to cancel Tenant A incident
      const betaCancelReq = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenBetaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: alphaIncident.id,
          action: 'cancel',
          reason: 'Unauthorized attacker dismiss',
        }),
      });
      const betaCancelRes = await safetyPATCH(betaCancelReq);
      expect(betaCancelRes.status).toBe(404);

      // Verify Tenant A incident remains unchanged in 'triggered' status without T2
      const alphaIncidents = dataService.getSafetyIncidents(alphaAdminClaims);
      expect(alphaIncidents.data[0].status).toBe('triggered');
      expect(alphaIncidents.data[0].t2_timestamp).toBeNull();
    });

    it('AT-SEC-05: Tenant B cannot read or modify Tenant A trips via /api/v1/trips', async () => {
      // Create trip in Tenant A
      const alphaTrip = await dataService.createTrip(alphaAdminClaims, {
        gross_freight: 90000,
        maintenance_reserve: 9000,
      });

      // Tenant B attempts to read trips
      const betaTripsReq = new NextRequest('http://localhost:3000/api/v1/trips', {
        headers: { authorization: `Bearer ${tokenBetaAdmin}` },
      });
      const betaTripsRes = await tripsGET(betaTripsReq);
      const betaTripsJson = await betaTripsRes.json();
      expect(betaTripsRes.status).toBe(200);
      expect(betaTripsJson.data).toHaveLength(0);
      expect(betaTripsJson.pagination.total).toBe(0);

      // Tenant B attempts to mutate milestone of Tenant A trip
      const betaMutateReq = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenBetaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: alphaTrip.id,
          milestone_status: 'in_transit',
        }),
      });
      const betaMutateRes = await tripsPATCH(betaMutateReq);
      expect(betaMutateRes.status).toBe(404);

      // Verify trip remains in created milestone
      const alphaTrips = dataService.getTrips(alphaAdminClaims, {});
      expect(alphaTrips.data[0].milestone_status).toBe('created');
    });

    it('AT-SEC-06: Tenant B cannot enumerate Tenant A drivers or invitations', async () => {
      // Generate driver invitation in Tenant A
      await createDriverInvitation(alphaAdminClaims, {
        phone: '+919999888877',
      });

      // Tenant B queries /api/v1/fleet/drivers
      const betaReq = new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
        headers: { authorization: `Bearer ${tokenBetaAdmin}` },
      });
      const betaRes = await driversGET(betaReq);
      const betaJson = await betaRes.json();
      expect(betaRes.status).toBe(200);

      // Assert 0 Tenant A drivers or invitations leaked
      expect(betaJson.drivers).toHaveLength(0);
      expect(betaJson.invitations).toHaveLength(0);
    });

    it('AT-SEC-07: Claiming Tenant A invitation assigns driver strictly to Tenant A, not Tenant B', async () => {
      // Tenant A generates an invitation
      const invitation = await createDriverInvitation(alphaAdminClaims, {
        phone: '+919877700011',
      });

      // Driver onboards using that invitation
      const req = new NextRequest('http://localhost:3000/api/v1/auth/driver-onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invitationToken: invitation.token,
          email: 'driver.onboard@alpha.in',
          fullName: 'New Alpha Driver',
          password: 'SecurePassword123!',
          phone: '+919877700011',
        }),
      });

      const res = await driverOnboardPOST(req);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.user.tenantId).toBe(tenantAlphaId);
      expect(json.organization.id).toBe(tenantAlphaId);

      // Verify profile in tenantStore is strictly bounded to Tenant A
      const driverProfile = tenantStore.getProfile(json.user.id);
      expect(driverProfile?.tenant_id).toBe(tenantAlphaId);

      // Assert Tenant B's driver query does not contain this driver
      const betaDrivers = tenantStore.getProfilesByTenant(tenantBetaId);
      expect(betaDrivers.some((d) => d.id === json.user.id)).toBe(false);
    });

    it('AT-SEC-08: Tenant B cannot read settlement or disburse advances on Tenant A trip via /api/v1/khata', async () => {
      // Create trip in Tenant A
      const alphaTrip = await dataService.createTrip(alphaAdminClaims, {
        gross_freight: 70000,
        maintenance_reserve: 7000,
      });

      // Tenant B attempts to read Khata settlement for Tenant A trip
      const betaKhataReq = new NextRequest(
        `http://localhost:3000/api/v1/khata?trip_id=${alphaTrip.id}`,
        {
          headers: { authorization: `Bearer ${tokenBetaAdmin}` },
        }
      );
      const betaKhataRes = await khataGET(betaKhataReq);
      expect(betaKhataRes.status).toBe(404);

      // Tenant B attempts to disburse diesel advance on Tenant A trip
      const betaDisburseReq = new NextRequest('http://localhost:3000/api/v1/khata', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenBetaAdmin}`,
          'Idempotency-Key': 'beta-malicious-advance-disburse-001',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: alphaTrip.id,
          type: 'diesel',
          amount: 25000,
          notes: 'Malicious unauthorized advance disbursement',
        }),
      });
      const betaDisburseRes = await khataPOST(betaDisburseReq);
      expect(betaDisburseRes.status).toBe(404);

      // Verify Tenant A trip advances remain empty
      const alphaKhata = dataService.getTripKhataSettlement(alphaAdminClaims, alphaTrip.id);
      expect(alphaKhata?.settlement.totalDisbursedAdvancesINR).toBe(0);
      expect(alphaKhata?.settlement.balanceDueOnPODINR).toBe(70000);
    });
  });

  // =========================================================================
  // 2. RBAC & ROUTE GUARD DEFENSES
  // =========================================================================
  describe('Penetration Vector 2: Role-Based Access Control (RBAC) & Route Guards', () => {
    it('AT-RBAC-01: Driver JWT rejected with HTTP 403 on all /api/v1/fleet/* endpoints', async () => {
      const endpoints: Array<{ name: string; call: () => Promise<Response> }> = [
        {
          name: 'GET /api/v1/fleet/dead-mileage',
          call: () =>
            deadMileageGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
                headers: { authorization: `Bearer ${tokenAlphaDriver}` },
              })
            ),
        },
        {
          name: 'GET /api/v1/fleet/documents',
          call: () =>
            docsGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/documents', {
                headers: { authorization: `Bearer ${tokenAlphaDriver}` },
              })
            ),
        },
        {
          name: 'POST /api/v1/fleet/documents',
          call: () =>
            docsPOST(
              new NextRequest('http://localhost:3000/api/v1/fleet/documents', {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${tokenAlphaDriver}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  vehicle_number: 'MH-04-AZ-1111',
                  doc_type: 'fitness',
                }),
              })
            ),
        },
        {
          name: 'DELETE /api/v1/fleet/documents',
          call: () =>
            docsDELETE(
              new NextRequest('http://localhost:3000/api/v1/fleet/documents?id=dummy-id', {
                method: 'DELETE',
                headers: { authorization: `Bearer ${tokenAlphaDriver}` },
              })
            ),
        },
        {
          name: 'GET /api/v1/fleet/drivers',
          call: () =>
            driversGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
                headers: { authorization: `Bearer ${tokenAlphaDriver}` },
              })
            ),
        },
        {
          name: 'POST /api/v1/fleet/drivers',
          call: () =>
            driversPOST(
              new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${tokenAlphaDriver}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({ phone: '+919999000011' }),
              })
            ),
        },
        {
          name: 'GET /api/v1/fleet/alerts',
          call: () =>
            alertsGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
                headers: { authorization: `Bearer ${tokenAlphaDriver}` },
              })
            ),
        },
        {
          name: 'PATCH /api/v1/fleet/alerts',
          call: () =>
            alertsPATCH(
              new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
                method: 'PATCH',
                headers: {
                  authorization: `Bearer ${tokenAlphaDriver}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({ alert_id: 'dummy-id', notes: 'test' }),
              })
            ),
        },
        {
          name: 'POST /api/v1/fleet/alerts',
          call: () =>
            alertsPOST(
              new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${tokenAlphaDriver}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  alert_type: 'route_detour',
                  message: 'Driver attempting to post alert',
                }),
              })
            ),
        },
      ];

      for (const ep of endpoints) {
        const res = await ep.call();
        expect(
          res.status,
          `Endpoint ${ep.name} must return 403 Forbidden for Driver JWT but returned ${res.status}`
        ).toBe(403);
      }
    });

    it('AT-RBAC-02: Shipper JWT rejected with HTTP 403 on all /api/v1/fleet/* endpoints', async () => {
      const endpoints: Array<{ name: string; call: () => Promise<Response> }> = [
        {
          name: 'GET /api/v1/fleet/dead-mileage',
          call: () =>
            deadMileageGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
                headers: { authorization: `Bearer ${tokenAlphaShipper}` },
              })
            ),
        },
        {
          name: 'GET /api/v1/fleet/documents',
          call: () =>
            docsGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/documents', {
                headers: { authorization: `Bearer ${tokenAlphaShipper}` },
              })
            ),
        },
        {
          name: 'POST /api/v1/fleet/documents',
          call: () =>
            docsPOST(
              new NextRequest('http://localhost:3000/api/v1/fleet/documents', {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${tokenAlphaShipper}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  vehicle_number: 'MH-04-AZ-2222',
                  doc_type: 'fitness',
                }),
              })
            ),
        },
        {
          name: 'DELETE /api/v1/fleet/documents',
          call: () =>
            docsDELETE(
              new NextRequest('http://localhost:3000/api/v1/fleet/documents?id=dummy-id', {
                method: 'DELETE',
                headers: { authorization: `Bearer ${tokenAlphaShipper}` },
              })
            ),
        },
        {
          name: 'GET /api/v1/fleet/drivers',
          call: () =>
            driversGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
                headers: { authorization: `Bearer ${tokenAlphaShipper}` },
              })
            ),
        },
        {
          name: 'POST /api/v1/fleet/drivers',
          call: () =>
            driversPOST(
              new NextRequest('http://localhost:3000/api/v1/fleet/drivers', {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${tokenAlphaShipper}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({ phone: '+919999000022' }),
              })
            ),
        },
        {
          name: 'GET /api/v1/fleet/alerts',
          call: () =>
            alertsGET(
              new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
                headers: { authorization: `Bearer ${tokenAlphaShipper}` },
              })
            ),
        },
        {
          name: 'PATCH /api/v1/fleet/alerts',
          call: () =>
            alertsPATCH(
              new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
                method: 'PATCH',
                headers: {
                  authorization: `Bearer ${tokenAlphaShipper}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({ alert_id: 'dummy-id', notes: 'test' }),
              })
            ),
        },
        {
          name: 'POST /api/v1/fleet/alerts',
          call: () =>
            alertsPOST(
              new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${tokenAlphaShipper}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  alert_type: 'route_detour',
                  message: 'Shipper attempting to post alert',
                }),
              })
            ),
        },
      ];

      for (const ep of endpoints) {
        const res = await ep.call();
        expect(
          res.status,
          `Endpoint ${ep.name} must return 403 Forbidden for Shipper JWT but returned ${res.status}`
        ).toBe(403);
      }
    });

    it('AT-RBAC-03: Forged, tampered, and expired JWTs rejected with HTTP 401 Unauthorized', async () => {
      // 1. Missing token
      const missingRes = await deadMileageGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage')
      );
      expect(missingRes.status).toBe(401);

      // 2. Forged signature token
      const forgedToken = `${tokenAlphaAdmin.split('.').slice(0, 2).join('.')}.InVaLiD_SiGnAtUrE_xYz123`;
      const forgedRes = await deadMileageGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
          headers: { authorization: `Bearer ${forgedToken}` },
        })
      );
      expect(forgedRes.status).toBe(401);

      // 3. Expired token (exp in past: negative expiresInSeconds)
      const expiredToken = createSignedJwtPayload(alphaAdminClaims, -3600);
      const expiredRes = await deadMileageGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
          headers: { authorization: `Bearer ${expiredToken}` },
        })
      );
      expect(expiredRes.status).toBe(401);

      // 4. Malformed random garbage token
      const garbageRes = await deadMileageGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/dead-mileage', {
          headers: { authorization: 'Bearer thisisnotajwtatall' },
        })
      );
      expect(garbageRes.status).toBe(401);
    });

    it('AT-RBAC-04: Driver invitation single-use token replay rejected on second attempt', async () => {
      const invitation = await createDriverInvitation(alphaAdminClaims, {
        phone: '+919988776655',
      });

      // First redemption attempt succeeds
      const firstReq = new NextRequest('http://localhost:3000/api/v1/auth/driver-onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invitationToken: invitation.token,
          email: 'driver.first@alpha.in',
          fullName: 'Driver First Claim',
          password: 'Password123!',
          phone: '+919988776655',
        }),
      });
      const firstRes = await driverOnboardPOST(firstReq);
      expect(firstRes.status).toBe(201);

      // Second replay attempt with same token must be rejected
      const replayReq = new NextRequest('http://localhost:3000/api/v1/auth/driver-onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invitationToken: invitation.token,
          email: 'driver.replay@alpha.in',
          fullName: 'Driver Replay Hacker',
          password: 'Password123!',
          phone: '+919988776655',
        }),
      });
      const replayRes = await driverOnboardPOST(replayReq);
      const replayJson = await replayRes.json();

      expect(replayRes.status).toBe(400);
      expect(replayJson.error).toContain('already redeemed');
    });
  });
});
