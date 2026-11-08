import { describe, it, expect } from 'vitest';
import { calculateTripKhata } from '../harness/contracts';

describe('Tier 1: Feature Coverage — Trip Khata Financial Engine (FEAT-04)', () => {
  it('TC-TK-01: calculates complete Khata financial breakdown on standard highway trip', () => {
    // Gross Freight = ₹45,000
    // Advances: Diesel = ₹12,000, FASTag = ₹3,000, Driver Bhatta = ₹2,500, Hamali = ₹1,500
    // Total Advances = 12000 + 3000 + 2500 + 1500 = ₹19,000
    // Maintenance Reserve = ₹3,500
    // Balance Due on POD = 45000 - 19000 = ₹26,000
    // Total Operating Costs = 19000 + 3500 = ₹22,500
    // Net Gross Profit = 45000 - 22500 = ₹22,500
    // Profit Margin = round((22500 / 45000) * 100 * 10) / 10 = 50.0%
    const result = calculateTripKhata(
      45000,
      {
        diesel: 12000,
        fastag: 3000,
        driverBhatta: 2500,
        hamali: 1500,
      },
      3500
    );

    expect(result.grossFreightINR).toBe(45000);
    expect(result.totalDisbursedAdvancesINR).toBe(19000);
    expect(result.balanceDueOnPODINR).toBe(26000);
    expect(result.totalOperatingCostsINR).toBe(22500);
    expect(result.netGrossProfitINR).toBe(22500);
    expect(result.profitMarginPercent).toBe(50.0);
  });

  it('TC-TK-02: verifies zero advances trip where balance due equals full gross freight', () => {
    // Gross Freight = ₹30,000, zero advances disbursed
    const result = calculateTripKhata(30000, {}, 2000);

    expect(result.totalDisbursedAdvancesINR).toBe(0);
    expect(result.balanceDueOnPODINR).toBe(30000);
    expect(result.totalOperatingCostsINR).toBe(2000);
    expect(result.netGrossProfitINR).toBe(28000);
    expect(result.profitMarginPercent).toBe(93.3);
  });

  it('TC-TK-03: accurately aggregates individual advance components', () => {
    const advances = {
      diesel: 14500,
      fastag: 2800,
      driverBhatta: 1800,
      hamali: 900,
    };
    const result = calculateTripKhata(35000, advances, 0);

    expect(result.dieselAdvanceINR).toBe(14500);
    expect(result.fastagAdvanceINR).toBe(2800);
    expect(result.driverBhattaINR).toBe(1800);
    expect(result.hamaliExpensesINR).toBe(900);
    expect(result.totalDisbursedAdvancesINR).toBe(20000);
    expect(result.balanceDueOnPODINR).toBe(15000);
  });

  it('TC-TK-04: verifies ledger balance invariant: Gross = Disbursed + BalanceDue (when Advances <= Gross)', () => {
    const testCases = [
      { gross: 50000, adv: { diesel: 15000, fastag: 2500, driverBhatta: 2000 } },
      { gross: 28000, adv: { diesel: 8000, fastag: 1500, hamali: 1000 } },
      { gross: 72000, adv: { diesel: 22000, fastag: 4500, driverBhatta: 3500, hamali: 2000 } },
    ];

    for (const tc of testCases) {
      const res = calculateTripKhata(tc.gross, tc.adv);
      expect(res.grossFreightINR).toBe(
        res.totalDisbursedAdvancesINR + res.balanceDueOnPODINR
      );
    }
  });

  it('TC-TK-05: accounts for tire and chassis maintenance sinking reserve', () => {
    const withoutReserve = calculateTripKhata(40000, { diesel: 10000 }, 0);
    const withReserve = calculateTripKhata(40000, { diesel: 10000 }, 4000);

    expect(withReserve.balanceDueOnPODINR).toBe(withoutReserve.balanceDueOnPODINR); // Reserve does not affect POD balance
    expect(withReserve.totalOperatingCostsINR).toBe(withoutReserve.totalOperatingCostsINR + 4000);
    expect(withReserve.netGrossProfitINR).toBe(withoutReserve.netGrossProfitINR - 4000);
  });

  it('TC-TK-06: computes exact 1-decimal-place profit margin percentage', () => {
    // Gross = 30,000, Operating = 10,000 -> Net = 20,000
    // Margin = (20,000 / 30,000) * 100 = 66.666... -> 66.7%
    const res = calculateTripKhata(30000, { diesel: 10000 });
    expect(res.profitMarginPercent).toBe(66.7);
  });
});
