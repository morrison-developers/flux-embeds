import type { CalendarEvent } from './types';

export type CalendarCell = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateOnly(input: string): Date | null {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function parseEventDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = parseDateOnly(trimmed);
  if (dateOnly) return dateOnly;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

export function hasExplicitTime(value: string) {
  return /[T\s]\d{2}:\d{2}/.test(value);
}

export function toDateKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toDateKeyFromEventStart(start: string): string | null {
  const trimmed = start.trim();
  if (!trimmed) return null;

  const prefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (prefixMatch) return prefixMatch[1];

  const parsed = parseEventDate(trimmed);
  if (!parsed) return null;

  return toDateKeyFromDate(parsed);
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateKeyLabel(dateKey: string) {
  const parsed = parseDateOnly(dateKey);
  if (!parsed) return dateKey;
  return parsed.toLocaleDateString(undefined, { dateStyle: 'long' });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEventDateTime(start: string, end?: string) {
  const startDate = parseEventDate(start);
  if (!startDate) return start;

  if (!end) {
    if (hasExplicitTime(start)) {
      return `${startDate.toLocaleDateString(undefined, { dateStyle: 'long' })} · ${formatTime(startDate)}`;
    }
    return startDate.toLocaleDateString(undefined, { dateStyle: 'long' });
  }

  const endDate = parseEventDate(end);
  if (!endDate) {
    if (hasExplicitTime(start)) {
      return `${startDate.toLocaleDateString(undefined, { dateStyle: 'long' })} · ${formatTime(startDate)}`;
    }
    return startDate.toLocaleDateString(undefined, { dateStyle: 'long' });
  }

  const sameDay = toDateKeyFromDate(startDate) === toDateKeyFromDate(endDate);
  const startHasTime = hasExplicitTime(start);
  const endHasTime = hasExplicitTime(end);

  if (sameDay && (startHasTime || endHasTime)) {
    return `${startDate.toLocaleDateString(undefined, { dateStyle: 'long' })} · ${formatTime(startDate)} - ${formatTime(endDate)}`;
  }

  const startText = startHasTime
    ? `${startDate.toLocaleDateString(undefined, { dateStyle: 'long' })} ${formatTime(startDate)}`
    : startDate.toLocaleDateString(undefined, { dateStyle: 'long' });

  const endText = endHasTime
    ? `${endDate.toLocaleDateString(undefined, { dateStyle: 'long' })} ${formatTime(endDate)}`
    : endDate.toLocaleDateString(undefined, { dateStyle: 'long' });

  return `${startText} - ${endText}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftMonth(date: Date, delta: number) {
  return startOfMonth(new Date(date.getFullYear(), date.getMonth() + delta, 1));
}

export function buildMonthGrid(currentMonth: Date, today = new Date()): CalendarCell[] {
  const monthStart = startOfMonth(currentMonth);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const todayKey = toDateKeyFromDate(today);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);

    cells.push({
      date: day,
      key: toDateKeyFromDate(day),
      inCurrentMonth: day.getMonth() === currentMonth.getMonth(),
      isToday: toDateKeyFromDate(day) === todayKey,
    });
  }

  return cells;
}

export function countEventsByDate(events: CalendarEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = toDateKeyFromEventStart(event.start);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function filterVisibleEvents(
  events: CalendarEvent[],
  selectedDateKey: string | null,
  now = new Date()
) {
  if (selectedDateKey) {
    return events.filter((event) => toDateKeyFromEventStart(event.start) === selectedDateKey);
  }

  const nowTime = now.getTime();

  return events.filter((event) => {
    const parsed = parseEventDate(event.start);
    return parsed ? parsed.getTime() >= nowTime : false;
  });
}

export function splitEventsByUpcomingStatus(events: CalendarEvent[], now = new Date()) {
  const nowTime = now.getTime();
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];

  for (const event of events) {
    const parsed = parseEventDate(event.start);
    if (!parsed) continue;

    if (parsed.getTime() >= nowTime) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }

  return {
    upcoming: sortEventsAscending(upcoming),
    past: sortEventsAscending(past).reverse(),
  };
}

export function sortEventsAscending(events: CalendarEvent[]) {
  return [...events].sort((left, right) => {
    const leftDate = parseEventDate(left.start);
    const rightDate = parseEventDate(right.start);

    const leftTime = leftDate ? leftDate.getTime() : Number.POSITIVE_INFINITY;
    const rightTime = rightDate ? rightDate.getTime() : Number.POSITIVE_INFINITY;

    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.title.localeCompare(right.title);
  });
}
