import { format, parseISO } from 'date-fns';
import { datesBetween, EVENT_TYPE_STYLES } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types';
import { EventChip } from './event-chip';

const MAX_CHIPS_PER_DAY = 3;

/**
 * Six-week month grid starting on Saturday. Clicking a day's empty space
 * opens quick-add; "+N more" jumps to that day.
 */
export function MonthView({
    anchor,
    start,
    end,
    today,
    eventsByDate,
    onAdd,
    onShowDay,
}: {
    anchor: string;
    start: string;
    end: string;
    today: string;
    eventsByDate: Map<string, CalendarEvent[]>;
    onAdd: ((date: string) => void) | null;
    onShowDay: (date: string) => void;
}) {
    const dates = datesBetween(start, end);
    const month = anchor.slice(0, 7);

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b bg-muted/40">
                {dates.slice(0, 7).map((date) => (
                    <div
                        key={date}
                        className="px-2 py-2 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                        <span className="hidden sm:inline">
                            {format(parseISO(date), 'EEE')}
                        </span>
                        <span className="sm:hidden">
                            {format(parseISO(date), 'EEEEE')}
                        </span>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {dates.map((date, index) => {
                    const events = eventsByDate.get(date) ?? [];
                    const hidden = events.length - MAX_CHIPS_PER_DAY;
                    const isToday = date === today;
                    const inMonth = date.startsWith(month);

                    return (
                        <div
                            key={date}
                            role={onAdd ? 'button' : undefined}
                            tabIndex={onAdd ? 0 : undefined}
                            aria-label={
                                onAdd
                                    ? `Add to ${format(parseISO(date), 'd MMMM yyyy')}`
                                    : undefined
                            }
                            onClick={() => onAdd?.(date)}
                            onKeyDown={(keyEvent) => {
                                if (
                                    onAdd &&
                                    keyEvent.target ===
                                        keyEvent.currentTarget &&
                                    (keyEvent.key === 'Enter' ||
                                        keyEvent.key === ' ')
                                ) {
                                    keyEvent.preventDefault();
                                    onAdd(date);
                                }
                            }}
                            className={cn(
                                'flex min-h-16 min-w-0 flex-col gap-1 border-b p-1 transition-colors sm:min-h-28 sm:p-1.5',
                                index % 7 !== 6 && 'border-r',
                                index >= 35 && 'border-b-0',
                                !inMonth && 'bg-muted/30',
                                onAdd &&
                                    'cursor-pointer hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset',
                            )}
                        >
                            <span
                                className={cn(
                                    'grid size-6 place-items-center rounded-full text-xs font-medium tabular-nums',
                                    !inMonth && 'text-muted-foreground',
                                    isToday &&
                                        'bg-linear-to-br from-primary to-teal-600 font-semibold text-primary-foreground',
                                )}
                            >
                                {format(parseISO(date), 'd')}
                            </span>

                            {/* Phones get coloured dots; wider screens get chips. */}
                            {events.length > 0 && (
                                <button
                                    type="button"
                                    onClick={(clickEvent) => {
                                        clickEvent.stopPropagation();
                                        onShowDay(date);
                                    }}
                                    aria-label={`${events.length} events on ${format(parseISO(date), 'd MMMM')}`}
                                    className="flex flex-wrap gap-0.5 sm:hidden"
                                >
                                    {events.slice(0, 6).map((event) => (
                                        <span
                                            key={event.id}
                                            className={cn(
                                                'size-1.5 rounded-full',
                                                EVENT_TYPE_STYLES[event.type]
                                                    ?.dot,
                                            )}
                                        />
                                    ))}
                                </button>
                            )}
                            <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                                {events
                                    .slice(0, MAX_CHIPS_PER_DAY)
                                    .map((event) => (
                                        <EventChip
                                            key={event.id}
                                            event={event}
                                            compact
                                        />
                                    ))}
                                {hidden > 0 && (
                                    <button
                                        type="button"
                                        onClick={(clickEvent) => {
                                            clickEvent.stopPropagation();
                                            onShowDay(date);
                                        }}
                                        className="self-start rounded-sm px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                    >
                                        +{hidden} more
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
