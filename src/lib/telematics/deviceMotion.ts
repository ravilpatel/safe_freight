/**
 * SafeFreight OS — Sensor Telemetry, AIS-140 Classifier & Gyroscopic Rollover Engine
 * Reference: PRD v4.0.0 §5 Phase 6, PRD v3 FR-SF-01, FR-SF-07
 */

import { classifyAIS140GForce, AIS140ClassificationResult } from '@/lib/algorithms/ais140Crash';

export interface MotionData {
  ax: number;
  ay: number;
  az: number;
  totalG: number;
  classification: string;
  isCollision: boolean;
  tiltAngle: number;
  isRolloverRisk: boolean;
}

export type MotionCallback = (_data: MotionData) => void;
export type CollisionCallback = (_result: AIS140ClassificationResult) => void;
export type RolloverCallback = (_tiltAngle: number) => void;

class DeviceMotionService {
  private isListening: boolean = false;
  private currentMotion: MotionData = {
    ax: 0,
    ay: 0,
    az: 9.81,
    totalG: 1.0,
    classification: 'ROAD_NOISE',
    isCollision: false,
    tiltAngle: 0,
    isRolloverRisk: false,
  };

  private motionCallbacks: Set<MotionCallback> = new Set();
  private collisionCallbacks: Set<CollisionCallback> = new Set();
  private rolloverCallbacks: Set<RolloverCallback> = new Set();

  private lastRolloverWarningTime: number = 0;
  private readonly ROLLOVER_DEBOUNCE_MS = 10000; // 10s cooldown for sharp curves

  constructor() {
    // Initialized ready for browser environment
  }

  public startListening(): boolean {
    if (typeof window === 'undefined' || this.isListening) {
      return false;
    }

    try {
      if ('DeviceMotionEvent' in window) {
        window.addEventListener('devicemotion', this.handleDeviceMotion, true);
      }
      if ('DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
      }
      this.isListening = true;
      return true;
    } catch {
      return false;
    }
  }

  public stopListening(): void {
    if (typeof window === 'undefined' || !this.isListening) {
      return;
    }

    window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
    this.isListening = false;
  }

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const ax = acc.x ?? 0;
    const ay = acc.y ?? 0;
    const az = acc.z ?? 9.81;

    this.processAcceleration(ax, ay, az);
  };

  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    const beta = Math.abs(event.beta ?? 0);   // Pitch (-180 to 180)
    const gamma = Math.abs(event.gamma ?? 0); // Roll (-90 to 90)
    const tilt = Math.max(beta, gamma);

    this.processOrientation(tilt);
  };

  public processAcceleration(ax: number, ay: number, az: number): MotionData {
    try {
      const triage = classifyAIS140GForce(ax, ay, az);
      const isCollision = triage.isTriggerEmergency && triage.classification === 'COLLISION_CRASH';

      this.currentMotion = {
        ...this.currentMotion,
        ax,
        ay,
        az,
        totalG: triage.totalG,
        classification: triage.classification,
        isCollision,
      };

      this.notifyMotion(this.currentMotion);

      if (isCollision) {
        this.notifyCollision(triage);
      }

      return this.currentMotion;
    } catch {
      return this.currentMotion;
    }
  }

  public processOrientation(tiltAngle: number): MotionData {
    const isRolloverRisk = tiltAngle > 30; // Threshold > 30 degrees per PRD v3 FR-SF-07

    this.currentMotion = {
      ...this.currentMotion,
      tiltAngle: Math.round(tiltAngle * 10) / 10,
      isRolloverRisk,
    };

    this.notifyMotion(this.currentMotion);

    const now = Date.now();
    if (isRolloverRisk && now - this.lastRolloverWarningTime > this.ROLLOVER_DEBOUNCE_MS) {
      this.lastRolloverWarningTime = now;
      this.notifyRollover(tiltAngle);
    }

    return this.currentMotion;
  }

  // ==========================================
  // IN-APP CRASH SIMULATION TEST SUITE (FR-SF-01)
  // ==========================================

  /**
   * Simulation 1: Normal Pothole / Rumble Strip (2.05G - Road Noise)
   * ax = 2.0, ay = 1.5, az = 20.0 m/s^2 -> TotalG = 2.05G (< 2.5G)
   */
  public simulatePothole(): MotionData {
    return this.processAcceleration(2.0, 1.5, 20.0);
  }

  /**
   * Simulation 2: Dropped Phone on Cabin Floor (3.57G on az alone - Filtered Anomaly)
   * ax = 0.5, ay = 0.4, az = 35.0 m/s^2 -> TotalG = 3.57G
   */
  public simulatePhoneDrop(): MotionData {
    return this.processAcceleration(0.5, 0.4, 35.0);
  }

  /**
   * Simulation 3: High-Velocity Vehicular Collision (4.60G multi-axial - Genuine Crash)
   * ax = 32.0, ay = 25.0, az = 19.62 m/s^2 -> TotalG = 4.60G
   */
  public simulateCollision(): MotionData {
    return this.processAcceleration(32.0, 25.0, 19.62);
  }

  /**
   * Simulation 4: Chassis Rollover Tilt (> 30 degrees)
   */
  public simulateRollover(tilt: number = 34.5): MotionData {
    return this.processOrientation(tilt);
  }

  // ==========================================
  // SUBSCRIBERS
  // ==========================================

  public onMotion(cb: MotionCallback): () => void {
    this.motionCallbacks.add(cb);
    cb(this.currentMotion);
    return () => this.motionCallbacks.delete(cb);
  }

  public onCollision(cb: CollisionCallback): () => void {
    this.collisionCallbacks.add(cb);
    return () => this.collisionCallbacks.delete(cb);
  }

  public onRollover(cb: RolloverCallback): () => void {
    this.rolloverCallbacks.add(cb);
    return () => this.rolloverCallbacks.delete(cb);
  }

  private notifyMotion(data: MotionData): void {
    this.motionCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch {
        // Ignored
      }
    });
  }

  private notifyCollision(result: AIS140ClassificationResult): void {
    this.collisionCallbacks.forEach((cb) => {
      try {
        cb(result);
      } catch {
        // Ignored
      }
    });
  }

  private notifyRollover(tiltAngle: number): void {
    this.rolloverCallbacks.forEach((cb) => {
      try {
        cb(tiltAngle);
      } catch {
        // Ignored
      }
    });
  }

  public getCurrentMotion(): MotionData {
    return this.currentMotion;
  }
}

export const deviceMotionService = new DeviceMotionService();
