export const CALENDAR_COLLECTION_NAME = 'calendar-events' as const;
export const CALENDAR_EMBED_ID = 'shavon-lloyd-calendar' as const;

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  notes?: string;
  href?: string;
};

export type FluxCollectionRow = {
  slug?: string;
  name?: string;
  title?: unknown;
  start?: unknown;
  end?: unknown;
  location?: unknown;
  notes?: unknown;
  link?: unknown;
  [key: string]: unknown;
};

export type NormalizedEmbedMessage = {
  type: string;
  payload: Record<string, unknown>;
};

export type CollectionRequestMessage = {
  type: 'flux:collection:request';
  payload: {
    requestId: string;
    embed: string;
    collection: string;
    requestedAt: number;
  };
};

export type CollectionResponseMessage = {
  type: 'flux:collection:response';
  payload: {
    requestId?: string;
    collection?: string;
    collections?: Record<string, unknown>;
    [key: string]: unknown;
  };
};
