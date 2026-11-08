import { describe, it, expect } from 'vitest';
import { calculate3WayRoutes } from '../harness/contracts';

describe('Tier 1: Feature Coverage — 3-Way Route Optimizer Engine (FEAT-02)', () => {
  it('TC-RO-01: generates exactly 3 distinct corridor route options with required schema', () => {
    // Authoritative Derivation: PRD v4.0.0 §7 / §5.2
    const routes = calculate3WayRoutes('Mumbai', 'Surat', false, 285);

    expect(routes).toHaveLength(3);
    const types = routes.map((r) => r.type);
    expect(types).toEqual(['fastest', 'toll_optimized', 'eco_fuel']);

    for (const route of routes) {
      expect(route).toHaveProperty('name');
      expect(route).toHaveProperty('distanceKm');
      expect(route).toHaveProperty('durationMinutes');
      expect(route).toHaveProperty('durationFormatted');
      expect(route).toHaveProperty('fuelLiters');
      expect(route).toHaveProperty('fuelCostINR');
      expect(route).toHaveProperty('fastagTollINR');
      expect(route).toHaveProperty('tollPlazaCount');
      expect(route).toHaveProperty('totalCostINR');
    }
  });

  it('TC-RO-02: verifies fastest expressway speed (62 km/h) and duration on baseline distance', () => {
    // Baseline: 480 km
    // Fastest: d1 = 480 km, speed = 62 km/h -> duration = round((480 / 62) * 60) = 465 mins (7h 45m)
    const routes = calculate3WayRoutes('Mumbai', 'Vadodara', true, 480);
    const fastest = routes.find((r) => r.type === 'fastest')!;

    expect(fastest.distanceKm).toBe(480);
    expect(fastest.speedKmh).toBe(62);
    expect(fastest.durationMinutes).toBe(465);
    expect(fastest.durationFormatted).toBe('7h 45m');
  });

  it('TC-RO-03: verifies toll-optimized corridor (+9% distance, ₹0.65/km toll rate)', () => {
    // Baseline: 500 km
    // Toll-Optimized: d2 = round(500 * 1.09) = 545 km
    // speed = 48 km/h -> duration = round((545 / 48) * 60) = 681 mins (11h 21m)
    // toll = round(545 * 0.65) = ₹354
    // plazas = max(1, round(545 / 140)) = max(1, 4) = 4
    const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 500);
    const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;

    expect(tollOpt.distanceKm).toBe(545);
    expect(tollOpt.fastagTollINR).toBe(354);
    expect(tollOpt.tollPlazaCount).toBe(4);
    expect(tollOpt.durationMinutes).toBe(681);
  });

  it('TC-RO-04: verifies eco-fuel corridor (+3% distance, 4.3 km/L optimal torque efficiency)', () => {
    // Baseline: 500 km
    // Eco-Fuel: d3 = round(500 * 1.03) = 515 km
    // fuelLiters = round((515 / 4.3) * 10) / 10 = 119.8 L
    // fuelCost = round(119.8 * 92) = ₹11,022
    // toll = round(515 * 1.25) = ₹644
    const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', false, 500);
    const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

    expect(ecoFuel.distanceKm).toBe(515);
    expect(ecoFuel.fuelLiters).toBe(119.8);
    expect(ecoFuel.fuelCostINR).toBe(11022);
    expect(ecoFuel.fastagTollINR).toBe(644);
  });

  it('TC-RO-05: applies ₹450 state tax for interstate transit and ₹0 for intrastate transit', () => {
    // Authoritative Derivation: PRD v4.0.0 §5.2
    // Interstate (MH to GJ): stateTaxINR = 450
    // Intrastate (GJ to GJ): stateTaxINR = 0
    const interstateRoutes = calculate3WayRoutes('Mumbai', 'Surat', true, 285);
    const intrastateRoutes = calculate3WayRoutes('Surat', 'Ahmedabad', false, 260);

    for (const r of interstateRoutes) {
      expect(r.stateTaxINR).toBe(450);
      expect(r.totalCostINR).toBe(r.fuelCostINR + r.fastagTollINR + 450);
    }

    for (const r of intrastateRoutes) {
      expect(r.stateTaxINR).toBe(0);
      expect(r.totalCostINR).toBe(r.fuelCostINR + r.fastagTollINR);
    }
  });

  it('TC-RO-06: confirms toll-optimized route delivers significant toll savings vs fastest route', () => {
    const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
    const fastest = routes.find((r) => r.type === 'fastest')!;
    const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;

    expect(tollOpt.fastagTollINR).toBeLessThan(fastest.fastagTollINR * 0.45);
  });
});
