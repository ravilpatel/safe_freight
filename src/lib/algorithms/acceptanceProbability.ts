/**
 * SafeFreight OS — Shipper Acceptance Probability Engine
 * Reference: PRD v4.0.0 §7, §5.3 & CTO Phase 2 Directives
 */

export type DispatchSpeedBand =
  | 'Instant (< 10 mins)'
  | '15 – 30 mins'
  | '45 – 60 mins'
  | '2 – 4 hours';

export interface AcceptanceProbabilityResult {
  userBidAdditionINR: number;
  minPricingINR: number;
  offeredBidINR: number;
  bonusRatio: number;
  probabilityPercent: number;
  dispatchSpeedBand: DispatchSpeedBand;
}

export function calculateAcceptanceProbability(
  userBidAdditionINR: number,
  minPricingINR: number
): AcceptanceProbabilityResult {
  const base = Math.max(1, isFinite(minPricingINR) ? minPricingINR : 1);
  const addition = isFinite(userBidAdditionINR) ? userBidAdditionINR : 0;
  const offeredBidINR = base + Math.max(0, addition);
  const bonusRatio = addition / base;

  let probabilityPercent: number;

  if (bonusRatio <= 0) {
    probabilityPercent = 48;
  } else if (bonusRatio < 0.08) {
    probabilityPercent = Math.round(48 + bonusRatio * 250);
  } else if (bonusRatio < 0.18) {
    probabilityPercent = Math.round(68 + (bonusRatio - 0.08) * 180);
  } else {
    probabilityPercent = Math.min(99, Math.round(86 + (bonusRatio - 0.18) * 100));
  }

  let dispatchSpeedBand: DispatchSpeedBand;
  if (probabilityPercent >= 92) {
    dispatchSpeedBand = 'Instant (< 10 mins)';
  } else if (probabilityPercent >= 80) {
    dispatchSpeedBand = '15 – 30 mins';
  } else if (probabilityPercent >= 65) {
    dispatchSpeedBand = '45 – 60 mins';
  } else {
    dispatchSpeedBand = '2 – 4 hours';
  }

  return {
    userBidAdditionINR: addition,
    minPricingINR: base,
    offeredBidINR,
    bonusRatio,
    probabilityPercent,
    dispatchSpeedBand,
  };
}

/**
 * Convenience helper accepting absolute user bid rather than bid increment.
 */
export function calculateBidProbability(
  totalBidINR: number,
  minPricingINR: number
): AcceptanceProbabilityResult {
  const userBidAddition = totalBidINR - minPricingINR;
  return calculateAcceptanceProbability(userBidAddition, minPricingINR);
}
