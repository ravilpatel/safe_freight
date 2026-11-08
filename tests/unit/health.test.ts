import path from 'path';
import dotenv from 'dotenv';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@/lib/logger';
import { handleHealthCheck } from '@/lib/health';

// Load local environment for health check probe against Supabase Cloud
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

describe('Structured JSON Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('emits valid structured JSON with timestamp, level, context, and message', () => {
    const logger = new Logger({ context: 'TestLogger' });
    const payload = logger.info('Test log message', { trace_id: 'test-123' });

    expect(payload).toHaveProperty('timestamp');
    expect(payload.level).toBe('INFO');
    expect(payload.context).toBe('TestLogger');
    expect(payload.message).toBe('Test log message');
    expect(payload.trace_id).toBe('test-123');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const printed = String(consoleLogSpy.mock.calls[0][0]);
    const parsed = JSON.parse(printed);
    expect(parsed.message).toBe('Test log message');
    expect(parsed.level).toBe('INFO');
    expect(parsed.context).toBe('TestLogger');
  });

  it('routes WARN to console.warn and ERROR/FATAL to console.error', () => {
    const logger = new Logger({ context: 'LevelTest' });

    logger.warn('Warning test');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    logger.error('Error test', { code: 500 });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    logger.fatal('Fatal test', { code: 503 });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  });

  it('supports child loggers with contextual metadata', () => {
    const parent = new Logger({ context: 'Parent', defaultMeta: { app: 'SafeFreight' } });
    const child = parent.child('API', { route: '/api/v1/health' });

    const payload = child.info('Child log');
    expect(payload.context).toBe('Parent:API');
    expect(payload.app).toBe('SafeFreight');
    expect(payload.route).toBe('/api/v1/health');
  });

  it('safely serializes objects with circular references without throwing', () => {
    const logger = new Logger({ context: 'CircularTest' });
    const circularObj: Record<string, unknown> = { name: 'circular_root' };
    circularObj.self = circularObj;

    expect(() => {
      logger.info('Circular payload test', { ref: circularObj });
    }).not.toThrow();

    expect(consoleLogSpy).toHaveBeenCalled();
    const printed = String(consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0]);
    const parsed = JSON.parse(printed);
    expect(parsed.ref.name).toBe('circular_root');
    expect(parsed.ref.self).toBe('[Circular]');
  });

  it('serializes BigInt values as strings without throwing TypeError', () => {
    const logger = new Logger({ context: 'BigIntTest' });
    const bigNumber = 9007199254740991n;

    expect(() => {
      logger.info('BigInt payload test', { big_value: bigNumber });
    }).not.toThrow();

    expect(consoleLogSpy).toHaveBeenCalled();
    const printed = String(consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0]);
    const parsed = JSON.parse(printed);
    expect(parsed.big_value).toBe('9007199254740991');
  });

  it('serializes Error instances extracting name, message, and stack', () => {
    const logger = new Logger({ context: 'ErrorTest' });
    const err = new Error('Database connection failed');

    expect(() => {
      logger.error('Error log test', { err });
    }).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
    const printed = String(consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1][0]);
    const parsed = JSON.parse(printed);
    expect(parsed.err).toBeDefined();
    expect(parsed.err.name).toBe('Error');
    expect(parsed.err.message).toBe('Database connection failed');
    expect(parsed.err.stack).toBeDefined();
  });
});

describe('Health Endpoint Logic', () => {
  it('returns HTTP 200 with required enterprise health payload', async () => {
    const response = await handleHealthCheck('/api/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
    expect(data.version).toBe('4.0.0');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('uptime_seconds');
    expect(data.services).toBeDefined();
    expect(data.services.system).toBe('operational');
    expect(data.services.database).toBe('connected');
  });

  it('GET /api/health and GET /api/v1/health return HTTP 200 with JSON payload', async () => {
    const { GET: getHealth } = await import('@/app/api/health/route');
    const { GET: getV1Health } = await import('@/app/api/v1/health/route');

    const res1 = await getHealth();
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.status).toBe('ok');
    expect(body1.version).toBe('4.0.0');
    expect(body1.services.database).toBe('connected');

    const res2 = await getV1Health();
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.status).toBe('ok');
    expect(body2.version).toBe('4.0.0');
    expect(body2.services.database).toBe('connected');
  });
});

