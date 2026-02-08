import type { GameSnapshot } from '@/src/types/superbowl';

type EspnTeam = {
  homeAway?: 'home' | 'away';
  score?: string;
  team?: { shortDisplayName?: string; displayName?: string; abbreviation?: string };
};

type EspnCompetition = {
  competitors?: EspnTeam[];
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
    };
    period?: number;
    displayClock?: string;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
    };
  };
};

function toNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveStatus(event: EspnEvent, competition?: EspnCompetition): GameSnapshot['status'] {
  const state = competition?.status?.type?.state ?? event.status?.type?.state ?? 'pre';
  const completed =
    competition?.status?.type?.completed ?? event.status?.type?.completed ?? false;

  if (completed) return 'final';
  if (state === 'in' || state === 'in_progress') return 'live';
  return 'pre';
}

export function normalizeEspnEvent(raw: unknown, fallbackGameId: string): GameSnapshot {
  const event = (raw ?? {}) as EspnEvent;
  const competition = event.competitions?.[0];

  const home = competition?.competitors?.find((team) => team.homeAway === 'home');
  const away = competition?.competitors?.find((team) => team.homeAway === 'away');

  const homeTeamName =
    home?.team?.shortDisplayName ?? home?.team?.displayName ?? home?.team?.abbreviation ?? 'Home';
  const awayTeamName =
    away?.team?.shortDisplayName ?? away?.team?.displayName ?? away?.team?.abbreviation ?? 'Away';

  const period = competition?.status?.period ?? 1;
  const clock = competition?.status?.displayClock ?? '15:00';

  return {
    gameId: event.id ?? fallbackGameId,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    homeScore: toNumber(home?.score),
    awayScore: toNumber(away?.score),
    period,
    clock,
    status: resolveStatus(event, competition),
    kickoffAt: event.date ?? null,
    lastUpdatedAt: event.date ?? new Date().toISOString(),
  };
}

export function buildFallbackSnapshot(gameId: string): GameSnapshot {
  return {
    gameId,
    homeTeam: 'Home',
    awayTeam: 'Away',
    homeScore: 0,
    awayScore: 0,
    period: 1,
    clock: '15:00',
    status: 'fallback',
    kickoffAt: null,
    lastUpdatedAt: new Date().toISOString(),
  };
}
