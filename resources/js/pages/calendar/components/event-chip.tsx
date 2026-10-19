import { Link } from '@inertiajs/react';
import { EVENT_TYPE_STYLES } from '@/lib/calendar';
import { formatTime } from '@/lib/task-due';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types';

/**
 * One event, linking to its lead, task or opportunity. `compact` is the
 * single-line chip used inside month cells.
 */
export function EventChip({
    event,
    compact = false,
}: {
    event: CalendarEvent;
    compact?: boolean;
}) {
    const style = EVENT_TYPE_STYLES[event.type] ?? EVENT_TYPE_STYLES.Task;
    const isDone = event.status === 'Completed';
    const time = event.time ? formatTime(event.time) : 'All day';

    if (compact) {
        return (
            <Link
                href={event.href}
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                title={`${time} · ${event.title}${event.subtitle ? ` (${event.subtitle})` : ''}`}
                className={cn(
                    'block truncate rounded-sm border-l-2 px-1.5 py-0.5 text-[11px] leading-4 transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    style.chip,
                    isDone && 'line-through opacity-60',
                )}
            >
                {event.time && (
                    <span className="mr-1 font-medium tabular-nums">
                        {formatTime(event.time)}
                    </span>
                )}
                {event.title}
            </Link>
        );
    }

    return (
        <Link
            href={event.href}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            className={cn(
                'flex flex-col gap-0.5 rounded-md border-l-[3px] px-2.5 py-1.5 text-xs transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                style.chip,
                isDone && 'opacity-60',
            )}
        >
            <span className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{time}</span>
                <span className="text-[10px] font-medium tracking-wider uppercase opacity-80">
                    {event.type}
                </span>
                {event.status && (
                    <span className="ml-auto truncate text-[10px] opacity-80">
                        {event.status}
                    </span>
                )}
            </span>
            <span
                className={cn(
                    'truncate text-sm font-medium text-foreground',
                    isDone && 'line-through',
                )}
            >
                {event.title}
            </span>
            {event.subtitle && (
                <span className="truncate text-muted-foreground">
                    {event.subtitle}
                </span>
            )}
        </Link>
    );
}
