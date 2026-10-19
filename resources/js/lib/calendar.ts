import {
    addDays,
    addMonths,
    addWeeks,
    endOfWeek,
    format,
    parseISO,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import type { CalendarEvent, CalendarEventType, CalendarView } from '@/types';

/** The business week starts on Saturday in Bangladesh. */
export const WEEK_STARTS_ON = 6;

/** Month grids always render six weeks, so the page height never jumps. */
const MONTH_GRID_DAYS = 42;

const AGENDA_DAYS = 30;

export type CalendarRange = { start: string; end: string };

export const EVENT_TYPE_STYLES: Record<
    CalendarEventType,
    { dot: string; chip: string }
> = {
    Call: {
        dot: 'bg-rose-500',
        chip: 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    WhatsApp: {
        dot: 'bg-emerald-500',
        chip: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    Meeting: {
        dot: 'bg-teal-500',
        chip: 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    },
    Email: {
        dot: 'bg-sky-500',
        chip: 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    Visit: {
        dot: 'bg-violet-500',
        chip: 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    Task: {
        dot: 'bg-amber-500',
        chip: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    Deadline: {
        dot: 'bg-slate-500',
        chip: 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    },
};

export function toDateKey(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/**
 * The dates (inclusive, Y-m-d) a view shows around the anchor date.
 */
export function visibleRange(
    view: CalendarView,
    anchor: string,
): CalendarRange {
    const date = parseISO(anchor);

    switch (view) {
        case 'month': {
            const start = startOfWeek(startOfMonth(date), {
                weekStartsOn: WEEK_STARTS_ON,
            });

            return {
                start: toDateKey(start),
                end: toDateKey(addDays(start, MONTH_GRID_DAYS - 1)),
            };
        }
        case 'week':
            return {
                start: toDateKey(
                    startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
                ),
                end: toDateKey(
                    endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
                ),
            };
        case 'day':
            return { start: anchor, end: anchor };
        case 'agenda':
            return {
                start: anchor,
                end: toDateKey(addDays(date, AGENDA_DAYS - 1)),
            };
    }
}

/**
 * Move the anchor one view-sized step backwards (-1) or forwards (1).
 */
export function shiftAnchor(
    view: CalendarView,
    anchor: string,
    direction: -1 | 1,
): string {
    const date = parseISO(anchor);

    switch (view) {
        case 'month':
            return toDateKey(startOfMonth(addMonths(date, direction)));
        case 'week':
            return toDateKey(addWeeks(date, direction));
        case 'day':
            return toDateKey(addDays(date, direction));
        case 'agenda':
            return toDateKey(addDays(date, direction * AGENDA_DAYS));
    }
}

export function rangeLabel(view: CalendarView, anchor: string): string {
    const { start, end } = visibleRange(view, anchor);

    if (view === 'month') {
        return format(parseISO(anchor), 'MMMM yyyy');
    }

    if (view === 'day') {
        return format(parseISO(anchor), 'EEEE, d MMMM yyyy');
    }

    return `${format(parseISO(start), 'd MMM')} – ${format(parseISO(end), 'd MMM yyyy')}`;
}

/**
 * Every date (Y-m-d) from start to end, inclusive.
 */
export function datesBetween(start: string, end: string): string[] {
    const dates: string[] = [];

    for (
        let date = parseISO(start);
        toDateKey(date) <= end;
        date = addDays(date, 1)
    ) {
        dates.push(toDateKey(date));
    }

    return dates;
}

export function groupByDate(
    events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
    const groups = new Map<string, CalendarEvent[]>();

    for (const event of events) {
        groups.set(event.date, [...(groups.get(event.date) ?? []), event]);
    }

    return groups;
}
