/**
 * SafeFreight OS — Tier 1: Feature Coverage Suite for Phase 6
 * Safety & Telematics (AIS-140 & Golden Hour Pipeline)
 * Reference: PRD v4.0.0 §5 Phase 6, §8, PRD v3 FR-SF-01 to FR-SF-07, FR-OF-01 to FR-OF-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as sosPOST } from '@/app/api/v1/safety/sos/route';
import { POST as cancelPOST } from '@/app/api/v1/safety/cancel/route';
import { POST as pingsPOST, GET as pingsGET } from '@/app/api/v1/pings/route';
import { PATCH as incidentsPATCH } from '@/app/api/v1/safety/incidents/route';
import { createSignedJwtPayload } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 1: Feature Coverage — Phase 6 Safety & Telematics', () => {
  const tenantOrgId = '00000000-0000-4000-8000-000000000001';
  const driverClaims: SessionClaims = {
    sub: 'driver-uuid-001',
    email: 'driver@western-logistics.in',
    tenant_id: tenantOrgId,
    role: 'driver',
  };
  const adminClaims: SessionClaims = {
    sub: 'admin-uuid-001',
    email: 'admin@western-logistics.in',
    tenant_id: tenantOrgId,
    role: 'fleet_admin',
  };

  let driverToken: string;
  let adminToken: string;

  beforeEach(() => {
    dataService.clear();
    globalIdempotencyStore.clear();

    driverToken = createSignedJwtPayload(driverClaims);
    adminToken = createSignedJwtPayload(adminClaims);
  });

  // ==========================================
  // 1. AUTOMATED 112 ERSS DISTRESS PROTOCOL
  // ==========================================
  describe('Feature 51: Automated 112 ERSS Distress Protocol (/api/v1/safety/sos)', () => {
    it('TC-SF-01: submits distress payload and records T0/T1 timestamps with ERSS acknowledgment', async () => {
      const t0 = new Date(Date.now() - 30000).toISOString();
      const req = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
          'Idempotency-Key': 'idemp-sos-001',
        },
        body: JSON.stringify({
          vehicle_plate: 'GJ 05 AX 7824',
          coords: { lat: 21.6264, lng: 73.0152 },
          speed: 58,
          g_force: 4.6,
          emergency_type: 'collision',
          timestamp: t0,
          contact_phone: '+919876543210',
        }),
      });

      const res = await sosPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.erss_ack).toBe(true);
      expect(json.sms_dispatched).toBe(true);
      expect(json.incident).toBeDefined();
      expect(json.incident.tenant_id).toBe(tenantOrgId);
      expect(json.incident.incident_type).toBe('crash');
      expect(json.incident.status).toBe('erss_notified');
      expect(json.incident.t0_timestamp).toBe(t0);
      expect(json.incident.t1_timestamp).toBeDefined();
    });

    it('TC-SF-02: deduplicates identical distress submissions via Idempotency-Key', async () => {
      const idempotencyKey = 'idemp-sos-repeat-99';
      const payload = {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
        speed: 62,
        g_force: 4.5,
      };

      const req1 = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const res1 = await sosPOST(req1);
      expect(res1.status).toBe(201);
      const json1 = await res1.json();

      // Second identical request with same Idempotency-Key
      const req2 = new NextRequest('http://localhost:3000/api/v1/safety/sos', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const res2 = await sosPOST(req2);
      expect(res2.status).toBe(201);
      const json2 = await res2.json();

      expect(json2.incident.id).toBe(json1.incident.id);

      // Verify only 1 incident exists in database
      const incidentsList = dataService.getSafetyIncidents(adminClaims);
      expect(incidentsList.data).toHaveLength(1);
    });
  });

  // ==========================================
  // 2. 96DP FALSE ALARM CANCELLATION
  // ==========================================
  describe('Feature 50: 96dp False Alarm Cancellation Button (/api/v1/safety/cancel)', () => {
    it('TC-SF-03: driver cancels active emergency countdown and marks incident as cancelled', async () => {
      // 1. Initial SOS distress incident
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
        speed: 60,
        g_force: 4.5,
      });
      expect(incident.status).toBe('erss_notified');

      // 2. Driver taps 96dp cancellation button at second 18
      const cancelReq = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: incident.id,
          reason: 'Driver tapped 96dp cancel button (False Alarm - dropped phone)',
        }),
      });

      const cancelRes = await cancelPOST(cancelReq);
      expect(cancelRes.status).toBe(200);
      const cancelJson = await cancelRes.json();

      expect(cancelJson.success).toBe(true);
      expect(cancelJson.incident.status).toBe('cancelled');

      // 3. Verify in database
      const persisted = dataService.getSafetyIncidentById(adminClaims, incident.id);
      expect(persisted?.status).toBe('cancelled');
    });

    it('TC-SF-04: driver cancels latest active incident when incident_id is omitted', async () => {
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
      });

      const cancelReq = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Driver confirmed all clear without specific incident id',
        }),
      });

      const cancelRes = await cancelPOST(cancelReq);
      expect(cancelRes.status).toBe(200);
      const cancelJson = await cancelRes.json();
      expect(cancelJson.incident.id).toBe(incident.id);
      expect(cancelJson.incident.status).toBe('cancelled');
    });
  });

  // ==========================================
  // 3. HIGH-VOLUME TELEMETRY PINGS INGESTION
  // ==========================================
  describe('Feature 46 & 58: Telemetry Pings Ingestion (/api/v1/pings)', () => {
    it('TC-SF-05: ingests batched telemetry pings and tags tenant_id from JWT', async () => {
      const pings = [
        { lat: 18.9496, lng: 72.9515, speed: 55, g_force: 1.02, timestamp: new Date().toISOString() },
        { lat: 19.5000, lng: 72.9200, speed: 62, g_force: 1.05, timestamp: new Date().toISOString() },
        { lat: 20.3712, lng: 72.9044, speed: 58, g_force: 1.10, timestamp: new Date().toISOString() },
      ];

      const req = new NextRequest('http://localhost:3000/api/v1/pings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ pings }),
      });

      const res = await pingsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.accepted).toBe(3);

      // Verify retrieval via GET /api/v1/pings
      const getReq = new NextRequest('http://localhost:3000/api/v1/pings', {
        method: 'GET',
        headers: { authorization: `Bearer ${driverToken}` },
      });
      const getRes = await pingsGET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data).toHaveLength(3);
      expect(getJson.data[0].tenant_id).toBe(tenantOrgId);
    });

    it('TC-SF-06: automatic collision triage triggers emergency incident when ping has multi-axial impact', async () => {
      // Ingest ping with high-velocity collision (ax = 32.0, ay = 25.0, az = 19.62 -> 4.60G)
      const collisionPing = [
        {
          lat: 21.6264,
          lng: 73.0152,
          speed: 64,
          ax: 32.0,
          ay: 25.0,
          az: 19.62,
          timestamp: new Date().toISOString(),
        },
      ];

      const req = new NextRequest('http://localhost:3000/api/v1/pings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ pings: collisionPing }),
      });

      const res = await pingsPOST(req);
      expect(res.status).toBe(201);

      // Incident should have been automatically created in safety_incidents
      const incidents = dataService.getSafetyIncidents(adminClaims);
      expect(incidents.data.length).toBeGreaterThanOrEqual(1);
      const crashIncident = incidents.data.find((i) => i.incident_type === 'crash');
      expect(crashIncident).toBeDefined();
      expect(crashIncident?.status).toBe('erss_notified');
      expect(crashIncident?.g_force).toBe(4.6);
    });
  });

  // ==========================================
  // 4. GOLDEN HOUR TIMELINE LIFECYCLE (T0 -> T1 -> T2)
  // ==========================================
  describe('Feature 53: Golden Hour T0/T1/T2 Timeline Lifecycle (/api/v1/safety/incidents)', () => {
    it('TC-SF-07: logs T2 arrival when first responders arrive on-scene', async () => {
      // 1. Create incident with T0 and T1
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 21.6264, lng: 73.0152 },
        speed: 60,
        g_force: 4.6,
      });

      expect(incident.t0_timestamp).toBeDefined();
      expect(incident.t1_timestamp).toBeDefined();
      expect(incident.t2_timestamp).toBeNull();
      expect(incident.status).toBe('erss_notified');

      // 2. First responders arrive: Fleet Admin logs T2 arrival
      const patchReq = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: incident.id,
          action: 'log_t2',
        }),
      });

      const patchRes = await incidentsPATCH(patchReq);
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();

      expect(patchJson.success).toBe(true);
      expect(patchJson.incident.status).toBe('resolved');
      expect(patchJson.incident.t2_timestamp).toBeDefined();

      // 3. Verify in database
      const resolved = dataService.getSafetyIncidentById(adminClaims, incident.id);
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.t2_timestamp).not.toBeNull();
    });
  });
});
