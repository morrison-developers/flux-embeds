'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiErrorResponse, LiveBoardSnapshot } from '@/src/types/superbowl';

type State = {
  loading: boolean;
  error: string | null;
  data: LiveBoardSnapshot | null;
  lastFetchedAt: string | null;
};

const POLL_INTERVAL_MS = 15_000;

export function useBoardLiveData(
  boardId: string,
  gameId?: string,
  enabled = true,
  testMode = false,
  guestName?: string | null
) {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: null,
    lastFetchedAt: null,
  });
  const [refreshTick, setRefreshTick] = useState(0);

  const winnerKeyRef = useRef<string>('');
  const prevScoreRef = useRef<{
    gameId: string;
    homeScore: number;
    awayScore: number;
  } | null>(null);

  const liveUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (gameId) params.set('gameId', gameId);
    if (testMode) params.set('testMode', '1');
    const qs = params.toString();
    return `/api/boards/${encodeURIComponent(boardId)}/live${qs ? `?${qs}` : ''}`;
  }, [boardId, gameId, testMode]);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, error: null, data: null, lastFetchedAt: null });
      return;
    }

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchLive() {
      try {
        const headers: Record<string, string> = {};
        if (testMode && guestName) {
          headers['x-superbowl-guest-name'] = guestName;
        }

        const res = await fetch(liveUrl, {
          cache: 'no-store',
          headers,
        });
        const json = (await res.json()) as { ok: true; data: LiveBoardSnapshot } | ApiErrorResponse;

        if (!res.ok || !json.ok) {
          throw new Error(json.ok ? 'Failed to load live data.' : json.error);
        }

        if (!mounted) return;

        setState({
          loading: false,
          error: null,
          data: json.data,
          lastFetchedAt: new Date().toISOString(),
        });

        const prevScore = prevScoreRef.current;
        const nextScore = {
          gameId: json.data.game.gameId,
          homeScore: json.data.game.homeScore,
          awayScore: json.data.game.awayScore,
        };

        if (prevScore && prevScore.gameId === nextScore.gameId) {
          const homeDelta = Math.max(0, nextScore.homeScore - prevScore.homeScore);
          const awayDelta = Math.max(0, nextScore.awayScore - prevScore.awayScore);

          if (homeDelta > 0) {
            window.parent?.postMessage(
              {
                type: 'superbowl:scoreChanged',
                payload: {
                  boardId,
                  gameId: json.data.game.gameId,
                  side: 'home',
                  team: json.data.game.homeTeam,
                  points: homeDelta,
                  score: json.data.game.homeScore,
                  previousScore: prevScore.homeScore,
                  period: json.data.game.period,
                  clock: json.data.game.clock,
                },
              },
              '*'
            );
          }

          if (awayDelta > 0) {
            window.parent?.postMessage(
              {
                type: 'superbowl:scoreChanged',
                payload: {
                  boardId,
                  gameId: json.data.game.gameId,
                  side: 'away',
                  team: json.data.game.awayTeam,
                  points: awayDelta,
                  score: json.data.game.awayScore,
                  previousScore: prevScore.awayScore,
                  period: json.data.game.period,
                  clock: json.data.game.clock,
                },
              },
              '*'
            );
          }
        }

        prevScoreRef.current = nextScore;

        const winnerId = json.data.winningOwner?.id ?? 'none';
        const nextKey = `${json.data.game.gameId}:${json.data.game.period}:${winnerId}`;

        if (winnerKeyRef.current && winnerKeyRef.current !== nextKey) {
          window.parent?.postMessage(
            {
              type: 'superbowl:winnerChanged',
              payload: {
                boardId,
                gameId: json.data.game.gameId,
                ownerId: json.data.winningOwner?.id ?? null,
              },
            },
            '*'
          );
        }

        winnerKeyRef.current = nextKey;
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Live data request failed.';
        setState((prev) => ({ ...prev, loading: false, error: message }));

        window.parent?.postMessage(
          {
            type: 'superbowl:error',
            payload: { boardId, error: message },
          },
          '*'
        );
      } finally {
        if (!mounted) return;
        timer = setTimeout(fetchLive, POLL_INTERVAL_MS);
      }
    }

    fetchLive();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [boardId, enabled, guestName, liveUrl, refreshTick, testMode]);

  return {
    ...state,
    refresh: () => setRefreshTick((tick) => tick + 1),
  };
}
