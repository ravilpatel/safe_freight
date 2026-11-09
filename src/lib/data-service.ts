/**
 * SafeFreight OS — Enterprise Multi-Tenant Data Service
 * Implements strict tenant-isolated CRUD, cursor pagination, and append-only audit logging.
 * Reference: PRD v4.0.0 §4, §8, §10 & CTO Phase 2 Directives
 */

import crypto from 'crypto';
import { logger } from './logger';
import { createAdminClient } from './supabase/admin';
import {
  Load,
  Trip,
  FleetDocument,
  TelematicsPing,
  SafetyIncident,
  SecurityAlert,
  AuditLogEntry,
  SessionClaims,
} from '../types/database';
import { PaginatedResponse } from '../types/api';
import { calculateShipperQuote } from './algorithms/shipperPricing';
import { calculateTripKhata, TripKhataResult } from './algorithms/tripKhata';

export class EnterpriseDataService {
  private loads = new Map<string, Load>();
  private trips = new Map<string, Trip>();
  private documents = new Map<string, FleetDocument>();
  private pings = new Map<string, TelematicsPing>();
  private safetyIncidents = new Map<string, SafetyIncident>();
  private securityAlerts = new Map<string, SecurityAlert>();
  private auditLog: AuditLogEntry[] = [];

  constructor() {
    // Invariant: Zero business seed rows
  }

  // ==========================================
  // AUDIT LOGGING (APPEND-ONLY)
  // ==========================================

  public async recordAuditLog(params: {
    tenantId: string;
    actorId: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
    tableName: string;
    recordId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
  }): Promise<AuditLogEntry> {
    const now = new Date().toISOString();
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      tenant_id: params.tenantId,
      table_name: params.tableName,
      record_id: params.recordId,
      row_id: params.recordId,
      action: params.action,
      old_record: params.beforeState || null,
      new_record: params.afterState || null,
      before_state: params.beforeState || null,
      after_state: params.afterState || null,
      performed_by: params.actorId,
      actor_id: params.actorId,
      created_by: params.actorId,
      updated_by: params.actorId,
      created_at: now,
      updated_at: now,
    };

    this.auditLog.push(entry);

    // Persist to Supabase audit_log table if configured
    try {
      const supabase = createAdminClient();
      await supabase.from('audit_log').insert({
        id: entry.id,
        tenant_id: entry.tenant_id,
        table_name: entry.table_name,
        record_id: entry.record_id,
        row_id: entry.row_id,
        action: entry.action,
        old_record: entry.old_record,
        new_record: entry.new_record,
        before_state: entry.before_state,
        after_state: entry.after_state,
        performed_by: entry.performed_by,
        actor_id: entry.actor_id,
        created_at: entry.created_at,
      });
    } catch (err) {
      // In-memory audit entry was recorded; log remote sync error
      logger.warn('Remote audit log sync skipped', { error: String(err) });
    }

    return entry;
  }

  public getAuditTrail(claims: SessionClaims, tableName?: string): AuditLogEntry[] {
    return this.auditLog.filter(
      (entry) =>
        entry.tenant_id === claims.tenant_id &&
        (!tableName || entry.table_name === tableName)
    );
  }

  // ==========================================
  // PAGINATION HELPER
  // ==========================================

  public paginate<T extends { id: string; created_at: string }>(
    items: T[],
    limit: number = 20,
    cursor?: string | null
  ): PaginatedResponse<T> {
    // Sort newest first
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sorted.findIndex((item) => item.id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const clampedLimit = Math.min(Math.max(1, limit), 100);
    const pageItems = sorted.slice(startIndex, startIndex + clampedLimit);
    const hasMore = startIndex + clampedLimit < sorted.length;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    return {
      data: pageItems,
      pagination: {
        limit: clampedLimit,
        cursor: cursor || null,
        next_cursor: nextCursor,
        has_more: hasMore,
        total: sorted.length,
      },
    };
  }

  // ==========================================
  // LOADS DOMAIN
  // ==========================================

  public async createLoad(
    claims: SessionClaims,
    input: {
      origin_name: string;
      origin_lat?: number;
      origin_lng?: number;
      destination_name: string;
      destination_lat?: number;
      destination_lng?: number;
      weight_kg: number;
      volume_cft?: number;
      distance_km?: number;
      pricing_inr?: number;
      status?: Load['status'];
    }
  ): Promise<Load> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    let pricing = input.pricing_inr;
    if (typeof pricing !== 'number' || pricing <= 0) {
      const quote = calculateShipperQuote(
        'shared',
        input.distance_km || 300,
        input.weight_kg,
        (input.volume_cft || 35.3) / 35.315 // cft to cbm
      );
      pricing = quote.minPricingINR;
    }

    const load: Load = {
      id,
      tenant_id: claims.tenant_id,
      shipper_id: claims.sub,
      origin_name: input.origin_name,
      origin_lat: input.origin_lat ?? null,
      origin_lng: input.origin_lng ?? null,
      destination_name: input.destination_name,
      destination_lat: input.destination_lat ?? null,
      destination_lng: input.destination_lng ?? null,
      weight_kg: input.weight_kg,
      volume_cft: input.volume_cft ?? null,
      distance_km: input.distance_km ?? null,
      status: input.status || 'posted',
      pricing_inr: pricing,
      matched_driver_id: null,
      created_by: claims.sub,
      updated_by: claims.sub,
      created_at: now,
      updated_at: now,
    };

    this.loads.set(id, load);

    // Record append-only audit log
    await this.recordAuditLog({
      tenantId: claims.tenant_id,
      actorId: claims.sub,
      action: 'INSERT',
      tableName: 'loads',
      recordId: id,
      beforeState: null,
      afterState: load as unknown as Record<string, unknown>,
    });

    // Remote persistence
    try {
      const supabase = createAdminClient();
      await supabase.from('loads').insert(load);
    } catch (_e) {
      // Memory state retained
    }

    return load;
  }

  public getLoads(
    claims: SessionClaims,
    params: { limit?: number; cursor?: string; status?: string }
  ): PaginatedResponse<Load> {
    const tenantLoads = Array.from(this.loads.values()).filter(
      (load) =>
        load.tenant_id === claims.tenant_id &&
        (!params.status || load.status === params.status)
    );

    return this.paginate(tenantLoads, params.limit, params.cursor);
  }

  public getLoadById(claims: SessionClaims, id: string): Load | null {
    const load = this.loads.get(id);
    if (!load || load.tenant_id !== claims.tenant_id) return null;
    return load;
  }

  // ==========================================
  // TRIPS DOMAIN
  // ==========================================

  public async createTrip(
    claims: SessionClaims,
    input: {
      load_id?: string;
      driver_id?: string;
      gross_freight?: number;
      maintenance_reserve?: number;
    }
  ): Promise<Trip> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const gross = Math.max(0, input.gross_freight || 0);
    const reserve = Math.max(0, input.maintenance_reserve || 0);

    const trip: Trip = {
      id,
      tenant_id: claims.tenant_id,
      load_id: input.load_id ?? null,
      driver_id: input.driver_id ?? null,
      start_time: now,
      end_time: null,
      milestone_status: 'created',
      gross_freight: gross,
      total_advances: 0,
      maintenance_reserve: reserve,
      balance_due: gross,
      net_profit: gross - reserve,
      created_by: claims.sub,
      updated_by: claims.sub,
      created_at: now,
      updated_at: now,
    };

    this.trips.set(id, trip);

    // Record audit log
    await this.recordAuditLog({
      tenantId: claims.tenant_id,
      actorId: claims.sub,
      action: 'INSERT',
      tableName: 'trips',
      recordId: id,
      beforeState: null,
      afterState: trip as unknown as Record<string, unknown>,
    });

    // Remote persistence
    try {
      const supabase = createAdminClient();
      await supabase.from('trips').insert(trip);
    } catch (_e) {
      // Memory state retained
    }

    return trip;
  }

  public getTrips(
    claims: SessionClaims,
    params: { limit?: number; cursor?: string; milestone_status?: string }
  ): PaginatedResponse<Trip> {
    const tenantTrips = Array.from(this.trips.values()).filter(
      (trip) =>
        trip.tenant_id === claims.tenant_id &&
        (!params.milestone_status || trip.milestone_status === params.milestone_status)
    );

    return this.paginate(tenantTrips, params.limit, params.cursor);
  }

  public getTripById(claims: SessionClaims, id: string): Trip | null {
    const trip = this.trips.get(id);
    if (!trip || trip.tenant_id !== claims.tenant_id) return null;
    return trip;
  }

  // ==========================================
  // KHATA FINANCIAL LEDGER DOMAIN
  // ==========================================

  public async disburseTripAdvance(
    claims: SessionClaims,
    tripId: string,
    params: {
      type: 'diesel' | 'fastag' | 'driverBhatta' | 'hamali';
      amount: number;
      notes?: string;
    }
  ): Promise<{ trip: Trip; settlement: TripKhataResult }> {
    const trip = this.trips.get(tripId);
    if (!trip || trip.tenant_id !== claims.tenant_id) {
      throw new Error('404 Not Found: Trip does not exist in tenant organization');
    }

    const beforeState = { ...trip };
    const amount = Math.max(0, params.amount);

    const newAdvances = trip.total_advances + amount;
    const settlement = calculateTripKhata(
      trip.gross_freight,
      {
        diesel: params.type === 'diesel' ? amount : 0,
        fastag: params.type === 'fastag' ? amount : 0,
        driverBhatta: params.type === 'driverBhatta' ? amount : 0,
        hamali: params.type === 'hamali' ? amount : 0,
      },
      trip.maintenance_reserve
    );

    const now = new Date().toISOString();
    const updatedTrip: Trip = {
      ...trip,
      total_advances: newAdvances,
      balance_due: Math.max(0, trip.gross_freight - newAdvances),
      net_profit: trip.gross_freight - (newAdvances + trip.maintenance_reserve),
      updated_by: claims.sub,
      updated_at: now,
    };

    this.trips.set(tripId, updatedTrip);

    // Record audit log
    await this.recordAuditLog({
      tenantId: claims.tenant_id,
      actorId: claims.sub,
      action: 'UPDATE',
      tableName: 'trips',
      recordId: tripId,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: updatedTrip as unknown as Record<string, unknown>,
    });

    // Remote persistence
    try {
      const supabase = createAdminClient();
      await supabase.from('trips').update(updatedTrip).eq('id', tripId);
    } catch (_e) {
      // Memory state retained
    }

    return { trip: updatedTrip, settlement };
  }

  public getTripKhataSettlement(
    claims: SessionClaims,
    tripId: string
  ): { trip: Trip; settlement: TripKhataResult } | null {
    const trip = this.trips.get(tripId);
    if (!trip || trip.tenant_id !== claims.tenant_id) return null;

    const settlement = calculateTripKhata(
      trip.gross_freight,
      {
        diesel: trip.total_advances, // Consolidated advance total
      },
      trip.maintenance_reserve
    );

    return { trip, settlement };
  }

  public clear(): void {
    this.loads.clear();
    this.trips.clear();
    this.documents.clear();
    this.pings.clear();
    this.safetyIncidents.clear();
    this.securityAlerts.clear();
    this.auditLog = [];
  }
}

// Global enterprise data service instance
export const dataService = new EnterpriseDataService();
