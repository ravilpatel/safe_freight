import { describe, it, expect } from 'vitest';
import { calculateDeadMileageSavings } from '../harness/contracts';

describe('Tier 2: Boundary Value Analysis — Dead Mileage Savings Engine (FEAT-01)', () => {
  it('TC-DM-BVA-01: clamps negative empty km avoided to 0 when loaded distance exceeds total distance', () => {
    // Boundary: data entry anomaly loadedKm (600) > totalKm (500)
    // EmptyKmAvoided = max(0, 500 - 600) = 0
    const result = calculateDeadMileageSavings(500, 600);

    expect(result.emptyKmAvoided).toBe(0);
    expect(result.fuelSavedLiters).toBe(0);
    expect(result.fuelCostSavedINR).toBe(0);
    expect(result.totalMoneySavedINR).toBe(0);
    expect(result.co2SavedKg).toBe(0);
  });

  it('TC-DM-BVA-02: protects against division by zero by clamping mileageKmPerLiter to minimum safe divisor 0.5', () => {
    // Boundary: user passes 0 or negative mileageKmPerLiter
    const resultZero = calculateDeadMileageSavings(200, 100, { mileageKmPerLiter: 0 });
    expect(resultZero.fuelSavedLiters).toBe(200); // 100 / 0.5 = 200 L
    expect(isFinite(resultZero.fuelSavedLiters)).toBe(true);

    const resultNeg = calculateDeadMileageSavings(200, 100, { mileageKmPerLiter: -5 });
    expect(resultNeg.fuelSavedLiters).toBe(200);
  });

  it('TC-DM-BVA-03: clamps negative total distance or loaded distance to 0', () => {
    // Boundary: negative inputs
    const result = calculateDeadMileageSavings(-100, -50);

    expect(result.totalKm).toBe(0);
    expect(result.loadedKm).toBe(0);
    expect(result.emptyKmAvoided).toBe(0);
    expect(result.totalMoneySavedINR).toBe(0);
  });

  it('TC-DM-BVA-04: verifies micro-distance boundary (0.5 km deadhead avoidance)', () => {
    // Boundary: 0.5 km avoided -> 0.5 / 3.8 = 0.1315 -> rounded to 1 dp = 0.1 L
    // FuelCost = round(0.1 * 92) = ₹9
    // WearTear = round(0.5 * 4.5) = round(2.25) = ₹2
    // TollSaved = round(0.5 * 2.2) = round(1.1) = ₹1
    // TotalMoneySaved = 9 + 2 + 1 = ₹12
    const result = calculateDeadMileageSavings(10.5, 10.0);

    expect(result.emptyKmAvoided).toBe(0.5);
    expect(result.fuelSavedLiters).toBe(0.1);
    expect(result.fuelCostSavedINR).toBe(9);
    expect(result.wearTearSavedINR).toBe(2);
    expect(result.tollSavedINR).toBe(1);
    expect(result.totalMoneySavedINR).toBe(12);
  });

  it('TC-DM-BVA-05: handles large-scale multi-month fleet enterprise aggregation (50,000 km avoided)', () => {
    // Boundary: 50,000 empty km avoided
    // FuelSaved = round(50000 / 3.8 * 10) / 10 = 13157.9 L
    // FuelCost = round(13157.9 * 92) = ₹1,210,527
    // WearTear = round(50000 * 4.5) = ₹225,000
    // TollSaved = round(50000 * 2.2) = ₹110,000
    // TotalMoneySaved = 1210527 + 225000 + 110000 = ₹1,545,527
    // CO2Saved = round(13157.9 * 2.68 * 10) / 10 = 35263.2 kg
    const result = calculateDeadMileageSavings(100000, 50000);

    expect(result.emptyKmAvoided).toBe(50000);
    expect(result.fuelSavedLiters).toBe(13157.9);
    expect(result.fuelCostSavedINR).toBe(1210527);
    expect(result.wearTearSavedINR).toBe(225000);
    expect(result.tollSavedINR).toBe(110000);
    expect(result.totalMoneySavedINR).toBe(1545527);
    expect(result.co2SavedKg).toBe(35263.2);
  });

  it('TC-DM-BVA-06: verifies half-way rounding behavior on 1-decimal-place float quantization', () => {
    // 19 km / 3.8 = exactly 5.0 L
    const resExact = calculateDeadMileageSavings(19, 0);
    expect(resExact.fuelSavedLiters).toBe(5.0);

    // 19.1 km / 3.8 = 5.0263... -> 5.0 L
    const resFloor = calculateDeadMileageSavings(19.1, 0);
    expect(resFloor.fuelSavedLiters).toBe(5.0);

    // 19.3 km / 3.8 = 5.0789... -> 5.1 L
    const resCeil = calculateDeadMileageSavings(19.3, 0);
    expect(resCeil.fuelSavedLiters).toBe(5.1);
  });
});
