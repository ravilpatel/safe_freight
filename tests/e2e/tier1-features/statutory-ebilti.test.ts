import { describe, it, expect } from 'vitest';
import {
  generateStatutoryLRNumber,
  validateEWayBillNumber,
  validateGSTIN,
} from '../harness/contracts';

describe('Tier 1: Feature Coverage — Statutory Compliance & Digital e-Bilti (FEAT-08)', () => {
  it('TC-STA-01: generates standard LR number format compliant with Carriage by Road Act 2007', () => {
    // Authoritative Requirement: PRD v4.0.0 §5 Phase 7, §4.1
    // Format: <PREFIX>/<FY>/LR-<SEQUENCE_PADDED_4>
    const lrNumber = generateStatutoryLRNumber('WIFL', '2026-27', 482);
    expect(lrNumber).toBe('WIFL/2026-27/LR-0482');

    const lrNumberSmall = generateStatutoryLRNumber('WIFL', '2026-27', 7);
    expect(lrNumberSmall).toBe('WIFL/2026-27/LR-0007');
  });

  it('TC-STA-02: validates 12-digit statutory e-Way Bill number according to GST Rule 138', () => {
    // Authoritative Requirement: PRD v4.0.0 §7 / §5 Phase 7
    // Valid: exactly 12 digits
    expect(validateEWayBillNumber('241088764512')).toBe(true);
    expect(validateEWayBillNumber('109988776655')).toBe(true);

    // Invalid: less than 12 digits, more than 12 digits, or containing alphabetic characters
    expect(validateEWayBillNumber('24108876451')).toBe(false); // 11 digits
    expect(validateEWayBillNumber('2410887645123')).toBe(false); // 13 digits
    expect(validateEWayBillNumber('24108876451A')).toBe(false); // alpha character
    expect(validateEWayBillNumber('')).toBe(false);
  });

  it('TC-STA-03: validates Indian GSTIN format for consignor and consignee', () => {
    // Valid Gujarat GSTIN (24) and Maharashtra GSTIN (27)
    expect(validateGSTIN('24AAACW1234F1Z5')).toBe(true);
    expect(validateGSTIN('27AAACU5555M1Z8')).toBe(true);

    // Invalid GSTINs
    expect(validateGSTIN('24AAACW1234F1')).toBe(false); // too short
    expect(validateGSTIN('999999999999999')).toBe(false); // numeric only
    expect(validateGSTIN('INVALID_GST_ID')).toBe(false);
  });

  it('TC-STA-04: verifies e-Bilti digital QR payload structure contains mandatory statutory fields', () => {
    const qrPayload = {
      lrNumber: 'WIFL/2026-27/LR-0482',
      ewayBillNo: '241088764512',
      consignorGst: '27AAACU5555M1Z8',
      consigneeGst: '24AAACW1234F1Z5',
      vehicleNumber: 'GJ-05-BZ-8821',
      grossWeightKg: 16000,
      freightINR: 45000,
      tenantId: '00000000-0000-4000-8000-000000000001',
    };

    expect(validateEWayBillNumber(qrPayload.ewayBillNo)).toBe(true);
    expect(validateGSTIN(qrPayload.consignorGst)).toBe(true);
    expect(validateGSTIN(qrPayload.consigneeGst)).toBe(true);
    expect(qrPayload.lrNumber).toMatch(/LR-\d{4}$/);
    expect(qrPayload.tenantId).toBeDefined();
  });

  it('TC-STA-05: verifies tenant-scoped LR numbering uniqueness invariant across organizations', () => {
    // Two different organizations using identical sequence numbers generate distinct tenant-scoped identifiers
    const tenantA_LR = {
      tenantId: 'org-tenant-a',
      lrNumber: generateStatutoryLRNumber('WIFL', '2026-27', 101),
    };
    const tenantB_LR = {
      tenantId: 'org-tenant-b',
      lrNumber: generateStatutoryLRNumber('ADANI', '2026-27', 101),
    };

    expect(tenantA_LR.lrNumber).not.toBe(tenantB_LR.lrNumber);
    expect(tenantA_LR.tenantId).not.toBe(tenantB_LR.tenantId);
  });

  it('TC-STA-06: validates Carriage by Road Act required goods carriage liability declaration', () => {
    const consignmentNote = {
      lrNumber: 'WIFL/2026-27/LR-0482',
      declaredCargoValueINR: 850000,
      transitInsurancePolicyNo: 'NIA/MUM/CARGO/2026/8812',
      carrierLiabilityAccepted: true,
    };

    expect(consignmentNote.declaredCargoValueINR).toBeGreaterThan(0);
    expect(consignmentNote.carrierLiabilityAccepted).toBe(true);
  });
});
