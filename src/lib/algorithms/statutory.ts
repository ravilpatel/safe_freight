/**
 * SafeFreight OS — Statutory Compliance & e-Bilti Utilities
 * Reference: PRD v4.0.0 §5 Phase 7, §10
 */

export function generateStatutoryLRNumber(
  prefix: string = 'WIFL',
  financialYear: string = '2026-27',
  sequence: number = 482
): string {
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}/${financialYear}/LR-${padded}`;
}

export function validateEWayBillNumber(ewayBill: string): boolean {
  // Statutory Indian e-Way Bill is strictly a 12-digit numeric identifier
  return /^\d{12}$/.test(ewayBill);
}

export function validateGSTIN(gstin: string): boolean {
  // Indian GSTIN format: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 checksum
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}
