import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface HealthCheckResponse {
  status: 'ok' | 'healthy' | 'degraded';
  version: string;
  timestamp: string;
  environment: string;
  uptime: number;
  uptime_seconds: number;
  services: {
    database: 'connected' | 'disconnected' | 'unconfigured';
    system: 'operational';
  };
}

export async function handleHealthCheck(reqPath: string = '/api/health'): Promise<NextResponse> {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' | 'unconfigured' = 'unconfigured';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    try {
      // Ping Supabase Auth service health endpoint (returns HTTP 200 on live Supabase Cloud)
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: 'no-store',
      });
      dbStatus = res.ok || res.status === 200 ? 'connected' : 'disconnected';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  const durationMs = Date.now() - startTime;
  const uptime = process.uptime();

  const payload: HealthCheckResponse = {
    status: dbStatus === 'disconnected' ? 'degraded' : 'ok',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
    uptime,
    uptime_seconds: Math.floor(uptime),
    services: {
      database: dbStatus,
      system: 'operational',
    },
  };

  logger.info('Health check executed', {
    context: 'HealthCheck',
    path: reqPath,
    duration_ms: durationMs,
    status: payload.status,
    database_status: dbStatus,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    },
  });
}
