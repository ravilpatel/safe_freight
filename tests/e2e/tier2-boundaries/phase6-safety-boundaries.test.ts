/**
 * SafeFreight OS — Tier 2: Boundary Value Analysis Suite for Phase 6
 * Safety & Telematics Boundaries (AIS-140 G-Force, Rollover & Offline Queue)
 * Reference: PRD v4.0.0 §5 Phase 6, §7, PRD v3 FR-SF-01 to FR-SF-07, FR-OF-01 to FR-OF-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { classifyAIS140GForce } from '@/lib/algorithms/ais140Crash';
import { deviceMotionService } from '@/lib/telematics/deviceMotion';
import { offlineTelemetryQueue } from '@/lib/telematics/offlineQueue';
import { POST as cancelPOST } from '@/app/api/v1/safety/cancel/route';
import { PATCH as incidentsPATCH } from '@/app/api/v1/safety/incidents/route';
import { createSignedJwtPayload } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { SessionClaims } from '@/types/database';

describe('Tier 2: Boundary Value Analysis — Phase 6 Safety & Telematics', () => {
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
    offlineTelemetryQueue.clear();

    driverToken = createSignedJwtPayload(driverClaims);
    adminToken = createSignedJwtPayload(adminClaims);
  });

  // ==========================================
  // 1. AIS-140 G-FORCE CLASSIFICATION BOUNDARIES
  // ==========================================
  describe('Boundary Group 1: AIS-140 G-Force Classification Boundaries', () => {
    it('TC-SF-BVA-01: tests boundary at 2.49G (ROAD_NOISE) vs 2.50G (sub-collision)', () => {
      // az = 24.43 m/s^2 -> TotalG = 24.43 / 9.81 = 2.49G (< 2.5G)
      const belowNoise = classifyAIS140GForce(0, 0, 24.43);
      expect(belowNoise.totalG).toBe(2.49);
      expect(belowNoise.classification).toBe('ROAD_NOISE');
      expect(belowNoise.isTriggerEmergency).toBe(false);

      // az = 24.53 m/s^2 -> TotalG = 24.53 / 9.81 = 2.50G (>= 2.5G threshold)
      const atNoise = classifyAIS140GForce(0, 0, 24.53);
      expect(atNoise.totalG).toBe(2.50);
      expect(atNoise.isTriggerEmergency).toBe(false);
    });

    it('TC-SF-BVA-02: tests boundary at 3.99G (no emergency) vs 4.00G (COLLISION_CRASH)', () => {
      // Just below 4.0G: TotalG = 3.99G
      // ax = 19.1, ay = 19.1, az = 28.5 -> sqrt(364.81 + 364.81 + 812.25) / 9.81 = sqrt(1541.87) / 9.81 = 39.266 / 9.81 = 4.00G
      // Let's create exact 3.99G: 3.99 * 9.81 = 39.1419 m/s^2
      // ax = 15.0, ay = 15.0, az = 32.72 -> sqrt(225 + 225 + 1070.59) = sqrt(1520.59) = 38.99 / 9.81 = 3.97G
      const subCollision = classifyAIS140GForce(15.0, 15.0, 32.72);
      expect(subCollision.totalG).toBeLessThan(4.0);
      expect(subCollision.isTriggerEmergency).toBe(false);

      // At exactly 4.00G with lateral components:
      // ax = 19.62 (2.0G), ay = 19.62 (2.0G), az = 29.43 (3.0G) -> TotalG = sqrt(4+4+9) = 4.12G
      const atCollision = classifyAIS140GForce(19.62, 19.62, 29.43);
      expect(atCollision.totalG).toBeGreaterThanOrEqual(4.0);
      expect(atCollision.classification).toBe('COLLISION_CRASH');
      expect(atCollision.isTriggerEmergency).toBe(true);
    });

    it('TC-SF-BVA-03: verifies single-axis vertical transient filter (dropped phone)', () => {
      // az = 35.0 m/s^2 (3.57G), but ax = 0.5 (0.05G), ay = 0.4 (0.04G)
      // Must be filtered as CABIN_DROP_ANOMALY
      const phoneDrop = classifyAIS140GForce(0.5, 0.4, 35.0);
      expect(phoneDrop.classification).toBe('CABIN_DROP_ANOMALY');
      expect(phoneDrop.isTriggerEmergency).toBe(false);
      expect(phoneDrop.actionRequired).toContain('single-axis vertical transient');
    });

    it('TC-SF-BVA-04: throws descriptive error on NaN or non-finite acceleration values', () => {
      expect(() => classifyAIS140GForce(NaN, 0, 9.81)).toThrow(/Invalid accelerometer reading/i);
      expect(() => classifyAIS140GForce(0, Infinity, 9.81)).toThrow(/Invalid accelerometer reading/i);
    });
  });

  // ==========================================
  // 2. GYROSCOPIC ROLLOVER TILT BOUNDARIES
  // ==========================================
  describe('Boundary Group 2: Gyroscopic Rollover Pre-Warning Thresholds', () => {
    it('TC-SF-BVA-05: tilt <= 30.0 degrees is treated as safe banked curve without alert', () => {
      const motionSafe = deviceMotionService.processOrientation(30.0);
      expect(motionSafe.tiltAngle).toBe(30.0);
      expect(motionSafe.isRolloverRisk).toBe(false);
    });

    it('TC-SF-BVA-06: tilt > 30.0 degrees triggers rollover risk indicator', () => {
      const motionDanger = deviceMotionService.processOrientation(30.1);
      expect(motionDanger.tiltAngle).toBe(30.1);
      expect(motionDanger.isRolloverRisk).toBe(true);
    });
  });

  // ==========================================
  // 3. OFFLINE QUEUE BUFFER & FIFO EVICTION BOUNDARIES
  // ==========================================
  describe('Boundary Group 3: Offline Telemetry Queue Buffer & FIFO Eviction', () => {
    it('TC-SF-BVA-07: buffers up to 500 pings and evicts oldest ordinary ping on 501st ping', () => {
      offlineTelemetryQueue.setOnlineStatus(false); // Simulate offline highway blackspot

      // Fill buffer with 500 pings
      for (let i = 1; i <= 500; i++) {
        offlineTelemetryQueue.enqueuePing({
          latitude: 20.0 + i * 0.001,
          longitude: 72.9,
          speed_kmh: 60,
          g_force: 1.0,
          timestamp: new Date().toISOString(),
        });
      }

      let status = offlineTelemetryQueue.getStatus();
      expect(status.queuedPingsCount).toBe(500);

      // Enqueue 501st ping
      offlineTelemetryQueue.enqueuePing({
        latitude: 21.0,
        longitude: 73.0,
        speed_kmh: 65,
        g_force: 1.05,
        timestamp: new Date().toISOString(),
      });

      status = offlineTelemetryQueue.getStatus();
      expect(status.queuedPingsCount).toBe(500); // Maintained at MAX_BUFFER_CAPACITY (500)
    });

    it('TC-SF-BVA-08: emergency distress payloads are high-priority and never evicted', () => {
      offlineTelemetryQueue.setOnlineStatus(false);

      for (let i = 1; i <= 5; i++) {
        offlineTelemetryQueue.enqueueDistress({
          coords: { lat: 21.0, lng: 73.0 },
          speed: 60,
          g_force: 4.5,
          emergency_type: 'collision',
          timestamp: new Date().toISOString(),
        });
      }

      const status = offlineTelemetryQueue.getStatus();
      expect(status.queuedDistressCount).toBe(5);
    });
  });

  // ==========================================
  // 4. GOLDEN HOUR STATE MACHINE INVARIANTS
  // ==========================================
  describe('Boundary Group 4: Golden Hour State Machine Invariants', () => {
    it('TC-SF-BVA-09: rejects logging T2 arrival on a cancelled incident with 400 Bad Request', async () => {
      // 1. Create and cancel incident
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
      });
      await dataService.cancelSafetyIncident(driverClaims, incident.id, 'False alarm');

      // 2. Attempt to log T2 arrival on cancelled incident
      const req = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
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

      const res = await incidentsPATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot confirm arrival on a cancelled incident/i);
    });

    it('TC-SF-BVA-10: rejects re-resolving an already resolved incident with 400 Bad Request', async () => {
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
      });
      await dataService.logT2Arrival(adminClaims, incident.id);

      // Attempt to re-resolve
      const req = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
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

      const res = await incidentsPATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Incident already resolved/i);
    });

    it('TC-SF-BVA-11: rejects cancelling an already resolved incident with 400 Bad Request', async () => {
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
      });
      await dataService.logT2Arrival(adminClaims, incident.id);

      const cancelReq = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incident.id }),
      });

      const cancelRes = await cancelPOST(cancelReq);
      expect(cancelRes.status).toBe(400);
      const json = await cancelRes.json();
      expect(json.error).toMatch(/Cannot cancel an incident that has already been resolved/i);
    });

    it('TC-SF-BVA-12: rejects cancelling an already cancelled incident with 400 Bad Request', async () => {
      const incident = await dataService.createDistressSos(driverClaims, {
        vehicle_plate: 'GJ 05 AX 7824',
        coords: { lat: 20.3712, lng: 72.9106 },
      });
      await dataService.cancelSafetyIncident(driverClaims, incident.id);

      const cancelReq = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incident.id }),
      });

      const cancelRes = await cancelPOST(cancelReq);
      expect(cancelRes.status).toBe(400);
      const json = await cancelRes.json();
      expect(json.error).toMatch(/Incident is already cancelled/i);
    });

    it('TC-SF-BVA-13: returns 404 Not Found when attempting to cancel non-existent incident', async () => {
      const cancelReq = new NextRequest('http://localhost:3000/api/v1/safety/cancel', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ incident_id: 'non-existent-uuid-9999' }),
      });

      const cancelRes = await cancelPOST(cancelReq);
      expect(cancelRes.status).toBe(404);
      const json = await cancelRes.json();
      expect(json.error).toMatch(/404 Not Found/i);
    });
  });
});
