import {
  buildMonthGrid,
  filterVisibleEvents,
  formatEventDateTime,
} from './calendar-utils';
import { extractCollectionRows, mapCollectionRowsToEvents, stripHtmlToText } from './data';
import {
  COLLECTION_RESPONSE_TYPE,
  normalizeIncomingMessage,
  normalizeIncomingObject,
} from './message';
import { CALENDAR_COLLECTION_NAME, type FluxCollectionRow } from './types';

describe('message normalization', () => {
  it('accepts object payloads', () => {
    const normalized = normalizeIncomingMessage({
      type: COLLECTION_RESPONSE_TYPE,
      payload: { collections: { [CALENDAR_COLLECTION_NAME]: [] } },
    });

    expect(normalized).toEqual({
      type: COLLECTION_RESPONSE_TYPE,
      payload: { collections: { [CALENDAR_COLLECTION_NAME]: [] } },
    });
  });

  it('accepts JSON string payloads', () => {
    const raw = JSON.stringify({
      type: COLLECTION_RESPONSE_TYPE,
      payload: { collections: { [CALENDAR_COLLECTION_NAME]: [] } },
    });

    const normalized = normalizeIncomingMessage(raw);

    expect(normalized?.type).toBe(COLLECTION_RESPONSE_TYPE);
    expect(normalized?.payload).toEqual({
      collections: { [CALENDAR_COLLECTION_NAME]: [] },
    });
  });

  it('accepts wrapped { message } payloads', () => {
    const raw = {
      message: JSON.stringify({
        type: COLLECTION_RESPONSE_TYPE,
        payload: {
          requestId: 'abc',
          collections: { [CALENDAR_COLLECTION_NAME]: [] },
        },
      }),
    };

    const normalized = normalizeIncomingMessage(raw);

    expect(normalized?.type).toBe(COLLECTION_RESPONSE_TYPE);
    expect(normalized?.payload.requestId).toBe('abc');
  });

  it('unwraps legacy wrapper objects without type', () => {
    const raw = {
      message: {
        'crispus-attucks-cantori-new-york': {
          name: 'crispus-attucks-cantori-new-york',
          slug: 'crispus-attucks-cantori-new-york',
          title: 'Crispus Attucks – Cantori New York',
          start: '2026-03-14T20:00:00.000-04:00',
        },
      },
      targetOrigin: '*',
      about: '[name="calendar-embed"]',
    };

    const normalized = normalizeIncomingObject(raw);

    expect(normalized).toEqual({
      'crispus-attucks-cantori-new-york': {
        name: 'crispus-attucks-cantori-new-york',
        slug: 'crispus-attucks-cantori-new-york',
        title: 'Crispus Attucks – Cantori New York',
        start: '2026-03-14T20:00:00.000-04:00',
      },
    });
  });
});

describe('collection extraction', () => {
  it('extracts rows when collection payload is an object map', () => {
    const rows = extractCollectionRows(
      {
        collections: {
          [CALENDAR_COLLECTION_NAME]: {
            eventA: { title: 'Alpha', start: '2026-01-01' },
            eventB: { title: 'Beta', start: '2026-01-02' },
          },
        },
      },
      CALENDAR_COLLECTION_NAME
    );

    expect(rows).toHaveLength(2);
  });

  it('extracts rows when collection payload is an array', () => {
    const rows = extractCollectionRows(
      {
        collections: {
          [CALENDAR_COLLECTION_NAME]: [
            { title: 'Alpha', start: '2026-01-01' },
            { title: 'Beta', start: '2026-01-02' },
          ],
        },
      },
      CALENDAR_COLLECTION_NAME
    );

    expect(rows).toHaveLength(2);
  });

  it('extracts rows from legacy direct message payload', () => {
    const rows = extractCollectionRows(
      {
        'crispus-attucks-cantori-new-york': {
          name: 'crispus-attucks-cantori-new-york',
          slug: 'crispus-attucks-cantori-new-york',
          title: 'Crispus Attucks – Cantori New York',
          start: '2026-03-14T20:00:00.000-04:00',
          end: '2026-03-14T22:00:00.000-04:00',
          location: 'Church of the Holy Apostles, 296 9th Ave.',
          notes: 'Baritone soloist, Adolphus Hailstork, Mark Shapiro conductor',
          link: 'https://app.arts-people.com/index.php?show=298415',
        },
      },
      CALENDAR_COLLECTION_NAME
    );

    expect(rows).toHaveLength(1);
    expect(rows?.[0].title).toBe('Crispus Attucks – Cantori New York');
  });
});

describe('row mapping', () => {
  it('drops invalid rows, strips rich text, and sorts ascending', () => {
    const rows: FluxCollectionRow[] = [
      {
        slug: 'late-event',
        title: 'Later Event',
        start: '2026-05-20T19:00:00',
        notes: '<p>Later &bull; details</p>',
      },
      {
        name: 'early-event',
        title: '<h2>Early Event</h2>',
        start: '2026-04-12',
        link: { href: 'https://example.com/events/early' },
      },
      {
        title: 'Invalid Missing Start',
      },
      {
        title: '',
        start: '2026-07-01',
      },
    ];

    const events = mapCollectionRowsToEvents(rows);

    expect(events).toHaveLength(2);
    expect(events[0].id).toBe('early-event');
    expect(events[0].title).toBe('Early Event');
    expect(events[0].href).toBe('https://example.com/events/early');
    expect(events[1].id).toBe('late-event');
    expect(events[1].notes).toBe('Later • details');
  });

  it('converts html to readable plain text', () => {
    const result = stripHtmlToText('<p>Hello&nbsp;<strong>world</strong><br/>Line 2</p>');
    expect(result).toBe('Hello world\nLine 2');
  });
});

describe('calendar math', () => {
  it('builds a Sunday-first 42-cell month grid', () => {
    const cells = buildMonthGrid(new Date(2023, 4, 1));

    expect(cells).toHaveLength(42);
    expect(cells[0].date.getDay()).toBe(0);
    expect(cells[0].key).toBe('2023-04-30');
    expect(cells[41].key).toBe('2023-06-10');
  });

  it('filters upcoming events by default and exact date when selected', () => {
    const events = [
      { id: 'past', title: 'Past', start: '2026-01-09T09:00:00' },
      { id: 'upcoming', title: 'Upcoming', start: '2026-01-10T13:00:00' },
      { id: 'future', title: 'Future', start: '2026-01-12' },
    ];

    const upcoming = filterVisibleEvents(events, null, new Date('2026-01-10T12:00:00'));
    expect(upcoming.map((event) => event.id)).toEqual(['upcoming', 'future']);

    const selected = filterVisibleEvents(events, '2026-01-09', new Date('2026-01-10T12:00:00'));
    expect(selected.map((event) => event.id)).toEqual(['past']);
  });

  it('formats date/time output', () => {
    const withTime = formatEventDateTime('2026-01-10T13:30:00');
    const dateOnly = formatEventDateTime('2026-01-12');

    expect(withTime).toContain('2026');
    expect(withTime).toContain('·');
    expect(dateOnly).toContain('2026');
  });
});
