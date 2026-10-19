import { format, parseISO } from 'date-fns';
import { CalendarX2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { datesBetween } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types';
import { EventChip } from './event-chip';

function DayHeading({
    date,
    today,
    onAdd,
    onShowDay,
}: {
    date: string;
    today: string;
    onAdd: ((date: string) => void) | null;
    onShowDay?: (date: string) => void;
}) {
    const isToday = date === today;
    const label = (
        <>
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {format(parseISO(date), 'EEE')}
            </span>
            <span
                className={cn(
                    'grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    isToday &&
                        'bg-linear-to-br from-primary to-teal-600 text-primary-foreground',
                )}
            >
                {format(parseISO(date), 'd')}
            </span>
        </>
    );

    return (
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            {onShowDay ? (
                <button
                    type="button"
                    onClick={() => onShowDay(date)}
                    className="flex items-center gap-2 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={`Open ${format(parseISO(date), 'EEEE d MMMM')}`}
                >
                    {label}
                </button>
            ) : (
                <div className="flex items-center gap-2">{label}</div>
            )}
            {onAdd && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onAdd(date)}
                    aria-label={`Add to ${format(parseISO(date), 'd MMMM yyyy')}`}
                >
                    <Plus className="size-4" />
                </Button>
            )}
        </div>
    );
}

function DayEvents({ events }: { events: CalendarEvent[] }) {
    if (events.length === 0) {
        return (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Nothing scheduled
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-1.5 p-2">
            {events.map((event) => (
                <EventChip key={event.id} event={event} />
            ))}
        </div>
    );
}

/**
 * Week and day views: one column per date, all-day items first (the API
 * already sorts them that way).
 */
export function DayColumns({
    start,
    end,
    today,
    eventsByDate,
    onAdd,
    onShowDay,
}: {
    start: string;
    end: string;
    today: string;
    eventsByDate: Map<string, CalendarEvent[]>;
    onAdd: ((date: string) => void) | null;
    onShowDay?: (date: string) => void;
}) {
    const dates = datesBetween(start, end);
    const isSingleDay = dates.length === 1;

    return (
        <div
            className={cn(
                'grid overflow-hidden rounded-xl border bg-card shadow-sm',
                !isSingleDay && 'md:grid-cols-7',
            )}
        >
            {dates.map((date, index) => (
                <section
                    key={date}
                    aria-label={format(parseISO(date), 'EEEE d MMMM')}
                    className={cn(
                        'flex min-w-0 flex-col',
                        !isSingleDay && 'md:min-h-96',
                        index > 0 && 'border-t md:border-t-0',
                        !isSingleDay && index > 0 && 'md:border-l',
                        date === today && 'bg-accent/20',
                    )}
                >
                    <DayHeading
                        date={date}
                        today={today}
                        onAdd={onAdd}
                        onShowDay={isSingleDay ? undefined : onShowDay}
                    />
                    <DayEvents events={eventsByDate.get(date) ?? []} />
                </section>
            ))}
        </div>
    );
}

/**
 * Agenda: only the dates that have something on them.
 */
export function AgendaView({
    start,
    end,
    today,
    eventsByDate,
    onAdd,
    onShowDay,
}: {
    start: string;
    end: string;
    today: string;
    eventsByDate: Map<string, CalendarEvent[]>;
    onAdd: ((date: string) => void) | null;
    onShowDay: (date: string) => void;
}) {
    const dates = datesBetween(start, end).filter(
        (date) => (eventsByDate.get(date) ?? []).length > 0,
    );

    if (dates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
                <CalendarX2 className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">Nothing scheduled</p>
                <p className="text-xs text-muted-foreground">
                    No follow-ups, tasks or deadlines between{' '}
                    {format(parseISO(start), 'd MMM')} and{' '}
                    {format(parseISO(end), 'd MMM yyyy')}.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {dates.map((date) => (
                <section
                    key={date}
                    aria-label={format(parseISO(date), 'EEEE d MMMM')}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                    <DayHeading
                        date={date}
                        today={today}
                        onAdd={onAdd}
                        onShowDay={onShowDay}
                    />
                    <DayEvents events={eventsByDate.get(date) ?? []} />
                </section>
            ))}
        </div>
    );
}
