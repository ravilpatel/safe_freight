import { describe, it, expect } from 'vitest';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';

describe('Tier 1: Feature Coverage — Multi-Tenant Architecture & Auth (FEAT-06)', () => {
  it('TC-MTA-01: Fleet Admin signup creates exactly 1 organization, 1 profile, and 0 business rows', () => {
    // Authoritative Requirement: PRD v4.0.0 §0 Rule 1, §3.2, §5 Phase 1
    const db = new MultiTenantDatabaseSimulator();

    const signup = db.registerFleetAdminOrShipper({
      userId: 'usr-balwinder-1',
      orgName: 'Western India Fleet Logistics',
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: 'Sardar Balwinder Singh',
    });

    expect(signup.orgId).toBeDefined();
    expect(signup.profile?.role).toBe('fleet_admin');
    expect(signup.profile?.tenant_id).toBe(signup.orgId);
    expect(signup.businessRowsCreated).toBe(0);

    // Verify 0 rows in all business tables
    expect(db.getTotalRowCount('loads')).toBe(0);
    expect(db.getTotalRowCount('trips')).toBe(0);
    expect(db.getTotalRowCount('documents')).toBe(0);
    expect(db.getTotalRowCount('safety_incidents')).toBe(0);
  });

  it('TC-MTA-02: Shipper signup creates exactly 1 shipper organization, 1 profile, and 0 business rows', () => {
    const db = new MultiTenantDatabaseSimulator();

    const signup = db.registerFleetAdminOrShipper({
      userId: 'usr-adani-1',
      orgName: 'Adani Logistics Forwarders Ltd',
      orgType: 'shipper',
      role: 'shipper',
      userName: 'Vikram Mehta',
    });

    expect(signup.orgId).toBeDefined();
    expect(signup.profile?.role).toBe('shipper');
    expect(signup.businessRowsCreated).toBe(0);
  });

  it('TC-MTA-03: Driver onboarding via invite joins existing organization and creates 0 new organizations', () => {
    // Authoritative Requirement: PRD v4.0.0 §3.2, §4, §5 Phase 1
    const db = new MultiTenantDatabaseSimulator();

    // 1. Fleet Admin signs up
    const adminSignup = db.registerFleetAdminOrShipper({
      userId: 'usr-admin-wifl',
      orgName: 'Western India Fleet Logistics',
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: 'Balwinder Singh',
    });

    const adminSession: SessionContext = {
      userId: 'usr-admin-wifl',
      tenantId: adminSignup.orgId,
      role: 'fleet_admin',
      email: 'balwinder@wifl.in',
    };

    // 2. Admin issues driver invitation token
    const inviteToken = db.createDriverInvitation(adminSession);
    expect(inviteToken).toMatch(/^inv-/);

    // 3. Driver Ramesh registers using the invite token
    const driverSignup = db.registerDriverWithInvite({
      userId: 'usr-driver-ramesh',
      userName: 'Ramesh Patel',
      invitationToken: inviteToken,
    });

    // Verification: Driver is linked to Admin's org, 0 new organizations were created
    expect(driverSignup.assignedTenantId).toBe(adminSignup.orgId);
    expect(driverSignup.newOrgsCreated).toBe(0);
    expect(driverSignup.profile?.role).toBe('driver');
    expect(driverSignup.businessRowsCreated).toBe(0);
  });

  it('TC-MTA-04: rejects driver signup with invalid or already-redeemed invitation token', () => {
    const db = new MultiTenantDatabaseSimulator();

    const admin = db.registerFleetAdminOrShipper({
      userId: 'admin-1',
      orgName: 'WIFL',
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: 'Balwinder',
    });

    const token = db.createDriverInvitation({
      userId: 'admin-1',
      tenantId: admin.orgId,
      role: 'fleet_admin',
      email: 'admin@wifl.in',
    });

    // First redemption succeeds
    db.registerDriverWithInvite({
      userId: 'driver-1',
      userName: 'Ramesh',
      invitationToken: token,
    });

    // Second redemption must fail
    expect(() =>
      db.registerDriverWithInvite({
        userId: 'driver-2',
        userName: 'Suresh',
        invitationToken: token,
      })
    ).toThrow(/already redeemed/);

    // Invalid token must fail
    expect(() =>
      db.registerDriverWithInvite({
        userId: 'driver-3',
        userName: 'Mahesh',
        invitationToken: 'inv-fake-nonexistent-token',
      })
    ).toThrow(/Invalid invitation token/);
  });

  it('TC-MTA-05: prevents non-admin roles from generating driver invitations', () => {
    const db = new MultiTenantDatabaseSimulator();

    const driverSession: SessionContext = {
      userId: 'usr-driver',
      tenantId: 'org-1',
      role: 'driver',
      email: 'driver@wifl.in',
    };

    const shipperSession: SessionContext = {
      userId: 'usr-shipper',
      tenantId: 'org-2',
      role: 'shipper',
      email: 'shipper@adani.in',
    };

    expect(() => db.createDriverInvitation(driverSession)).toThrow(/403 Forbidden/);
    expect(() => db.createDriverInvitation(shipperSession)).toThrow(/403 Forbidden/);
  });

  it('TC-MTA-06: strictly enforces cross-tenant data isolation across business tables', () => {
    // Authoritative Requirement: PRD v4.0.0 §1, §3.6, §4, §11
    const db = new MultiTenantDatabaseSimulator();

    const sessionA: SessionContext = {
      userId: 'user-a',
      tenantId: 'org-alpha-1111',
      role: 'fleet_admin',
      email: 'a@alpha.in',
    };

    const sessionB: SessionContext = {
      userId: 'user-b',
      tenantId: 'org-beta-2222',
      role: 'fleet_admin',
      email: 'b@beta.in',
    };

    // Org A inserts a trip
    db.insertRow(sessionA, 'trips', {
      lr_number: 'WIFL/2026-27/LR-0001',
      start_city: 'Mumbai',
      end_city: 'Vapi',
      distance_km: 165,
    });

    // Org B selects trips
    const tripsForB = db.selectRows(sessionB, 'trips');
    expect(tripsForB).toHaveLength(0); // Exactly 0 rows leaked

    // Org A selects trips
    const tripsForA = db.selectRows(sessionA, 'trips');
    expect(tripsForA).toHaveLength(1);
    expect(tripsForA[0].lr_number).toBe('WIFL/2026-27/LR-0001');
  });
});
