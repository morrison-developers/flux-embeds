'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

type GuestRole = 'viewer' | 'picker' | 'captain' | 'admin';

export type GuestAuthState = {
  status: 'idle' | 'requesting' | 'authenticated' | 'unauthenticated' | 'error';
  parentOrigin: string | null;
  guestId: string | null;
  guestName: string | null;
  role: GuestRole | null;
  features: string[];
  expiresAt: number | null;
  error: string | null;
};

type AuthResultPayload = {
  requestId?: string;
  authenticated?: boolean;
  guestId?: string;
  guestName?: string;
  role?: GuestRole;
  features?: string[];
  exp?: number;
  sig?: string;
  source?: string;
};

type AuthResultMessage = {
  type: string;
  payload: AuthResultPayload;
};

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizeOrigin(origin?: string): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function isExpired(exp?: number) {
  if (!exp) return false;
  return Date.now() >= exp * 1000;
}

function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input.trim()) as unknown;
  } catch {
    return null;
  }
}

function normalizeAuthResultMessage(raw: unknown): AuthResultMessage | null {
  let candidate: unknown = raw;

  // Some parent tools send postMessage payload as a JSON string.
  if (typeof candidate === 'string') {
    const parsed = tryParseJson(candidate);
    if (!parsed) return null;
    candidate = parsed;
  }

  // Some parent tools wrap the actual message in { message, targetOrigin, about }.
  if (candidate && typeof candidate === 'object' && 'message' in candidate) {
    const wrapper = candidate as { message?: unknown };
    let embeddedMessage = wrapper.message;
    if (typeof embeddedMessage === 'string') {
      embeddedMessage = tryParseJson(embeddedMessage) ?? embeddedMessage;
    }
    if (embeddedMessage && typeof embeddedMessage === 'object') {
      candidate = embeddedMessage;
    }
  }

  if (!candidate || typeof candidate !== 'object') return null;

  const message = candidate as { type?: unknown; payload?: unknown };
  if (typeof message.type !== 'string') return null;

  return {
    type: message.type,
    payload: (message.payload ?? {}) as AuthResultPayload,
  };
}

function getGuestNameFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('guestName') ?? params.get('guest') ?? '').trim();
    if (!raw) return null;
    return raw.slice(0, 64);
  } catch {
    return null;
  }
}

function fallbackToUrlGuest(
  setState: Dispatch<SetStateAction<GuestAuthState>>,
  expectedOrigin: string | null
) {
  const fallbackGuest = getGuestNameFromUrl();
  if (!fallbackGuest) {
    setState((prev) => ({
      ...prev,
      status: 'unauthenticated',
      error: 'No auth response from parent.',
    }));
    return;
  }

  setState((prev) => ({
    ...prev,
    status: 'authenticated',
    parentOrigin: expectedOrigin,
    guestId: `url:${fallbackGuest.toLowerCase()}`,
    guestName: fallbackGuest,
    role: 'picker',
    features: ['url-guest-fallback'],
    expiresAt: null,
    error: null,
  }));
}

export function useEmbedGuestAuth(params: {
  boardId: string;
  parentOrigin?: string;
  enabled: boolean;
}) {
  const expectedOrigin = useMemo(() => normalizeOrigin(params.parentOrigin), [params.parentOrigin]);

  const [state, setState] = useState<GuestAuthState>({
    status: 'idle',
    parentOrigin: expectedOrigin,
    guestId: null,
    guestName: null,
    role: null,
    features: [],
    expiresAt: null,
    error: null,
  });

  const activeRequestIdRef = useRef<string>('');
  const resolvedParentOriginRef = useRef<string | null>(expectedOrigin);

  const requestAuth = useCallback(() => {
    if (!params.enabled || !params.boardId) {
      setState((prev) => ({ ...prev, status: 'idle', error: null }));
      return;
    }

    if (typeof window === 'undefined' || window.parent === window) {
      fallbackToUrlGuest(setState, expectedOrigin);
      return;
    }

    const requestId = randomId();
    activeRequestIdRef.current = requestId;

    setState((prev) => ({
      ...prev,
      status: prev.guestName ? 'authenticated' : 'requesting',
      error: null,
      parentOrigin: expectedOrigin,
    }));

    const targetOrigin = expectedOrigin ?? '*';

    window.parent.postMessage(
      {
        type: 'superbowl:auth:request',
        payload: {
          requestId,
          boardId: params.boardId,
          requestedAt: Date.now(),
        },
      },
      targetOrigin
    );
  }, [expectedOrigin, params.boardId, params.enabled]);

  useEffect(() => {
    resolvedParentOriginRef.current = expectedOrigin;
  }, [expectedOrigin]);

  useEffect(() => {
    if (!params.enabled || !params.boardId) return;

    const kickoff = window.setTimeout(() => {
      requestAuth();
    }, 0);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;

      const data = normalizeAuthResultMessage(event.data);
      if (!data) return;
      if (data.type !== 'superbowl:auth:result') return;

      if (resolvedParentOriginRef.current && event.origin !== resolvedParentOriginRef.current) {
        return;
      }

      if (!resolvedParentOriginRef.current) {
        resolvedParentOriginRef.current = event.origin;
      }

      const payload = data.payload ?? {};

      if (!payload.requestId || payload.requestId !== activeRequestIdRef.current) {
        return;
      }

      // Guard against stale/legacy responders. Parent should send source: "parent-auth-v2".
      if (payload.source !== 'parent-auth-v2') {
        return;
      }

      if (payload.authenticated !== true) {
        setState((prev) => ({
          ...(prev.guestName
            ? {
                ...prev,
                parentOrigin: resolvedParentOriginRef.current,
                error: 'Parent auth refresh returned unauthenticated. Retaining current session.',
              }
            : {
                ...prev,
                status: 'unauthenticated',
                parentOrigin: resolvedParentOriginRef.current,
                guestId: null,
                guestName: null,
                role: null,
                features: [],
                expiresAt: null,
                error: null,
              }),
        }));
        return;
      }

      if (isExpired(payload.exp)) {
        setState((prev) => ({
          ...(prev.guestName
            ? {
                ...prev,
                parentOrigin: resolvedParentOriginRef.current,
                error: 'Parent auth refresh is expired. Retaining current session.',
              }
            : {
                ...prev,
                status: 'error',
                parentOrigin: resolvedParentOriginRef.current,
                error: 'Auth session is expired.',
                guestId: null,
                guestName: null,
                role: null,
                features: [],
                expiresAt: null,
              }),
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'authenticated',
        parentOrigin: resolvedParentOriginRef.current,
        guestId: payload.guestId ?? null,
        guestName: payload.guestName ?? null,
        role: payload.role ?? 'viewer',
        features: Array.isArray(payload.features) ? payload.features : [],
        expiresAt: payload.exp ? payload.exp * 1000 : null,
        error: null,
      }));
    };

    window.addEventListener('message', onMessage);

    const timeout = window.setTimeout(() => {
      setState((prev) => {
        if (prev.status !== 'requesting') return prev;
        if (prev.guestName && prev.status === 'authenticated') {
          return {
            ...prev,
            error: 'Auth refresh timed out. Retaining current session.',
          };
        }
        return {
          ...prev,
          status: 'unauthenticated',
          error: 'No auth response from parent.',
        };
      });
    }, 5000);

    const refreshTimer = window.setInterval(() => {
      requestAuth();
    }, 5 * 60_000);

    return () => {
      window.clearTimeout(kickoff);
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
      window.clearInterval(refreshTimer);
    };
  }, [params.boardId, params.enabled, requestAuth]);

  return {
    ...state,
    requestAuth,
  };
}
