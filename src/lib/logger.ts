/**
 * Centralized Structured JSON Logger for SafeFreight OS
 * Emits single-line JSON strings to stdout/stderr conforming to PRD v4.0.0 observability standards.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  request_id?: string;
  correlation_id?: string;
  tenant_id?: string | null;
  actor_id?: string | null;
  path?: string;
  duration_ms?: number;
  status_code?: number;
  error?: string | { message: string; stack?: string };
  [key: string]: unknown;
}

export interface LoggerOptions {
  context?: string;
  defaultMeta?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN = /^(password|token|secret|authorization|service_role_key|supabase_service_role_key|jwt|cookie|api_key|access_token|refresh_token|private_key)$/i;

/**
 * Custom JSON replacer for structured logging:
 * - Replaces circular references with "[Circular]"
 * - Automatically scrubs passwords, secrets, authorization headers, and tokens
 * - Serializes BigInt values as strings
 * - Serializes Error objects extracting name, message, and stack
 */
export function createSafeJsonReplacer() {
  const seen = new WeakSet();
  return function replacer(this: unknown, key: string, value: unknown): unknown {
    // 1. Scrub sensitive credentials by key name
    if (typeof key === 'string' && SENSITIVE_KEY_PATTERN.test(key)) {
      return '[REDACTED]';
    }

    // 2. Scrub sensitive token strings by pattern
    if (typeof value === 'string') {
      if (value.startsWith('Bearer eyJ') || value.startsWith('eyJhbGciOi')) {
        return '[REDACTED_TOKEN]';
      }
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value instanceof Error) {
      const errorObj: Record<string, unknown> = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
      if ('code' in value) {
        errorObj.code = (value as unknown as { code: unknown }).code;
      }
      return errorObj;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, createSafeJsonReplacer());
  } catch (err: unknown) {
    try {
      return JSON.stringify({
        fallback_error: 'SerializationFailed',
        error_message: err instanceof Error ? err.message : String(err),
      });
    } catch {
      return '{"fallback_error":"FatalSerializationFailed"}';
    }
  }
}

export class Logger {
  private context: string;
  private defaultMeta: Record<string, unknown>;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context || 'SafeFreightOS';
    this.defaultMeta = options.defaultMeta || {};
  }

  private emit(level: LogLevel, message: string, meta: Record<string, unknown> = {}): LogPayload {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...this.defaultMeta,
      ...meta,
    };

    let serialized: string;
    try {
      serialized = safeJsonStringify(payload);
    } catch {
      serialized = JSON.stringify({
        timestamp: payload.timestamp,
        level,
        context: this.context,
        message,
        serialization_fallback: true,
      });
    }

    try {
      if (level === 'ERROR' || level === 'FATAL') {
        // eslint-disable-next-line no-console
        console.error(serialized);
      } else if (level === 'WARN') {
        // eslint-disable-next-line no-console
        console.warn(serialized);
      } else {
        // eslint-disable-next-line no-console
        console.log(serialized);
      }
    } catch {
      // Prevent console stream errors from crashing caller
    }

    return payload;
  }

  public debug(message: string, meta?: Record<string, unknown>): LogPayload {
    return this.emit('DEBUG', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): LogPayload {
    return this.emit('INFO', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): LogPayload {
    return this.emit('WARN', message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): LogPayload {
    return this.emit('ERROR', message, meta);
  }

  public fatal(message: string, meta?: Record<string, unknown>): LogPayload {
    return this.emit('FATAL', message, meta);
  }

  public child(childContext: string, extraMeta?: Record<string, unknown>): Logger {
    return new Logger({
      context: `${this.context}:${childContext}`,
      defaultMeta: {
        ...this.defaultMeta,
        ...extraMeta,
      },
    });
  }
}

export const logger = new Logger({ context: 'SafeFreightOS' });
