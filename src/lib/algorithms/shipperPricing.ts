/**
 * SafeFreight OS — Shipper Dynamic Pricing Engine
 * Reference: PRD v4.0.0 §7, §5.3 & CTO Phase 2 Directives
 */

export type TruckPricingType = 'shared' | 'private' | 'LTL' | 'FTL';

export interface ShipperQuoteResult {
  truckType: 'shared' | 'private';
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
  type: TruckPricingType | string,
  distanceKm: number,
  weightKg: number,
  volumeCbm: number = 12.0
): ShipperQuoteResult {
  const d = Math.max(1, isFinite(distanceKm) ? distanceKm : 1);
  const w = Math.max(50, isFinite(weightKg) ? weightKg : 50);
  const v = Math.max(0.5, isFinite(volumeCbm) ? volumeCbm : 12.0);

  const normalizedType: 'shared' | 'private' =
    type.toLowerCase() === 'shared' || type.toUpperCase() === 'LTL'
      ? 'shared'
      : 'private';

  let baseFareINR = 0;
  let distanceFareINR = 0;
  let weightFareINR = 0;
  let volumeFareINR = 0;

  if (normalizedType === 'shared') {
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
    truckType: normalizedType,
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
