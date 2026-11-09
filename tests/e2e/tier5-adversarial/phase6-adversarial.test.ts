/**
 * SafeFreight OS — Tier 5: Adversarial Hardening Suite for Phase 6
 * Cross-Tenant Isolation & Penetration Defenses for Safety & Telematics
 * Reference: PRD v4.0.0 §3, §4, §5 Phase 6, §8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as sosPOST } from '@/app/api/v1/safety/sos/route';
import { POST as cancelPOST } from '@/app/api/v1/safety/cancel/route';
import { POST as pingsPOST, GET as pingsGET } from '@/app/api/v1/pings/route';
import { PATCH as incidentsPATCH } from '@/app/api/v1/safety/incidents/route';
import { createSignedJwtPayload } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { SessionClaims } from '@/types/database';

describe('Tier 5 Adversarial Hardening: Phase 6 Safety & Tenancy Security Suite', () => {
  // Tenant Alpha
  const tenantAlphaOrgId = '11111111-1111-4000-a000-000000000001';
  const alphaDriverClaims: SessionClaims = {
    sub: 'alpha-driver-001',
    email: 'driver@alpha.in',
    tenant_id: tenantAlphaOrgId,
    role: 'driver',
  };
  const alphaAdminClaims: SessionClaims = {
    sub: 'alpha-admin-001',
    email: 'admin@alpha.in',
    tenant_id: tenantAlphaOrgId,
    role: 'fleet_admin',
  };
  const alphaShipperClaims: SessionClaims = {
    sub: 'alpha-shipper-001',
    email: 'shipper@alpha.in',
    tenant_id: tenantAlphaOrgId,
    role: 'shipper',
  };

  // Tenant Beta
  const tenantBetaOrgId = '22222222-2222-4000-b000-000000000002';
  const betaDriverClaims: SessionClaims = {
    sub: 'beta-driver-001',
    email: 'driver@beta.in',
    tenant_id: tenantBetaOrgId,
    role: 'driver',
  };
  const betaAdminClaims: SessionClaims = {
    sub: 'beta-admin-001',
    email: 'admin@beta.in',
    tenant_id: tenantBetaOrgId,
    role: 'fleet_admin',
  };

  let tokenAlphaDriver: string;
  let tokenAlphaAdmin: string;
  let tokenAlphaShipper: string;

  beforeEach(() => {
    dataService.clear();

    tokenAlphaDriver = createSignedJwtPayload(alphaDriverClaims);
    tokenAlphaAdmin = createSignedJwtPayload(alphaAdminClaims);
    tokenAlphaShipper = createSignedJwtPayload(alphaShipperClaims);
  });

  // ==========================================
  // 1. CROSS-TENANT ISOLATION ATTACKS
  // ==========================================
  describe('Group 1: Cross-Tenant Safety Attacks', () => {
    it('TC-ADV-SF-01: Tenant Alpha driver cannot cancel Tenant Beta safety incident (strictly 404)', async () => {
      // 1. Tenant Beta creates legitimate distress incident
      const incidentBeta = await dataService.createDistressSos(betaDriverClaims, {
        vehicle_plate: 'MH 04 GP 9102',
        coords: { lat: 21.1702, lng: 72.8311 },
        speed: 65,
        g_force: 4.6,
      });

      // 2. Tenant Alpha driver attempts to cancel Tenant Beta's incident
      const req = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: incidentBeta.id,
          reason: 'Malicious cross-tenant cancellation attack',
        }),
      });

      const res = await cancelPOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);

      // Verify Tenant Beta incident remains untouched
      const persisted = dataService.getSafetyIncidentById(betaAdminClaims, incidentBeta.id);
      expect(persisted?.status).toBe('erss_notified');
    });

    it('TC-ADV-SF-02: Tenant Alpha admin cannot log T2 arrival on Tenant Beta safety incident (strictly 404)', async () => {
      const incidentBeta = await dataService.createDistressSos(betaDriverClaims, {
        vehicle_plate: 'MH 04 GP 9102',
        coords: { lat: 21.1702, lng: 72.8311 },
        speed: 65,
        g_force: 4.6,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: incidentBeta.id,
          action: 'log_t2',
        }),
      });

      const res = await incidentsPATCH(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);
    });

    it('TC-ADV-SF-03: Tenant Alpha cannot read Tenant Beta telematics pings (strictly isolated)', async () => {
      // 1. Tenant Beta ingests 5 pings
      await dataService.ingestPings(betaDriverClaims, [
        { lat: 20.3712, lng: 72.9044, speed: 60, timestamp: new Date().toISOString() },
        { lat: 20.3800, lng: 72.9050, speed: 62, timestamp: new Date().toISOString() },
      ]);

      // 2. Tenant Alpha queries pings
      const req = new NextRequest('http://localhost:3000/api/v1/pings', {
        method: 'GET',
        headers: { authorization: `Bearer ${tokenAlphaAdmin}` },
      });

      const res = await pingsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(0); // Zero cross-tenant data leak
    });
  });

  // ==========================================
  // 2. RBAC PRIVILEGE ESCALATION ATTACKS
  // ==========================================
  describe('Group 2: RBAC Privilege Escalation Attacks', () => {
    it('TC-ADV-SF-04: Shipper role cannot trigger emergency SOS via /api/v1/safety/sos (strictly 403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_plate: 'GJ 05 AX 7824',
          coords: { lat: 20.3712, lng: 72.9106 },
        }),
      });

      const res = await sosPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-SF-05: Shipper role cannot cancel safety incidents via /api/v1/safety/cancel (strictly 403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Unauthorized shipper cancel attempt',
        }),
      });

      const res = await cancelPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-SF-06: Shipper role cannot ingest telematics pings via /api/v1/pings (strictly 403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/pings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pings: [{ lat: 20.0, lng: 72.0, speed: 50 }],
        }),
      });

      const res = await pingsPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });
  });

  // ==========================================
  // 3. AUTHENTICATION & TOKEN ATTACKS
  // ==========================================
  describe('Group 3: Authentication & Token Security', () => {
    it('TC-ADV-SF-07: unauthenticated request to /api/v1/safety/sos returns 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vehicle_plate: 'GJ 05 AX 7824' }),
      });

      const res = await sosPOST(req);
      expect(res.status).toBe(401);
    });

    it('TC-ADV-SF-08: tampered JWT signature is rejected with 401 Unauthorized', async () => {
      const tampered = `${tokenAlphaDriver.substring(0, tokenAlphaDriver.lastIndexOf('.'))}.tampered-signature-000`;
      const req = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tampered}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ vehicle_plate: 'GJ 05 AX 7824' }),
      });

      const res = await sosPOST(req);
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 4. MALFORMED PAYLOAD & BOUNDARY STRESS
  // ==========================================
  describe('Group 4: Malformed Payload & Extreme Boundary Stress', () => {
    it('TC-ADV-SF-09: rejects invalid latitude (> 90) with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          coords: { lat: 95.0, lng: 72.0 },
          speed: 60,
        }),
      });

      const res = await sosPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid latitude/i);
    });

    it('TC-ADV-SF-10: rejects negative speed with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          coords: { lat: 20.0, lng: 72.0 },
          speed: -50,
        }),
      });

      const res = await sosPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Speed must be a non-negative number/i);
    });
  });
});
