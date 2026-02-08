'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { GameSnapshot } from '@/src/types/superbowl';
import styles from '../superbowl.module.css';

export function ScoreHeader({ game }: { game: GameSnapshot }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const kickoffLabel = useMemo(() => formatKickoff(game.kickoffAt), [game.kickoffAt]);
  const countdown = useMemo(() => {
    if (game.status !== 'pre') return null;
    return formatCountdown(game.kickoffAt, nowMs);
  }, [game.kickoffAt, game.status, nowMs]);
  const awayPalette = useMemo(() => getTeamPalette(game.awayTeam, 'away'), [game.awayTeam]);
  const homePalette = useMemo(() => getTeamPalette(game.homeTeam, 'home'), [game.homeTeam]);

  return (
    <div className={`${styles.card} ${styles.scoreCard}`}>
      <div className={styles.scoreTopRow}>
        <div className={styles.kicker}>Game center</div>
        <div className={styles.scoreStatusPill}>
          {game.status.toUpperCase()} · Q{game.period} · {game.clock}
        </div>
      </div>
      <div className={styles.scoreSubRow}>
        <span>{kickoffLabel}</span>
        {countdown ? <span className={styles.scoreCountdown}>{countdown}</span> : null}
      </div>

      <div className={styles.scoreTeams}>
        <div
          className={`${styles.teamPanel} ${styles.teamPanelAway}`}
          style={toTeamStyleVars(awayPalette)}
        >
          <div className={styles.teamMeta}>Away</div>
          <div className={styles.teamRow}>
            <strong className={styles.teamName}>{game.awayTeam}</strong>
            <strong className={`${styles.scoreValue} ${styles.scoreValueAway}`}>{game.awayScore}</strong>
          </div>
        </div>

        <div className={styles.scoreVs}>vs</div>

        <div
          className={`${styles.teamPanel} ${styles.teamPanelHome}`}
          style={toTeamStyleVars(homePalette)}
        >
          <div className={styles.teamMeta}>Home</div>
          <div className={styles.teamRow}>
            <strong className={styles.teamName}>{game.homeTeam}</strong>
            <strong className={`${styles.scoreValue} ${styles.scoreValueHome}`}>{game.homeScore}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatKickoff(value: string | null) {
  if (!value) return 'Kickoff TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Kickoff TBD';
  return `Kickoff ${date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function formatCountdown(value: string | null, nowMs: number) {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return null;
  const diff = target - nowMs;
  if (diff <= 0) return 'Kickoff';

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `Starts in ${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
}

type TeamPalette = {
  primary: string;
  secondary: string;
  text: string;
  shadow: string;
};

function getTeamPalette(teamName: string, side: 'home' | 'away'): TeamPalette {
  const normalized = teamName.toLowerCase();

  // Seattle Seahawks official colors
  if (normalized.includes('seahawks') || normalized.includes('seattle')) {
    return {
      primary: '#002244',
      secondary: '#69BE28',
      text: '#e8f5da',
      shadow: 'rgba(105, 190, 40, 0.48)',
    };
  }

  // New England Patriots official colors
  if (normalized.includes('patriots') || normalized.includes('new england')) {
    return {
      primary: '#002244',
      secondary: '#C60C30',
      text: '#ffe0e5',
      shadow: 'rgba(198, 12, 48, 0.5)',
    };
  }

  return side === 'away'
    ? {
        primary: '#132956',
        secondary: '#84c2ff',
        text: '#e4f2ff',
        shadow: 'rgba(100, 175, 255, 0.44)',
      }
    : {
        primary: '#521b12',
        secondary: '#ffad72',
        text: '#ffe7d3',
        shadow: 'rgba(255, 143, 81, 0.46)',
      };
}

function toTeamStyleVars(palette: TeamPalette): CSSProperties {
  return {
    '--sb-team-primary': palette.primary,
    '--sb-team-secondary': palette.secondary,
    '--sb-team-text': palette.text,
    '--sb-team-shadow': palette.shadow,
  } as CSSProperties;
}
