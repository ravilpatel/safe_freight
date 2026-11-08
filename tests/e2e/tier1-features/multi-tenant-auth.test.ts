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

  it('TC-MTA-07: Tenant A cannot access Tenant B organization or profile data', () => {
    // Authoritative Requirement: PRD v4.0.0 §1, §4, §10
    const db = new MultiTenantDatabaseSimulator();

    // Register Tenant A (Western India Fleet Logistics)
    const adminA = db.registerFleetAdminOrShipper({
      userId: 'usr-admin-a',
      orgName: 'Western India Fleet Logistics',
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: 'Balwinder Singh',
    });
    const sessionA: SessionContext = {
      userId: 'usr-admin-a',
      tenantId: adminA.orgId,
      role: 'fleet_admin',
      email: 'balwinder@wifl.in',
    };

    // Register Tenant B (Adani Logistics)
    const adminB = db.registerFleetAdminOrShipper({
      userId: 'usr-admin-b',
      orgName: 'Adani Logistics Forwarders',
      orgType: 'shipper',
      role: 'shipper',
      userName: 'Vikram Mehta',
    });
    const sessionB: SessionContext = {
      userId: 'usr-admin-b',
      tenantId: adminB.orgId,
      role: 'shipper',
      email: 'vikram@adani.in',
    };

    // Onboard Driver into Tenant A
    const inviteTokenA = db.createDriverInvitation(sessionA);
    db.registerDriverWithInvite({
      userId: 'usr-driver-a',
      userName: 'Ramesh Patel',
      invitationToken: inviteTokenA,
    });

    // 1. Organization Isolation: Tenant A can only see Org A
    const orgsForA = db.selectOrganizations(sessionA);
    expect(orgsForA).toHaveLength(1);
    expect(orgsForA[0].id).toBe(adminA.orgId);
    expect(orgsForA[0].name).toBe('Western India Fleet Logistics');

    const orgsForB = db.selectOrganizations(sessionB);
    expect(orgsForB).toHaveLength(1);
    expect(orgsForB[0].id).toBe(adminB.orgId);
    expect(orgsForB[0].name).toBe('Adani Logistics Forwarders');

    // 2. Profile Isolation: Tenant B cannot see Tenant A's admin or driver
    const profilesForB = db.selectProfiles(sessionB);
    expect(profilesForB).toHaveLength(1);
    expect(profilesForB[0].name).toBe('Vikram Mehta');

    const profilesForA = db.selectProfiles(sessionA);
    expect(profilesForA).toHaveLength(2); // Admin Balwinder + Driver Ramesh
    expect(profilesForA.every((p) => p.tenant_id === adminA.orgId)).toBe(true);
    expect(profilesForA.some((p) => p.name === 'Vikram Mehta')).toBe(false);
  });

  it('TC-MTA-08: Tenant A cannot mutate Tenant B records', () => {
    // Authoritative Requirement: PRD v4.0.0 §1, §4, §10
    const db = new MultiTenantDatabaseSimulator();

    const adminA = db.registerFleetAdminOrShipper({
      userId: 'usr-admin-a',
      orgName: 'Carrier Alpha',
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: 'Alpha Admin',
    });
    const sessionA: SessionContext = {
      userId: 'usr-admin-a',
      tenantId: adminA.orgId,
      role: 'fleet_admin',
      email: 'admin@alpha.in',
    };

    const adminB = db.registerFleetAdminOrShipper({
      userId: 'usr-admin-b',
      orgName: 'Carrier Beta',
      orgType: 'fleet_operator',
      role: 'fleet_admin',
      userName: 'Beta Admin',
    });
    const sessionB: SessionContext = {
      userId: 'usr-admin-b',
      tenantId: adminB.orgId,
      role: 'fleet_admin',
      email: 'admin@beta.in',
    };

    // Attempt 1: Tenant A tries to alter Tenant B's organization
    expect(() =>
      db.updateOrganization(sessionA, adminB.orgId, { name: 'Compromised Organization' })
    ).toThrow(/Cross-tenant organization modification prohibited/);

    // Verify Org B remains unchanged
    const betaOrg = db.selectOrganizations(sessionB);
    expect(betaOrg[0].name).toBe('Carrier Beta');

    // Attempt 2: Tenant A tries to modify Tenant B's profile
    expect(() =>
      db.updateProfile(sessionA, 'usr-admin-b', { name: 'Compromised User' })
    ).toThrow(/Cross-tenant profile modification prohibited/);

    const betaProfiles = db.selectProfiles(sessionB);
    expect(betaProfiles[0].name).toBe('Beta Admin');
  });

  it('TC-MTA-09: Driver cannot create an organization or access /admin', async () => {
    // Authoritative Requirement: PRD v4.0.0 §3.2, §4, §5 Phase 1
    const { validateSignupInput, createSignedJwtPayload } = await import(
      '@/lib/auth'
    );
    const { middleware } = await import('@/middleware');
    const { NextRequest } = await import('next/server');

    // 1. Direct Driver Signup Rejection (Drivers cannot register an organization)
    const driverSignupAttempt = validateSignupInput({
      email: 'driver.direct@wifl.in',
      password: 'SecurePassword123!',
      fullName: 'Ramesh Patel',
      orgName: 'Ramesh Transport Co',
      role: 'driver',
    });

    expect(driverSignupAttempt.valid).toBe(false);
    expect(driverSignupAttempt.error).toMatch(/restricted to role "fleet_admin" or "shipper"/);

    // 2. Driver role attempting to access /admin/* route guard
    const driverToken = createSignedJwtPayload({
      sub: 'usr-driver-1',
      email: 'driver@wifl.in',
      tenant_id: 'org-tenant-wifl',
      role: 'driver',
    });

    const driverReq = new NextRequest('http://localhost:3000/admin/fleet', {
      headers: {
        authorization: `Bearer ${driverToken}`,
      },
    });

    const response = middleware(driverReq);
    expect(response.status).toBe(307); // Temporary Redirect
    const location = response.headers.get('location');
    expect(location).toContain('/driver'); // Redirected to Driver HUD, denied /admin

    // 3. Unauthenticated request to /admin -> redirects to /login
    const unauthReq = new NextRequest('http://localhost:3000/admin/dashboard');
    const unauthResponse = middleware(unauthReq);
    expect(unauthResponse.status).toBe(307);
    expect(unauthResponse.headers.get('location')).toContain('/login');
  });

  it('TC-MTA-10: Automated check verifying rowsecurity = true on public schema tables', async () => {
    // Authoritative Requirement: PRD v4.0.0 §10, CTO Directives §5.2
    const fs = await import('fs');
    const path = await import('path');

    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    const combinedSql = migrationFiles
      .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf-8'))
      .join('\n');

    const requiredTables = [
      'organizations',
      'profiles',
      'driver_invitations',
      'loads',
      'trips',
      'documents',
      'pings',
      'security_alerts',
      'safety_incidents',
      'users',
    ];

    for (const table of requiredTables) {
      const rlsRegex = new RegExp(
        `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      );
      expect(rlsRegex.test(combinedSql)).toBe(true);
    }

    // Verify all RLS policies enforce tenant isolation via (auth.jwt() ->> 'tenant_id')::uuid
    expect(combinedSql).toContain("(auth.jwt() ->> 'tenant_id')::uuid");

    // Strictly ensure no permissive USING (true) or WITH CHECK (true) bypasses exist
    expect(/\bUSING\s*\(\s*true\s*\)/i.test(combinedSql)).toBe(false);
    expect(/\bWITH\s+CHECK\s*\(\s*true\s*\)/i.test(combinedSql)).toBe(false);
  });

  it('TC-MTA-11: REST API lifecycle test: Fleet Admin signup -> Driver invite -> Driver onboard', async () => {
    // Authoritative Requirement: PRD v4.0.0 §4, §5 Phase 1
    const { handleSignup, createDriverInvitation, handleDriverOnboarding } = await import(
      '@/lib/auth'
    );

    // 1. Fleet Admin self-onboarding
    const adminResult = await handleSignup({
      email: 'admin.lifecycle@wifl.in',
      fullName: 'Balwinder Singh',
      orgName: 'WIFL Super Logistics',
      orgType: 'carrier',
      role: 'fleet_admin',
    });

    expect(adminResult.user.id).toBeDefined();
    expect(adminResult.user.role).toBe('fleet_admin');
    expect(adminResult.organization.id).toBeDefined();
    expect(adminResult.businessRowsCreated).toBe(0);

    const adminClaims = {
      sub: adminResult.user.id,
      email: adminResult.user.email,
      tenant_id: adminResult.organization.id,
      role: 'fleet_admin' as const,
    };

    // 2. Fleet Admin issues invitation token
    const invite = await createDriverInvitation(adminClaims, {
      phone: '+919876543210',
      expiresInHours: 48,
    });

    expect(invite.token).toMatch(/^inv-/);
    expect(invite.tenant_id).toBe(adminResult.organization.id);
    expect(invite.status).toBe('pending');

    // 3. Driver onboards with invitation token
    const driverResult = await handleDriverOnboarding({
      invitationToken: invite.token,
      email: 'driver.lifecycle@wifl.in',
      fullName: 'Suresh Kumar',
      phone: '+919876543210',
    });

    expect(driverResult.user.role).toBe('driver');
    expect(driverResult.user.tenantId).toBe(adminResult.organization.id);
    expect(driverResult.newOrgsCreated).toBe(0);
    expect(driverResult.businessRowsCreated).toBe(0);

    // 4. Token cannot be redeemed twice
    await expect(
      handleDriverOnboarding({
        invitationToken: invite.token,
        email: 'another.driver@wifl.in',
        fullName: 'Another Driver',
      })
    ).rejects.toThrow(/already redeemed/);
  });
});
