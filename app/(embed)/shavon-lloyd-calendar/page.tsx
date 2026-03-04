'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EmbedShell } from '../_shared/EmbedShell';
import styles from './shavon-lloyd-calendar.module.css';
import {
  buildMonthGrid,
  countEventsByDate,
  filterVisibleEvents,
  formatDateKeyLabel,
  formatEventDateTime,
  formatMonthLabel,
  shiftMonth,
  startOfMonth,
  toDateKeyFromEventStart,
  WEEKDAY_LABELS,
} from './calendar-utils';
import {
  buildCollectionRequestMessage,
  COLLECTION_RESPONSE_TYPE,
  createRequestId,
  normalizeIncomingObject,
  normalizeIncomingMessage,
} from './message';
import { extractCollectionRows, mapCollectionRowsToEvents } from './data';
import { buildSampleEvents } from './sample-events';
import {
  CALENDAR_COLLECTION_NAME,
  CALENDAR_EMBED_ID,
  type CalendarEvent,
  type CollectionResponseMessage,
} from './types';

const POLL_INTERVAL_MS = 800;
const POLL_TIMEOUT_MS = 10_000;

type DataSourceStatus = 'loading' | 'host' | 'sample' | 'empty';

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function DayEventBadge({ count }: { count: number }) {
  return (
    <span className={styles.eventIconBadge} aria-label={`${count} event${count === 1 ? '' : 's'}`}>
      <svg viewBox="0 0 24 24" className={styles.eventIcon} aria-hidden>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </svg>
      <span className={styles.eventIconCount}>{count}</span>
    </span>
  );
}

export default function ShavonLloydCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('loading');

  const requestIdRef = useRef('');
  const settledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let intervalId: number | null = null;
    let timeoutId: number | null = null;
    let started = false;

    requestIdRef.current = createRequestId();
    settledRef.current = false;

    const clearTimers = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const settleWithHost = (nextEvents: CalendarEvent[]) => {
      if (settledRef.current) return;
      settledRef.current = true;
      clearTimers();
      setEvents(nextEvents);
      setDataSourceStatus(nextEvents.length > 0 ? 'host' : 'empty');
    };

    const settleWithSample = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      clearTimers();
      setEvents(buildSampleEvents());
      setDataSourceStatus('sample');
    };

    const sendRequest = () => {
      if (window.parent === window) return;

      window.parent.postMessage(
        buildCollectionRequestMessage({
          collection: CALENDAR_COLLECTION_NAME,
          embed: CALENDAR_EMBED_ID,
          requestId: requestIdRef.current,
        }),
        '*'
      );
    };

    const startPolling = () => {
      if (started) return;
      started = true;

      sendRequest();

      intervalId = window.setInterval(() => {
        if (settledRef.current) return;
        sendRequest();
      }, POLL_INTERVAL_MS);

      timeoutId = window.setTimeout(() => {
        settleWithSample();
      }, POLL_TIMEOUT_MS);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (settledRef.current) return;

      const normalized = normalizeIncomingMessage(event.data);
      if (normalized && normalized.type === COLLECTION_RESPONSE_TYPE) {
        const response = normalized as CollectionResponseMessage;
        const payloadRequestId =
          typeof response.payload.requestId === 'string'
            ? response.payload.requestId
            : null;

        if (payloadRequestId && payloadRequestId !== requestIdRef.current) {
          return;
        }

        const rows = extractCollectionRows(response.payload, CALENDAR_COLLECTION_NAME);
        if (rows === null) return;

        settleWithHost(mapCollectionRowsToEvents(rows));
        return;
      }

      // Legacy fallback:
      // parent posts { message: {<itemKey>: {title,start,...}}, targetOrigin, about }.
      const legacyPayload = normalizeIncomingObject(event.data);
      if (!legacyPayload) return;

      const legacyRows = extractCollectionRows(legacyPayload, CALENDAR_COLLECTION_NAME);
      if (legacyRows === null) return;

      settleWithHost(mapCollectionRowsToEvents(legacyRows));
    };

    window.addEventListener('message', onMessage);

    const onLoad = () => {
      startPolling();
    };

    if (document.readyState === 'complete') {
      startPolling();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    return () => {
      clearTimers();
      window.removeEventListener('message', onMessage);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  const monthCells = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const eventCounts = useMemo(() => countEventsByDate(events), [events]);

  const visibleEvents = useMemo(
    () => filterVisibleEvents(events, selectedDate),
    [events, selectedDate]
  );

  const sidebarTitle = selectedDate ? formatDateKeyLabel(selectedDate) : 'Upcoming';
  const showSourceLabel = process.env.NODE_ENV !== 'production';

  const sourceLabel = useMemo(() => {
    if (dataSourceStatus === 'loading') {
      return `Requesting ${CALENDAR_COLLECTION_NAME}…`;
    }
    if (dataSourceStatus === 'host') {
      return `Source: ${CALENDAR_COLLECTION_NAME}`;
    }
    if (dataSourceStatus === 'empty') {
      return `${CALENDAR_COLLECTION_NAME} returned no events`;
    }
    return 'Using local sample events';
  }, [dataSourceStatus]);

  const emptyMessage = useMemo(() => {
    if (selectedDate) return 'No events on this date.';
    if (dataSourceStatus === 'loading') {
      return `Waiting for ${CALENDAR_COLLECTION_NAME} from parent…`;
    }
    if (dataSourceStatus === 'empty') {
      return `No events found in ${CALENDAR_COLLECTION_NAME}.`;
    }
    return 'No upcoming events.';
  }, [dataSourceStatus, selectedDate]);

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <div className={styles.frame}>
          <div className={styles.grid}>
            <div className={styles.leftPane}>
              <header className={styles.calendarHeader}>
                <h2 className={styles.monthTitle}>{formatMonthLabel(currentMonth)}</h2>
                <div className={styles.navButtons}>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={() => setCurrentMonth((prev) => shiftMonth(prev, -1))}
                    aria-label="Previous month"
                  >
                    <svg viewBox="0 0 24 24" className={styles.navIcon} aria-hidden>
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={() => setCurrentMonth((prev) => shiftMonth(prev, 1))}
                    aria-label="Next month"
                  >
                    <svg viewBox="0 0 24 24" className={styles.navIcon} aria-hidden>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </header>

              <div className={styles.weekdays}>
                {WEEKDAY_LABELS.map((day) => (
                  <div key={day} className={styles.weekdayLabel}>
                    {day}
                  </div>
                ))}
              </div>

              <div className={styles.dayGrid}>
                {monthCells.map((cell) => {
                  const count = eventCounts.get(cell.key) ?? 0;
                  const isSelected = selectedDate === cell.key;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(cell.key);
                        if (!cell.inCurrentMonth) {
                          setCurrentMonth(startOfMonth(cell.date));
                        }
                      }}
                      className={classNames(
                        styles.dayCell,
                        !cell.inCurrentMonth && styles.dayCellOutside,
                        cell.isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected
                      )}
                      aria-pressed={isSelected}
                    >
                      {count > 0 ? <DayEventBadge count={count} /> : null}
                      <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className={styles.rightPane}>
              {showSourceLabel ? <div className={styles.statusLine}>{sourceLabel}</div> : null}
              <h3 className={styles.sidebarTitle}>{sidebarTitle}</h3>

              <ul className={styles.eventList}>
                {visibleEvents.map((event) => {
                  const eventDateKey = toDateKeyFromEventStart(event.start);
                  const selectedCard = Boolean(selectedDate && eventDateKey === selectedDate);
                  const eventDateLabel = formatEventDateTime(event.start, event.end);

                  return (
                    <li
                      key={event.id}
                      className={classNames(
                        styles.eventCard,
                        selectedCard && styles.eventCardSelected
                      )}
                    >
                      <div className={styles.eventHeader}>
                        <div className={styles.eventDateHitArea} title={eventDateLabel}>
                          <div className={styles.eventDate}>{eventDateLabel}</div>
                        </div>
                        {event.href ? (
                          <a
                            href={event.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.eventLink}
                          >
                            View details
                          </a>
                        ) : null}
                      </div>

                      <div className={styles.eventTitle}>{event.title}</div>

                      {event.location ? (
                        <div className={styles.eventLocation}>{event.location}</div>
                      ) : null}

                      {event.notes ? <div className={styles.eventNotes}>{event.notes}</div> : null}
                    </li>
                  );
                })}

                {visibleEvents.length === 0 ? (
                  <li className={styles.emptyState}>{emptyMessage}</li>
                ) : null}
              </ul>

              {selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className={styles.showAllButton}
                >
                  Show all upcoming
                </button>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    </EmbedShell>
  );
}
