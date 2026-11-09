/**
 * SafeFreight OS — Dynamic Freight Cost Estimator Engine
 * Reference: PRD v4.0.0 §7, Feature 35 & Phase 5 Directives
 * 
 * Unauthenticated, instant freight calculation along the Western Freight Corridor (NH 48).
 * Evaluates: origin, destination, distance, truck type, payload, diesel fuel index,
 * FASTag toll charges, backhaul deadhead reduction discount, and 5% GST (SAC 9965).
 */

export interface CorridorHub {
  id: string;
  name: string;
  city: string;
  state: 'MH' | 'GJ';
  chainageKm: number;
  lat: number;
  lng: number;
}

export const CORRIDOR_HUBS: CorridorHub[] = [
  { id: 'jnpt', name: 'Mumbai JNPT Port', city: 'Navi Mumbai', state: 'MH', chainageKm: 0, lat: 18.9500, lng: 72.9500 },
  { id: 'bhiwandi', name: 'Bhiwandi Logistics Hub', city: 'Bhiwandi', state: 'MH', chainageKm: 45, lat: 19.2967, lng: 73.0631 },
  { id: 'vapi', name: 'Vapi GIDC Industrial Park', city: 'Vapi', state: 'GJ', chainageKm: 165, lat: 20.3713, lng: 72.9106 },
  { id: 'surat', name: 'Surat Ring Road Textile Hub', city: 'Surat', state: 'GJ', chainageKm: 280, lat: 21.1702, lng: 72.8311 },
  { id: 'bharuch', name: 'Bharuch Chemical Corridor', city: 'Bharuch', state: 'GJ', chainageKm: 355, lat: 21.7051, lng: 72.9959 },
  { id: 'vadodara', name: 'Vadodara Makarpura GIDC', city: 'Vadodara', state: 'GJ', chainageKm: 430, lat: 22.2587, lng: 73.1926 },
  { id: 'ahmedabad', name: 'Ahmedabad Changodar Hub', city: 'Ahmedabad', state: 'GJ', chainageKm: 525, lat: 22.9234, lng: 72.4382 },
];

export interface TruckSpecification {
  type: string;
  name: string;
  capacityKg: number;
  capacityTons: number;
  volumeCbm: number;
  baseFareINR: number;
  ratePerKmINR: number;
  description: string;
}

export const TRUCK_SPECIFICATIONS: Record<string, TruckSpecification> = {
  '14ft': {
    type: '14ft',
    name: '14ft Eicher Open/Closed',
    capacityKg: 4000,
    capacityTons: 4,
    volumeCbm: 14,
    baseFareINR: 3500,
    ratePerKmINR: 18,
    description: 'Ideal for local parcel, light industrial, and retail replenishment up to 4 MT.',
  },
  '19ft': {
    type: '19ft',
    name: '19ft Container Truck',
    capacityKg: 7000,
    capacityTons: 7,
    volumeCbm: 24,
    baseFareINR: 5000,
    ratePerKmINR: 24,
    description: 'Engineered for FMCG, white goods, and textiles up to 7 MT.',
  },
  '22ft': {
    type: '22ft',
    name: '22ft Heavy Carrier',
    capacityKg: 10000,
    capacityTons: 10,
    volumeCbm: 32,
    baseFareINR: 6500,
    ratePerKmINR: 30,
    description: 'Built for industrial machinery, auto components, and mid-range loads up to 10 MT.',
  },
  '32ft SXL': {
    type: '32ft SXL',
    name: '32ft Single-Axle (SXL)',
    capacityKg: 15000,
    capacityTons: 15,
    volumeCbm: 54,
    baseFareINR: 8000,
    ratePerKmINR: 38,
    description: 'High-volume containerized freight, pharmaceuticals, and e-commerce up to 15 MT.',
  },
  '32ft MXL': {
    type: '32ft MXL',
    name: '32ft Multi-Axle (MXL)',
    capacityKg: 25000,
    capacityTons: 25,
    volumeCbm: 68,
    baseFareINR: 10000,
    ratePerKmINR: 45,
    description: 'Maximum legal axle weight carrier for steel coils, chemicals, and bulk cargo up to 25 MT.',
  },
  'shared': {
    type: 'shared',
    name: 'Shared Part-Load (LTL)',
    capacityKg: 8000,
    capacityTons: 8,
    volumeCbm: 20,
    baseFareINR: 2500,
    ratePerKmINR: 14,
    description: 'Consolidated partial load with algorithmic backhaul matching and deadhead reduction.',
  },
  'private': {
    type: 'private',
    name: 'Dedicated Private Truck (FTL)',
    capacityKg: 25000,
    capacityTons: 25,
    volumeCbm: 60,
    baseFareINR: 7500,
    ratePerKmINR: 42,
    description: 'Exclusive vehicle assignment for direct express point-to-point corridor transport.',
  },
};

export const CARGO_CATEGORIES = [
  { id: 'fmcg', name: 'FMCG & Packaged Goods', densityFactor: 1.0, requiresReefer: false },
  { id: 'textiles', name: 'Textiles & Garments', densityFactor: 0.9, requiresReefer: false },
  { id: 'auto_parts', name: 'Automotive Components', densityFactor: 1.2, requiresReefer: false },
  { id: 'steel_machinery', name: 'Industrial Machinery & Steel', densityFactor: 1.5, requiresReefer: false },
  { id: 'chemicals', name: 'Industrial Chemicals (Non-Hazmat)', densityFactor: 1.1, requiresReefer: false },
  { id: 'perishables', name: 'Perishables & Agricultural Produce', densityFactor: 1.1, requiresReefer: true },
  { id: 'cement', name: 'Cement & Building Materials', densityFactor: 1.6, requiresReefer: false },
];

export interface FreightQuoteParams {
  origin?: string;
  destination?: string;
  distanceKm?: number;
  truckType?: string;
  weightKg?: number;
  payloadKg?: number;
  volumeCbm?: number;
  volumeCft?: number;
  fuelPricePerLitre?: number;
  hasBackhaulDiscount?: boolean;
  applyDeadheadReduction?: boolean;
}

export interface DetailedFreightQuote {
  origin: string;
  destination: string;
  distanceKm: number;
  truckType: string;
  truckName: string;
  weightKg: number;
  volumeCbm: number;
  baseFreightINR: number;
  dieselSurchargeINR: number;
  fastagTollINR: number;
  backhaulDiscountINR: number;
  subTotalINR: number;
  gstINR: number; // 5% GTA SAC 9965
  totalQuoteINR: number;
  recommendedPriceINR: number;
  ratePerKmINR: number;
  ratePerTonKmINR: number;
  estimatedTransitHours: number;
  deadMileageReductionPct: number;
  sacCode: string;
}

/**
 * Helper to calculate corridor road distance between two known hubs along NH 48.
 */
export function calculateCorridorDistance(origin: string, destination: string): number {
  const normOrigin = origin.toLowerCase().trim();
  const normDest = destination.toLowerCase().trim();

  const oHub = CORRIDOR_HUBS.find(
    (h) => normOrigin.includes(h.name.toLowerCase()) || normOrigin.includes(h.city.toLowerCase()) || normOrigin.includes(h.id)
  );
  const dHub = CORRIDOR_HUBS.find(
    (h) => normDest.includes(h.name.toLowerCase()) || normDest.includes(h.city.toLowerCase()) || normDest.includes(h.id)
  );

  if (oHub && dHub) {
    const dist = Math.abs(dHub.chainageKm - oHub.chainageKm);
    return dist > 0 ? dist : 45; // Minimum corridor leg
  }

  // Fallback defaults along NH 48
  return 525; // Mumbai JNPT to Ahmedabad Changodar
}

/**
 * Compute detailed, public, unauthenticated freight quote.
 * Pure algorithmic execution with ZERO database side-effects.
 */
export function calculateDynamicFreightQuote(params: FreightQuoteParams): DetailedFreightQuote {
  const origin = params.origin?.trim() || 'Mumbai JNPT Port';
  const destination = params.destination?.trim() || 'Ahmedabad Changodar Hub';

  let distanceKm = params.distanceKm;
  if (typeof distanceKm !== 'number' || !isFinite(distanceKm) || distanceKm <= 0) {
    distanceKm = calculateCorridorDistance(origin, destination);
  }
  // Boundary clamps
  distanceKm = Math.min(2500, Math.max(10, Math.round(distanceKm)));

  const effectiveWeightKg = Math.max(
    50,
    typeof params.weightKg === 'number' && isFinite(params.weightKg)
      ? params.weightKg
      : typeof params.payloadKg === 'number' && isFinite(params.payloadKg)
        ? params.payloadKg
        : 5000
  );

  const effectiveVolumeCbm = Math.max(
    0.5,
    typeof params.volumeCbm === 'number' && isFinite(params.volumeCbm)
      ? params.volumeCbm
      : typeof params.volumeCft === 'number' && isFinite(params.volumeCft)
        ? Math.round((params.volumeCft / 35.315) * 10) / 10
        : 12.0
  );

  // Normalize truck type
  const rawType = (params.truckType || 'shared').toLowerCase();
  let selectedSpecKey = 'shared';

  if (rawType.includes('14ft') || rawType.includes('14')) {
    selectedSpecKey = '14ft';
  } else if (rawType.includes('19ft') || rawType.includes('19')) {
    selectedSpecKey = '19ft';
  } else if (rawType.includes('22ft') || rawType.includes('22')) {
    selectedSpecKey = '22ft';
  } else if (rawType.includes('mxl') || rawType.includes('multi')) {
    selectedSpecKey = '32ft MXL';
  } else if (rawType.includes('sxl') || rawType.includes('single')) {
    selectedSpecKey = '32ft SXL';
  } else if (rawType.includes('private') || rawType.includes('ftl')) {
    selectedSpecKey = 'private';
  } else {
    selectedSpecKey = 'shared';
  }

  const spec = TRUCK_SPECIFICATIONS[selectedSpecKey] || TRUCK_SPECIFICATIONS['shared'];

  // 1. Base Freight & Distance Calculation
  let baseFreightINR = 0;
  if (selectedSpecKey === 'shared') {
    const distFare = Math.round(distanceKm * spec.ratePerKmINR);
    const weightFare = Math.round((effectiveWeightKg / 1000) * 650 * (distanceKm / 250));
    const volumeFare = Math.round(effectiveVolumeCbm * 180);
    baseFreightINR = spec.baseFareINR + distFare + weightFare + volumeFare;
  } else if (selectedSpecKey === 'private') {
    const distFare = Math.round(distanceKm * spec.ratePerKmINR);
    const capacityTons = Math.max(10, Math.ceil(effectiveWeightKg / 1000) + 2);
    const weightFare = Math.round(capacityTons * 400);
    const volumeFare = Math.round(effectiveVolumeCbm * 220);
    baseFreightINR = spec.baseFareINR + distFare + weightFare + volumeFare;
  } else {
    // Specific container/axle truck models
    const distFare = Math.round(distanceKm * spec.ratePerKmINR);
    const weightRatio = Math.min(1.5, effectiveWeightKg / spec.capacityKg);
    const weightSurcharge = Math.round(distFare * Math.max(0, weightRatio - 0.7) * 0.4);
    baseFreightINR = spec.baseFareINR + distFare + weightSurcharge;
  }

  // 2. Diesel Surcharge (Benchmark Diesel at ₹92.50/L with 3.8 km/L efficiency)
  const fuelPrice = Math.max(80, params.fuelPricePerLitre || 92.5);
  const fuelLitres = distanceKm / 3.8;
  const dieselSurchargeINR = Math.round(fuelLitres * fuelPrice * 0.12);

  // 3. FASTag Toll Charges (Corridor standard ₹2.20/km)
  const fastagTollINR = Math.round(distanceKm * 2.2);

  // 4. Backhaul Deadhead Reduction Discount
  // SafeFreight backhaul matching reduces deadhead by ~18-34%, passing ~10-14% savings to shipper
  const applyDiscount = params.hasBackhaulDiscount !== false && params.applyDeadheadReduction !== false;
  const deadMileageReductionPct = applyDiscount ? 12 : 0;
  const backhaulDiscountINR = applyDiscount ? Math.round(baseFreightINR * 0.12) : 0;

  // 5. Subtotal
  const subTotalINR = Math.max(1000, baseFreightINR + dieselSurchargeINR + fastagTollINR - backhaulDiscountINR);

  // 6. GST 5% under Goods Transport Agency SAC Code 9965
  const gstINR = Math.round(subTotalINR * 0.05);

  // 7. Statutory Rounding (to nearest hundred)
  const totalQuoteINR = Math.round((subTotalINR + gstINR) / 100) * 100;
  const recommendedPriceINR = Math.round(totalQuoteINR * 1.08);

  // Unit Metrics
  const ratePerKmINR = Math.round((totalQuoteINR / distanceKm) * 10) / 10;
  const tonKm = Math.max(1, (effectiveWeightKg / 1000) * distanceKm);
  const ratePerTonKmINR = Math.round((totalQuoteINR / tonKm) * 100) / 100;

  // Estimated Transit Time: Average highway transit speed ~48 km/h + 2 hours loading/toll
  const estimatedTransitHours = Math.round(((distanceKm / 48) + 2) * 10) / 10;

  return {
    origin,
    destination,
    distanceKm,
    truckType: spec.type,
    truckName: spec.name,
    weightKg: effectiveWeightKg,
    volumeCbm: effectiveVolumeCbm,
    baseFreightINR,
    dieselSurchargeINR,
    fastagTollINR,
    backhaulDiscountINR,
    subTotalINR,
    gstINR,
    totalQuoteINR,
    recommendedPriceINR,
    ratePerKmINR,
    ratePerTonKmINR,
    estimatedTransitHours,
    deadMileageReductionPct,
    sacCode: '9965',
  };
}
