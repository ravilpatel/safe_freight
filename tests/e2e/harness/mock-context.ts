/**
 * SafeFreight OS — Multi-Tenant Context & Session Isolation Simulator
 * Strictly adheres to PRD v4.0.0 §4, §8, §10
 */

export interface SessionContext {
  userId: string;
  tenantId: string;
  role: 'fleet_admin' | 'shipper' | 'driver';
  email: string;
}

export interface AuditRecord {
  id: string;
  tenantId: string;
  actorId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: string;
  rowId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface IdempotencyEntry {
  key: string;
  tenantId: string;
  statusCode: number;
  responsePayload: unknown;
  timestamp: string;
}

export class MultiTenantDatabaseSimulator {
  private organizations: Map<string, { id: string; name: string; type: string }> = new Map();
  private profiles: Map<string, { id: string; tenant_id: string; role: string; name: string }> = new Map();
  private businessTables: Map<string, Map<string, Record<string, unknown>>> = new Map();
  private auditLog: AuditRecord[] = [];
  private idempotencyCache: Map<string, IdempotencyEntry> = new Map();
  private activeDriverInviteTokens: Map<string, { tenantId: string; role: 'driver'; redeemed: boolean }> = new Map();

  constructor() {
    this.businessTables.set('loads', new Map());
    this.businessTables.set('trips', new Map());
    this.businessTables.set('documents', new Map());
    this.businessTables.set('pings', new Map());
    this.businessTables.set('safety_incidents', new Map());
    this.businessTables.set('security_alerts', new Map());
  }

  // --- Auth & Onboarding Flows ---

  registerFleetAdminOrShipper(params: {
    userId: string;
    orgName: string;
    orgType: 'fleet_operator' | 'shipper';
    role: 'fleet_admin' | 'shipper';
    userName: string;
  }) {
    const orgId = `org-${Math.random().toString(36).substring(2, 9)}`;
    this.organizations.set(orgId, { id: orgId, name: params.orgName, type: params.orgType });

    this.profiles.set(params.userId, {
      id: params.userId,
      tenant_id: orgId,
      role: params.role,
      name: params.userName,
    });

    return {
      orgId,
      profile: this.profiles.get(params.userId),
      businessRowsCreated: 0,
    };
  }

  createDriverInvitation(adminSession: SessionContext) {
    if (adminSession.role !== 'fleet_admin') {
      throw new Error('403 Forbidden: Only Fleet Admins can generate driver invitations');
    }
    const token = `inv-${Math.random().toString(36).substring(2, 10)}`;
    this.activeDriverInviteTokens.set(token, {
      tenantId: adminSession.tenantId,
      role: 'driver',
      redeemed: false,
    });
    return token;
  }

  registerDriverWithInvite(params: {
    userId: string;
    userName: string;
    invitationToken: string;
  }) {
    const invite = this.activeDriverInviteTokens.get(params.invitationToken);
    if (!invite) {
      throw new Error('400 Bad Request: Invalid invitation token');
    }
    if (invite.redeemed) {
      throw new Error('400 Bad Request: Invitation token already redeemed');
    }

    const orgsBeforeCount = this.organizations.size;

    this.profiles.set(params.userId, {
      id: params.userId,
      tenant_id: invite.tenantId,
      role: 'driver',
      name: params.userName,
    });

    invite.redeemed = true;

    const orgsAfterCount = this.organizations.size;
    const newOrgsCreated = orgsAfterCount - orgsBeforeCount;

    return {
      profile: this.profiles.get(params.userId),
      assignedTenantId: invite.tenantId,
      newOrgsCreated,
      businessRowsCreated: 0,
    };
  }

  // --- RLS-Enforced Table Operations ---

  insertRow<T extends Record<string, any> = Record<string, any>>(
    session: SessionContext,
    tableName: string,
    row: T
  ): T & {
    id: string;
    tenant_id: string;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
  } {
    const table = this.businessTables.get(tableName);
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    const id = ((row as any).id as string) || `row-${Math.random().toString(36).substring(2, 9)}`;
    const rowToSave = {
      ...row,
      id,
      tenant_id: session.tenantId, // Strictly derived from session
      created_by: session.userId,
      updated_by: session.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    table.set(id, rowToSave);

    // Append to audit log
    this.auditLog.push({
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      tenantId: session.tenantId,
      actorId: session.userId,
      action: 'INSERT',
      tableName,
      rowId: id,
      before: null,
      after: rowToSave,
      createdAt: new Date().toISOString(),
    });

    return rowToSave as any;
  }


  selectRows(session: SessionContext, tableName: string): Record<string, unknown>[] {
    const table = this.businessTables.get(tableName);
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    // Strictly enforce RLS tenant isolation: row.tenant_id === session.tenantId
    const results: Record<string, unknown>[] = [];
    for (const row of Array.from(table.values())) {
      if (row.tenant_id === session.tenantId) {
        results.push({ ...row });
      }
    }
    return results;
  }

  selectOrganizations(session: SessionContext): { id: string; name: string; type: string }[] {
    const org = this.organizations.get(session.tenantId);
    return org ? [{ ...org }] : [];
  }

  selectProfiles(session: SessionContext): { id: string; tenant_id: string; role: string; name: string }[] {
    const list: { id: string; tenant_id: string; role: string; name: string }[] = [];
    for (const p of Array.from(this.profiles.values())) {
      if (p.tenant_id === session.tenantId) {
        list.push({ ...p });
      }
    }
    return list;
  }

  updateOrganization(
    session: SessionContext,
    orgId: string,
    updates: Record<string, unknown>
  ): { id: string; name: string; type: string } {
    if (orgId !== session.tenantId) {
      throw new Error('404 Not Found or Access Denied: Cross-tenant organization modification prohibited');
    }
    if (session.role !== 'fleet_admin') {
      throw new Error('403 Forbidden: Only fleet_admin can update organization settings');
    }
    const existing = this.organizations.get(orgId);
    if (!existing) {
      throw new Error('404 Not Found: Organization not found');
    }
    const updated = { ...existing, ...updates, id: orgId };
    this.organizations.set(orgId, updated);
    return updated;
  }

  updateProfile(
    session: SessionContext,
    profileId: string,
    updates: Record<string, unknown>
  ): { id: string; tenant_id: string; role: string; name: string } {
    const existing = this.profiles.get(profileId);
    if (!existing || existing.tenant_id !== session.tenantId) {
      throw new Error('404 Not Found or Access Denied: Cross-tenant profile modification prohibited');
    }
    if (existing.id !== session.userId) {
      throw new Error('403 Forbidden: Users can only modify their own profile');
    }
    const updated = { ...existing, ...updates, id: profileId, tenant_id: session.tenantId };
    this.profiles.set(profileId, updated);
    return updated;
  }

  updateRow(
    session: SessionContext,
    tableName: string,
    rowId: string,
    updates: Record<string, unknown>
  ): Record<string, unknown> {
    const table = this.businessTables.get(tableName);
    if (!table) throw new Error(`Unknown table: ${tableName}`);

    const existing = table.get(rowId);
    if (!existing || existing.tenant_id !== session.tenantId) {
      throw new Error('404 Not Found or Access Denied: Tenant boundary violation');
    }

    const before = { ...existing };
    const updated = {
      ...existing,
      ...updates,
      tenant_id: session.tenantId, // Cannot alter tenant_id
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    };

    table.set(rowId, updated);

    // Append to audit log
    this.auditLog.push({
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      tenantId: session.tenantId,
      actorId: session.userId,
      action: 'UPDATE',
      tableName,
      rowId,
      before,
      after: updated,
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  // --- Idempotency Header Handling ---

  executeIdempotentOperation<T>(
    session: SessionContext,
    idempotencyKey: string | undefined,
    operation: () => { statusCode: number; payload: T }
  ): { statusCode: number; payload: T; fromCache: boolean } {
    if (!idempotencyKey) {
      const res = operation();
      return { ...res, fromCache: false };
    }

    const cacheLookupKey = `${session.tenantId}:${idempotencyKey}`;
    const cached = this.idempotencyCache.get(cacheLookupKey);
    if (cached) {
      return {
        statusCode: cached.statusCode,
        payload: cached.responsePayload as T,
        fromCache: true,
      };
    }

    const res = operation();
    this.idempotencyCache.set(cacheLookupKey, {
      key: idempotencyKey,
      tenantId: session.tenantId,
      statusCode: res.statusCode,
      responsePayload: res.payload,
      timestamp: new Date().toISOString(),
    });

    return { ...res, fromCache: false };
  }

  getAuditTrail(session: SessionContext, tableName?: string): AuditRecord[] {
    return this.auditLog.filter(
      (entry) =>
        entry.tenantId === session.tenantId &&
        (!tableName || entry.tableName === tableName)
    );
  }

  getTotalRowCount(tableName: string): number {
    const table = this.businessTables.get(tableName);
    return table ? table.size : 0;
  }
}
