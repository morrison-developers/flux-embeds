import { buildFallbackSnapshot, normalizeEspnEvent } from '@/src/server/espn/normalize';

describe('normalizeEspnEvent', () => {
  it('normalizes partial payload safely', () => {
    const snapshot = normalizeEspnEvent(
      {
        id: '123',
        competitions: [
          {
            competitors: [
              { homeAway: 'home', score: '21', team: { shortDisplayName: 'Chiefs' } },
              { homeAway: 'away', score: '17', team: { shortDisplayName: 'Eagles' } },
            ],
            status: {
              period: 3,
              displayClock: '04:20',
              type: { state: 'in', completed: false },
            },
          },
        ],
      },
      'fallback'
    );

    expect(snapshot.gameId).toBe('123');
    expect(snapshot.homeScore).toBe(21);
    expect(snapshot.awayScore).toBe(17);
    expect(snapshot.period).toBe(3);
    expect(snapshot.status).toBe('live');
  });

  it('provides fallback defaults for missing fields', () => {
    const snapshot = normalizeEspnEvent({}, 'fallback-game');
    expect(snapshot.gameId).toBe('fallback-game');
    expect(snapshot.homeTeam).toBe('Home');
    expect(snapshot.awayTeam).toBe('Away');
    expect(snapshot.homeScore).toBe(0);
    expect(snapshot.awayScore).toBe(0);
  });

  it('treats halftime as live so markers are revealed', () => {
    const snapshot = normalizeEspnEvent(
      {
        id: '123',
        competitions: [
          {
            competitors: [
              { homeAway: 'home', score: '14', team: { shortDisplayName: 'Chiefs' } },
              { homeAway: 'away', score: '10', team: { shortDisplayName: 'Eagles' } },
            ],
            status: {
              period: 2,
              displayClock: '0:00',
              type: { state: 'halftime', completed: false },
            },
          },
        ],
      },
      'fallback'
    );

    expect(snapshot.status).toBe('live');
  });

  it('treats advanced score/period signals as live even if state is pre', () => {
    const snapshot = normalizeEspnEvent(
      {
        id: '123',
        competitions: [
          {
            competitors: [
              { homeAway: 'home', score: '7', team: { shortDisplayName: 'Chiefs' } },
              { homeAway: 'away', score: '0', team: { shortDisplayName: 'Eagles' } },
            ],
            status: {
              period: 1,
              displayClock: '12:41',
              type: { state: 'pre', completed: false },
            },
          },
        ],
      },
      'fallback'
    );

    expect(snapshot.status).toBe('live');
  });
});

describe('buildFallbackSnapshot', () => {
  it('returns deterministic fallback shape', () => {
    const snapshot = buildFallbackSnapshot('g1');
    expect(snapshot.gameId).toBe('g1');
    expect(snapshot.status).toBe('fallback');
    expect(snapshot.homeScore).toBe(0);
    expect(snapshot.awayScore).toBe(0);
  });
});
