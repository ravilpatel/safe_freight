/**
 * Tier 2: Boundary Value Analysis & Edge Cases — Phase 7: Statutory & Regulatory Compliance
 * Boundaries:
 * - Group 1: e-Way Bill CGST Rule 138 Distance Boundaries (200km, 201km, 400km, 401km, ODC 20km/21km)
 * - Group 2: Section 194C TDS Thresholds (10 vs 11 carriages, ₹30,000 vs ₹30,001, ₹100,000 vs ₹100,001)
 * - Group 3: Document Expiry Date Boundaries (31d, 30d, 1d, 0d, -1d)
 * - Group 4: LR Sequence Boundaries & Tenant Prefix Edge Cases (1, 9999, 10000)
 * - Group 5: MoRTH Plate & SARATHI DL Format Boundaries (8/10/11 chars, 15/16 chars, Year boundaries)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEWayBillValidity,
  calculateSection194CTDS,
  computeDocumentExpiryBadge,
  generateTenantUniqueLRNumber,
  validateMoRTHRegistrationPlate,
  validateSARATHICommercialDL,
  getCurrentFinancialYear,
  calculateFASTagCorridorToll,
} from '@/lib/algorithms/statutory';

describe('Tier 2: Boundary Value Analysis — Phase 7: Statutory & Regulatory Compliance', () => {
  // ==========================================================================
  // BOUNDARY GROUP 1: e-WAY BILL CGST RULE 138 DISTANCE & TIME BOUNDARIES
  // ==========================================================================
  describe('Boundary Group 1: e-Way Bill Distance & Time Boundaries', () => {
    it('TC-STAT-BVA-01: tests standard cargo distance boundary at 200 km (1 day) vs 201 km (2 days)', () => {
      // 199 km: 1 day
      expect(calculateEWayBillValidity(199).daysValid).toBe(1);

      // Exactly 200 km: 1 day
      expect(calculateEWayBillValidity(200).daysValid).toBe(1);

      // Off-by-one 201 km: 2 days
      expect(calculateEWayBillValidity(201).daysValid).toBe(2);

      // Exactly 400 km: 2 days
      expect(calculateEWayBillValidity(400).daysValid).toBe(2);

      // Off-by-one 401 km: 3 days
      expect(calculateEWayBillValidity(401).daysValid).toBe(3);
    });

    it('TC-STAT-BVA-02: tests Over Dimensional Cargo (ODC) boundary at 20 km (1 day) vs 21 km (2 days)', () => {
      // 19 km ODC: 1 day
      expect(calculateEWayBillValidity(19, true).daysValid).toBe(1);

      // Exactly 20 km ODC: 1 day
      expect(calculateEWayBillValidity(20, true).daysValid).toBe(1);

      // Off-by-one 21 km ODC: 2 days
      expect(calculateEWayBillValidity(21, true).daysValid).toBe(2);

      // Exactly 40 km ODC: 2 days
      expect(calculateEWayBillValidity(40, true).daysValid).toBe(2);

      // Off-by-one 41 km ODC: 3 days
      expect(calculateEWayBillValidity(41, true).daysValid).toBe(3);
    });

    it('TC-STAT-BVA-03: handles zero, negative, or fractional distance (clamps to min 1 day)', () => {
      expect(calculateEWayBillValidity(0).daysValid).toBe(1);
      expect(calculateEWayBillValidity(-50).daysValid).toBe(1);
      expect(calculateEWayBillValidity(0.5).daysValid).toBe(1);
      expect(calculateEWayBillValidity(NaN).daysValid).toBe(1);
    });

    it('TC-STAT-BVA-04: tests validity time status boundary (VALID > 8h, EXPIRING_SOON <= 8h, EXPIRED <= 0h)', () => {
      const now = new Date();

      // Generated 23 hours ago for a 1-day (24h) validity -> 1 hour remaining -> EXPIRING_SOON
      const gen23hAgo = new Date(now.getTime() - 23 * 3600 * 1000);
      const resExpSoon = calculateEWayBillValidity(150, false, gen23hAgo);
      expect(resExpSoon.status).toBe('EXPIRING_SOON');
      expect(resExpSoon.hoursRemaining).toBeLessThanOrEqual(8);
      expect(resExpSoon.hoursRemaining).toBeGreaterThan(0);

      // Generated 25 hours ago for a 1-day (24h) validity -> EXPIRED
      const gen25hAgo = new Date(now.getTime() - 25 * 3600 * 1000);
      const resExpired = calculateEWayBillValidity(150, false, gen25hAgo);
      expect(resExpired.status).toBe('EXPIRED');
      expect(resExpired.hoursRemaining).toBeLessThanOrEqual(0);

      // Generated just now -> VALID
      const resValid = calculateEWayBillValidity(150, false, now);
      expect(resValid.status).toBe('VALID');
      expect(resValid.hoursRemaining).toBeGreaterThan(8);
    });
  });

  // ==========================================================================
  // BOUNDARY GROUP 2: SECTION 194C TDS THRESHOLDS & CARRIAGE BOUNDARIES
  // ==========================================================================
  describe('Boundary Group 2: Section 194C TDS Thresholds & Carriage Count', () => {
    it('TC-STAT-BVA-05: tests carriage count boundary: 10 carriages (0% TDS) vs 11 carriages (TDS applies)', () => {
      // Boundary 10 carriages with declaration: 0% TDS under 194C(6)
      const res10 = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 10,
        hasDeclarationSubSection6: true,
        grossPaymentINR: 50000,
      });
      expect(res10.tdsRatePct).toBe(0.0);
      expect(res10.exemptionClause).toBe('Section 194C(6)');
      expect(res10.isDeclarationValid).toBe(true);

      // Off-by-one 11 carriages with declaration: declaration disqualified, standard 1% TDS applied
      const res11 = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 11,
        hasDeclarationSubSection6: true,
        grossPaymentINR: 50000,
      });
      expect(res11.tdsRatePct).toBe(1.0);
      expect(res11.tdsAmountINR).toBe(500);
      expect(res11.isDeclarationValid).toBe(false);
      expect(res11.exemptionApplied).toBe(false);
    });

    it('TC-STAT-BVA-06: tests single bill payment boundary: ₹30,000 (exempt) vs ₹30,001 (withheld)', () => {
      // Exactly ₹30,000 single bill with 0 prior aggregate -> 0% under 194C(5)
      const res30k = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 15,
        hasDeclarationSubSection6: false,
        grossPaymentINR: 30000,
        financialYearAggregateINR: 0,
      });
      expect(res30k.tdsRatePct).toBe(0.0);
      expect(res30k.exemptionClause).toBe('Section 194C(5)');

      // Off-by-one ₹30,001 single bill -> breaches single limit -> 1% TDS
      const res30kPlus1 = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 15,
        hasDeclarationSubSection6: false,
        grossPaymentINR: 30001,
        financialYearAggregateINR: 0,
      });
      expect(res30kPlus1.tdsRatePct).toBe(1.0);
      expect(res30kPlus1.tdsAmountINR).toBe(300); // round(30001 * 0.01)
      expect(res30kPlus1.exemptionApplied).toBe(false);
    });

    it('TC-STAT-BVA-07: tests aggregate FY payment boundary: ₹1,00,000 (exempt) vs ₹1,00,001 (withheld)', () => {
      // Small bill ₹20k, prior aggregate ₹80k -> total exactly ₹1,00,000 -> 0% under 194C(5)
      const res100k = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 15,
        hasDeclarationSubSection6: false,
        grossPaymentINR: 20000,
        financialYearAggregateINR: 80000,
      });
      expect(res100k.tdsRatePct).toBe(0.0);
      expect(res100k.exemptionClause).toBe('Section 194C(5)');

      // Small bill ₹20k, prior aggregate ₹80,001 -> total ₹1,00,001 -> breaches aggregate limit -> 1% TDS
      const res100kPlus1 = calculateSection194CTDS({
        transporterPan: 'AAACP1234K',
        transporterType: 'individual',
        goodsCarriagesOwnedCount: 15,
        hasDeclarationSubSection6: false,
        grossPaymentINR: 20000,
        financialYearAggregateINR: 80001,
      });
      expect(res100kPlus1.tdsRatePct).toBe(1.0);
      expect(res100kPlus1.tdsAmountINR).toBe(200);
      expect(res100kPlus1.exemptionApplied).toBe(false);
    });
  });

  // ==========================================================================
  // BOUNDARY GROUP 3: STATUTORY DOCUMENT EXPIRY DATE BOUNDARIES
  // ==========================================================================
  describe('Boundary Group 3: Document Expiry Date Boundaries', () => {
    it('TC-STAT-BVA-08: tests document expiry boundary at 31 days (valid) vs 30 days (expiring_soon)', () => {
      const today = new Date('2026-11-09T00:00:00Z');

      // 31 days ahead: December 10, 2026 -> VALID
      const exp31d = new Date('2026-12-10T00:00:00Z');
      const badge31d = computeDocumentExpiryBadge(exp31d, today);
      expect(badge31d.status).toBe('valid');
      expect(badge31d.badgeColor).toBe('green');
      expect(badge31d.alertRequired).toBe(false);

      // Exactly 30 days ahead: December 9, 2026 -> EXPIRING_SOON
      const exp30d = new Date('2026-12-09T00:00:00Z');
      const badge30d = computeDocumentExpiryBadge(exp30d, today);
      expect(badge30d.status).toBe('expiring_soon');
      expect(badge30d.badgeColor).toBe('amber');
      expect(badge30d.alertRequired).toBe(true);

      // 1 day ahead: November 10, 2026 -> EXPIRING_SOON
      const exp1d = new Date('2026-11-10T00:00:00Z');
      const badge1d = computeDocumentExpiryBadge(exp1d, today);
      expect(badge1d.status).toBe('expiring_soon');
      expect(badge1d.badgeColor).toBe('amber');
      expect(badge1d.alertRequired).toBe(true);

      // Exactly 0 days ahead (Expires today): November 9, 2026 -> EXPIRED
      const exp0d = new Date('2026-11-09T00:00:00Z');
      const badge0d = computeDocumentExpiryBadge(exp0d, today);
      expect(badge0d.status).toBe('expired');
      expect(badge0d.badgeColor).toBe('red');
      expect(badge0d.alertRequired).toBe(true);

      // Expired 1 day ago: November 8, 2026 -> EXPIRED
      const expPast1d = new Date('2026-11-08T00:00:00Z');
      const badgePast = computeDocumentExpiryBadge(expPast1d, today);
      expect(badgePast.status).toBe('expired');
      expect(badgePast.badgeLabel).toContain('1d ago');
    });
  });

  // ==========================================================================
  // BOUNDARY GROUP 4: LR SEQUENCE BOUNDARIES & TENANT PREFIX SANITIZATION
  // ==========================================================================
  describe('Boundary Group 4: LR Sequence Boundaries & Tenant Prefix', () => {
    it('TC-STAT-BVA-09: tests sequence padding and high sequence numbers (9999 to 10000+)', () => {
      const fy = '2026-27';
      expect(generateTenantUniqueLRNumber('ALPHA', 1, fy)).toBe('ALPHA/2026-27/LR-0001');
      expect(generateTenantUniqueLRNumber('ALPHA', 9999, fy)).toBe('ALPHA/2026-27/LR-9999');
      expect(generateTenantUniqueLRNumber('ALPHA', 10000, fy)).toBe('ALPHA/2026-27/LR-10000');
      expect(generateTenantUniqueLRNumber('ALPHA', 154820, fy)).toBe('ALPHA/2026-27/LR-154820');
    });

    it('TC-STAT-BVA-10: sanitizes noisy tenant prefix inputs (special characters, lowercase, length limit)', () => {
      const fy = '2026-27';
      // '@alpha#123_test' -> 'ALPHA123' (first 8 alphanumeric chars uppercase)
      const res = generateTenantUniqueLRNumber('@alpha#123_test', 5, fy);
      expect(res).toBe('ALPHA123/2026-27/LR-0005');

      // Empty string prefix defaults to 'SF'
      const resEmpty = generateTenantUniqueLRNumber('', 1, fy);
      expect(resEmpty).toBe('SF/2026-27/LR-0001');
    });

    it('TC-STAT-BVA-11: calculates financial year across calendar month boundary (March vs April)', () => {
      const marchDate = new Date('2026-03-31T23:59:59Z');
      expect(getCurrentFinancialYear(marchDate)).toBe('2025-26');

      const aprilDate = new Date('2026-04-01T00:00:01Z');
      expect(getCurrentFinancialYear(aprilDate)).toBe('2026-27');
    });
  });

  // ==========================================================================
  // BOUNDARY GROUP 5: MoRTH PLATE & SARATHI DL FORMAT BOUNDARIES
  // ==========================================================================
  describe('Boundary Group 5: MoRTH Plate & SARATHI DL Format Boundaries', () => {
    it('TC-STAT-BVA-12: validates MoRTH registration plate character length boundary (8, 10, 11)', () => {
      // 8 characters (no series letter): 'GJ051234'
      const plate8 = validateMoRTHRegistrationPlate('GJ051234');
      expect(plate8.isValid).toBe(true);

      // 10 characters (2 series letters): 'GJ05BZ8821'
      const plate10 = validateMoRTHRegistrationPlate('GJ05BZ8821');
      expect(plate10.isValid).toBe(true);

      // 11 characters (3 series letters): 'MH04AAA1234'
      const plate11 = validateMoRTHRegistrationPlate('MH04AAA1234');
      expect(plate11.isValid).toBe(true);

      // 7 characters (too short): 'GJ05123'
      const plate7 = validateMoRTHRegistrationPlate('GJ05123');
      expect(plate7.isValid).toBe(false);

      // 12 characters (too long): 'MH04AAAA1234'
      const plate12 = validateMoRTHRegistrationPlate('MH04AAAA1234');
      expect(plate12.isValid).toBe(false);
    });

    it('TC-STAT-BVA-13: validates SARATHI commercial DL issue year boundary (1960 vs 1959, current year vs future)', () => {
      const currentYear = new Date().getFullYear();

      // Issue year 1960: valid boundary min
      const dl1960 = validateSARATHICommercialDL({ dlNumber: 'GJ0519600012345', endorsements: ['TRANS'] });
      expect(dl1960.isValid).toBe(true);

      // Issue year 1959: invalid under boundary
      const dl1959 = validateSARATHICommercialDL({ dlNumber: 'GJ0519590012345', endorsements: ['TRANS'] });
      expect(dl1959.isValid).toBe(false);

      // Current year: valid boundary max
      const dlCurr = validateSARATHICommercialDL({ dlNumber: `GJ05${currentYear}0012345`, endorsements: ['TRANS'] });
      expect(dlCurr.isValid).toBe(true);

      // Future year: invalid over boundary
      const dlFuture = validateSARATHICommercialDL({ dlNumber: `GJ05${currentYear + 1}0012345`, endorsements: ['TRANS'] });
      expect(dlFuture.isValid).toBe(false);
    });

    it('TC-STAT-BVA-14: calculates FASTag toll along partial segments of NH-48', () => {
      // Short segment: Chainage 0 to 120 km (Kharbao and Charoti only)
      const segment = calculateFASTagCorridorToll(0, 120, '2_AXLE');
      expect(segment.plazaCount).toBe(2);
      expect(segment.totalTollINR).toBe(165 + 190); // Kharbao (165) + Charoti (190)

      // Inverted segment: 500 down to 300 km (Vasad, Bharuch)
      const inverted = calculateFASTagCorridorToll(500, 300, '2_AXLE');
      expect(inverted.plazaCount).toBe(2);
      expect(inverted.totalTollINR).toBe(210 + 175); // Bharuch (210) + Vasad (175)
    });
  });
});
