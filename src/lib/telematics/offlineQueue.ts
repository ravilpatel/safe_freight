/**
 * SafeFreight OS — Offline-First Telemetry Queue Buffer (Module G)
 * Reference: PRD v4.0.0 §5 Phase 6, PRD v3 FR-OF-01, FR-OF-02, FR-OF-03
 *
 * Buffers GPS coordinates, speed, and sensor pings locally in localStorage / in-memory
 * (up to 500 pings) during highway cellular blackspots. Automatically flushes on reconnect.
 */

export interface QueuedPing {
  id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  g_force: number;
  ax?: number;
  ay?: number;
  az?: number;
  timestamp: string;
}

export interface QueuedDistress {
  id: string;
  trip_id?: string;
  driver_id?: string;
  vehicle_plate?: string;
  coords: { lat: number; lng: number };
  speed: number;
  g_force: number;
  emergency_type: string;
  timestamp: string;
  contact_phone?: string;
}

export interface QueueStatus {
  isOnline: boolean;
  queuedPingsCount: number;
  queuedDistressCount: number;
  lastSyncTime: string | null;
}

const STORAGE_KEY_PINGS = 'safefreight_queued_pings';
const STORAGE_KEY_DISTRESS = 'safefreight_queued_distress';
const MAX_BUFFER_CAPACITY = 500;

class OfflineTelemetryQueue {
  private inMemoryPings: QueuedPing[] = [];
  private inMemoryDistress: QueuedDistress[] = [];
  private onlineStatus: boolean = true;
  private lastSyncTime: string | null = null;
  private listeners: Set<(_status: QueueStatus) => void> = new Set();
  private isFlushing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.onlineStatus = navigator.onLine;
      this.loadFromStorage();

      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.onlineStatus = true;
    this.notifyListeners();
    this.flush();
  };

  private handleOffline = () => {
    this.onlineStatus = false;
    this.notifyListeners();
  };

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedPings = localStorage.getItem(STORAGE_KEY_PINGS);
        if (storedPings) {
          this.inMemoryPings = JSON.parse(storedPings);
        }
        const storedDistress = localStorage.getItem(STORAGE_KEY_DISTRESS);
        if (storedDistress) {
          this.inMemoryDistress = JSON.parse(storedDistress);
        }
      }
    } catch {
      // Memory fallback active
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_PINGS, JSON.stringify(this.inMemoryPings));
        localStorage.setItem(STORAGE_KEY_DISTRESS, JSON.stringify(this.inMemoryDistress));
      }
    } catch {
      // Storage quota or restriction handled gracefully
    }
  }

  public isOnline(): boolean {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return this.onlineStatus;
  }

  public setOnlineStatus(online: boolean): void {
    this.onlineStatus = online;
    this.notifyListeners();
    if (online) {
      this.flush();
    }
  }

  public enqueuePing(ping: Omit<QueuedPing, 'id'>): QueuedPing {
    const record: QueuedPing = {
      ...ping,
      id: `ping-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: ping.timestamp || new Date().toISOString(),
    };

    // FIFO eviction: if buffer reaches MAX_BUFFER_CAPACITY (500), drop oldest ordinary ping
    if (this.inMemoryPings.length >= MAX_BUFFER_CAPACITY) {
      this.inMemoryPings.shift();
    }

    this.inMemoryPings.push(record);
    this.persistToStorage();
    this.notifyListeners();

    // If online, trigger auto-flush
    if (this.isOnline()) {
      this.flush();
    }

    return record;
  }

  public enqueueDistress(distress: Omit<QueuedDistress, 'id'>): QueuedDistress {
    const record: QueuedDistress = {
      ...distress,
      id: `sos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: distress.timestamp || new Date().toISOString(),
    };

    // Safety incident payloads are high-priority and NEVER evicted
    this.inMemoryDistress.push(record);
    this.persistToStorage();
    this.notifyListeners();

    if (this.isOnline()) {
      this.flush();
    }

    return record;
  }

  public async flush(authToken?: string): Promise<{ flushedPings: number; flushedDistress: number }> {
    if (this.isFlushing || !this.isOnline()) {
      return { flushedPings: 0, flushedDistress: 0 };
    }

    if (this.inMemoryPings.length === 0 && this.inMemoryDistress.length === 0) {
      return { flushedPings: 0, flushedDistress: 0 };
    }

    this.isFlushing = true;
    let flushedDistress = 0;
    let flushedPings = 0;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      // 1. Priority Flush: Safety Incident Distress Payloads
      while (this.inMemoryDistress.length > 0) {
        const item = this.inMemoryDistress[0];
        try {
          const res = await fetch('/api/v1/safety/sos', {
            method: 'POST',
            headers: {
              ...headers,
              'Idempotency-Key': item.id,
            },
            body: JSON.stringify(item),
          });

          if (res.ok || res.status === 409) {
            this.inMemoryDistress.shift();
            flushedDistress++;
          } else {
            // Stop if backend returns unrecoverable error
            break;
          }
        } catch {
          // Network dropped mid-flush, break to retry later
          break;
        }
      }

      // 2. Batch Flush: Telemetry Pings (batches of 50)
      while (this.inMemoryPings.length > 0) {
        const batch = this.inMemoryPings.slice(0, 50);
        try {
          const res = await fetch('/api/v1/pings', {
            method: 'POST',
            headers,
            body: JSON.stringify({ pings: batch }),
          });

          if (res.ok) {
            this.inMemoryPings.splice(0, batch.length);
            flushedPings += batch.length;
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.persistToStorage();
    } finally {
      this.isFlushing = false;
      this.notifyListeners();
    }

    return { flushedPings, flushedDistress };
  }

  public getStatus(): QueueStatus {
    return {
      isOnline: this.isOnline(),
      queuedPingsCount: this.inMemoryPings.length,
      queuedDistressCount: this.inMemoryDistress.length,
      lastSyncTime: this.lastSyncTime,
    };
  }

  public clear(): void {
    this.inMemoryPings = [];
    this.inMemoryDistress = [];
    this.persistToStorage();
    this.notifyListeners();
  }

  public subscribe(listener: (_status: QueueStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch {
        // Listener error ignored
      }
    });
  }
}

export const offlineTelemetryQueue = new OfflineTelemetryQueue();
