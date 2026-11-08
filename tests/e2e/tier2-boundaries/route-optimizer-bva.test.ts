import { describe, it, expect } from 'vitest';
import { calculate3WayRoutes } from '../harness/contracts';

describe('Tier 2: Boundary Value Analysis — 3-Way Route Optimizer Engine (FEAT-02)', () => {
  it('TC-RO-BVA-01: falls back to 480km corridor default when distance override is 0 or negative', () => {
    // Boundary: 0 km or negative distance passed
    const routesZero = calculate3WayRoutes('Mumbai', 'Vadodara', false, 0);
    const routesNeg = calculate3WayRoutes('Mumbai', 'Vadodara', false, -150);

    const fastestZero = routesZero.find((r) => r.type === 'fastest')!;
    const fastestNeg = routesNeg.find((r) => r.type === 'fastest')!;

    expect(fastestZero.distanceKm).toBe(480);
    expect(fastestNeg.distanceKm).toBe(480);
  });

  it('TC-RO-BVA-02: verifies minimum toll plaza count clamping on ultra-short distance', () => {
    // Boundary: distance = 10 km
    // Fastest plazas = max(3, round(10 / 70)) = max(3, 0) = 3
    // Toll-Optimized plazas = max(1, round(10 / 140)) = max(1, 0) = 1
    // Eco-Fuel plazas = max(2, round(10 / 90)) = max(2, 0) = 2
    const routes = calculate3WayRoutes('CityA', 'CityB', false, 10);

    const fastest = routes.find((r) => r.type === 'fastest')!;
    const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;
    const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

    expect(fastest.tollPlazaCount).toBe(3);
    expect(tollOpt.tollPlazaCount).toBe(1);
    expect(ecoFuel.tollPlazaCount).toBe(2);
  });

  it('TC-RO-BVA-03: verifies interstate tax binary boundary condition (₹450 vs ₹0)', () => {
    const intrastate = calculate3WayRoutes('Surat', 'Vadodara', false, 150);
    const interstate = calculate3WayRoutes('Mumbai', 'Vapi', true, 165);

    for (const r of intrastate) {
      expect(r.stateTaxINR).toBe(0);
    }
    for (const r of interstate) {
      expect(r.stateTaxINR).toBe(450);
    }
  });

  it('TC-RO-BVA-04: tests ultra-long trans-corridor journey (2,800 km Kanyakumari to Delhi)', () => {
    const routes = calculate3WayRoutes('Kanyakumari', 'Delhi', true, 2800);
    const fastest = routes.find((r) => r.type === 'fastest')!;

    expect(fastest.distanceKm).toBe(2800);
    // speed = 62 -> duration = round((2800 / 62) * 60) = 2710 mins (45h 10m)
    expect(fastest.durationMinutes).toBe(2710);
    expect(fastest.durationFormatted).toBe('45h 10m');
    expect(fastest.tollPlazaCount).toBe(40); // 2800 / 70 = 40
    expect(fastest.fastagTollINR).toBe(Math.round(2800 * 1.85)); // ₹5180
  });

  it('TC-RO-BVA-05: verifies duration formatting boundary at exactly 60 minutes and 59 minutes', () => {
    // 62 km at 62 km/h = exactly 60 mins -> '1h 0m'
    const routes60 = calculate3WayRoutes('PtA', 'PtB', false, 62);
    const fastest60 = routes60.find((r) => r.type === 'fastest')!;
    expect(fastest60.durationMinutes).toBe(60);
    expect(fastest60.durationFormatted).toBe('1h 0m');

    // 61 km at 62 km/h = round((61/62)*60) = 59 mins -> '0h 59m'
    const routes59 = calculate3WayRoutes('PtA', 'PtB', false, 61);
    const fastest59 = routes59.find((r) => r.type === 'fastest')!;
    expect(fastest59.durationMinutes).toBe(59);
    expect(fastest59.durationFormatted).toBe('0h 59m');
  });

  it('TC-RO-BVA-06: verifies detour distance rounding for toll-optimized (+9%) and eco-fuel (+3%)', () => {
    // Baseline = 100 km
    // Toll-Optimized = round(100 * 1.09) = 109 km
    // Eco-Fuel = round(100 * 1.03) = 103 km
    const routes = calculate3WayRoutes('A', 'B', false, 100);

    const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;
    const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

    expect(tollOpt.distanceKm).toBe(109);
    expect(ecoFuel.distanceKm).toBe(103);
  });
});
