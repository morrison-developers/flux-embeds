import { buildFallbackSnapshot, normalizeEspnEvent } from '@/src/server/espn/normalize';
import type { GameSnapshot } from '@/src/types/superbowl';

const ESPN_TIMEOUT_MS = 6_000;
const ESPN_SITE = 'site';
const ESPN_SPORT = 'football';
const ESPN_LEAGUE = 'nfl';

let discoveryCache: { season: number; gameId: string; expiresAt: number } | null = null;

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 30 } });
    if (!res.ok) {
      throw new Error(`ESPN request failed (${res.status})`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function currentSuperBowlSeason(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  // Super Bowl in Jan/Feb belongs to previous NFL season.
  return month <= 2 ? year - 1 : year;
}

function extractEventIdFromSeasonPayload(raw: unknown): string | null {
  const payload = raw as { events?: Array<{ id?: string }> };
  return payload.events?.[0]?.id ?? null;
}

async function discoverGameIdBySeason(): Promise<string | null> {
  const season = currentSuperBowlSeason();
  const now = Date.now();

  if (discoveryCache && discoveryCache.season === season && discoveryCache.expiresAt > now) {
    return discoveryCache.gameId;
  }

  const fallbackSeasons = [season, season - 1];

  for (const targetSeason of fallbackSeasons) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${ESPN_SPORT}/${ESPN_LEAGUE}/scoreboard?seasontype=3&week=5&dates=${targetSeason}`;
    try {
      const payload = await fetchJson(url, ESPN_TIMEOUT_MS);
      const eventId = extractEventIdFromSeasonPayload(payload);
      if (eventId) {
        discoveryCache = {
          season,
          gameId: eventId,
          expiresAt: now + 10 * 60_000,
        };
        return eventId;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function resolveGameId(inputGameId?: string, boardDefaultGameId?: string | null): Promise<string> {
  if (inputGameId) return inputGameId;
  if (boardDefaultGameId) return boardDefaultGameId;
  if (process.env.SUPERBOWL_DEFAULT_GAME_ID) {
    return process.env.SUPERBOWL_DEFAULT_GAME_ID;
  }

  const discovered = await discoverGameIdBySeason();
  if (discovered) return discovered;

  // Stable fallback historical event id (Super Bowl LVIII).
  return '401547652';
}

export async function getGameSnapshot(params: {
  gameId?: string;
  boardDefaultGameId?: string | null;
}): Promise<{ snapshot: GameSnapshot; liveStatus: 'ok' | 'fallback' }> {
  const resolvedGameId = await resolveGameId(params.gameId, params.boardDefaultGameId);
  const eventUrl = `https://${ESPN_SITE}.api.espn.com/apis/site/v2/sports/${ESPN_SPORT}/${ESPN_LEAGUE}/summary?event=${resolvedGameId}`;

  try {
    const payload = (await fetchJson(eventUrl, ESPN_TIMEOUT_MS)) as { header?: { id?: string }; status?: unknown; boxscore?: unknown; format?: unknown; gamepackageJSON?: unknown; [key: string]: unknown };

    const event =
      (payload as { header?: { competitions?: unknown[] } }).header &&
      (payload as { header?: { competitions?: unknown[] } }).header?.competitions
        ? {
            id: (payload as { header?: { id?: string } }).header?.id,
            competitions: (payload as { header?: { competitions?: unknown[] } }).header
              ?.competitions as unknown[],
            status: (payload as { status?: unknown }).status,
          }
        : payload;

    return {
      snapshot: normalizeEspnEvent(event, resolvedGameId),
      liveStatus: 'ok',
    };
  } catch (error) {
    console.error('[superb-owl] espn fetch failed', {
      gameId: resolvedGameId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      snapshot: buildFallbackSnapshot(resolvedGameId),
      liveStatus: 'fallback',
    };
  }
}
