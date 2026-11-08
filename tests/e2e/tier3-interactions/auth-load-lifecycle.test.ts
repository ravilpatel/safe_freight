import { describe, it, expect } from 'vitest';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';
import { TEST_ORGS, TEST_PROFILES } from '../harness/fixtures';

describe('Tier 3: Cross-Feature Interactions — Auth & Load Lifecycle (Pairwise)', () => {
  it('TC-INT-01: executes multi-tenant registration, driver invitation, load posting, and assignment with audit log', () => {
    // Cross-Feature: Auth + Invitation + Load Posting + Assignment + Audit Trail
    const db = new MultiTenantDatabaseSimulator();

    // 1. Shipper Org registers and signs in
    const shipperSignup = db.registerFleetAdminOrShipper({
      userId: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
      orgName: TEST_ORGS.SHIPPER_ADANI.name,
      orgType: 'shipper',
      role: 'shipper',
      userName: TEST_PROFILES.SHIPPER_ADANI_EXEC.name,
    });

    const shipperSession: SessionContext = {
      userId: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
      tenantId: shipperSignup.orgId,
      role: 'shipper',
      email: TEST_PROFILES.SHIPPER_ADANI_EXEC.email,
    };

    // 2. Fleet Admin Org registers
    const fleetSignup = db.registerFleetAdminOrShipper({
      userId: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
      orgName: TEST_ORGS.FLEET_WIFL.name,
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: TEST_PROFILES.FLEET_ADMIN_BALWINDER.name,
    });

    const fleetSession: SessionContext = {
      userId: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
      tenantId: fleetSignup.orgId,
      role: 'fleet_admin',
      email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
    };

    // 3. Fleet Admin generates driver invite
    const inviteToken = db.createDriverInvitation(fleetSession);

    // 4. Commercial Driver joins via invite token
    const driverSignup = db.registerDriverWithInvite({
      userId: TEST_PROFILES.DRIVER_RAMESH.id,
      userName: TEST_PROFILES.DRIVER_RAMESH.name,
      invitationToken: inviteToken,
    });

    expect(driverSignup.assignedTenantId).toBe(fleetSession.tenantId);

    const driverSession: SessionContext = {
      userId: TEST_PROFILES.DRIVER_RAMESH.id,
      tenantId: fleetSession.tenantId,
      role: 'driver',
      email: TEST_PROFILES.DRIVER_RAMESH.email,
    };

    // 5. Shipper posts FTL load (Mumbai to Ahmedabad)
    const load = db.insertRow(shipperSession, 'loads', {
      pickup_city: 'Mumbai',
      drop_city: 'Ahmedabad',
      weight_kg: 16000,
      truck_type: 'private',
      revenue_inr: 45000,
      status: 'open',
    });

    expect(load.tenant_id).toBe(shipperSession.tenantId);
    expect(load.status).toBe('open');

    // 6. Driver accepts load via idempotent operation
    const idempotencyKey = 'load-accept-key-uuid-101';
    const acceptOp = db.executeIdempotentOperation(driverSession, idempotencyKey, () => {
      // Create matched trip under Fleet Admin's tenant
      const trip = db.insertRow(driverSession, 'trips', {
        load_id: load.id,
        driver_id: driverSession.userId,
        start_city: 'Mumbai',
        end_city: 'Ahmedabad',
        total_freight_inr: 45000,
        milestone_status: 'dispatched',
      });

      return {
        statusCode: 200,
        payload: {
          tripId: trip.id,
          status: 'accepted',
          assignedDriverId: driverSession.userId,
        },
      };
    });

    expect(acceptOp.statusCode).toBe(200);
    expect(acceptOp.payload.status).toBe('accepted');

    // 7. Replay with identical key returns cached response
    const replayOp = db.executeIdempotentOperation<any>(driverSession, idempotencyKey, () => {
      throw new Error('Should not execute side effect on repeated idempotency key');
    });

    expect(replayOp.fromCache).toBe(true);
    expect(replayOp.payload.tripId).toBe(acceptOp.payload.tripId);

    // 8. Verify audit trail in both Shipper and Fleet organizations
    const shipperAudit = db.getAuditTrail(shipperSession);
    const fleetAudit = db.getAuditTrail(fleetSession);

    expect(shipperAudit.length).toBeGreaterThanOrEqual(1);
    expect(fleetAudit.length).toBeGreaterThanOrEqual(1);
    expect(shipperAudit[0].tableName).toBe('loads');
    expect(fleetAudit[0].tableName).toBe('trips');
  });

  it('TC-INT-02: asserts that Driver cannot read other tenants trips while on duty', () => {
    const db = new MultiTenantDatabaseSimulator();

    const orgASession: SessionContext = {
      userId: 'driver-a',
      tenantId: 'org-wifl',
      role: 'driver',
      email: 'a@wifl.in',
    };

    const orgBSession: SessionContext = {
      userId: 'driver-b',
      tenantId: 'org-competitor',
      role: 'driver',
      email: 'b@competitor.in',
    };

    db.insertRow(orgASession, 'trips', { lr_number: 'WIFL-001', start_city: 'Mumbai' });
    db.insertRow(orgBSession, 'trips', { lr_number: 'COMP-001', start_city: 'Delhi' });

    const tripsA = db.selectRows(orgASession, 'trips');
    const tripsB = db.selectRows(orgBSession, 'trips');

    expect(tripsA).toHaveLength(1);
    expect(tripsA[0].lr_number).toBe('WIFL-001');

    expect(tripsB).toHaveLength(1);
    expect(tripsB[0].lr_number).toBe('COMP-001');
  });

  it('TC-INT-03: verifies audit log records consecutive status updates (dispatched -> loading -> delivered)', () => {
    const db = new MultiTenantDatabaseSimulator();
    const session: SessionContext = {
      userId: 'driver-1',
      tenantId: 'org-wifl',
      role: 'driver',
      email: 'd@wifl.in',
    };

    const trip = db.insertRow(session, 'trips', {
      lr_number: 'LR-101',
      milestone_status: 'dispatched',
    });

    db.updateRow(session, 'trips', trip.id as string, { milestone_status: 'loading_done' });
    db.updateRow(session, 'trips', trip.id as string, { milestone_status: 'on_highway' });
    db.updateRow(session, 'trips', trip.id as string, { milestone_status: 'delivered' });

    const auditEntries = db.getAuditTrail(session, 'trips');
    expect(auditEntries).toHaveLength(4); // 1 INSERT + 3 UPDATEs

    expect(auditEntries[0].action).toBe('INSERT');
    expect(auditEntries[1].after?.milestone_status).toBe('loading_done');
    expect(auditEntries[2].after?.milestone_status).toBe('on_highway');
    expect(auditEntries[3].after?.milestone_status).toBe('delivered');
  });
});
