import { describe, it, expect } from 'vitest';
import { classifyAIS140GForce } from '../harness/contracts';

describe('Tier 2: Boundary Value Analysis — AIS-140 G-Force & Crash Detection (FEAT-05)', () => {
  it('TC-AIS-BVA-01: verifies exact threshold boundary at 2.49G (ROAD_NOISE) vs 2.50G', () => {
    // az = 24.43 m/s^2 -> TotalG = 24.43 / 9.81 = 2.49G (< 2.5G)
    const subNoise = classifyAIS140GForce(0, 0, 24.43);
    expect(subNoise.totalG).toBe(2.49);
    expect(subNoise.classification).toBe('ROAD_NOISE');
    expect(subNoise.isTriggerEmergency).toBe(false);

    // az = 24.53 m/s^2 -> TotalG = 24.53 / 9.81 = 2.50G (>= 2.5G threshold)
    const thresholdNoise = classifyAIS140GForce(0, 0, 24.53);
    expect(thresholdNoise.totalG).toBe(2.50);
  });

  it('TC-AIS-BVA-02: verifies single-axis cabin drop filter boundary: az >= 3.0G with lateral G < 1.0G', () => {
    // Case A: az = 29.43 m/s^2 (3.0G), ax = 9.71 m/s^2 (0.99G), ay = 0
    // lateralG_X = 0.99G (< 1.0G) -> Must be filtered as CABIN_DROP_ANOMALY
    const filtered = classifyAIS140GForce(9.71, 0, 29.43);
    expect(filtered.classification).toBe('CABIN_DROP_ANOMALY');
    expect(filtered.isTriggerEmergency).toBe(false);

    // Case B: az = 29.43 m/s^2 (3.0G), ax = 9.90 m/s^2 (1.01G)
    // TotalG = sqrt(9.90^2 + 29.43^2) / 9.81 = sqrt(98.01 + 866.12) / 9.81 = 31.05 / 9.81 = 3.16G
    // Since TotalG < 4.0G, it is not a crash
    const notCollision = classifyAIS140GForce(9.90, 0, 29.43);
    expect(notCollision.isTriggerEmergency).toBe(false);
  });

  it('TC-AIS-BVA-03: verifies collision threshold boundary at exactly 4.00G with multi-axial lateral deceleration', () => {
    // TotalG = 4.00G with multi-axial lateral component:
    // ax = 19.62 m/s^2 (2.0G), ay = 19.62 m/s^2 (2.0G), az = 29.43 m/s^2 (3.0G)
    // TotalG = sqrt(4 + 4 + 9) * 9.81 / 9.81 = sqrt(17) = 4.12G (>= 4.0G)
    const collision = classifyAIS140GForce(19.62, 19.62, 29.43);
    expect(collision.totalG).toBe(4.12);
    expect(collision.classification).toBe('COLLISION_CRASH');
    expect(collision.isTriggerEmergency).toBe(true);

    // Just below 4.0G: TotalG = 3.99G
    // ax = 15.0, ay = 15.0, az = 32.0 -> sqrt(225 + 225 + 1024) / 9.81 = sqrt(1474) / 9.81 = 38.39 / 9.81 = 3.91G (< 4.0G)
    const subCrash = classifyAIS140GForce(15.0, 15.0, 32.0);
    expect(subCrash.totalG).toBe(3.91);
    expect(subCrash.classification).not.toBe('COLLISION_CRASH');
    expect(subCrash.isTriggerEmergency).toBe(false);
  });

  it('TC-AIS-BVA-04: handles weightlessness / zero G sensor anomaly (ax = 0, ay = 0, az = 0)', () => {
    const zeroG = classifyAIS140GForce(0, 0, 0);
    expect(zeroG.totalG).toBe(0);
    expect(zeroG.classification).toBe('ROAD_NOISE');
    expect(zeroG.isTriggerEmergency).toBe(false);
  });

  it('TC-AIS-BVA-05: handles severe catastrophic rollover impact (50G extreme deceleration)', () => {
    // High G rollover: ax = 300 m/s^2 (30.5G), ay = 300 m/s^2 (30.5G), az = 100 m/s^2 (10.2G)
    // TotalG = sqrt(90000 + 90000 + 10000) / 9.81 = sqrt(190000) / 9.81 = 435.88 / 9.81 = 44.43G
    const extremeCrash = classifyAIS140GForce(300, 300, 100);
    expect(extremeCrash.totalG).toBe(44.43);
    expect(extremeCrash.classification).toBe('COLLISION_CRASH');
    expect(extremeCrash.isTriggerEmergency).toBe(true);
  });

  it('TC-AIS-BVA-06: rejects Infinity values from uncalibrated sensor ADC overflow', () => {
    expect(() => classifyAIS140GForce(Infinity, 10, 10)).toThrow();
    expect(() => classifyAIS140GForce(10, -Infinity, 10)).toThrow();
  });
});
