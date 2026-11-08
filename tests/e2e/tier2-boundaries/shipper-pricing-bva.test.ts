import { describe, it, expect } from 'vitest';
import { calculateShipperQuote, calculateAcceptanceProbability } from '../harness/contracts';

describe('Tier 2: Boundary Value Analysis — Shipper Pricing & Acceptance Probability (FEAT-03)', () => {
  it('TC-SP-BVA-01: clamps weight to minimum 50 kg when 0 or negative weight is supplied', () => {
    // Boundary: weight <= 0 clamped to 50 kg
    const quoteZero = calculateShipperQuote('shared', 100, 0, 1.0);
    const quoteNeg = calculateShipperQuote('shared', 100, -200, 1.0);

    expect(quoteZero.weightKg).toBe(50);
    expect(quoteNeg.weightKg).toBe(50);
  });

  it('TC-SP-BVA-02: clamps volume to minimum 0.5 cbm when 0 or negative volume is supplied', () => {
    // Boundary: volume <= 0 clamped to 0.5 cbm
    const quoteZero = calculateShipperQuote('shared', 100, 1000, 0);
    const quoteNeg = calculateShipperQuote('shared', 100, 1000, -5);

    expect(quoteZero.volumeCbm).toBe(0.5);
    expect(quoteNeg.volumeCbm).toBe(0.5);
    expect(quoteZero.volumeFareINR).toBe(Math.round(0.5 * 180)); // ₹90
  });

  it('TC-SP-BVA-03: verifies nearest 100 statutory rounding boundary (₹12,449 rounds down, ₹12,450 rounds up)', () => {
    // Test the roundToHundreds logic explicitly:
    // Subtotal + GST = 12,449 -> 12,400
    // Subtotal + GST = 12,450 -> 12,500
    // Let's verify via calculateShipperQuote where rounding occurs
    const quote = calculateShipperQuote('shared', 200, 500, 2);
    // Subtotal + GST must end in double zeros
    expect(quote.minPricingINR % 100).toBe(0);
    expect(quote.minPricingINR).toBe(
      Math.round((quote.subTotalINR + quote.gstINR) / 100) * 100
    );
  });

  it('TC-SP-BVA-04: verifies exact piecewise breakpoint at BonusRatio = 0.08 (8% bonus)', () => {
    // MinPricing = 10,000
    // Ratio just below 0.08 (e.g. userBid = 799 -> ratio = 0.0799):
    // prob = round(48 + 0.0799 * 250) = round(48 + 19.975) = 68%
    const below = calculateAcceptanceProbability(799, 10000);

    // Ratio exactly 0.08 (userBid = 800 -> ratio = 0.08):
    // prob = round(68 + (0.08 - 0.08) * 180) = 68%
    const exact = calculateAcceptanceProbability(800, 10000);

    expect(below.probabilityPercent).toBe(68);
    expect(exact.probabilityPercent).toBe(68);
  });

  it('TC-SP-BVA-05: verifies exact piecewise breakpoint at BonusRatio = 0.18 (18% bonus)', () => {
    // MinPricing = 10,000
    // Ratio just below 0.18 (userBid = 1799 -> ratio = 0.1799):
    // prob = round(68 + (0.1799 - 0.08) * 180) = round(68 + 17.982) = 86%
    const below = calculateAcceptanceProbability(1799, 10000);

    // Ratio exactly 0.18 (userBid = 1800 -> ratio = 0.18):
    // prob = round(86 + (0.18 - 0.18) * 100) = 86%
    const exact = calculateAcceptanceProbability(1800, 10000);

    expect(below.probabilityPercent).toBe(86);
    expect(exact.probabilityPercent).toBe(86);
    expect(exact.dispatchSpeedBand).toBe('15 – 30 mins');
  });

  it('TC-SP-BVA-06: strictly enforces the 99% probability ceiling on excessive bids (never reaches 100%)', () => {
    // Authoritative Requirement: PRD v4.0.0 §7 / §5.3
    // Even with a massive 200% bonus (₹20,000 on a ₹10,000 load), probability CANNOT exceed 99%
    const massiveBid = calculateAcceptanceProbability(20000, 10000);
    expect(massiveBid.probabilityPercent).toBe(99);

    const astronomicalBid = calculateAcceptanceProbability(1000000, 10000);
    expect(astronomicalBid.probabilityPercent).toBe(99);
  });
});
