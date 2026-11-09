/**
 * SafeFreight OS — Dead Mileage Savings Calculation Engine
 * Reference: PRD v4.0.0 §7, §5.1 & CTO Phase 2 Directives
 */

export interface DeadMileageOptions {
  dieselRate?: number; // Default ₹92.00 / Liter
  mileageKmPerLiter?: number; // Default 3.8 km/L
  wearTearPerKm?: number; // Default ₹4.50 / km
  tollAvoidanceRatePerKm?: number; // Default ₹2.20 / km
  co2EmissionFactor?: number; // Default 2.68 kg CO2 / L
}

export interface DeadMileageSavingsResult {
  totalKm: number;
  loadedKm: number;
  emptyKmAvoided: number;
  fuelSavedLiters: number;
  fuelCostSavedINR: number;
  wearTearSavedINR: number;
  tollSavedINR: number;
  totalMoneySavedINR: number;
  co2SavedKg: number;
}

export function calculateDeadMileageSavings(
  totalKm: number,
  loadedKm: number,
  options?: DeadMileageOptions
): DeadMileageSavingsResult {
  const dieselRate = options?.dieselRate ?? 92.0;
  const mileageKmPerLiter = Math.max(0.5, options?.mileageKmPerLiter ?? 3.8);
  const wearTearPerKm = options?.wearTearPerKm ?? 4.5;
  const tollAvoidanceRatePerKm = options?.tollAvoidanceRatePerKm ?? 2.2;
  const co2EmissionFactor = options?.co2EmissionFactor ?? 2.68;

  const validTotal = Math.max(0, isFinite(totalKm) ? totalKm : 0);
  const validLoaded = Math.max(0, isFinite(loadedKm) ? loadedKm : 0);
  const emptyKmAvoided = Math.max(0, validTotal - validLoaded);

  const fuelSavedLiters =
    emptyKmAvoided > 0
      ? Math.round((emptyKmAvoided / mileageKmPerLiter) * 10) / 10
      : 0;

  const fuelCostSavedINR = Math.round(fuelSavedLiters * dieselRate);
  const wearTearSavedINR = Math.round(emptyKmAvoided * wearTearPerKm);
  const tollSavedINR = Math.round(emptyKmAvoided * tollAvoidanceRatePerKm);
  const totalMoneySavedINR = fuelCostSavedINR + wearTearSavedINR + tollSavedINR;
  const co2SavedKg =
    emptyKmAvoided > 0
      ? Math.round(fuelSavedLiters * co2EmissionFactor * 10) / 10
      : 0;

  return {
    totalKm: validTotal,
    loadedKm: validLoaded,
    emptyKmAvoided,
    fuelSavedLiters,
    fuelCostSavedINR,
    wearTearSavedINR,
    tollSavedINR,
    totalMoneySavedINR,
    co2SavedKg,
  };
}
