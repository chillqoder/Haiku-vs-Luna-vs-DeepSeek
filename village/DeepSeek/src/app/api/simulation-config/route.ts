import { NextResponse } from 'next/server';
import { buildSimulationConfig } from '@/diorama/simulation/manifest';

export const dynamic = 'force-dynamic';

/**
 * Scene manifest endpoint.
 *
 * GET /api/simulation-config            -> full SimulationConfig
 * GET /api/simulation-config?timeScale=0.5 -> global simulation speed override
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const config = buildSimulationConfig();

  const rawTimeScale = Number(url.searchParams.get('timeScale'));
  if (Number.isFinite(rawTimeScale) && rawTimeScale > 0) {
    config.timeScale = Math.min(2, Math.max(0.25, rawTimeScale));
  }

  return NextResponse.json(config, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
