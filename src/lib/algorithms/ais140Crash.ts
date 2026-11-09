/**
 * SafeFreight OS — AIS-140 Telematics & G-Force Crash Classification Engine
 * Reference: PRD v4.0.0 §7, §5.5 & CTO Phase 2 Directives
 */

export type AIS140ImpactClassification =
  | 'ROAD_NOISE'
  | 'CABIN_DROP_ANOMALY'
  | 'COLLISION_CRASH';

export interface AIS140ClassificationResult {
  ax: number;
  ay: number;
  az: number;
  totalG: number;
  classification: AIS140ImpactClassification;
  isTriggerEmergency: boolean;
  actionRequired: string;
}

export function classifyAIS140GForce(
  ax: number,
  ay: number,
  az: number
): AIS140ClassificationResult {
  if (!isFinite(ax) || !isFinite(ay) || !isFinite(az)) {
    throw new Error('Invalid accelerometer reading: NaN or non-finite value detected');
  }

  const gTotal = Math.sqrt(ax * ax + ay * ay + az * az) / 9.81;
  const roundedTotalG = Math.round(gTotal * 100) / 100;

  const lateralG_X = Math.abs(ax) / 9.81;
  const lateralG_Y = Math.abs(ay) / 9.81;
  const verticalG_Z = Math.abs(az) / 9.81;

  if (roundedTotalG < 2.5) {
    return {
      ax,
      ay,
      az,
      totalG: roundedTotalG,
      classification: 'ROAD_NOISE',
      isTriggerEmergency: false,
      actionRequired: 'Damped vertical transient discarded. Zero alert triggered.',
    };
  }

  // Single-axis vertical transient check (e.g. dropped phone on cabin floor, az spike alone)
  if (verticalG_Z >= 3.0 && lateralG_X < 1.0 && lateralG_Y < 1.0) {
    return {
      ax,
      ay,
      az,
      totalG: roundedTotalG,
      classification: 'CABIN_DROP_ANOMALY',
      isTriggerEmergency: false,
      actionRequired: 'Filtered out as single-axis vertical transient. Zero alert triggered.',
    };
  }

  // High-velocity structural vehicular collision: TotalG >= 4.0G and significant lateral vector
  if (roundedTotalG >= 4.0 && (lateralG_X >= 1.0 || lateralG_Y >= 1.0)) {
    return {
      ax,
      ay,
      az,
      totalG: roundedTotalG,
      classification: 'COLLISION_CRASH',
      isTriggerEmergency: true,
      actionRequired:
        'Initiate Golden Hour T0 sequence: 30s vernacular countdown, siren, 96dp safe button, 112 ERSS dispatch.',
    };
  }

  // Intermediate transient above 2.5G but below collision threshold
  return {
    ax,
    ay,
    az,
    totalG: roundedTotalG,
    classification: 'ROAD_NOISE',
    isTriggerEmergency: false,
    actionRequired: 'Sub-collision transient logged without triggering distress alert.',
  };
}
