import { NextRequest, NextResponse } from 'next/server';
import { validateSignupInput, handleSignup } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = validateSignupInput(body);

    if (!validation.valid || !validation.data) {
      logger.warn('Signup rejected due to validation errors', {
        error: validation.error,
      });
      return NextResponse.json(
        { error: validation.error || 'Validation failed' },
        { status: 400 }
      );
    }

    const result = await handleSignup(validation.data);

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Signup error', { error: errMsg });

    const status = errMsg.includes('already registered') ? 409 : 400;
    return NextResponse.json({ error: errMsg }, { status });
  }
}
