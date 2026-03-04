import type { CalendarEvent } from './types';
import { sortEventsAscending } from './calendar-utils';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDateTime(date: Date) {
  return `${formatDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function addDays(base: Date, days: number, hour?: number, minute = 0) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  if (typeof hour === 'number') {
    next.setHours(hour, minute, 0, 0);
  } else {
    next.setHours(0, 0, 0, 0);
  }
  return next;
}

export function buildSampleEvents(now = new Date()): CalendarEvent[] {
  const anchor = new Date(now);
  anchor.setHours(12, 0, 0, 0);

  const events: CalendarEvent[] = [
    {
      id: 'sample-1',
      title: 'Studio Recording Session',
      start: formatDateTime(addDays(anchor, 3, 19, 0)),
      location: 'New York, NY',
      notes: 'Studio recording of selected art song repertoire.',
      href: 'https://example.com/events/studio-recording-session',
    },
    {
      id: 'sample-2',
      title: 'Benefit Concert Appearance',
      start: formatDateTime(addDays(anchor, 10, 18, 30)),
      location: 'Carnegie Hall, Stern Auditorium',
      notes: 'Guest baritone soloist with chamber orchestra.',
      href: 'https://example.com/events/benefit-concert-appearance',
    },
    {
      id: 'sample-3',
      title: 'Masterclass Residency',
      start: formatDate(addDays(anchor, 18)),
      location: 'Harlem School of the Arts',
      notes: 'Open rehearsal and vocal performance workshop.',
      href: 'https://example.com/events/masterclass-residency',
    },
    {
      id: 'sample-4',
      title: 'Premiere Performance',
      start: formatDateTime(addDays(anchor, 27, 20, 0)),
      location: 'The Riverside Theater',
      notes: 'World premiere with chamber ensemble and choir.',
      href: 'https://example.com/events/premiere-performance',
    },
  ];

  return sortEventsAscending(events);
}
