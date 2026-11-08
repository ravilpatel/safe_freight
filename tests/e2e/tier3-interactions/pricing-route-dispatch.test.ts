import { describe, it, expect } from 'vitest';
import {
  calculateShipperQuote,
  calculate3WayRoutes,
  calculateDeadMileageSavings,
  calculateAcceptanceProbability,
} from '../harness/contracts';

describe('Tier 3: Cross-Feature Interactions — Pricing, Routing & Dispatch (Pairwise)', () => {
  it('TC-INT-04: evaluates quote generation, route options, and dead mileage savings for NH 48 corridor trip', () => {
    // Scenario: Mumbai JNPT to Ahmedabad Changodar (525 km), 16-ton FTL payload
    // 1. Generate Shipper Quote
    const quote = calculateShipperQuote('private', 525, 16000, 24.0);

    expect(quote.truckType).toBe('private');
    expect(quote.minPricingINR).toBeGreaterThan(30000);
    expect(quote.recommendedPriceINR).toBe(Math.round(quote.minPricingINR * 1.08));

    // 2. Evaluate 3-Way Route Alternatives
    const routes = calculate3WayRoutes('Mumbai', 'Ahmedabad', true, 525);
    expect(routes).toHaveLength(3);

    const fastest = routes.find((r) => r.type === 'fastest')!;
    const tollOpt = routes.find((r) => r.type === 'toll_optimized')!;
    const ecoFuel = routes.find((r) => r.type === 'eco_fuel')!;

    // Verification of corridor trade-offs:
    // Toll-Optimized saves FASTag toll compared to fastest
    expect(tollOpt.fastagTollINR).toBeLessThan(fastest.fastagTollINR);
    // Eco-Fuel has superior fuel economy
    expect(ecoFuel.fuelLiters).toBeLessThan(fastest.fuelLiters);
    // Interstate tax applies across all 3 routes for MH -> GJ
    expect(fastest.stateTaxINR).toBe(450);
    expect(tollOpt.stateTaxINR).toBe(450);
    expect(ecoFuel.stateTaxINR).toBe(450);

    // 3. Driver Acceptance Probability at Recommended Price
    const bidBonus = quote.recommendedPriceINR - quote.minPricingINR;
    const probability = calculateAcceptanceProbability(bidBonus, quote.minPricingINR);

    // Recommended price gives an 8% bonus (bonusRatio = 0.08)
    // prob = 68% -> dispatch speed band is '45 – 60 mins'
    expect(probability.probabilityPercent).toBe(68);
    expect(probability.dispatchSpeedBand).toBe('45 – 60 mins');

    // 4. Backhaul Dead Mileage Savings:
    // If the truck was originally returning empty (525 km deadhead), but gets matched with this load:
    const savings = calculateDeadMileageSavings(525, 0);
    expect(savings.emptyKmAvoided).toBe(525);
    expect(savings.totalMoneySavedINR).toBeGreaterThan(15000);
    expect(savings.co2SavedKg).toBeGreaterThan(350);
  });

  it('TC-INT-05: verifies shipper bid enhancement directly shifts driver acceptance band from 2-4h to Instant', () => {
    const minPricing = 35000;

    // Zero bonus: 48%, 2-4 hours
    const zeroBid = calculateAcceptanceProbability(0, minPricing);
    expect(zeroBid.probabilityPercent).toBe(48);
    expect(zeroBid.dispatchSpeedBand).toBe('2 – 4 hours');

    // Modest bonus (+5%): 61%, 2-4 hours
    const modestBid = calculateAcceptanceProbability(1750, minPricing);
    expect(modestBid.probabilityPercent).toBe(61);

    // Competitive bonus (+12%): 75%, 45-60 mins
    const compBid = calculateAcceptanceProbability(4200, minPricing);
    expect(compBid.probabilityPercent).toBe(75);
    expect(compBid.dispatchSpeedBand).toBe('45 – 60 mins');

    // Premium bonus (+25%): 93%, Instant (<10 mins)
    const premiumBid = calculateAcceptanceProbability(8750, minPricing);
    expect(premiumBid.probabilityPercent).toBe(93);
    expect(premiumBid.dispatchSpeedBand).toBe('Instant (< 10 mins)');
  });

  it('TC-INT-06: validates route cost consistency against shipper quote floor pricing', () => {
    // Operating cost of vehicle on fastest route should not exceed shipper minimum pricing
    const quote = calculateShipperQuote('private', 285, 12000, 15);
    const routes = calculate3WayRoutes('Mumbai', 'Surat', true, 285);
    const fastest = routes.find((r) => r.type === 'fastest')!;

    // Total route direct costs (Fuel + Toll + State Tax) should be less than the gross shipper quote
    expect(fastest.totalCostINR).toBeLessThan(quote.minPricingINR);
  });
});
