/**
 * SafeFreight OS — Trip Khata Financial Settlement Engine
 * Reference: PRD v4.0.0 §7, §5.4 & CTO Phase 2 Directives
 */

export interface TripKhataAdvances {
  diesel?: number;
  fastag?: number;
  driverBhatta?: number;
  hamali?: number;
}

export interface TripKhataResult {
  grossFreightINR: number;
  dieselAdvanceINR: number;
  fastagAdvanceINR: number;
  driverBhattaINR: number;
  hamaliExpensesINR: number;
  totalDisbursedAdvancesINR: number;
  maintenanceReserveINR: number;
  balanceDueOnPODINR: number;
  totalOperatingCostsINR: number;
  netGrossProfitINR: number;
  profitMarginPercent: number;
}

export function calculateTripKhata(
  grossFreight: number,
  advances: TripKhataAdvances,
  maintenanceReserve: number = 0
): TripKhataResult {
  const gross = Math.max(0, isFinite(grossFreight) ? grossFreight : 0);
  const diesel = Math.max(0, advances?.diesel && isFinite(advances.diesel) ? advances.diesel : 0);
  const fastag = Math.max(0, advances?.fastag && isFinite(advances.fastag) ? advances.fastag : 0);
  const bhatta = Math.max(
    0,
    advances?.driverBhatta && isFinite(advances.driverBhatta) ? advances.driverBhatta : 0
  );
  const hamali = Math.max(0, advances?.hamali && isFinite(advances.hamali) ? advances.hamali : 0);
  const reserve = Math.max(0, isFinite(maintenanceReserve) ? maintenanceReserve : 0);

  const totalDisbursedAdvancesINR = diesel + fastag + bhatta + hamali;
  const balanceDueOnPODINR = Math.max(0, gross - totalDisbursedAdvancesINR);
  const totalOperatingCostsINR = totalDisbursedAdvancesINR + reserve;
  const netGrossProfitINR = gross - totalOperatingCostsINR;

  const profitMarginPercent =
    gross > 0 ? Math.round((netGrossProfitINR / gross) * 100 * 10) / 10 : 0;

  return {
    grossFreightINR: gross,
    dieselAdvanceINR: diesel,
    fastagAdvanceINR: fastag,
    driverBhattaINR: bhatta,
    hamaliExpensesINR: hamali,
    totalDisbursedAdvancesINR,
    maintenanceReserveINR: reserve,
    balanceDueOnPODINR,
    totalOperatingCostsINR,
    netGrossProfitINR,
    profitMarginPercent,
  };
}
