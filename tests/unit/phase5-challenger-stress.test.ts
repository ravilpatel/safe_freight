/**
 * SafeFreight OS — Empirical Challenger Stress & Algorithmic Verification Suite
 * Milestone: Phase 5 Shipper Experience & Dynamic Pricing Stress Verification
 *
 * EMPIRICAL CHALLENGER VERIFICATION:
 * 1. Dynamic Shipper Pricing (`quoteEstimator.ts`, `shipperPricing.ts`)
 *    - Extreme boundary vectors: 0 km, 1 km, 525 km, 2000 km, 2500 km, 10,000 km
 *    - Extreme weight vectors: 0 kg, 50 kg, 100 kg, 5,000 kg, 25,000 kg, 40,000 kg, 100,000 kg
 *    - Operating floor invariant: base pricing never falls below fuel + toll operating floor
 * 2. Acceptance Probability Slider Engine (`acceptanceProbability.ts`)
 *    - Invariant: P(bonus = 0) >= 48%
 *    - Invariant: P(bonus >= 10,000) <= 99%
 *    - Strict monotonicity: no probability inversions across any bonus interval
 *    - Latent probability curve continuity across piece-wise boundary transitions (8%, 18%, 31%)
 * 3. Public Rate Limiter (`rateLimit.ts` & GET `/api/v1/quotes`)
 *    - Concurrency burst: 100 concurrent requests (60 allowed, 40 rejected with 429)
 *    - Zero DB writes verification: zero audit log rows, zero load mutations
 *    - IP isolation under load
 * 4. Statutory GST Tax Calculation (`statutory.ts`)
 *    - Strictly SAC 9965 (GTA Road Carriage)
 *    - Intra-state (MH->MH, GJ->GJ): CGST 2.5% + SGST 2.5%, IGST 0%
 *    - Inter-state (MH->GJ, GJ->MH): IGST 5.0%, CGST 0% + SGST 0%
 *    - Hamali addition (+₹800) into taxable value
 *    - Zero floating-point rounding errors across Lakh/Crore scales and sub-rupee fractions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as quotesGET } from '@/app/api/v1/quotes/route';
import {
  calculateDynamicFreightQuote,
  calculateCorridorDistance,
  TRUCK_SPECIFICATIONS,
} from '@/lib/algorithms/quoteEstimator';
import { calculateShipperQuote } from '@/lib/algorithms/shipperPricing';
import {
  calculateAcceptanceProbability,
  calculateBidProbability,
} from '@/lib/algorithms/acceptanceProbability';
import {
  generateGSTInvoice,
  formatINR,
  validateGSTIN,
  validateEWayBillNumber,
} from '@/lib/algorithms/statutory';
import { checkRateLimit, resetRateLimiter } from '@/lib/rateLimit';
import { dataService } from '@/lib/data-service';
import { SessionClaims } from '@/types/database';

describe('Empirical Challenger Suite: Phase 5 Algorithmic Stress Probes', () => {
  const dummyClaims: SessionClaims = {
    sub: 'probe-auditor',
    email: 'auditor@safefreight.in',
    tenant_id: 'org-audit-probe',
    role: 'shipper',
  };

  beforeEach(() => {
    dataService.clear();
    resetRateLimiter();
  });

  // =========================================================================
  // CHALLENGE 1: DYNAMIC SHIPPER PRICING BOUNDARY & OPERATING FLOOR STRESS
  // =========================================================================
  describe('Challenge 1: Dynamic Shipper Pricing & Operating Floor Invariants', () => {
    const testDistances = [0, 1, 10, 45, 165, 280, 355, 430, 525, 1000, 2000, 2500, 10000];
    const testWeights = [0, 50, 100, 500, 1000, 5000, 10000, 15000, 25000, 40000, 100000];
    const truckTypes = ['14ft', '19ft', '22ft', '32ft SXL', '32ft MXL', 'shared', 'private'];

    it('verifies quoteEstimator clamps 0 km, 1 km, 525 km, 2000 km, and extreme weights without NaN or crash', () => {
      for (const d of testDistances) {
        for (const w of testWeights) {
          const quote = calculateDynamicFreightQuote({
            origin: 'Mumbai JNPT Port',
            destination: 'Ahmedabad Changodar Hub',
            distanceKm: d,
            weightKg: w,
            truckType: '32ft MXL',
          });

          expect(isFinite(quote.distanceKm)).toBe(true);
          expect(quote.distanceKm).toBeGreaterThanOrEqual(10);
          expect(quote.distanceKm).toBeLessThanOrEqual(2500);

          expect(isFinite(quote.weightKg)).toBe(true);
          expect(quote.weightKg).toBeGreaterThanOrEqual(50);

          expect(isFinite(quote.baseFreightINR)).toBe(true);
          expect(quote.baseFreightINR).toBeGreaterThan(0);

          expect(isFinite(quote.totalQuoteINR)).toBe(true);
          expect(quote.totalQuoteINR).toBeGreaterThan(0);
          expect(quote.totalQuoteINR % 100).toBe(0); // Statutory 100 INR rounding
        }
      }
    });

    it('verifies shipperPricing handles boundary vectors (0 km, 1 km, 525 km, 2000 km, 100 kg to 40,000 kg)', () => {
      for (const d of [0, 1, 525, 2000]) {
        for (const w of [100, 5000, 20000, 40000]) {
          for (const type of ['shared', 'private'] as const) {
            const quote = calculateShipperQuote(type, d, w);
            expect(isFinite(quote.distanceKm)).toBe(true);
            expect(quote.distanceKm).toBeGreaterThanOrEqual(1);

            expect(isFinite(quote.weightKg)).toBe(true);
            expect(quote.weightKg).toBeGreaterThanOrEqual(50);

            expect(isFinite(quote.minPricingINR)).toBe(true);
            expect(quote.minPricingINR).toBeGreaterThan(0);
            expect(quote.minPricingINR % 100).toBe(0);
            expect(quote.recommendedPriceINR).toBe(Math.round(quote.minPricingINR * 1.08));
          }
        }
      }
    });

    it('PROBE-FLOOR: Base freight strictly exceeds FASTag toll + diesel operating floor across all configurations', () => {
      // Direct variable operating cost floor = FASTag tolls + diesel surcharge
      // Base freight must cover and exceed these operating components
      for (const d of [10, 45, 165, 280, 355, 430, 525, 1000, 2000]) {
        for (const type of truckTypes) {
          const quote = calculateDynamicFreightQuote({
            distanceKm: d,
            truckType: type,
            weightKg: 8000,
          });

          const variableOperatingFloor = quote.fastagTollINR + quote.dieselSurchargeINR;
          expect(quote.baseFreightINR).toBeGreaterThan(variableOperatingFloor);
          expect(quote.subTotalINR).toBeGreaterThanOrEqual(variableOperatingFloor);
        }
      }
    });

    it('PROBE-FLOOR-FTL: Dedicated FTL ratePerKm exceeds physical diesel consumption + FASTag per km', () => {
      // Physical diesel on NH 48: 3.8 km/L @ ₹92.50/L = ₹24.34/km
      // FASTag toll = ₹2.20/km
      // Combined direct cost per km = ₹26.54/km
      // FTL distance rate is ₹42/km (private) or ₹38-₹45/km (32ft SXL/MXL)
      const quoteFTL = calculateDynamicFreightQuote({
        origin: 'Mumbai JNPT Port',
        destination: 'Ahmedabad Changodar Hub',
        distanceKm: 525,
        truckType: 'private',
        weightKg: 20000,
      });

      const physicalFuelCostPerKm = 92.5 / 3.8; // ₹24.342/km
      const tollCostPerKm = 2.2; // ₹2.20/km
      const directOperatingCostPerKm = physicalFuelCostPerKm + tollCostPerKm; // ~₹26.54/km

      const effectiveRatePerKm = quoteFTL.baseFreightINR / quoteFTL.distanceKm;
      expect(effectiveRatePerKm).toBeGreaterThan(directOperatingCostPerKm);
      expect(quoteFTL.ratePerKmINR).toBeGreaterThan(directOperatingCostPerKm);
    });
  });

  // =========================================================================
  // CHALLENGE 2: ACCEPTANCE PROBABILITY SLIDER ENGINE MATHEMATICAL INVARIANTS
  // =========================================================================
  describe('Challenge 2: Acceptance Probability Engine Mathematical Invariants', () => {
    const testBases = [5000, 15000, 30000, 50000, 100000];

    it('INVARIANT-P0: P(bonus = 0) >= 48% and negative bonus clamps cleanly to 48%', () => {
      for (const base of testBases) {
        const pZero = calculateAcceptanceProbability(0, base);
        expect(pZero.probabilityPercent).toBe(48);
        expect(pZero.probabilityPercent).toBeGreaterThanOrEqual(48);
        expect(pZero.dispatchSpeedBand).toBe('2 – 4 hours');

        const pNegative = calculateAcceptanceProbability(-2500, base);
        expect(pNegative.probabilityPercent).toBe(48);
        expect(pNegative.offeredBidINR).toBe(base);
      }
    });

    it('INVARIANT-P10K: P(bonus >= 10,000) <= 99% across all bases and up to extreme bonuses', () => {
      for (const base of testBases) {
        for (const bonus of [10000, 25000, 50000, 100000, 1000000]) {
          const res = calculateAcceptanceProbability(bonus, base);
          expect(res.probabilityPercent).toBeLessThanOrEqual(99);
          expect(res.probabilityPercent).toBeGreaterThanOrEqual(48);
          // If bonus is high enough to reach >= 92%, speed band is Instant (< 10 mins)
          if (res.probabilityPercent >= 92) {
            expect(res.dispatchSpeedBand).toBe('Instant (< 10 mins)');
          } else if (res.probabilityPercent >= 80) {
            expect(res.dispatchSpeedBand).toBe('15 – 30 mins');
          } else {
            expect(res.dispatchSpeedBand).toBe('45 – 60 mins');
          }
        }
      }
    });

    it('INVARIANT-MONOTONICITY: probability is strictly non-decreasing across continuous range [0, 50,000]', () => {
      const base = 25000;
      let prevProb = 0;

      // Probe in ₹250 increments (1% bonus ratio steps)
      for (let bonus = 0; bonus <= 50000; bonus += 250) {
        const res = calculateAcceptanceProbability(bonus, base);
        expect(res.probabilityPercent).toBeGreaterThanOrEqual(prevProb);
        prevProb = res.probabilityPercent;
      }
    });

    it('INVARIANT-CONTINUITY: piece-wise segments connect continuously at boundary points 8% and 18%', () => {
      const base = 100000;
      // Boundary 1: bonusRatio = 0.08 (bonus = 8000)
      const atBoundary1Left = calculateAcceptanceProbability(7999, base);
      const atBoundary1 = calculateAcceptanceProbability(8000, base);
      const atBoundary1Right = calculateAcceptanceProbability(8001, base);
      expect(Math.abs(atBoundary1.probabilityPercent - 68)).toBeLessThanOrEqual(1);
      expect(atBoundary1.probabilityPercent).toBeGreaterThanOrEqual(atBoundary1Left.probabilityPercent);
      expect(atBoundary1Right.probabilityPercent).toBeGreaterThanOrEqual(atBoundary1.probabilityPercent);

      // Boundary 2: bonusRatio = 0.18 (bonus = 18000)
      const atBoundary2Left = calculateAcceptanceProbability(17999, base);
      const atBoundary2 = calculateAcceptanceProbability(18000, base);
      const atBoundary2Right = calculateAcceptanceProbability(18001, base);
      expect(Math.abs(atBoundary2.probabilityPercent - 86)).toBeLessThanOrEqual(1);
      expect(atBoundary2.probabilityPercent).toBeGreaterThanOrEqual(atBoundary2Left.probabilityPercent);
      expect(atBoundary2Right.probabilityPercent).toBeGreaterThanOrEqual(atBoundary2.probabilityPercent);
    });

    it('INVARIANT-STRICT-INCREASE: probe verified on discrete 2% ratio steps from 0% to 30%', () => {
      const base = 50000;
      const ratios = [0.0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22, 0.24, 0.26, 0.28, 0.30, 0.32];
      const probs = ratios.map((r) => calculateAcceptanceProbability(r * base, base).probabilityPercent);

      // Verify each step is strictly greater than the predecessor
      for (let i = 1; i < probs.length; i++) {
        expect(probs[i]).toBeGreaterThan(probs[i - 1]);
      }
    });
  });

  // =========================================================================
  // CHALLENGE 3: PUBLIC RATE LIMITER CONCURRENCY STRESS & ZERO DB WRITES
  // =========================================================================
  describe('Challenge 3: Rate Limiter Concurrency Stress & Zero DB Writes', () => {
    it('CONCURRENCY-BURST: exactly 60 requests succeed and 40 return 429 under 100 concurrent requests', async () => {
      const stressIp = '198.51.100.77';

      // Fire 100 requests concurrently
      const requests = Array.from({ length: 100 }, (_, i) => {
        const req = new NextRequest(
          `http://localhost:3000/api/v1/quotes?origin=Vapi&destination=Surat&distanceKm=115&reqIndex=${i}`,
          {
            method: 'GET',
            headers: { 'x-forwarded-for': stressIp },
          }
        );
        return quotesGET(req);
      });

      const responses = await Promise.all(requests);
      const status200 = responses.filter((r) => r.status === 200);
      const status429 = responses.filter((r) => r.status === 429);

      expect(status200.length).toBe(60);
      expect(status429.length).toBe(40);

      // Verify 429 response headers and structure
      const sample429 = status429[0];
      expect(sample429.headers.get('Retry-After')).toBeDefined();
      expect(Number(sample429.headers.get('Retry-After'))).toBeGreaterThan(0);
      expect(sample429.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(sample429.headers.get('X-RateLimit-Remaining')).toBe('0');

      const json429 = await sample429.json();
      expect(json429.error).toContain('429 Too Many Requests');
    });

    it('ZERO-DB-WRITES: verify 0 loads, 0 invoices, and 0 audit trail mutations occur during quote estimation', async () => {
      const testIp = '198.51.100.88';

      // Execute 10 GET quotes
      for (let i = 0; i < 10; i++) {
        const req = new NextRequest(
          'http://localhost:3000/api/v1/quotes?origin=Mumbai%20JNPT&destination=Surat&truckType=19ft',
          { headers: { 'x-forwarded-for': testIp } }
        );
        const res = await quotesGET(req);
        expect(res.status).toBe(200);
      }

      // Assert zero database side effects in dataService
      expect(dataService.getAuditTrail(dummyClaims, 'loads')).toHaveLength(0);
      expect(dataService.getAuditTrail(dummyClaims, 'invoices')).toHaveLength(0);
      const allLoads = dataService.getLoads(dummyClaims, {});
      expect(allLoads.data).toHaveLength(0);
    });

    it('IP-ISOLATION: rate limit saturation on IP 1 does not affect IP 2', async () => {
      const ip1 = '203.0.113.1';
      const ip2 = '203.0.113.2';

      // Exhaust IP 1
      for (let i = 0; i < 60; i++) {
        const res = checkRateLimit(ip1, 60, 60000);
        expect(res.success).toBe(true);
      }
      expect(checkRateLimit(ip1, 60, 60000).success).toBe(false);

      // Verify IP 2 is unaffected
      const ip2Req = new NextRequest('http://localhost:3000/api/v1/quotes', {
        headers: { 'x-forwarded-for': ip2 },
      });
      const ip2Res = await quotesGET(ip2Req);
      expect(ip2Res.status).toBe(200);
      expect(ip2Res.headers.get('X-RateLimit-Remaining')).toBe('59');
    });
  });

  // =========================================================================
  // CHALLENGE 4: STATUTORY GST TAX CALCULATION & INR PRECISION
  // =========================================================================
  describe('Challenge 4: Statutory GST Tax Calculation & INR Precision', () => {
    it('INVARIANT-SAC: SAC Code is strictly 9965 (GTA Road Carriage)', () => {
      const invoice = generateGSTInvoice({
        consignorGstin: '27AAACW1234F1Z1',
        consigneeGstin: '24AAACA9876G1ZA',
        pricingInr: 45000,
      });

      expect(invoice.sacCode).toBe('9965');
      expect(invoice.sacDescription).toContain('Goods Transport Agency (GTA)');
    });

    it('INVARIANT-INTRA-STATE: produces CGST 2.5% + SGST 2.5% and IGST 0% (MH->MH and GJ->GJ)', () => {
      // Maharashtra to Maharashtra (State Code 27)
      const invoiceMH = generateGSTInvoice({
        consignorGstin: '27AAACW1234F1Z1',
        consigneeGstin: '27BBBCW9876G1Z2',
        pricingInr: 60000,
      });

      expect(invoiceMH.isInterState).toBe(false);
      expect(invoiceMH.cgstRatePct).toBe(2.5);
      expect(invoiceMH.sgstRatePct).toBe(2.5);
      expect(invoiceMH.igstRatePct).toBe(0);
      expect(invoiceMH.igstAmountINR).toBe(0);
      expect(invoiceMH.cgstAmountINR).toBeGreaterThan(0);
      expect(invoiceMH.cgstAmountINR).toBe(invoiceMH.sgstAmountINR);
      expect(invoiceMH.totalTaxINR).toBe(invoiceMH.cgstAmountINR + invoiceMH.sgstAmountINR);

      // Gujarat to Gujarat (State Code 24)
      const invoiceGJ = generateGSTInvoice({
        consignorGstin: '24AAACA9876G1ZA',
        consigneeGstin: '24BBBCA1234F1ZB',
        pricingInr: 40000,
      });

      expect(invoiceGJ.isInterState).toBe(false);
      expect(invoiceGJ.cgstRatePct).toBe(2.5);
      expect(invoiceGJ.sgstRatePct).toBe(2.5);
      expect(invoiceGJ.igstRatePct).toBe(0);
      expect(invoiceGJ.igstAmountINR).toBe(0);
      expect(invoiceGJ.totalTaxINR).toBe(invoiceGJ.cgstAmountINR + invoiceGJ.sgstAmountINR);
    });

    it('INVARIANT-INTER-STATE: produces IGST 5.0% and CGST 0% + SGST 0% (MH->GJ and GJ->MH)', () => {
      // MH to GJ
      const invoiceInter1 = generateGSTInvoice({
        consignorGstin: '27AAACW1234F1Z1', // MH
        consigneeGstin: '24AAACA9876G1ZA', // GJ
        pricingInr: 50000,
      });

      expect(invoiceInter1.isInterState).toBe(true);
      expect(invoiceInter1.igstRatePct).toBe(5.0);
      expect(invoiceInter1.cgstRatePct).toBe(0);
      expect(invoiceInter1.sgstRatePct).toBe(0);
      expect(invoiceInter1.cgstAmountINR).toBe(0);
      expect(invoiceInter1.sgstAmountINR).toBe(0);
      expect(invoiceInter1.igstAmountINR).toBe(invoiceInter1.totalTaxINR);
      expect(invoiceInter1.igstAmountINR).toBe(Math.round(invoiceInter1.totalTaxableValueINR * 0.05));

      // GJ to MH
      const invoiceInter2 = generateGSTInvoice({
        consignorGstin: '24AAACA9876G1ZA', // GJ
        consigneeGstin: '27AAACW1234F1Z1', // MH
        pricingInr: 75000,
      });

      expect(invoiceInter2.isInterState).toBe(true);
      expect(invoiceInter2.igstRatePct).toBe(5.0);
      expect(invoiceInter2.cgstAmountINR).toBe(0);
      expect(invoiceInter2.sgstAmountINR).toBe(0);
      expect(invoiceInter2.igstAmountINR).toBe(invoiceInter2.totalTaxINR);
    });

    it('INVARIANT-HAMALI: total taxable value includes Hamali (+₹800) when selected', () => {
      const withoutHamali = generateGSTInvoice({
        pricingInr: 42000,
        hamaliIncluded: false,
      });

      const withHamali = generateGSTInvoice({
        pricingInr: 42000,
        hamaliIncluded: true,
      });

      expect(withoutHamali.hamaliChargesINR).toBe(0);
      expect(withHamali.hamaliChargesINR).toBe(800);
      expect(withHamali.totalTaxableValueINR).toBe(withoutHamali.totalTaxableValueINR + 800);
      // Tax and grand total must reflect the hamali inclusion
      expect(withHamali.grandTotalINR).toBeGreaterThan(withoutHamali.grandTotalINR);
    });

    it('PRECISION-INR: zero floating-point rounding errors in formatted INR string across Lakhs and Crores', () => {
      // Benchmark Indian Lakhs and Crores test cases
      const testCases: [number, string][] = [
        [0, '₹0.00'],
        [42, '₹42.00'],
        [800, '₹800.00'],
        [1500, '₹1,500.00'],
        [41600, '₹41,600.00'],
        [100000, '₹1,00,000.00'], // 1 Lakh
        [2500000, '₹25,00,000.00'], // 25 Lakhs
        [10000000, '₹1,00,00,000.00'], // 1 Crore
        [98765432.1, '₹9,87,65,432.10'], // 9.87 Crores
        [-52500.75, '-₹52,500.75'], // Negative currency
      ];

      for (const [val, expected] of testCases) {
        expect(formatINR(val)).toBe(expected);
      }

      // Verify no floating point artifacts like 0.30000000000000004
      const floatVal = 0.1 + 0.2; // JS gives 0.30000000000000004
      expect(formatINR(floatVal)).toBe('₹0.30');
    });

    it('STATUTORY-IDENTIFIERS: verifies 15-char GSTIN and 12-digit e-Way bill validations', () => {
      expect(validateGSTIN('27AAACW1234F1Z1')).toBe(true);
      expect(validateGSTIN('24AAACA9876G1ZA')).toBe(true);
      expect(validateGSTIN('27AAACW1234F1Z')).toBe(false); // 14 char
      expect(validateGSTIN('27AAACW1234F1Z1A')).toBe(false); // 16 char

      expect(validateEWayBillNumber('241098234512')).toBe(true);
      expect(validateEWayBillNumber('24109823451')).toBe(false); // 11 digit
      expect(validateEWayBillNumber('2410982345123')).toBe(false); // 13 digit
      expect(validateEWayBillNumber('241098ABC512')).toBe(false); // alphanumeric
    });
  });
});
