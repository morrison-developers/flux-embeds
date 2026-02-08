import { NextResponse } from 'next/server';
import type { ApiErrorResponse } from '@/src/types/superbowl';

export function apiError(status: number, error: string, code?: string) {
  const body: ApiErrorResponse = { ok: false, error, code };
  return NextResponse.json(body, { status });
}
