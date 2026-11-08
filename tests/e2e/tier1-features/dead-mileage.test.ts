import { describe, it, expect } from 'vitest';
import { calculateDeadMileageSavings } from '../harness/contracts';

describe('Tier 1: Feature Coverage — Dead Mileage Savings Engine (FEAT-01)', () => {
  it('TC-DM-01: calculates standard empty km avoided and savings on 500km trip with 300km loaded', () => {
    // Authoritative Derivation: PRD v4.0.0 §7 / §5.1
    // EmptyKmAvoided = 500 - 300 = 200 km
    // FuelSaved = round(200 / 3.8 * 10) / 10 = 52.6 L
    // FuelCostSaved = round(52.6 * 92) = ₹4839
    // WearTearSaved = round(200 * 4.50) = ₹900
    // TollSaved = round(200 * 2.20) = ₹440
    // TotalMoneySaved = 4839 + 900 + 440 = ₹6179
    // CO2Saved = round(52.6 * 2.68 * 10) / 10 = 141.0 kg
    const result = calculateDeadMileageSavings(500, 300);

    expect(result.emptyKmAvoided).toBe(200);
    expect(result.fuelSavedLiters).toBe(52.6);
    expect(result.fuelCostSavedINR).toBe(4839);
    expect(result.wearTearSavedINR).toBe(900);
    expect(result.tollSavedINR).toBe(440);
    expect(result.totalMoneySavedINR).toBe(6179);
    expect(result.co2SavedKg).toBe(141.0);
  });

  it('TC-DM-02: returns zero savings when trip is 100% loaded (zero deadhead mileage)', () => {
    // Authoritative Derivation: PRD v4.0.0 §5.1
    // TotalKm = 450, LoadedKm = 450 -> EmptyKmAvoided = 0
    const result = calculateDeadMileageSavings(450, 450);

    expect(result.emptyKmAvoided).toBe(0);
    expect(result.fuelSavedLiters).toBe(0);
    expect(result.fuelCostSavedINR).toBe(0);
    expect(result.wearTearSavedINR).toBe(0);
    expect(result.tollSavedINR).toBe(0);
    expect(result.totalMoneySavedINR).toBe(0);
    expect(result.co2SavedKg).toBe(0);
  });

  it('TC-DM-03: calculates full empty deadhead return leg (e.g. 0 km loaded)', () => {
    // Authoritative Derivation: PRD v4.0.0 §5.1
    // TotalKm = 285 (Surat to Mumbai return), LoadedKm = 0
    // EmptyKmAvoided = 285 km
    // FuelSaved = round(285 / 3.8 * 10) / 10 = 75.0 L
    // FuelCostSaved = round(75.0 * 92) = ₹6900
    // WearTearSaved = round(285 * 4.50) = ₹1283 (1282.5 rounded)
    // TollSaved = round(285 * 2.20) = ₹627
    // TotalMoneySaved = 6900 + 1283 + 627 = ₹8810
    // CO2Saved = round(75.0 * 2.68 * 10) / 10 = 201.0 kg
    const result = calculateDeadMileageSavings(285, 0);

    expect(result.emptyKmAvoided).toBe(285);
    expect(result.fuelSavedLiters).toBe(75.0);
    expect(result.fuelCostSavedINR).toBe(6900);
    expect(result.wearTearSavedINR).toBe(1283);
    expect(result.tollSavedINR).toBe(627);
    expect(result.totalMoneySavedINR).toBe(8810);
    expect(result.co2SavedKg).toBe(201.0);
  });

  it('TC-DM-04: supports custom diesel rate and vehicle fuel efficiency overrides', () => {
    // Authoritative Derivation: Custom fuel rate ₹95/L, heavy vehicle mileage 3.2 km/L
    // EmptyKmAvoided = 160 km (Mumbai to Vapi backhaul)
    // FuelSaved = round(160 / 3.2 * 10) / 10 = 50.0 L
    // FuelCostSaved = round(50.0 * 95) = ₹4750
    // WearTearSaved = round(160 * 4.50) = ₹720
    // TollSaved = round(160 * 2.20) = ₹352
    // TotalMoneySaved = 4750 + 720 + 352 = ₹5822
    // CO2Saved = round(50.0 * 2.68 * 10) / 10 = 134.0 kg
    const result = calculateDeadMileageSavings(160, 0, {
      dieselRate: 95.0,
      mileageKmPerLiter: 3.2,
    });

    expect(result.emptyKmAvoided).toBe(160);
    expect(result.fuelSavedLiters).toBe(50.0);
    expect(result.fuelCostSavedINR).toBe(4750);
    expect(result.wearTearSavedINR).toBe(720);
    expect(result.tollSavedINR).toBe(352);
    expect(result.totalMoneySavedINR).toBe(5822);
    expect(result.co2SavedKg).toBe(134.0);
  });

  it('TC-DM-05: correctly computes CO2 emission abatement with exact statutory factor 2.68 kg/L', () => {
    // Authoritative Derivation: 380 km empty -> 380 / 3.8 = 100.0 L
    // CO2 = 100.0 * 2.68 = 268.0 kg
    const result = calculateDeadMileageSavings(600, 220);

    expect(result.emptyKmAvoided).toBe(380);
    expect(result.fuelSavedLiters).toBe(100.0);
    expect(result.co2SavedKg).toBe(268.0);
  });

  it('TC-DM-06: maintains monetary sum invariant: TotalMoneySaved = Fuel + WearTear + Toll', () => {
    const testCases = [
      { total: 525, loaded: 125 },
      { total: 340, loaded: 140 },
      { total: 800, loaded: 550 },
    ];

    for (const tc of testCases) {
      const res = calculateDeadMileageSavings(tc.total, tc.loaded);
      expect(res.totalMoneySavedINR).toBe(
        res.fuelCostSavedINR + res.wearTearSavedINR + res.tollSavedINR
      );
    }
  });
});
