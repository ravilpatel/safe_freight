/**
 * SafeFreight OS — 3-Way Route Optimizer Engine
 * Reference: PRD v4.0.0 §7, §5.2 & CTO Phase 2 Directives
 */

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
  // Baseline corridor distance fallback if <= 0 or missing or non-finite
  const baselineDistance =
    typeof distanceOverrideKm === 'number' && Number.isFinite(distanceOverrideKm) && distanceOverrideKm > 0
      ? distanceOverrideKm
      : 480;

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
