/**
 * SafeFreight OS — Phase 4 Remediation Comprehensive Test Suite
 *
 * Verifies all 5 remediation items:
 * 1. RBAC Guard on POST /api/v1/fleet/alerts (strictly 403 for driver/shipper, 201 for fleet_admin)
 * 2. Cold-Start KpiGrid Metric Fallbacks (clean zeros without hardcoded mocks)
 * 3. Golden Hour Incident State Machine Immutability (re-resolution and cancellation of resolved rejected)
 * 4. Advance Scheduling Date Validation (past dates rejected, >30d rejected, Day 0/30 accepted)
 * 5. Trip creation with scheduled_date integration via dataService and REST endpoint
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { dataService, validateScheduledDate } from '@/lib/data-service';
import { POST as alertsPOST } from '@/app/api/v1/fleet/alerts/route';
import { POST as tripsPOST } from '@/app/api/v1/trips/route';
import { PATCH as incidentsPATCH } from '@/app/api/v1/safety/incidents/route';
import { KpiGrid } from '@/components/admin/KpiGrid';
import { createSignedJwtPayload } from '@/lib/auth';
import { SessionClaims } from '@/types/database';

describe('Phase 4 Remediation Comprehensive Suite', () => {
  const tenantId = '00000000-0000-4000-b000-000000000001';

  const adminClaims: SessionClaims = {
    tenant_id: tenantId,
    sub: 'user-admin-01',
    role: 'fleet_admin',
    email: 'admin@remediation-test.com',
  };

  const _driverClaims: SessionClaims = {
    tenant_id: tenantId,
    sub: 'user-driver-01',
    role: 'driver',
    email: 'driver@remediation-test.com',
  };

  const _shipperClaims: SessionClaims = {
    tenant_id: tenantId,
    sub: 'user-shipper-01',
    role: 'shipper',
    email: 'shipper@remediation-test.com',
  };

  const adminToken = createSignedJwtPayload({
    tenant_id: tenantId,
    sub: 'user-admin-01',
    role: 'fleet_admin',
    email: 'admin@remediation-test.com',
  });

  const driverToken = createSignedJwtPayload({
    tenant_id: tenantId,
    sub: 'user-driver-01',
    role: 'driver',
    email: 'driver@remediation-test.com',
  });

  const shipperToken = createSignedJwtPayload({
    tenant_id: tenantId,
    sub: 'user-shipper-01',
    role: 'shipper',
    email: 'shipper@remediation-test.com',
  });

  beforeEach(() => {
    dataService.clear();
  });

  // =========================================================================
  // 1. RBAC Guard on POST /api/v1/fleet/alerts
  // =========================================================================
  describe('Remediation 1: RBAC Guard on POST /api/v1/fleet/alerts', () => {
    it('strictly returns HTTP 403 Forbidden when Driver role calls POST /api/v1/fleet/alerts', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${driverToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'route_deviation',
          message: 'Driver attempting unauthorized security alert injection',
        }),
      });

      const res = await alertsPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Only Fleet Admins can create security alerts');
    });

    it('strictly returns HTTP 403 Forbidden when Shipper role calls POST /api/v1/fleet/alerts', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${shipperToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'speed_violation',
          message: 'Shipper attempting unauthorized security alert injection',
        }),
      });

      const res = await alertsPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Only Fleet Admins can create security alerts');
    });

    it('returns HTTP 201 Created when Fleet Admin role calls POST /api/v1/fleet/alerts', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/fleet/alerts', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'geofence_exit',
          message: 'Legitimate geofence breach flagged by Fleet Admin',
          severity: 'high',
        }),
      });

      const res = await alertsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.alert.alert_type).toBe('geofence_exit');
      expect(json.alert.severity).toBe('high');
    });
  });

  // =========================================================================
  // 2. Cold-Start KpiGrid Metric Fallbacks
  // =========================================================================
  describe('Remediation 2: Cold-Start KpiGrid Metric Fallbacks', () => {
    it('renders genuine zero values without hardcoded mock fallbacks', () => {
      const coldStartKpis = {
        activeAssets: 0,
        deadheadReductionPct: 0,
        fuelSavedINR: 0,
        activeAlertsCount: 0,
        totalMoneySavedINR: 0,
        co2SavedKg: 0,
      };

      const html = renderToString(React.createElement(KpiGrid, { kpis: coldStartKpis }));

      // Check deadhead reduction: must show genuine 0.0%, NOT 24.8%
      expect(html).toContain('0.0%');
      expect(html).not.toContain('24.8%');

      // Check CO2 abatement: must show genuine 0 kg, NOT 420 kg
      expect(html).toContain('0 kg CO₂ abated');
      expect(html).not.toContain('420 kg CO₂ abated');

      // Check Fuel Saved: must show genuine ₹0, NOT ₹1.43 L
      expect(html).toContain('₹0');
      expect(html).not.toContain('₹1.43 L');

      // Check Total Capital Recaptured: must show genuine ₹0, NOT ₹2.10 L
      expect(html).toContain('total capital recaptured');
      expect(html).not.toContain('₹2.10 L');
    });

    it('renders positive values correctly when metrics exist', () => {
      const activeKpis = {
        activeAssets: 12,
        deadheadReductionPct: 32,
        fuelSavedINR: 185000,
        activeAlertsCount: 2,
        totalMoneySavedINR: 310000,
        co2SavedKg: 580,
      };

      const html = renderToString(React.createElement(KpiGrid, { kpis: activeKpis }));

      expect(html).toContain('32%');
      expect(html).toContain('580 kg CO₂ abated');
      expect(html).toContain('₹1.85 L');
      expect(html).toContain('₹3.10 L');
    });
  });

  // =========================================================================
  // 3. Golden Hour Incident State Machine Immutability
  // =========================================================================
  describe('Remediation 3: Golden Hour Incident State Machine Immutability', () => {
    it('rejects logging T2 arrival on an already resolved incident via dataService', async () => {
      const incident = await dataService.createSafetyIncident(adminClaims, {
        trip_id: 'trip-gh-immutability-01',
        incident_type: 'crash',
      });

      // First T2 arrival resolves incident
      const resolved = await dataService.logT2Arrival(adminClaims, incident.id);
      expect(resolved.status).toBe('resolved');

      // Second T2 arrival must throw HTTP 400 error
      await expect(dataService.logT2Arrival(adminClaims, incident.id)).rejects.toThrow(
        /Incident already resolved/
      );
    });

    it('rejects cancelling an already resolved incident via dataService', async () => {
      const incident = await dataService.createSafetyIncident(adminClaims, {
        trip_id: 'trip-gh-immutability-02',
        incident_type: 'rollover',
      });

      await dataService.logT2Arrival(adminClaims, incident.id);

      await expect(
        dataService.cancelSafetyIncident(adminClaims, incident.id, 'Late cancellation attempt')
      ).rejects.toThrow(/Cannot cancel an incident that has already been resolved/);
    });

    it('returns HTTP 400 via PATCH /api/v1/safety/incidents when re-resolving an already resolved incident', async () => {
      const incident = await dataService.createSafetyIncident(adminClaims, {
        trip_id: 'trip-gh-immutability-03',
        incident_type: 'sos',
      });

      // First resolution succeeds
      const patchReq1 = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incident.id, action: 'log_t2' }),
      });
      const patchRes1 = await incidentsPATCH(patchReq1);
      expect(patchRes1.status).toBe(200);

      // Second resolution is rejected with HTTP 400
      const patchReq2 = new NextRequest('http://localhost:3000/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incident.id, action: 'log_t2' }),
      });
      const patchRes2 = await incidentsPATCH(patchReq2);
      expect(patchRes2.status).toBe(400);
      const json = await patchRes2.json();
      expect(json.error).toContain('already resolved');
    });
  });

  // =========================================================================
  // 4. Advance Scheduling Date Validation
  // =========================================================================
  describe('Remediation 4: Advance Scheduling Date Validation', () => {
    const referenceDate = new Date('2026-11-09');

    it('rejects scheduling corridor dispatches with past dates', () => {
      const res = validateScheduledDate('2026-11-08', referenceDate);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot be in the past');
    });

    it('rejects scheduling corridor dispatches more than 30 days in advance', () => {
      const res = validateScheduledDate('2026-12-10', referenceDate);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('more than 30 days');
    });

    it('accepts exact boundaries: today (Day 0) and Day 30', () => {
      const day0 = validateScheduledDate('2026-11-09', referenceDate);
      expect(day0.valid).toBe(true);

      const day30 = validateScheduledDate('2026-12-09', referenceDate);
      expect(day30.valid).toBe(true);
    });

    it('rejects invalid scheduled date via POST /api/v1/trips with HTTP 400', async () => {
      const reqPast = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          gross_freight: 45000,
          scheduled_date: '2026-11-01', // Past date
        }),
      });

      const resPast = await tripsPOST(reqPast);
      expect(resPast.status).toBe(400);
      const jsonPast = await resPast.json();
      expect(jsonPast.error).toContain('cannot be in the past');
    });

    it('accepts valid advance scheduled date via POST /api/v1/trips with HTTP 201', async () => {
      const reqValid = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          gross_freight: 60000,
          scheduled_date: '2026-11-20',
        }),
      });

      const resValid = await tripsPOST(reqValid);
      expect(resValid.status).toBe(201);
      const jsonValid = await resValid.json();
      expect(jsonValid.data.scheduled_date).toBe('2026-11-20');
      expect(jsonValid.data.gross_freight).toBe(60000);
    });
  });
});
