import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: 'superb-owl',
    deprecated: true,
    message: 'Use /api/boards/:boardId/live?gameId=... instead.',
    example: '/api/boards/default/live',
  });
}
