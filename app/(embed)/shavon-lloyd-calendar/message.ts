import type {
  CollectionRequestMessage,
  NormalizedEmbedMessage,
} from './types';

export const COLLECTION_REQUEST_TYPE = 'flux:collection:request' as const;
export const COLLECTION_RESPONSE_TYPE = 'flux:collection:response' as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input.trim()) as unknown;
  } catch {
    return null;
  }
}

function unwrapMessageValue(raw: unknown): unknown {
  let candidate = raw;

  if (typeof candidate === 'string') {
    const parsed = tryParseJson(candidate);
    if (!parsed) return null;
    candidate = parsed;
  }

  if (isRecord(candidate) && 'message' in candidate) {
    let embedded = candidate.message;
    if (typeof embedded === 'string') {
      embedded = tryParseJson(embedded) ?? embedded;
    }
    if (isRecord(embedded)) {
      candidate = embedded;
    }
  }

  return candidate;
}

export function normalizeIncomingObject(raw: unknown): Record<string, unknown> | null {
  const candidate = unwrapMessageValue(raw);
  if (!isRecord(candidate)) return null;
  return candidate;
}

export function normalizeIncomingMessage(raw: unknown): NormalizedEmbedMessage | null {
  const candidate = normalizeIncomingObject(raw);
  if (!candidate) return null;
  if (typeof candidate.type !== 'string') return null;

  const payload = isRecord(candidate.payload) ? candidate.payload : {};

  return {
    type: candidate.type,
    payload,
  };
}

export function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `calendar-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function buildCollectionRequestMessage(params: {
  collection: string;
  requestId: string;
  embed: string;
}): CollectionRequestMessage {
  return {
    type: COLLECTION_REQUEST_TYPE,
    payload: {
      collection: params.collection,
      requestId: params.requestId,
      embed: params.embed,
      requestedAt: Date.now(),
    },
  };
}
