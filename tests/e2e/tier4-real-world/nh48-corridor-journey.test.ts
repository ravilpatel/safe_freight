import { describe, it, expect } from 'vitest';
import {
  calculateShipperQuote,
  calculate3WayRoutes,
  calculateDeadMileageSavings,
  calculateTripKhata,
  generateStatutoryLRNumber,
  validateEWayBillNumber,
  validateGSTIN,
} from '../harness/contracts';
import {
  NH48_WESTERN_CORRIDOR_WAYPOINTS,
  TEST_ORGS,
  TEST_PROFILES,
} from '../harness/fixtures';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';

describe('Tier 4: Real-World Scenario — NH 48 Western Freight Corridor Journey', () => {
  it('TC-RW-01: executes complete 525km freight journey from Mumbai JNPT to Ahmedabad Changodar with multi-persona orchestration', () => {
    const db = new MultiTenantDatabaseSimulator();

    // ==========================================
    // STAGE 1: Shipper Onboarding & Load Posting
    // Adani Logistics Forwarders (Mumbai HQ)
    // ==========================================
    const shipperSession: SessionContext = {
      userId: TEST_PROFILES.SHIPPER_ADANI_EXEC.id,
      tenantId: TEST_ORGS.SHIPPER_ADANI.id,
      role: 'shipper',
      email: TEST_PROFILES.SHIPPER_ADANI_EXEC.email,
    };

    // Calculate dynamic pricing quote for 525km FTL (16,000 kg, 24 cbm)
    const quote = calculateShipperQuote('private', 525, 16000, 24.0);
    expect(quote.minPricingINR).toBeGreaterThan(35000);
    expect(quote.gstINR).toBe(Math.round(quote.subTotalINR * 0.05));

    // Shipper posts load with recommended pricing
    const load = db.insertRow(shipperSession, 'loads', {
      shipper_name: TEST_ORGS.SHIPPER_ADANI.name,
      shipper_phone: TEST_PROFILES.SHIPPER_ADANI_EXEC.phone,
      pickup_city: 'Mumbai',
      pickup_lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lat,
      pickup_lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[0].lng,
      drop_city: 'Ahmedabad',
      drop_lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[5].lat,
      drop_lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[5].lng,
      weight_kg: 16000,
      truck_type: 'private',
      revenue_inr: quote.recommendedPriceINR,
      min_pricing_inr: quote.minPricingINR,
      status: 'open',
    });

    expect(load.status).toBe('open');
    expect(load.tenant_id).toBe(TEST_ORGS.SHIPPER_ADANI.id);

    // ==========================================
    // STAGE 2: Fleet Admin Route Optimization
    // Sardar Balwinder Singh (WIFL, Vapi & Surat)
    // ==========================================
    const fleetAdminSession: SessionContext = {
      userId: TEST_PROFILES.FLEET_ADMIN_BALWINDER.id,
      tenantId: TEST_ORGS.FLEET_WIFL.id,
      role: 'fleet_admin',
      email: TEST_PROFILES.FLEET_ADMIN_BALWINDER.email,
    };

    // Fleet admin evaluates 3-way route options for Mumbai -> Ahmedabad (interstate)
    const routeOptions = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
    const selectedRoute = routeOptions.find((r) => r.type === 'fastest')!;

    expect(selectedRoute.distanceKm).toBe(525);
    expect(selectedRoute.stateTaxINR).toBe(450); // Interstate commercial entry tax
    expect(selectedRoute.tollPlazaCount).toBeGreaterThanOrEqual(7);

    // Admin calculates deadhead mileage saved if truck had to deadhead back to Mumbai
    const deadMileageSavings = calculateDeadMileageSavings(525, 0);
    expect(deadMileageSavings.emptyKmAvoided).toBe(525);
    expect(deadMileageSavings.totalMoneySavedINR).toBeGreaterThan(16000);

    // Admin creates dispatch slip and assigns Commercial Driver Ramesh Patel
    const statutoryLR = generateStatutoryLRNumber('WIFL', '2026-27', 482);
    const statutoryEWayBill = '241088764512';
    expect(validateEWayBillNumber(statutoryEWayBill)).toBe(true);
    expect(validateGSTIN(TEST_ORGS.FLEET_WIFL.gstin)).toBe(true);

    const trip = db.insertRow(fleetAdminSession, 'trips', {
      load_id: load.id,
      driver_id: TEST_PROFILES.DRIVER_RAMESH.id,
      lr_number: statutoryLR,
      eway_bill_no: statutoryEWayBill,
      consignor_name: TEST_ORGS.SHIPPER_ADANI.name,
      consignor_gst: TEST_ORGS.SHIPPER_ADANI.gstin,
      consignee_name: 'Gujarat Petrochem Industries Ltd',
      consignee_gst: '24AAACG7777K1Z3',
      start_city: 'Mumbai',
      end_city: 'Ahmedabad',
      distance_km: 525,
      route_type: selectedRoute.type,
      assigned_route_name: selectedRoute.name,
      fastag_toll_inr: selectedRoute.fastagTollINR,
      state_tax_inr: selectedRoute.stateTaxINR,
      total_freight_inr: quote.recommendedPriceINR,
      diesel_advance_inr: 14000,
      fastag_advance_inr: 3000,
      driver_bhatta_inr: 2500,
      hamali_expenses_inr: 0,
      maintenance_reserve_inr: 3500,
      milestone_status: 'dispatched',
    });

    expect(trip.tenant_id).toBe(TEST_ORGS.FLEET_WIFL.id);

    // ==========================================
    // STAGE 3: Driver HUD Highway Progression
    // Ramesh Patel (Tata Signa 4825.T, GJ-05-BZ-8821)
    // ==========================================
    const driverSession: SessionContext = {
      userId: TEST_PROFILES.DRIVER_RAMESH.id,
      tenantId: TEST_ORGS.FLEET_WIFL.id,
      role: 'driver',
      email: TEST_PROFILES.DRIVER_RAMESH.email,
    };

    // Waypoint 1: Mumbai JNPT (km 0) -> Reached Pickup & Loading Done
    db.updateRow(driverSession, 'trips', trip.id as string, {
      milestone_status: 'reached_pickup',
    });
    db.updateRow(driverSession, 'trips', trip.id as string, {
      milestone_status: 'loading_done',
      hamali_expenses_inr: 1200, // loading hamali
    });

    // Waypoint 2: Vapi GIDC (km 165) -> Crossed MH/GJ border
    db.insertRow(driverSession, 'pings', {
      trip_id: trip.id,
      lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[1].lat,
      lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[1].lng,
      speed: 61.5,
      g_force: 1.05,
    });
    db.updateRow(driverSession, 'trips', trip.id as string, {
      milestone_status: 'on_highway',
    });

    // Waypoint 3: Surat Kadodara (km 285) -> Dhaba break & driver meal allowance
    db.updateRow(driverSession, 'trips', trip.id as string, {
      milestone_status: 'dhaba_break',
      driver_bhatta_inr: 3500, // additional ₹1000 bhatta disbursed
    });

    // Waypoint 4: Bharuch Narmada Bridge (km 360) -> FASTag Toll Plaza
    db.insertRow(driverSession, 'pings', {
      trip_id: trip.id,
      lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[3].lat,
      lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[3].lng,
      speed: 55.0,
      g_force: 1.10,
    });

    // Waypoint 5: Vadodara Ranoli (km 440) -> High speed cruising
    db.insertRow(driverSession, 'pings', {
      trip_id: trip.id,
      lat: NH48_WESTERN_CORRIDOR_WAYPOINTS[4].lat,
      lng: NH48_WESTERN_CORRIDOR_WAYPOINTS[4].lng,
      speed: 64.0,
      g_force: 1.01,
    });

    // Waypoint 6: Ahmedabad Changodar (km 525) -> Reached Drop & Delivered
    db.updateRow(driverSession, 'trips', trip.id as string, {
      milestone_status: 'reached_drop',
      hamali_expenses_inr: 2500, // total loading + unloading hamali
    });

    const completedTrip = db.updateRow(driverSession, 'trips', trip.id as string, {
      milestone_status: 'delivered',
      completed_at: new Date().toISOString(),
    });

    expect(completedTrip.milestone_status).toBe('delivered');

    // ==========================================
    // STAGE 4: Trip Khata Financial Settlement
    // ==========================================
    const settlement = calculateTripKhata(
      completedTrip.total_freight_inr as number,
      {
        diesel: completedTrip.diesel_advance_inr as number,
        fastag: completedTrip.fastag_advance_inr as number,
        driverBhatta: completedTrip.driver_bhatta_inr as number,
        hamali: completedTrip.hamali_expenses_inr as number,
      },
      completedTrip.maintenance_reserve_inr as number
    );

    // Total Disbursed: Diesel(14000) + FASTag(3000) + Bhatta(3500) + Hamali(2500) = ₹23,000
    expect(settlement.totalDisbursedAdvancesINR).toBe(23000);
    // Balance Due on POD: Freight - 23000
    expect(settlement.balanceDueOnPODINR).toBe(
      (completedTrip.total_freight_inr as number) - 23000
    );
    expect(settlement.balanceDueOnPODINR).toBeGreaterThan(0);
    expect(settlement.netGrossProfitINR).toBeGreaterThan(0);
    expect(settlement.profitMarginPercent).toBeGreaterThan(30.0);

    // ==========================================
    // STAGE 5: Multi-Tenant Isolation & Audit Trail
    // ==========================================
    // Assert Fleet Admin audit trail captured the complete lifecycle
    const fleetAudit = db.getAuditTrail(fleetAdminSession, 'trips');
    expect(fleetAudit.length).toBeGreaterThanOrEqual(6);

    // Assert Shipper cannot inspect Fleet Admin internal financial advances
    const shipperTrips = db.selectRows(shipperSession, 'trips');
    expect(shipperTrips).toHaveLength(0); // Zero cross-tenant rows
  });
});
