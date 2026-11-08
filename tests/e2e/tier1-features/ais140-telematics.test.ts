import { describe, it, expect } from 'vitest';
import { classifyAIS140GForce } from '../harness/contracts';

describe('Tier 1: Feature Coverage — AIS-140 Crash Classification Engine (FEAT-05)', () => {
  it('TC-AIS-01: classifies gentle road driving (< 2.5G) as ROAD_NOISE with zero emergency trigger', () => {
    // Normal cruising: ax = 1.2 m/s^2, ay = 0.8 m/s^2, az = 9.81 m/s^2 (gravity)
    // TotalG = sqrt(1.2^2 + 0.8^2 + 9.81^2) / 9.81 = sqrt(1.44 + 0.64 + 96.2361) / 9.81 = 1.01G
    const result = classifyAIS140GForce(1.2, 0.8, 9.81);

    expect(result.classification).toBe('ROAD_NOISE');
    expect(result.isTriggerEmergency).toBe(false);
    expect(result.totalG).toBe(1.01);
  });

  it('TC-AIS-02: classifies severe pothole / rumble strip (< 2.5G) as ROAD_NOISE', () => {
    // Pothole bump: ax = 2.0, ay = 1.5, az = 20.0 m/s^2
    // TotalG = sqrt(4 + 2.25 + 400) / 9.81 = sqrt(406.25) / 9.81 = 20.155 / 9.81 = 2.05G
    const result = classifyAIS140GForce(2.0, 1.5, 20.0);

    expect(result.totalG).toBe(2.05);
    expect(result.classification).toBe('ROAD_NOISE');
    expect(result.isTriggerEmergency).toBe(false);
  });

  it('TC-AIS-03: filters dropped smartphone on cabin floor as CABIN_DROP_ANOMALY', () => {
    // Phone drops on floor: high vertical shock az = 35.0 m/s^2 (3.57G), but negligible lateral
    // ax = 0.5 (0.05G), ay = 0.4 (0.04G)
    // TotalG = sqrt(0.25 + 0.16 + 1225) / 9.81 = 35.005 / 9.81 = 3.57G
    const result = classifyAIS140GForce(0.5, 0.4, 35.0);

    expect(result.classification).toBe('CABIN_DROP_ANOMALY');
    expect(result.isTriggerEmergency).toBe(false);
    expect(result.actionRequired).toContain('single-axis vertical transient');
  });

  it('TC-AIS-04: triggers COLLISION_CRASH and Golden Hour sequence on high-velocity multi-axial collision', () => {
    // High-speed collision at 60 km/h into barrier:
    // ax = 32.0 m/s^2 (3.26G lateral), ay = 25.0 m/s^2 (2.55G lateral), az = 19.62 m/s^2 (2.0G vertical)
    // TotalG = sqrt(1024 + 625 + 384.94) / 9.81 = sqrt(2033.94) / 9.81 = 45.099 / 9.81 = 4.60G
    const result = classifyAIS140GForce(32.0, 25.0, 19.62);

    expect(result.totalG).toBe(4.6);
    expect(result.classification).toBe('COLLISION_CRASH');
    expect(result.isTriggerEmergency).toBe(true);
    expect(result.actionRequired).toContain('Golden Hour T0 sequence');
  });

  it('TC-AIS-05: correctly computes 3D Euclidean magnitude from tri-axial vector', () => {
    // Test known orthogonal triple: (9.81, 9.81, 9.81) -> sqrt(3 * 9.81^2) / 9.81 = sqrt(3) = 1.73G
    const result = classifyAIS140GForce(9.81, 9.81, 9.81);
    expect(result.totalG).toBe(1.73);
  });

  it('TC-AIS-06: rejects NaN or invalid accelerometer readings with descriptive error', () => {
    expect(() => classifyAIS140GForce(NaN, 10, 10)).toThrow(/NaN/);
    expect(() => classifyAIS140GForce(10, NaN, 10)).toThrow(/NaN/);
    expect(() => classifyAIS140GForce(10, 10, NaN)).toThrow(/NaN/);
  });
});
