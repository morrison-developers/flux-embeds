import type { CalendarEvent, FluxCollectionRow } from './types';
import { sortEventsAscending } from './calendar-utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function decodeHtmlEntities(input: string) {
  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&bull;': '•',
    '&#8226;': '•',
  };

  return input.replace(
    /&(?:nbsp|amp|quot|#39|lt|gt|bull|#8226);/g,
    (match) => entityMap[match] ?? match
  );
}

export function stripHtmlToText(input: string) {
  const noTags = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return decodeHtmlEntities(noTags)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function toText(value: unknown) {
  if (typeof value === 'string') return stripHtmlToText(value).trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function parseDateString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return trimmed;
}

function isLikelyUrl(value: string) {
  try {
    const parsed = new URL(value, 'https://example.com');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function normalizeLink(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || !isLikelyUrl(trimmed)) return undefined;
    return trimmed;
  }

  if (!isRecord(value)) return undefined;

  for (const key of ['href', 'url', 'link', 'value']) {
    const candidate = value[key];
    if (typeof candidate === 'string') {
      const normalized = normalizeLink(candidate);
      if (normalized) return normalized;
    }
  }

  return undefined;
}

function looksLikeRow(record: Record<string, unknown>) {
  return (
    'title' in record ||
    'start' in record ||
    'end' in record ||
    'location' in record ||
    'notes' in record ||
    'link' in record
  );
}

function hasRowLikeValues(record: Record<string, unknown>) {
  return Object.values(record).some((value) => {
    if (!isRecord(value)) return false;
    return looksLikeRow(value);
  });
}

function normalizeCollectionRows(raw: unknown): FluxCollectionRow[] {
  if (Array.isArray(raw)) {
    return raw.filter(isRecord) as FluxCollectionRow[];
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (Array.isArray(raw.items)) {
    return raw.items.filter(isRecord) as FluxCollectionRow[];
  }

  if (looksLikeRow(raw)) {
    return [raw as FluxCollectionRow];
  }

  return Object.values(raw).filter(isRecord) as FluxCollectionRow[];
}

export function extractCollectionRows(
  payload: Record<string, unknown>,
  collectionName: string
): FluxCollectionRow[] | null {
  const collections = payload.collections;
  if (isRecord(collections) && collectionName in collections) {
    return normalizeCollectionRows(collections[collectionName]);
  }

  if (collectionName in payload) {
    return normalizeCollectionRows(payload[collectionName]);
  }

  // Legacy fallback: message payload is the collection rows object directly.
  if (looksLikeRow(payload) || hasRowLikeValues(payload)) {
    return normalizeCollectionRows(payload);
  }

  return null;
}

export function mapCollectionRowsToEvents(rows: FluxCollectionRow[]): CalendarEvent[] {
  const usedIds = new Set<string>();
  const mapped: CalendarEvent[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const title = toText(row.title);
    const start = parseDateString(row.start);

    if (!title || !start) {
      continue;
    }

    const end = parseDateString(row.end) ?? undefined;
    const location = toText(row.location) || undefined;
    const notes = toText(row.notes) || undefined;
    const href = normalizeLink(row.link);

    const rawId = toText(row.slug) || toText(row.name) || `event-${index + 1}`;
    const safeId = usedIds.has(rawId) ? `${rawId}-${index + 1}` : rawId;
    usedIds.add(safeId);

    mapped.push({
      id: safeId,
      title,
      start,
      end,
      location,
      notes,
      href,
    });
  }

  return sortEventsAscending(mapped);
}
