import { describe, it, expect } from 'vitest';
import { calculateTripKhata } from '../harness/contracts';

describe('Tier 2: Boundary Value Analysis — Trip Khata Financial Breakdown (FEAT-04)', () => {
  it('TC-TK-BVA-01: clamps BalanceDueOnPOD to 0 when advances exceed gross freight (never negative balance)', () => {
    // Authoritative Requirement: PRD v4.0.0 §5.4
    // BalanceDueOnPOD = max(0, GrossFreight - TotalAdvances)
    // Gross = ₹30,000, Total Advances = ₹35,000 (disbursed advance overpay)
    const result = calculateTripKhata(30000, {
      diesel: 20000,
      fastag: 5000,
      driverBhatta: 5000,
      hamali: 5000,
    });

    expect(result.grossFreightINR).toBe(30000);
    expect(result.totalDisbursedAdvancesINR).toBe(35000);
    expect(result.balanceDueOnPODINR).toBe(0); // Clamped to 0
    expect(result.netGrossProfitINR).toBe(-5000); // Legitimate negative net profit
  });

  it('TC-TK-BVA-02: returns 0.0% profit margin without division by zero NaN when gross freight is 0', () => {
    // Boundary: gross freight = 0
    const result = calculateTripKhata(0, { diesel: 2000 }, 500);

    expect(result.grossFreightINR).toBe(0);
    expect(result.profitMarginPercent).toBe(0);
    expect(isNaN(result.profitMarginPercent)).toBe(false);
  });

  it('TC-TK-BVA-03: clamps negative advance input values to 0', () => {
    // Boundary: negative values passed into advances
    const result = calculateTripKhata(50000, {
      diesel: -5000,
      fastag: 2000,
      driverBhatta: -1000,
      hamali: 1500,
    });

    expect(result.dieselAdvanceINR).toBe(0);
    expect(result.driverBhattaINR).toBe(0);
    expect(result.totalDisbursedAdvancesINR).toBe(3500); // 2000 + 1500
    expect(result.balanceDueOnPODINR).toBe(46500);
  });

  it('TC-TK-BVA-04: verifies 100% loss boundary when operating costs exceed gross freight', () => {
    // Gross = ₹20,000, Total Operating Costs = ₹40,000
    // Net Profit = -₹20,000
    // Profit margin = (-20000 / 20000) * 100 = -100.0%
    const result = calculateTripKhata(20000, { diesel: 30000 }, 10000);

    expect(result.netGrossProfitINR).toBe(-20000);
    expect(result.profitMarginPercent).toBe(-100.0);
  });

  it('TC-TK-BVA-05: verifies micro-freight boundary (₹1 gross freight with ₹1 advance)', () => {
    const result = calculateTripKhata(1, { driverBhatta: 1 }, 0);

    expect(result.grossFreightINR).toBe(1);
    expect(result.totalDisbursedAdvancesINR).toBe(1);
    expect(result.balanceDueOnPODINR).toBe(0);
    expect(result.netGrossProfitINR).toBe(0);
    expect(result.profitMarginPercent).toBe(0.0);
  });

  it('TC-TK-BVA-06: maintains exact balance when maintenance reserve exceeds gross freight', () => {
    // Gross = ₹25,000, Advances = ₹10,000, Maintenance Reserve = ₹30,000
    // Balance Due on POD remains 25000 - 10000 = ₹15,000 (Driver POD balance is unaffected by Fleet Admin reserve)
    // Total Operating Costs = 10000 + 30000 = ₹40,000
    // Net Profit = 25000 - 40000 = -₹15,000
    const result = calculateTripKhata(25000, { diesel: 10000 }, 30000);

    expect(result.balanceDueOnPODINR).toBe(15000);
    expect(result.totalOperatingCostsINR).toBe(40000);
    expect(result.netGrossProfitINR).toBe(-15000);
  });
});
