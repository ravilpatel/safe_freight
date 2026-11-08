import { describe, it, expect } from 'vitest';
import {
  generateStatutoryLRNumber,
  validateEWayBillNumber,
  validateGSTIN,
} from '../harness/contracts';

describe('Tier 2: Boundary Value Analysis — Statutory Compliance & Digital e-Bilti (FEAT-08)', () => {
  it('TC-STA-BVA-01: handles sequence number boundary at 9999 and overflow to 5 digits (10000)', () => {
    const lr9999 = generateStatutoryLRNumber('WIFL', '2026-27', 9999);
    expect(lr9999).toBe('WIFL/2026-27/LR-9999');

    const lr10000 = generateStatutoryLRNumber('WIFL', '2026-27', 10000);
    expect(lr10000).toBe('WIFL/2026-27/LR-10000');
  });

  it('TC-STA-BVA-02: verifies e-Way Bill exact 12-digit length boundaries (11 digits, 12 digits, 13 digits)', () => {
    // 11 digits: off-by-one under
    expect(validateEWayBillNumber('12345678901')).toBe(false);

    // Exactly 12 digits: valid
    expect(validateEWayBillNumber('123456789012')).toBe(true);

    // 13 digits: off-by-one over
    expect(validateEWayBillNumber('1234567890123')).toBe(false);
  });

  it('TC-STA-BVA-03: verifies all 2-digit Indian State Codes for GSTIN (e.g. 24 Gujarat, 27 Maharashtra, 08 Rajasthan, 29 Karnataka)', () => {
    const states = [
      { code: '24', state: 'Gujarat' },
      { code: '27', state: 'Maharashtra' },
      { code: '08', state: 'Rajasthan' },
      { code: '29', state: 'Karnataka' },
      { code: '07', state: 'Delhi' },
    ];

    for (const s of states) {
      const gstin = `${s.code}AABCB1234C1Z5`;
      expect(validateGSTIN(gstin)).toBe(true);
    }
  });

  it('TC-STA-BVA-04: rejects GSTINs with invalid 14th character (must be statutory "Z")', () => {
    // Indian GSTIN rule: character 14 is default "Z"
    const validGstin = '24AAACW1234F1Z5';
    const invalidChar14 = '24AAACW1234F1A5'; // 'A' instead of 'Z'

    expect(validateGSTIN(validGstin)).toBe(true);
    expect(validateGSTIN(invalidChar14)).toBe(false);
  });

  it('TC-STA-BVA-05: handles financial year rollover transition (2025-26 to 2026-27)', () => {
    const oldFY = generateStatutoryLRNumber('WIFL', '2025-26', 1540);
    const newFY = generateStatutoryLRNumber('WIFL', '2026-27', 1);

    expect(oldFY).toBe('WIFL/2025-26/LR-1540');
    expect(newFY).toBe('WIFL/2026-27/LR-0001');
  });

  it('TC-STA-BVA-06: rejects special characters, spaces, and lowercase in GSTIN', () => {
    expect(validateGSTIN(' 24AAACW1234F1Z5 ')).toBe(false);
    expect(validateGSTIN('24aaacw1234f1z5')).toBe(false);
    expect(validateGSTIN('24-AAACW-1234-F1Z5')).toBe(false);
  });
});
