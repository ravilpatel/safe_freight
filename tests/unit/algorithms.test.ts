import { describe, it, expect } from 'vitest';
import {
  calculateDeadMileageSavings,
  calculate3WayRoutes,
  calculateShipperQuote,
  calculateAcceptanceProbability,
  calculateBidProbability,
  calculateTripKhata,
  classifyAIS140GForce,
  generateStatutoryLRNumber,
  validateEWayBillNumber,
  validateGSTIN,
} from '@/lib/algorithms';

describe('Unit Test: Algorithmic Engines (M2)', () => {
  // ==========================================
  // 1. DEAD MILEAGE SAVINGS ENGINE
  // ==========================================
  describe('deadMileage.ts — calculateDeadMileageSavings', () => {
    it('calculates standard empty km avoided and savings on 500km trip with 300km loaded', () => {
      const res = calculateDeadMileageSavings(500, 300);
      expect(res.emptyKmAvoided).toBe(200);
      expect(res.fuelSavedLiters).toBe(52.6);
      expect(res.fuelCostSavedINR).toBe(4839);
      expect(res.wearTearSavedINR).toBe(900);
      expect(res.tollSavedINR).toBe(440);
      expect(res.totalMoneySavedINR).toBe(6179);
      expect(res.co2SavedKg).toBe(141.0);
    });

    it('returns 0 savings when fully loaded (totalKm === loadedKm)', () => {
      const res = calculateDeadMileageSavings(400, 400);
      expect(res.emptyKmAvoided).toBe(0);
      expect(res.fuelSavedLiters).toBe(0);
      expect(res.fuelCostSavedINR).toBe(0);
      expect(res.wearTearSavedINR).toBe(0);
      expect(res.tollSavedINR).toBe(0);
      expect(res.totalMoneySavedINR).toBe(0);
      expect(res.co2SavedKg).toBe(0);
    });

    it('clamps to 0 when loadedKm > totalKm', () => {
      const res = calculateDeadMileageSavings(300, 450);
      expect(res.emptyKmAvoided).toBe(0);
      expect(res.totalMoneySavedINR).toBe(0);
    });

    it('handles 100% deadhead return leg (loadedKm === 0)', () => {
      const res = calculateDeadMileageSavings(285, 0);
      expect(res.emptyKmAvoided).toBe(285);
      expect(res.fuelSavedLiters).toBe(75.0);
      expect(res.fuelCostSavedINR).toBe(6900);
      expect(res.wearTearSavedINR).toBe(1283);
      expect(res.tollSavedINR).toBe(627);
      expect(res.totalMoneySavedINR).toBe(8810);
      expect(res.co2SavedKg).toBe(201.0);
    });

    it('handles negative or NaN inputs gracefully by clamping to 0', () => {
      const resNeg = calculateDeadMileageSavings(-100, -50);
      expect(resNeg.totalKm).toBe(0);
      expect(resNeg.loadedKm).toBe(0);
      expect(resNeg.emptyKmAvoided).toBe(0);
      expect(resNeg.totalMoneySavedINR).toBe(0);

      const resNaN = calculateDeadMileageSavings(NaN, NaN);
      expect(resNaN.totalKm).toBe(0);
      expect(resNaN.loadedKm).toBe(0);
      expect(resNaN.emptyKmAvoided).toBe(0);
    });

    it('supports custom dieselRate, mileage, wearTear, toll, and co2Factor overrides', () => {
      const res = calculateDeadMileageSavings(160, 0, {
        dieselRate: 95.0,
        mileageKmPerLiter: 3.2,
        wearTearPerKm: 5.0,
        tollAvoidanceRatePerKm: 2.5,
        co2EmissionFactor: 2.7,
      });
      // 160 / 3.2 = 50.0 L
      expect(res.fuelSavedLiters).toBe(50.0);
      expect(res.fuelCostSavedINR).toBe(4750); // 50 * 95
      expect(res.wearTearSavedINR).toBe(800); // 160 * 5
      expect(res.tollSavedINR).toBe(400); // 160 * 2.5
      expect(res.totalMoneySavedINR).toBe(5950);
      expect(res.co2SavedKg).toBe(135.0); // 50 * 2.7
    });

    it('maintains mathematical sum invariant: TotalMoney = FuelCost + WearTear + Toll', () => {
      const samples = [
        [320, 100],
        [650, 250],
        [890, 800],
        [120, 0],
      ];
      for (const [tot, lod] of samples) {
        const r = calculateDeadMileageSavings(tot, lod);
        expect(r.totalMoneySavedINR).toBe(
          r.fuelCostSavedINR + r.wearTearSavedINR + r.tollSavedINR
        );
      }
    });
  });

  // ==========================================
  // 2. 3-WAY ROUTE OPTIMIZER ENGINE
  // ==========================================
  describe('routeOptimizer.ts — calculate3WayRoutes', () => {
    it('returns 3 distinct routes: fastest, toll_optimized, eco_fuel', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Surat', false, 285);
      expect(routes).toHaveLength(3);
      expect(routes.map((r) => r.type)).toEqual(['fastest', 'toll_optimized', 'eco_fuel']);
    });

    it('adds flat ₹450 state entry tax on interstate journeys and ₹0 on intrastate', () => {
      const interstate = calculate3WayRoutes('Mumbai', 'Surat', true, 285);
      expect(interstate[0].stateTaxINR).toBe(450);
      expect(interstate[1].stateTaxINR).toBe(450);
      expect(interstate[2].stateTaxINR).toBe(450);

      const intrastate = calculate3WayRoutes('Surat', 'Ahmedabad', false, 260);
      expect(intrastate[0].stateTaxINR).toBe(0);
      expect(intrastate[1].stateTaxINR).toBe(0);
      expect(intrastate[2].stateTaxINR).toBe(0);
    });

    it('calculates proper speed, toll, and distance detours across routes', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', false, 500);
      const [fastest, tollOpt, eco] = routes;

      // Fastest
      expect(fastest.distanceKm).toBe(500);
      expect(fastest.speedKmh).toBe(62);
      expect(fastest.fastagTollINR).toBe(Math.round(500 * 1.85));

      // Toll-Optimized (+9% distance, 48 km/h, 0.65 toll)
      expect(tollOpt.distanceKm).toBe(545);
      expect(tollOpt.speedKmh).toBe(48);
      expect(tollOpt.fastagTollINR).toBe(Math.round(545 * 0.65));
      expect(tollOpt.fastagTollINR).toBeLessThan(fastest.fastagTollINR);

      // Eco-Fuel (+3% distance, 54 km/h, 4.3 km/L)
      expect(eco.distanceKm).toBe(515);
      expect(eco.speedKmh).toBe(54);
      expect(eco.fuelLiters).toBeLessThan(fastest.fuelLiters);
    });

    it('formats duration string in hours and minutes', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Surat', false, 285);
      for (const r of routes) {
        expect(r.durationFormatted).toMatch(/^\d+h\s+\d+m$/);
      }
    });

    it('uses fallback baseline distance when distanceOverrideKm is omitted or <= 0', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad');
      expect(routes[0].distanceKm).toBe(480);

      const routesZero = calculate3WayRoutes('A', 'B', false, 0);
      expect(routesZero[0].distanceKm).toBe(480);
    });

    it('maintains totalCostINR invariant: Total = FuelCost + Toll + StateTax', () => {
      const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
      for (const r of routes) {
        expect(r.totalCostINR).toBe(r.fuelCostINR + r.fastagTollINR + r.stateTaxINR);
      }
    });
  });

  // ==========================================
  // 3. SHIPPER PRICING ENGINE
  // ==========================================
  describe('shipperPricing.ts — calculateShipperQuote', () => {
    it('calculates Shared LTL quote with standard base, distance, weight, and volume components', () => {
      const quote = calculateShipperQuote('shared', 250, 2000, 10);
      expect(quote.truckType).toBe('shared');
      expect(quote.baseFareINR).toBe(2500);
      expect(quote.distanceFareINR).toBe(250 * 14);
      expect(quote.weightFareINR).toBe(1300); // (2000/1000) * 650 * (250/250)
      expect(quote.volumeFareINR).toBe(1800); // 10 * 180
      expect(quote.subTotalINR).toBe(2500 + 3500 + 1300 + 1800); // 9100
      expect(quote.gstINR).toBe(455); // 5% of 9100
      expect(quote.minPricingINR).toBe(9600); // round(9555 / 100) * 100
      expect(quote.recommendedPriceINR).toBe(Math.round(9600 * 1.08));
    });

    it('calculates Dedicated FTL quote with capacity tonnage and higher base fare', () => {
      const quote = calculateShipperQuote('private', 500, 12000, 25);
      expect(quote.truckType).toBe('private');
      expect(quote.baseFareINR).toBe(7500);
      expect(quote.distanceFareINR).toBe(500 * 42); // 21000
      expect(quote.weightFareINR).toBe(14 * 400); // ceil(12)+2 = 14 tons * 400 = 5600
      expect(quote.volumeFareINR).toBe(25 * 220); // 5500
      expect(quote.subTotalINR).toBe(7500 + 21000 + 5600 + 5500); // 39600
      expect(quote.gstINR).toBe(1980);
      expect(quote.minPricingINR).toBe(41600);
    });

    it('accepts LTL / FTL string alias identifiers', () => {
      const ltl = calculateShipperQuote('LTL', 200, 1000, 5);
      expect(ltl.truckType).toBe('shared');

      const ftl = calculateShipperQuote('FTL', 200, 1000, 5);
      expect(ftl.truckType).toBe('private');
    });

    it('clamps minimum inputs: distance >= 1, weight >= 50, volume >= 0.5', () => {
      const quote = calculateShipperQuote('shared', 0, 10, 0);
      expect(quote.distanceKm).toBe(1);
      expect(quote.weightKg).toBe(50);
      expect(quote.volumeCbm).toBe(0.5);
    });

    it('always rounds minPricingINR to the nearest 100', () => {
      const testCases = [
        [123, 456, 3.2],
        [450, 3200, 14],
        [890, 15000, 28],
      ];
      for (const [d, w, v] of testCases) {
        const qShared = calculateShipperQuote('shared', d, w, v);
        expect(qShared.minPricingINR % 100).toBe(0);
        const qPrivate = calculateShipperQuote('private', d, w, v);
        expect(qPrivate.minPricingINR % 100).toBe(0);
      }
    });
  });

  // ==========================================
  // 4. ACCEPTANCE PROBABILITY ENGINE
  // ==========================================
  describe('acceptanceProbability.ts — calculateAcceptanceProbability', () => {
    const minPricing = 10000;

    it('returns flat 48% at zero or negative bid bonus', () => {
      const zero = calculateAcceptanceProbability(0, minPricing);
      expect(zero.probabilityPercent).toBe(48);
      expect(zero.dispatchSpeedBand).toBe('2 – 4 hours');

      const neg = calculateAcceptanceProbability(-1000, minPricing);
      expect(neg.probabilityPercent).toBe(48);
      expect(neg.dispatchSpeedBand).toBe('2 – 4 hours');
    });

    it('scales through tier 1 (0 to 8% bonus)', () => {
      // 5% bonus: 48 + 0.05 * 250 = 48 + 12.5 = 61% (or 60.5 -> 61)
      const res = calculateAcceptanceProbability(500, minPricing);
      expect(res.probabilityPercent).toBe(61);
      expect(res.dispatchSpeedBand).toBe('2 – 4 hours');
    });

    it('hits exactly 68% at 8% bonus breakpoint', () => {
      const exact8 = calculateAcceptanceProbability(800, minPricing);
      expect(exact8.probabilityPercent).toBe(68);
      expect(exact8.dispatchSpeedBand).toBe('45 – 60 mins');
    });

    it('scales through tier 2 (8% to 18% bonus)', () => {
      // 12% bonus: 68 + (0.12 - 0.08) * 180 = 68 + 7.2 = 75%
      const res = calculateAcceptanceProbability(1200, minPricing);
      expect(res.probabilityPercent).toBe(75);
      expect(res.dispatchSpeedBand).toBe('45 – 60 mins');
    });

    it('hits exactly 86% at 18% bonus breakpoint', () => {
      const exact18 = calculateAcceptanceProbability(1800, minPricing);
      expect(exact18.probabilityPercent).toBe(86);
      expect(exact18.dispatchSpeedBand).toBe('15 – 30 mins');
    });

    it('scales to instant dispatch band (>= 92%) past 24% bonus', () => {
      const res = calculateAcceptanceProbability(2500, minPricing);
      expect(res.probabilityPercent).toBe(93);
      expect(res.dispatchSpeedBand).toBe('Instant (< 10 mins)');
    });

    it('strictly caps at 99% for massive and astronomical bids', () => {
      const massive = calculateAcceptanceProbability(20000, minPricing);
      expect(massive.probabilityPercent).toBe(99);

      const astronomical = calculateAcceptanceProbability(1000000, minPricing);
      expect(astronomical.probabilityPercent).toBe(99);
    });

    it('supports calculateBidProbability with total bid input', () => {
      const res = calculateBidProbability(11800, 10000);
      expect(res.probabilityPercent).toBe(86);
      expect(res.userBidAdditionINR).toBe(1800);
    });
  });

  // ==========================================
  // 5. TRIP KHATA FINANCIAL SETTLEMENT ENGINE
  // ==========================================
  describe('tripKhata.ts — calculateTripKhata', () => {
    it('calculates full financial breakdown on standard trip with advances and reserve', () => {
      const result = calculateTripKhata(
        45000,
        {
          diesel: 16000,
          fastag: 3500,
          driverBhatta: 2500,
          hamali: 1000,
        },
        2250 // 5% reserve
      );

      expect(result.grossFreightINR).toBe(45000);
      expect(result.dieselAdvanceINR).toBe(16000);
      expect(result.fastagAdvanceINR).toBe(3500);
      expect(result.driverBhattaINR).toBe(2500);
      expect(result.hamaliExpensesINR).toBe(1000);
      expect(result.totalDisbursedAdvancesINR).toBe(23000);
      expect(result.maintenanceReserveINR).toBe(2250);
      expect(result.balanceDueOnPODINR).toBe(22000); // 45000 - 23000
      expect(result.totalOperatingCostsINR).toBe(25250); // 23000 + 2250
      expect(result.netGrossProfitINR).toBe(19750); // 45000 - 25250
      expect(result.profitMarginPercent).toBe(43.9);
    });

    it('handles zero advances scenario gracefully', () => {
      const res = calculateTripKhata(30000, {}, 1500);
      expect(res.totalDisbursedAdvancesINR).toBe(0);
      expect(res.balanceDueOnPODINR).toBe(30000);
      expect(res.netGrossProfitINR).toBe(28500);
    });

    it('clamps balanceDueOnPODINR to 0 when advances exceed gross freight', () => {
      const res = calculateTripKhata(20000, { diesel: 25000 });
      expect(res.totalDisbursedAdvancesINR).toBe(25000);
      expect(res.balanceDueOnPODINR).toBe(0);
      expect(res.netGrossProfitINR).toBe(-5000);
    });

    it('handles zero gross freight without division by zero', () => {
      const res = calculateTripKhata(0, { diesel: 2000 }, 500);
      expect(res.profitMarginPercent).toBe(0);
      expect(res.netGrossProfitINR).toBe(-2500);
    });

    it('maintains ledger invariants across diverse freight values', () => {
      const cases = [
        { gross: 12000, adv: { diesel: 4000, fastag: 800 }, res: 600 },
        { gross: 85000, adv: { diesel: 32000, fastag: 6000, driverBhatta: 4000, hamali: 2000 }, res: 4250 },
        { gross: 5000, adv: { driverBhatta: 1000 }, res: 0 },
      ];

      for (const c of cases) {
        const r = calculateTripKhata(c.gross, c.adv, c.res);
        expect(r.totalDisbursedAdvancesINR).toBe(
          (c.adv.diesel ?? 0) + (c.adv.fastag ?? 0) + (c.adv.driverBhatta ?? 0) + (c.adv.hamali ?? 0)
        );
        expect(r.totalOperatingCostsINR).toBe(r.totalDisbursedAdvancesINR + c.res);
        expect(r.netGrossProfitINR).toBe(r.grossFreightINR - r.totalOperatingCostsINR);
        expect(r.balanceDueOnPODINR).toBe(Math.max(0, r.grossFreightINR - r.totalDisbursedAdvancesINR));
      }
    });
  });

  // ==========================================
  // 6. AIS-140 CRASH CLASSIFICATION ENGINE
  // ==========================================
  describe('ais140Crash.ts — classifyAIS140GForce', () => {
    it('discards road vibration and potholes below 2.5G noise floor', () => {
      // 1.5G total
      const res = classifyAIS140GForce(5.0, 5.0, 12.0);
      expect(res.classification).toBe('ROAD_NOISE');
      expect(res.isTriggerEmergency).toBe(false);
    });

    it('filters out cabin floor drop anomaly (high az alone, negligible lateral force)', () => {
      // az = 35.0 m/s^2 (~3.57G), ax = 2.0 m/s^2 (0.2G), ay = 1.0 m/s^2 (0.1G)
      const res = classifyAIS140GForce(2.0, 1.0, 35.0);
      expect(res.classification).toBe('CABIN_DROP_ANOMALY');
      expect(res.isTriggerEmergency).toBe(false);
      expect(res.totalG).toBeGreaterThanOrEqual(3.0);
    });

    it('triggers COLLISION_CRASH when TotalG >= 4.0G and lateral forces are present', () => {
      // High frontal impact: ax = 45 m/s^2 (4.59G), ay = 15 m/s^2 (1.53G), az = 9.81 m/s^2 (1G)
      const res = classifyAIS140GForce(45.0, 15.0, 9.81);
      expect(res.classification).toBe('COLLISION_CRASH');
      expect(res.isTriggerEmergency).toBe(true);
      expect(res.actionRequired).toContain('Golden Hour T0');
    });

    it('triggers COLLISION_CRASH on severe lateral T-bone impact', () => {
      // Lateral impact: ax = 12 m/s^2 (1.22G), ay = 40 m/s^2 (4.08G), az = 9.81 m/s^2 (1G)
      const res = classifyAIS140GForce(12.0, 40.0, 9.81);
      expect(res.classification).toBe('COLLISION_CRASH');
      expect(res.isTriggerEmergency).toBe(true);
    });

    it('logs sub-collision intermediate transient (>2.5G and <4.0G) without alert', () => {
      // ax = 15 m/s^2 (1.53G), ay = 15 m/s^2 (1.53G), az = 10 m/s^2 (1.02G) -> ~2.39G
      // Let's use 20, 20, 10 -> sqrt(400+400+100) = sqrt(900) = 30 / 9.81 = 3.06G
      const res = classifyAIS140GForce(20.0, 20.0, 10.0);
      expect(res.totalG).toBe(3.06);
      expect(res.classification).toBe('ROAD_NOISE');
      expect(res.isTriggerEmergency).toBe(false);
    });

    it('throws error on NaN or non-finite inputs', () => {
      expect(() => classifyAIS140GForce(NaN, 0, 0)).toThrow('Invalid accelerometer reading');
      expect(() => classifyAIS140GForce(0, Infinity, 0)).toThrow('Invalid accelerometer reading');
    });
  });

  // ==========================================
  // 7. STATUTORY UTILITIES
  // ==========================================
  describe('statutory.ts — LR & Compliance validation', () => {
    it('generates properly formatted statutory LR number', () => {
      const lr = generateStatutoryLRNumber('WIFL', '2026-27', 482);
      expect(lr).toBe('WIFL/2026-27/LR-0482');
    });

    it('validates 12-digit Indian e-Way bill number', () => {
      expect(validateEWayBillNumber('241089201948')).toBe(true);
      expect(validateEWayBillNumber('12345')).toBe(false);
      expect(validateEWayBillNumber('24108920194A')).toBe(false);
    });

    it('validates standard 15-character Indian GSTIN format', () => {
      expect(validateGSTIN('24AABCU9603R1ZM')).toBe(true);
      expect(validateGSTIN('INVALID-GSTIN')).toBe(false);
    });
  });
});
