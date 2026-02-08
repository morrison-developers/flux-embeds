'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmbedShell } from '../_shared/EmbedShell';
import { Grid } from './components/Grid';
import { OwnerLegend } from './components/OwnerLegend';
import { ScoreHeader } from './components/ScoreHeader';
import { Sidebar } from './components/Sidebar';
import { useBoardLiveData } from './hooks/useBoardLiveData';
import { useEmbedGuestAuth } from './hooks/useEmbedGuestAuth';
import { parseSuperbOwlQuery } from './query';
import type { QuarterWinner } from '@/src/types/superbowl';
import styles from './superbowl.module.css';

const OWNER_COLOR_CHOICES = [
  '#1d4ed8',
  '#0f766e',
  '#9333ea',
  '#ea580c',
  '#be123c',
  '#334155',
  '#047857',
  '#7c3aed',
  '#c2410c',
  '#b91c1c',
  '#0ea5e9',
  '#16a34a',
  '#ca8a04',
  '#e11d48',
  '#6d28d9',
  '#0369a1',
];
const MAX_PICKS_PER_GUEST = 16;

export default function SuperbOwlPage() {
  const searchParams = useSearchParams();

  const parsed = useMemo(() => parseSuperbOwlQuery(searchParams), [searchParams]);

  const boardId = parsed.success ? parsed.data.board : '';
  const gameId = parsed.success ? parsed.data.gameId : undefined;
  const parentOrigin = parsed.success ? parsed.data.parentOrigin : undefined;
  const compact = parsed.success ? parsed.data.compact === '1' : false;
  const [hostViewport, setHostViewport] = useState<{ width: number; height: number } | null>(null);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [claimColor, setClaimColor] = useState('#1d4ed8');
  const [claimBusy, setClaimBusy] = useState(false);
  const [pendingPickCells, setPendingPickCells] = useState<Record<string, boolean>>({});
  const [localPickOverrides, setLocalPickOverrides] = useState<Record<string, string>>({});
  const [lockBusy, setLockBusy] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [adminBusyAction, setAdminBusyAction] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [quarterPreviewStage, setQuarterPreviewStage] = useState(0);

  const auth = useEmbedGuestAuth({
    boardId,
    parentOrigin,
    enabled: parsed.success,
  });
  const canToggleTestMode =
    auth.status === 'authenticated' &&
    (auth.guestName ?? '').trim().toLowerCase() === 'admin adminson';
  const isAdminView = canToggleTestMode || auth.role === 'admin';
  const effectiveTestMode = canToggleTestMode && testModeEnabled;

  const { loading, error, data, lastFetchedAt, refresh } = useBoardLiveData(
    boardId,
    gameId,
    parsed.success,
    effectiveTestMode,
    auth.guestName
  );

  const guestOwner =
    data && auth.guestName
      ? data.board.owners.find(
          (owner) =>
            owner.displayName.trim().toLowerCase() === auth.guestName?.trim().toLowerCase()
        ) ?? null
      : null;
  const displayBoard = useMemo(() => {
    if (!data) return null;
    if (Object.keys(localPickOverrides).length === 0) return data.board;
    const nextAssignments = data.board.assignments.map((row) => [...row]);
    for (const [key, value] of Object.entries(localPickOverrides)) {
      const [rowRaw, colRaw] = key.split(':');
      const row = Number(rowRaw);
      const col = Number(colRaw);
      if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
      if (row < 0 || row > 9 || col < 0 || col > 9) continue;
      nextAssignments[row][col] = value;
    }
    return { ...data.board, assignments: nextAssignments };
  }, [data, localPickOverrides]);
  const guestPickCount =
    displayBoard && guestOwner
      ? displayBoard.assignments.flat().filter((cell) => cell.trim() === guestOwner.initials).length
      : 0;
  const isGuestLocked = Boolean(guestOwner?.lockedAt);
  const shouldShowOnboarding =
    auth.status === 'authenticated' && Boolean(auth.guestName) && !guestOwner;
  const autoInitials = deriveInitials(auth.guestName ?? '');
  const claimTextColor = getReadableTextColor(claimColor);
  const effectiveQuarterWinners = useMemo(() => {
    if (!data) return [];
    if (quarterPreviewStage <= 0 || !canToggleTestMode) return data.quarterWinners;
    return buildQuarterPreviewWinners(data.board.id, data.board.owners, quarterPreviewStage);
  }, [canToggleTestMode, data, quarterPreviewStage]);

  useEffect(() => {
    setLocalPickOverrides({});
    setPendingPickCells({});
  }, [lastFetchedAt]);

  async function claimOwner() {
    if (!auth.guestName || !boardId || claimBusy) return;
    setOnboardingError(null);
    setClaimBusy(true);

    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/guest/claim`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-superbowl-guest-name': auth.guestName,
        },
        body: JSON.stringify({
          initials: autoInitials || undefined,
          bgColor: claimColor,
          textColor: claimTextColor,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Failed to claim owner slot.');
      }

      await refresh();
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : 'Failed to claim owner.');
    } finally {
      setClaimBusy(false);
    }
  }

  async function toggleGuestPick(row: number, col: number, selected: boolean) {
    if (!auth.guestName || !boardId || !guestOwner || isGuestLocked) return;
    const key = `${row}:${col}`;
    if (pendingPickCells[key]) return;
    const optimisticValue = selected ? guestOwner.initials : '';
    setPendingPickCells((prev) => ({ ...prev, [key]: true }));
    setLocalPickOverrides((prev) => ({ ...prev, [key]: optimisticValue }));
    setOnboardingError(null);
    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/guest/pick`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-superbowl-guest-name': auth.guestName,
        },
        body: JSON.stringify({ row, col, selected }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Failed to update pick.');
      }

      refresh();
    } catch (err) {
      setLocalPickOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setOnboardingError(err instanceof Error ? err.message : 'Failed to update pick.');
    } finally {
      setPendingPickCells((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function lockInPicks() {
    if (!auth.guestName || !boardId || lockBusy || !guestOwner || isGuestLocked) return;
    setLockBusy(true);
    setOnboardingError(null);
    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/guest/lock`, {
        method: 'POST',
        headers: {
          'x-superbowl-guest-name': auth.guestName,
        },
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Failed to lock picks.');
      }
      await refresh();
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : 'Failed to lock picks.');
    } finally {
      setLockBusy(false);
    }
  }

  async function runAdminAction(action: 'clear_picks' | 'clear_winners' | 'clear_all' | 'seed_demo') {
    if (!auth.guestName || !boardId || adminBusyAction) return;
    setAdminStatus(null);
    setAdminBusyAction(action);
    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/guest/admin`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-superbowl-guest-name': auth.guestName,
        },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Failed to run admin action.');
      }
      setAdminStatus(`Action completed: ${action.replace('_', ' ')}`);
      await refresh();
    } catch (err) {
      setAdminStatus(err instanceof Error ? err.message : 'Failed to run admin action.');
    } finally {
      setAdminBusyAction(null);
    }
  }

  function simulateScoreEvent(side: 'home' | 'away') {
    if (!data) return;
    const points = 7;
    const isHome = side === 'home';
    const team = isHome ? data.game.homeTeam : data.game.awayTeam;
    const previousScore = isHome ? data.game.homeScore : data.game.awayScore;
    const score = previousScore + points;

    window.parent?.postMessage(
      {
        type: 'superbowl:scoreChanged',
        payload: {
          boardId,
          gameId: data.game.gameId,
          side,
          team,
          points,
          score,
          previousScore,
          period: data.game.period,
          clock: data.game.clock,
          simulated: true,
        },
      },
      '*'
    );

    setAdminStatus(`Simulated ${team} +${points} score event sent`);
  }

  useEffect(() => {
    window.parent?.postMessage(
      {
        type: 'superbowl:loaded',
        payload: {
          boardId,
        },
      },
      '*'
    );
  }, [boardId]);

  useEffect(() => {
    if (!parsed.success) return;

    function normalizeMessage(raw: unknown) {
      let data = raw;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data.trim()) as unknown;
        } catch {
          return null;
        }
      }
      if (data && typeof data === 'object' && 'message' in data) {
        const wrapped = data as { message?: unknown };
        let inner = wrapped.message;
        if (typeof inner === 'string') {
          try {
            inner = JSON.parse(inner.trim()) as unknown;
          } catch {
            return null;
          }
        }
        data = inner;
      }
      return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;

      const data = normalizeMessage(event.data);
      if (!data) return;
      if (data.type !== 'superbowl:host:viewport') return;

      const payload = (data.payload ?? {}) as { width?: unknown; height?: unknown };
      const width = Number(payload.width);
      const height = Number(payload.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;

      setHostViewport({ width, height });
    };

    window.addEventListener('message', onMessage);
    window.parent?.postMessage(
      {
        type: 'superbowl:host:requestViewport',
        payload: { boardId },
      },
      '*'
    );

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [boardId, parsed.success]);

  if (!parsed.success) {
    return (
      <EmbedShell defaultBg="transparent">
        <EmbedError message="Missing or invalid query params. Required: board" />
      </EmbedShell>
    );
  }

  const themeVars = {
    '--sb-accent': parsed.data.accent,
    '--sb-bg': parsed.data.bg,
    '--sb-text': parsed.data.text,
    '--sb-host-width': hostViewport ? `${hostViewport.width}px` : '100%',
    '--sb-host-height': hostViewport ? `${hostViewport.height}px` : '100%',
  } as CSSProperties;

  return (
    <EmbedShell defaultBg="transparent">
      <div
        className={`${styles.root} ${compact ? styles.rootCompact : ''} ${shouldShowOnboarding ? styles.rootOnboarding : ''}`}
        style={themeVars}
      >
        <div className={styles.backdrop} />

        <div className={styles.content}>
          {loading && !data ? <div className={styles.loading}>Loading board...</div> : null}
          {error ? <EmbedError message={error} /> : null}

          {data && shouldShowOnboarding ? (
            <FirstTimeOverlay
              guestName={auth.guestName ?? ''}
              ownerCount={data.board.owners.length}
              color={claimColor}
              onColorChange={setClaimColor}
              busy={claimBusy}
              error={onboardingError}
              onSubmit={claimOwner}
            />
          ) : null}

          {data && !shouldShowOnboarding ? (
            <div className={styles.layout}>
              <div className={styles.main}>
                {isAdminView ? (
                  <GuestAuthCard
                    status={auth.status}
                    guestName={auth.guestName}
                    role={auth.role}
                    features={auth.features}
                    error={auth.error}
                    isAdminView={isAdminView}
                    canToggleTestMode={canToggleTestMode}
                    testModeEnabled={testModeEnabled}
                    onToggleTestMode={() => setTestModeEnabled((prev) => !prev)}
                  />
                ) : null}
                {canToggleTestMode ? (
                  <TestingSuiteCard
                    busyAction={adminBusyAction}
                    status={adminStatus}
                    onRunAction={runAdminAction}
                    homeTeam={data.game.homeTeam}
                    awayTeam={data.game.awayTeam}
                    onSimulateHomeScore={() => simulateScoreEvent('home')}
                    onSimulateAwayScore={() => simulateScoreEvent('away')}
                    quarterPreviewStage={quarterPreviewStage}
                    onCycleQuarterPreview={() => setQuarterPreviewStage((prev) => (prev + 1) % 5)}
                  />
                ) : null}
                <ScoreHeader game={data.game} />
                <Grid
                  board={displayBoard ?? data.board}
                  winningCell={data.winningCell}
                  ownerInitials={guestOwner?.initials}
                  onCellToggle={guestOwner && !isGuestLocked ? toggleGuestPick : undefined}
                  busyCellKeys={pendingPickCells}
                  revealMarkers={data.game.status === 'live' || data.game.status === 'final'}
                  revealWinner={data.game.status === 'live' || data.game.status === 'final'}
                />
                {guestOwner && !isGuestLocked ? (
                  <PickControlsCard
                    guestPickCount={guestPickCount}
                    isGuestLocked={isGuestLocked}
                    lockBusy={lockBusy}
                    onLockIn={lockInPicks}
                  />
                ) : null}
                <OwnerLegend owners={data.board.owners} />
                <div className={styles.meta}>
                  liveStatus: {data.liveStatus} · board: {data.board.id}
                </div>
                {isAdminView ? (
                  <ApiStatusCard
                    boardId={boardId}
                    gameId={gameId}
                    testModeEnabled={effectiveTestMode}
                    lastFetchedAt={lastFetchedAt}
                  />
                ) : null}
              </div>

              <Sidebar
                quarterWinners={effectiveQuarterWinners}
                winningOwner={data.winningOwner}
                owners={data.board.owners}
              />
            </div>
          ) : null}
        </div>
      </div>
    </EmbedShell>
  );
}

function EmbedError({ message }: { message: string }) {
  return <div className={styles.error}>{message}</div>;
}

function GuestAuthCard(props: {
  status: 'idle' | 'requesting' | 'authenticated' | 'unauthenticated' | 'error';
  guestName: string | null;
  role: string | null;
  features: string[];
  error: string | null;
  isAdminView: boolean;
  canToggleTestMode: boolean;
  testModeEnabled: boolean;
  onToggleTestMode: () => void;
}) {
  return (
    <div className={`${styles.card} ${styles.authCard}`}>
      <div className={styles.kicker}>Guest session</div>

      {props.guestName ? (
        <div className={styles.authRow}>
          <span className={styles.authLabel}>Guest</span>
          <span className={styles.authValue}>{props.guestName}</span>
        </div>
      ) : null}

      {props.isAdminView ? (
        <>
          <div className={styles.authRow}>
            <span className={styles.authLabel}>Status</span>
            <span className={styles.authValue}>{props.status}</span>
          </div>

          {props.role ? (
            <div className={styles.authRow}>
              <span className={styles.authLabel}>Role</span>
              <span className={styles.authValue}>{props.role}</span>
            </div>
          ) : null}

          {props.features.length > 0 ? (
            <div className={styles.authFeatures}>
              {props.features.map((feature) => (
                <span key={feature} className={styles.authFeature}>
                  {feature}
                </span>
              ))}
            </div>
          ) : null}

          {props.error ? <div className={styles.authError}>{props.error}</div> : null}
        </>
      ) : (
        <div className={styles.authHint}>Authenticated guest view</div>
      )}

      {props.isAdminView && props.canToggleTestMode ? (
        <button className={styles.testToggleBtn} type="button" onClick={props.onToggleTestMode}>
          {props.testModeEnabled ? 'Disable Test Mode' : 'Enable Test Mode'}
        </button>
      ) : null}
    </div>
  );
}

function PickControlsCard(props: {
  guestPickCount: number;
  isGuestLocked: boolean;
  lockBusy: boolean;
  onLockIn: () => void;
}) {
  const picksRemaining = Math.max(0, MAX_PICKS_PER_GUEST - props.guestPickCount);
  const canLockIn = picksRemaining === 0 && !props.isGuestLocked;

  return (
    <div className={`${styles.card} ${styles.pickCard}`}>
      <div className={styles.authRow}>
        <span className={styles.authLabel}>Picks</span>
        <span className={styles.authValue}>
          {props.guestPickCount} / {MAX_PICKS_PER_GUEST}
        </span>
      </div>
      <div className={styles.authRow}>
        <span className={styles.authLabel}>Picks lock</span>
        <span className={styles.authValue}>{props.isGuestLocked ? 'locked' : 'open'}</span>
      </div>
      {!props.isGuestLocked && picksRemaining > 0 ? (
        <div className={styles.authHint}>
          Add {picksRemaining} more {picksRemaining === 1 ? 'pick' : 'picks'} to lock in.
        </div>
      ) : null}
      {!props.isGuestLocked ? (
        <button
          type="button"
          className={styles.claimBtn}
          onClick={props.onLockIn}
          disabled={props.lockBusy || !canLockIn}
        >
          {props.lockBusy ? 'Locking…' : 'Lock It In'}
        </button>
      ) : null}
    </div>
  );
}

function ApiStatusCard(props: {
  boardId: string;
  gameId?: string;
  testModeEnabled: boolean;
  lastFetchedAt: string | null;
}) {
  const query = new URLSearchParams();
  if (props.gameId) query.set('gameId', props.gameId);
  if (props.testModeEnabled) query.set('testMode', '1');
  const endpoint = `/api/boards/${encodeURIComponent(props.boardId)}/live${
    query.toString() ? `?${query.toString()}` : ''
  }`;

  return (
    <div className={`${styles.card} ${styles.apiCard}`}>
      <div className={styles.kicker}>API status</div>
      <div className={styles.authRow}>
        <span className={styles.authLabel}>Endpoint</span>
        <span className={styles.authValue}>{endpoint}</span>
      </div>
      <div className={styles.authRow}>
        <span className={styles.authLabel}>Mode</span>
        <span className={styles.authValue}>{props.testModeEnabled ? 'test' : 'live'}</span>
      </div>
      <div className={styles.authRow}>
        <span className={styles.authLabel}>Last fetch</span>
        <span className={styles.authValue}>
          {props.lastFetchedAt ? new Date(props.lastFetchedAt).toLocaleTimeString() : 'pending'}
        </span>
      </div>
    </div>
  );
}

function FirstTimeOverlay(props: {
  guestName: string;
  ownerCount: number;
  color: string;
  onColorChange: (value: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className={styles.onboardingOverlay}>
      <div className={`${styles.card} ${styles.onboardingPanel}`}>
        <div className={styles.kicker}>First-time setup</div>
        <div className={styles.authRow}>
          <span className={styles.authLabel}>Guest</span>
          <span className={styles.authValue}>{props.guestName}</span>
        </div>
        <div className={styles.authRow}>
          <span className={styles.authLabel}>Owner slots</span>
          <span className={styles.authValue}>{props.ownerCount} / 6</span>
        </div>
        <div className={styles.claimHint}>
          Claim your owner slot to unlock square picking.
        </div>
        <label className={styles.claimField}>
          <span className={styles.authLabel}>Your color</span>
          <div className={styles.claimColorRow}>
            <div className={styles.colorChoices}>
              {OWNER_COLOR_CHOICES.map((choice) => {
                const selected = props.color.toLowerCase() === choice.toLowerCase();
                return (
                  <button
                    key={choice}
                    type="button"
                    className={`${styles.colorChoiceBtn} ${selected ? styles.colorChoiceBtnSelected : ''}`}
                    style={{ background: choice }}
                    onClick={() => props.onColorChange(choice)}
                    aria-label={`Select color ${choice}`}
                    title={choice}
                  />
                );
              })}
            </div>
          </div>
        </label>
        <button
          type="button"
          className={styles.claimBtn}
          onClick={props.onSubmit}
          disabled={props.busy}
        >
          {props.busy ? 'Claiming…' : 'Claim Owner Slot'}
        </button>
        {props.error ? <div className={styles.authError}>{props.error}</div> : null}
      </div>
    </div>
  );
}

function deriveInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return '';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('').slice(0, 4);
}

function getReadableTextColor(hex: string) {
  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : clean;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#111111' : '#ffffff';
}

function TestingSuiteCard(props: {
  busyAction: string | null;
  status: string | null;
  onRunAction: (action: 'clear_picks' | 'clear_winners' | 'clear_all' | 'seed_demo') => void;
  homeTeam: string;
  awayTeam: string;
  onSimulateHomeScore: () => void;
  onSimulateAwayScore: () => void;
  quarterPreviewStage: number;
  onCycleQuarterPreview: () => void;
}) {
  const actions: Array<{
    id: 'clear_picks' | 'clear_winners' | 'clear_all' | 'seed_demo';
    label: string;
  }> = [
    { id: 'clear_picks', label: 'Clear Picks' },
    { id: 'clear_winners', label: 'Clear Winners' },
    { id: 'clear_all', label: 'Full Reset' },
    { id: 'seed_demo', label: 'Seed Demo Board' },
  ];

  return (
    <div className={`${styles.card} ${styles.testingSuiteCard}`}>
      <div className={styles.kicker}>Admin testing suite</div>
      <div className={styles.testingGrid}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.testingBtn}
            onClick={() => props.onRunAction(action.id)}
            disabled={Boolean(props.busyAction)}
          >
            {props.busyAction === action.id ? 'Working…' : action.label}
          </button>
        ))}
      </div>
      <div className={styles.testingGrid}>
        <button
          type="button"
          className={styles.testingBtn}
          onClick={props.onSimulateHomeScore}
          disabled={Boolean(props.busyAction)}
        >
          Sim {props.homeTeam} +7
        </button>
        <button
          type="button"
          className={styles.testingBtn}
          onClick={props.onSimulateAwayScore}
          disabled={Boolean(props.busyAction)}
        >
          Sim {props.awayTeam} +7
        </button>
      </div>
      <button type="button" className={styles.testingBtn} onClick={props.onCycleQuarterPreview}>
        Quarter Preview:{' '}
        {props.quarterPreviewStage === 0
          ? 'Off'
          : props.quarterPreviewStage === 1
            ? 'Q1 only'
            : props.quarterPreviewStage === 2
              ? 'Q1 + Q2'
              : props.quarterPreviewStage === 3
                ? 'Q1 + Q2 + Q3'
                : 'Q1 + Q2 + Q3 + Q4'}
      </button>
      {props.status ? <div className={styles.testingStatus}>{props.status}</div> : null}
    </div>
  );
}

function buildQuarterPreviewWinners(
  boardId: string,
  owners: Array<{ id: string; initials: string; displayName: string }>,
  stage: number
): QuarterWinner[] {
  const count = Math.max(0, Math.min(4, stage));
  return Array.from({ length: count }, (_, index) => {
    const quarter = index + 1;
    const owner = owners.length > 0 ? owners[index % owners.length] : null;
    return {
      id: `preview-q${quarter}`,
      boardId,
      quarter,
      ownerId: owner?.id ?? null,
      ownerInitials: owner?.initials ?? null,
      ownerDisplayName: owner?.displayName ?? null,
      homeScore: quarter * 7,
      awayScore: Math.max(0, quarter * 7 - 3),
      gamePeriodRecorded: quarter,
    };
  });
}
