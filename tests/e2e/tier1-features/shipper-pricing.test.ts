import { describe, it, expect } from 'vitest';
import { calculateShipperQuote, calculateAcceptanceProbability } from '../harness/contracts';

describe('Tier 1: Feature Coverage — Shipper Pricing & Acceptance Engine (FEAT-03)', () => {
  it('TC-SP-01: calculates Shared LTL quote with accurate base, distance, weight, and volume components', () => {
    // Distance = 250 km, Weight = 2000 kg (2 tons), Volume = 10 cbm
    // BaseFare = 2500
    // DistanceFare = 250 * 14 = 3500
    // WeightFare = (2000 / 1000) * 650 * (250 / 250) = 1300
    // VolumeFare = 10 * 180 = 1800
    // SubTotal = 2500 + 3500 + 1300 + 1800 = 9100
    // GST = round(9100 * 0.05) = 455
    // MinPricing = round((9100 + 455) / 100) * 100 = round(9555 / 100) * 100 = 9600
    // RecommendedPrice = round(9600 * 1.08) = 10368
    const quote = calculateShipperQuote('shared', 250, 2000, 10);

    expect(quote.baseFareINR).toBe(2500);
    expect(quote.distanceFareINR).toBe(3500);
    expect(quote.weightFareINR).toBe(1300);
    expect(quote.volumeFareINR).toBe(1800);
    expect(quote.subTotalINR).toBe(9100);
    expect(quote.gstINR).toBe(455);
    expect(quote.minPricingINR).toBe(9600);
    expect(quote.recommendedPriceINR).toBe(10368);
  });

  it('TC-SP-02: calculates Dedicated FTL quote with capacity tonnage and higher base fare', () => {
    // Distance = 500 km, Weight = 12,000 kg (12 tons), Volume = 25 cbm
    // BaseFare = 7500
    // DistanceFare = 500 * 42 = 21000
    // CapacityTons = max(10, ceil(12000 / 1000) + 2) = max(10, 14) = 14 tons
    // WeightFare = 14 * 400 = 5600
    // VolumeFare = 25 * 220 = 5500
    // SubTotal = 7500 + 21000 + 5600 + 5500 = 39600
    // GST = round(39600 * 0.05) = 1980
    // MinPricing = round((39600 + 1980) / 100) * 100 = round(41580 / 100) * 100 = 41600
    // RecommendedPrice = round(41600 * 1.08) = 44928
    const quote = calculateShipperQuote('private', 500, 12000, 25);

    expect(quote.baseFareINR).toBe(7500);
    expect(quote.distanceFareINR).toBe(21000);
    expect(quote.weightFareINR).toBe(5600);
    expect(quote.volumeFareINR).toBe(5500);
    expect(quote.subTotalINR).toBe(39600);
    expect(quote.gstINR).toBe(1980);
    expect(quote.minPricingINR).toBe(41600);
    expect(quote.recommendedPriceINR).toBe(44928);
  });

  it('TC-SP-03: returns baseline 48% probability for 0 or negative bid addition', () => {
    // Authoritative Derivation: PRD v4.0.0 §5.3
    // userBidAdditionINR = 0, minPricing = 10000 -> ratio = 0
    const zeroBid = calculateAcceptanceProbability(0, 10000);
    expect(zeroBid.probabilityPercent).toBe(48);
    expect(zeroBid.dispatchSpeedBand).toBe('2 – 4 hours');

    const negBid = calculateAcceptanceProbability(-500, 10000);
    expect(negBid.probabilityPercent).toBe(48);
    expect(negBid.dispatchSpeedBand).toBe('2 – 4 hours');
  });

  it('TC-SP-04: evaluates piecewise probability in Tier 1 bonus band (0 < ratio < 0.08)', () => {
    // MinPricing = 10,000, userBid = 500 -> ratio = 0.05
    // probability = round(48 + 0.05 * 250) = round(48 + 12.5) = 61%
    // Band: 61% < 65% -> '2 – 4 hours'
    const result = calculateAcceptanceProbability(500, 10000);
    expect(result.bonusRatio).toBe(0.05);
    expect(result.probabilityPercent).toBe(61);
    expect(result.dispatchSpeedBand).toBe('2 – 4 hours');
  });

  it('TC-SP-05: evaluates piecewise probability in Tier 2 bonus band (0.08 <= ratio < 0.18)', () => {
    // MinPricing = 10,000, userBid = 1,200 -> ratio = 0.12
    // probability = round(68 + (0.12 - 0.08) * 180) = round(68 + 7.2) = 75%
    // Band: 65% <= 75% < 80% -> '45 – 60 mins'
    const result = calculateAcceptanceProbability(1200, 10000);
    expect(result.bonusRatio).toBe(0.12);
    expect(result.probabilityPercent).toBe(75);
    expect(result.dispatchSpeedBand).toBe('45 – 60 mins');
  });

  it('TC-SP-06: evaluates Tier 3 bonus band (ratio >= 0.18) reaching instant dispatch band', () => {
    // MinPricing = 10,000, userBid = 2,500 -> ratio = 0.25
    // probability = round(86 + (0.25 - 0.18) * 100) = round(86 + 7) = 93%
    // Band: >= 92% -> 'Instant (< 10 mins)'
    const result = calculateAcceptanceProbability(2500, 10000);
    expect(result.bonusRatio).toBe(0.25);
    expect(result.probabilityPercent).toBe(93);
    expect(result.dispatchSpeedBand).toBe('Instant (< 10 mins)');
  });
});
