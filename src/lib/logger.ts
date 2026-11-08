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
  tenant_id?: string | null;
  actor_id?: string | null;
  path?: string;
  duration_ms?: number;
  error?: string | { message: string; stack?: string };
  [key: string]: unknown;
}

export interface LoggerOptions {
  context?: string;
  defaultMeta?: Record<string, unknown>;
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

    const serialized = JSON.stringify(payload);

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
