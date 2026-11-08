import { describe, it, expect } from 'vitest';
import { calculateTripKhata, generateStatutoryLRNumber } from '../harness/contracts';
import { MultiTenantDatabaseSimulator, SessionContext } from '../harness/mock-context';

describe('Tier 3: Cross-Feature Interactions — Khata Ledger & Trip Completion (Pairwise)', () => {
  it('TC-INT-10: simulates 6-stage milestone tracker, en-route cash advance disbursements, and final Khata settlement', () => {
    // Pairwise: Milestones + Advances + POD Delivery + Khata Settlement
    const db = new MultiTenantDatabaseSimulator();
    const session: SessionContext = {
      userId: 'driver-ramesh',
      tenantId: 'org-wifl',
      role: 'driver',
      email: 'ramesh@wifl.in',
    };

    const lrNumber = generateStatutoryLRNumber('WIFL', '2026-27', 482);
    const grossFreight = 48000;

    // Milestone 1: Dispatched (Initial advances logged)
    const trip = db.insertRow(session, 'trips', {
      lr_number: lrNumber,
      total_freight_inr: grossFreight,
      diesel_advance_inr: 12000,
      fastag_advance_inr: 3000,
      driver_bhatta_inr: 1500,
      hamali_expenses_inr: 0,
      maintenance_reserve_inr: 2500,
      milestone_status: 'dispatched',
    });

    // Milestone 2: Reached Pickup
    db.updateRow(session, 'trips', trip.id as string, { milestone_status: 'reached_pickup' });

    // Milestone 3: Loading Done (Hamali / labor loading charge added)
    db.updateRow(session, 'trips', trip.id as string, {
      milestone_status: 'loading_done',
      hamali_expenses_inr: 1200,
    });

    // Milestone 4: On Highway
    db.updateRow(session, 'trips', trip.id as string, { milestone_status: 'on_highway' });

    // Milestone 5: Reached Drop (Unloading hamali added)
    db.updateRow(session, 'trips', trip.id as string, {
      milestone_status: 'reached_drop',
      hamali_expenses_inr: 2000, // Total hamali = 2000
    });

    // Milestone 6: Delivered (Proof of Delivery / POD signed)
    const deliveredTrip = db.updateRow(session, 'trips', trip.id as string, {
      milestone_status: 'delivered',
      completed_at: new Date().toISOString(),
    });

    expect(deliveredTrip.milestone_status).toBe('delivered');

    // Financial Settlement Execution:
    const khata = calculateTripKhata(
      deliveredTrip.total_freight_inr as number,
      {
        diesel: deliveredTrip.diesel_advance_inr as number,
        fastag: deliveredTrip.fastag_advance_inr as number,
        driverBhatta: deliveredTrip.driver_bhatta_inr as number,
        hamali: deliveredTrip.hamali_expenses_inr as number,
      },
      deliveredTrip.maintenance_reserve_inr as number
    );

    // Advances: 12000 + 3000 + 1500 + 2000 = ₹18,500
    expect(khata.totalDisbursedAdvancesINR).toBe(18500);
    // Balance Due on POD: 48000 - 18500 = ₹29,500
    expect(khata.balanceDueOnPODINR).toBe(29500);
    // Operating Costs: 18500 + 2500 reserve = ₹21,000
    expect(khata.totalOperatingCostsINR).toBe(21000);
    // Net Gross Profit: 48000 - 21000 = ₹27,000
    expect(khata.netGrossProfitINR).toBe(27000);
    // Profit margin: round(27000 / 48000 * 100 * 10) / 10 = 56.3%
    expect(khata.profitMarginPercent).toBe(56.3);

    // Verify statutory audit trail captured all 5 milestone transitions
    const auditEntries = db.getAuditTrail(session, 'trips');
    expect(auditEntries).toHaveLength(6); // 1 INSERT + 5 UPDATEs
  });

  it('TC-INT-11: verifies driver cash bhatta disbursement does not violate tenant financial boundaries', () => {
    const db = new MultiTenantDatabaseSimulator();

    const sessionA: SessionContext = {
      userId: 'driver-a',
      tenantId: 'org-wifl',
      role: 'driver',
      email: 'a@wifl.in',
    };

    const tripA = db.insertRow(sessionA, 'trips', {
      lr_number: 'LR-A',
      total_freight_inr: 30000,
      driver_bhatta_inr: 2000,
    });
    expect(tripA.lr_number).toBe('LR-A');

    const sessionB: SessionContext = {
      userId: 'driver-b',
      tenantId: 'org-other',
      role: 'driver',
      email: 'b@other.in',
    };

    // Session B cannot inspect Session A's Khata advances
    const tripsB = db.selectRows(sessionB, 'trips');
    expect(tripsB).toHaveLength(0);
  });
});
