/**
 * SafeFreight OS — Authoritative Mathematical Contracts & Specification Engine
 * Source of Truth: PRD v4.0.0 §7, §4, §8, §10 & PROJECT.md
 */

// ==========================================
// 1. DEAD MILEAGE SAVINGS ENGINE CONTRACT
// PRD v4.0.0 §7, §5.1
// ==========================================

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

  const validTotal = Math.max(0, totalKm);
  const validLoaded = Math.max(0, loadedKm);
  const emptyKmAvoided = Math.max(0, validTotal - validLoaded);

  const fuelSavedLiters = Math.round((emptyKmAvoided / mileageKmPerLiter) * 10) / 10;
  const fuelCostSavedINR = Math.round(fuelSavedLiters * dieselRate);
  const wearTearSavedINR = Math.round(emptyKmAvoided * wearTearPerKm);
  const tollSavedINR = Math.round(emptyKmAvoided * tollAvoidanceRatePerKm);
  const totalMoneySavedINR = fuelCostSavedINR + wearTearSavedINR + tollSavedINR;
  const co2SavedKg = Math.round(fuelSavedLiters * co2EmissionFactor * 10) / 10;

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

// ==========================================
// 2. 3-WAY ROUTE OPTIMIZER ENGINE CONTRACT
// PRD v4.0.0 §7, §5.2
// ==========================================

export type RouteType = 'fastest' | 'toll_optimized' | 'eco_fuel';

export interface RouteOption {
  type: RouteType;
  name: string;
  description: string;
  distanceKm: number;
  durationMinutes: number;
  durationFormatted: string;
  speedKmh: number;
  fuelLiters: number;
  fuelCostINR: number;
  fastagTollINR: number;
  tollPlazaCount: number;
  stateTaxINR: number;
  totalCostINR: number;
}

export function calculate3WayRoutes(
  origin: string,
  destination: string,
  isInterstate: boolean = false,
  distanceOverrideKm?: number
): RouteOption[] {
  // Baseline corridor distance fallback if <= 0 or missing
  const baselineDistance =
    distanceOverrideKm && distanceOverrideKm > 0 ? distanceOverrideKm : 480;

  const stateTaxINR = isInterstate ? 450 : 0;
  const dieselRate = 92;

  // Route 1: Fastest Highway (Expressway / Golden Quadrilateral)
  const d1 = Math.round(baselineDistance);
  const speed1 = 62;
  const dur1 = Math.round((d1 / speed1) * 60);
  const fuelLiters1 = Math.round((d1 / 3.6) * 10) / 10;
  const fuelCost1 = Math.round(fuelLiters1 * dieselRate);
  const toll1 = Math.round(d1 * 1.85);
  const plazas1 = Math.max(3, Math.round(d1 / 70));
  const totalCost1 = fuelCost1 + toll1 + stateTaxINR;

  // Route 2: Toll-Optimized (+9% detour, saves ~65% toll)
  const d2 = Math.round(baselineDistance * 1.09);
  const speed2 = 48;
  const dur2 = Math.round((d2 / speed2) * 60);
  const fuelLiters2 = Math.round((d2 / 3.7) * 10) / 10;
  const fuelCost2 = Math.round(fuelLiters2 * dieselRate);
  const toll2 = Math.round(d2 * 0.65);
  const plazas2 = Math.max(1, Math.round(d2 / 140));
  const totalCost2 = fuelCost2 + toll2 + stateTaxINR;

  // Route 3: Eco-Fuel Corridor (+3% detour, optimal torque)
  const d3 = Math.round(baselineDistance * 1.03);
  const speed3 = 54;
  const dur3 = Math.round((d3 / speed3) * 60);
  const fuelLiters3 = Math.round((d3 / 4.3) * 10) / 10;
  const fuelCost3 = Math.round(fuelLiters3 * dieselRate);
  const toll3 = Math.round(d3 * 1.25);
  const plazas3 = Math.max(2, Math.round(d3 / 90));
  const totalCost3 = fuelCost3 + toll3 + stateTaxINR;

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return [
    {
      type: 'fastest',
      name: 'Expressway Direct (NH 48)',
      description: 'Golden Quadrilateral expressway corridor with high-speed bypasses',
      distanceKm: d1,
      durationMinutes: dur1,
      durationFormatted: formatHours(dur1),
      speedKmh: speed1,
      fuelLiters: fuelLiters1,
      fuelCostINR: fuelCost1,
      fastagTollINR: toll1,
      tollPlazaCount: plazas1,
      stateTaxINR,
      totalCostINR: totalCost1,
    },
    {
      type: 'toll_optimized',
      name: 'State Highway Bypass',
      description: 'Avoids prime FASTag plazas via commercial bypass corridors',
      distanceKm: d2,
      durationMinutes: dur2,
      durationFormatted: formatHours(dur2),
      speedKmh: speed2,
      fuelLiters: fuelLiters2,
      fuelCostINR: fuelCost2,
      fastagTollINR: toll2,
      tollPlazaCount: plazas2,
      stateTaxINR,
      totalCostINR: totalCost2,
    },
    {
      type: 'eco_fuel',
      name: 'Steady-RPM Eco Corridor',
      description: 'Steady 54 km/h cruising optimized for heavy diesel engine torque',
      distanceKm: d3,
      durationMinutes: dur3,
      durationFormatted: formatHours(dur3),
      speedKmh: speed3,
      fuelLiters: fuelLiters3,
      fuelCostINR: fuelCost3,
      fastagTollINR: toll3,
      tollPlazaCount: plazas3,
      stateTaxINR,
      totalCostINR: totalCost3,
    },
  ];
}

// ==========================================
// 3. SHIPPER DYNAMIC PRICING & ACCEPTANCE
// PRD v4.0.0 §7, §5.3
// ==========================================

export type TruckPricingType = 'shared' | 'private';

export interface ShipperQuoteResult {
  truckType: TruckPricingType;
  distanceKm: number;
  weightKg: number;
  volumeCbm: number;
  baseFareINR: number;
  distanceFareINR: number;
  weightFareINR: number;
  volumeFareINR: number;
  subTotalINR: number;
  gstINR: number;
  minPricingINR: number;
  recommendedPriceINR: number;
}

export function calculateShipperQuote(
  type: TruckPricingType,
  distanceKm: number,
  weightKg: number,
  volumeCbm: number = 12.0
): ShipperQuoteResult {
  const d = Math.max(1, distanceKm);
  const w = Math.max(50, weightKg);
  const v = Math.max(0.5, volumeCbm);

  let baseFareINR = 0;
  let distanceFareINR = 0;
  let weightFareINR = 0;
  let volumeFareINR = 0;

  if (type === 'shared') {
    // Shared Part-Load (LTL)
    baseFareINR = 2500;
    distanceFareINR = Math.round(d * 14);
    weightFareINR = Math.round((w / 1000) * 650 * (d / 250));
    volumeFareINR = Math.round(v * 180);
  } else {
    // Dedicated Private Truck (FTL)
    baseFareINR = 7500;
    distanceFareINR = Math.round(d * 42);
    const capacityTons = Math.max(10, Math.ceil(w / 1000) + 2);
    weightFareINR = Math.round(capacityTons * 400);
    volumeFareINR = Math.round(v * 220);
  }

  const subTotalINR = baseFareINR + distanceFareINR + weightFareINR + volumeFareINR;
  const gstINR = Math.round(subTotalINR * 0.05);
  // Round to nearest hundred
  const minPricingINR = Math.round((subTotalINR + gstINR) / 100) * 100;
  const recommendedPriceINR = Math.round(minPricingINR * 1.08);

  return {
    truckType: type,
    distanceKm: d,
    weightKg: w,
    volumeCbm: v,
    baseFareINR,
    distanceFareINR,
    weightFareINR,
    volumeFareINR,
    subTotalINR,
    gstINR,
    minPricingINR,
    recommendedPriceINR,
  };
}

export interface AcceptanceProbabilityResult {
  userBidAdditionINR: number;
  minPricingINR: number;
  offeredBidINR: number;
  bonusRatio: number;
  probabilityPercent: number;
  dispatchSpeedBand: 'Instant (< 10 mins)' | '15 – 30 mins' | '45 – 60 mins' | '2 – 4 hours';
}

export function calculateAcceptanceProbability(
  userBidAdditionINR: number,
  minPricingINR: number
): AcceptanceProbabilityResult {
  const base = Math.max(1, minPricingINR);
  const addition = userBidAdditionINR;
  const offeredBidINR = base + Math.max(0, addition);
  const bonusRatio = addition / base;

  let probabilityPercent: number;

  if (bonusRatio <= 0) {
    probabilityPercent = 48;
  } else if (bonusRatio < 0.08) {
    probabilityPercent = Math.round(48 + bonusRatio * 250);
  } else if (bonusRatio < 0.18) {
    probabilityPercent = Math.round(68 + (bonusRatio - 0.08) * 180);
  } else {
    probabilityPercent = Math.min(99, Math.round(86 + (bonusRatio - 0.18) * 100));
  }

  let dispatchSpeedBand: AcceptanceProbabilityResult['dispatchSpeedBand'];
  if (probabilityPercent >= 92) {
    dispatchSpeedBand = 'Instant (< 10 mins)';
  } else if (probabilityPercent >= 80) {
    dispatchSpeedBand = '15 – 30 mins';
  } else if (probabilityPercent >= 65) {
    dispatchSpeedBand = '45 – 60 mins';
  } else {
    dispatchSpeedBand = '2 – 4 hours';
  }

  return {
    userBidAdditionINR: addition,
    minPricingINR: base,
    offeredBidINR,
    bonusRatio,
    probabilityPercent,
    dispatchSpeedBand,
  };
}

// ==========================================
// 4. TRIP KHATA FINANCIAL SETTLEMENT ENGINE
// PRD v4.0.0 §7, §5.4
// ==========================================

export interface TripKhataAdvances {
  diesel?: number;
  fastag?: number;
  driverBhatta?: number;
  hamali?: number;
}

export interface TripKhataResult {
  grossFreightINR: number;
  dieselAdvanceINR: number;
  fastagAdvanceINR: number;
  driverBhattaINR: number;
  hamaliExpensesINR: number;
  totalDisbursedAdvancesINR: number;
  maintenanceReserveINR: number;
  balanceDueOnPODINR: number;
  totalOperatingCostsINR: number;
  netGrossProfitINR: number;
  profitMarginPercent: number;
}

export function calculateTripKhata(
  grossFreight: number,
  advances: TripKhataAdvances,
  maintenanceReserve: number = 0
): TripKhataResult {
  const gross = Math.max(0, grossFreight);
  const diesel = Math.max(0, advances.diesel ?? 0);
  const fastag = Math.max(0, advances.fastag ?? 0);
  const bhatta = Math.max(0, advances.driverBhatta ?? 0);
  const hamali = Math.max(0, advances.hamali ?? 0);
  const reserve = Math.max(0, maintenanceReserve);

  const totalDisbursedAdvancesINR = diesel + fastag + bhatta + hamali;
  const balanceDueOnPODINR = Math.max(0, gross - totalDisbursedAdvancesINR);
  const totalOperatingCostsINR = totalDisbursedAdvancesINR + reserve;
  const netGrossProfitINR = gross - totalOperatingCostsINR;

  const profitMarginPercent =
    gross > 0 ? Math.round((netGrossProfitINR / gross) * 100 * 10) / 10 : 0;

  return {
    grossFreightINR: gross,
    dieselAdvanceINR: diesel,
    fastagAdvanceINR: fastag,
    driverBhattaINR: bhatta,
    hamaliExpensesINR: hamali,
    totalDisbursedAdvancesINR,
    maintenanceReserveINR: reserve,
    balanceDueOnPODINR,
    totalOperatingCostsINR,
    netGrossProfitINR,
    profitMarginPercent,
  };
}

// ==========================================
// 5. AIS-140 CRASH CLASSIFICATION & G-FORCE
// PRD v4.0.0 §7, §5.5
// ==========================================

export type AIS140ImpactClassification =
  | 'ROAD_NOISE'
  | 'CABIN_DROP_ANOMALY'
  | 'COLLISION_CRASH';

export interface AIS140ClassificationResult {
  ax: number;
  ay: number;
  az: number;
  totalG: number;
  classification: AIS140ImpactClassification;
  isTriggerEmergency: boolean;
  actionRequired: string;
}

export function classifyAIS140GForce(
  ax: number,
  ay: number,
  az: number
): AIS140ClassificationResult {
  if (!isFinite(ax) || !isFinite(ay) || !isFinite(az)) {
    throw new Error('Invalid accelerometer reading: NaN or non-finite value detected');
  }

  const gTotal = Math.sqrt(ax * ax + ay * ay + az * az) / 9.81;
  const roundedTotalG = Math.round(gTotal * 100) / 100;

  const lateralG_X = Math.abs(ax) / 9.81;
  const lateralG_Y = Math.abs(ay) / 9.81;
  const verticalG_Z = Math.abs(az) / 9.81;

  if (roundedTotalG < 2.5) {
    return {
      ax,
      ay,
      az,
      totalG: roundedTotalG,
      classification: 'ROAD_NOISE',
      isTriggerEmergency: false,
      actionRequired: 'Damped vertical transient discarded. Zero alert triggered.',
    };
  }

  // Single-axis vertical transient check (e.g. cabin floor drop)
  if (verticalG_Z >= 3.0 && lateralG_X < 1.0 && lateralG_Y < 1.0) {
    return {
      ax,
      ay,
      az,
      totalG: roundedTotalG,
      classification: 'CABIN_DROP_ANOMALY',
      isTriggerEmergency: false,
      actionRequired: 'Filtered out as single-axis vertical transient. Zero alert triggered.',
    };
  }

  // High-velocity structural vehicular collision
  if (roundedTotalG >= 4.0 && (lateralG_X >= 1.0 || lateralG_Y >= 1.0)) {
    return {
      ax,
      ay,
      az,
      totalG: roundedTotalG,
      classification: 'COLLISION_CRASH',
      isTriggerEmergency: true,
      actionRequired:
        'Initiate Golden Hour T0 sequence: 30s vernacular countdown, siren, 96dp safe button, 112 ERSS dispatch.',
    };
  }

  // Intermediate transient above 2.5G but below collision threshold
  return {
    ax,
    ay,
    az,
    totalG: roundedTotalG,
    classification: 'ROAD_NOISE',
    isTriggerEmergency: false,
    actionRequired: 'Sub-collision transient logged without triggering distress alert.',
  };
}

// ==========================================
// 6. STATUTORY COMPLIANCE & e-BILTI HELPERS
// PRD v4.0.0 §5 Phase 7, §10
// ==========================================

export function generateStatutoryLRNumber(
  prefix: string = 'WIFL',
  financialYear: string = '2026-27',
  sequence: number = 482
): string {
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}/${financialYear}/LR-${padded}`;
}

export function validateEWayBillNumber(ewayBill: string): boolean {
  // Statutory Indian e-Way Bill is strictly a 12-digit numeric identifier
  return /^\d{12}$/.test(ewayBill);
}

export function validateGSTIN(gstin: string): boolean {
  // Indian GSTIN format: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 checksum
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}
