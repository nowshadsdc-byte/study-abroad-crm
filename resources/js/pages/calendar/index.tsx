import { Head, useHttp, usePage } from '@inertiajs/react';
import { format, isValid, parseISO, startOfMonth } from 'date-fns';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Plus,
    UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermission } from '@/hooks/use-permission';
import {
    EVENT_TYPE_STYLES,
    groupByDate,
    rangeLabel,
    shiftAnchor,
    toDateKey,
    visibleRange,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { calendar } from '@/routes';
import calendarApi from '@/routes/api/calendar';
import taskApi from '@/routes/api/tasks';
import type { CalendarResponse, CalendarView, TaskPerson } from '@/types';
import { CALENDAR_EVENT_TYPES, CALENDAR_VIEWS } from '@/types/calendar';
import { AgendaView, DayColumns } from './components/day-columns';
import { EventChip } from './components/event-chip';
import { MonthView } from './components/month-view';
import { QuickAddDialog } from './components/quick-add-dialog';

const VIEW_LABELS: Record<CalendarView, string> = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
};

/**
 * Query params from the Inertia page URL, which is identical during SSR and
 * hydration (unlike window.location).
 */
function pageQuery(pageUrl: string): URLSearchParams {
    return new URLSearchParams(pageUrl.split('?')[1] ?? '');
}

function initialState(pageUrl: string): {
    view: CalendarView;
    anchor: string;
    mine: boolean;
} {
    const query = pageQuery(pageUrl);
    const view = query.get('view');
    const date = query.get('date') ?? '';

    return {
        view: CALENDAR_VIEWS.includes(view as CalendarView)
            ? (view as CalendarView)
            : 'month',
        anchor:
            /^\d{4}-\d{2}-\d{2}$/.test(date) && isValid(parseISO(date))
                ? date
                : toDateKey(new Date()),
        mine: query.get('mine') === '1',
    };
}

export default function Calendar() {
    const page = usePage();
    const { can } = usePermission();
    const canAddTask = can('task.create');
    const canAddFollowUp = can('lead.view') && can('lead.edit');
    const canAdd = canAddTask || canAddFollowUp;

    const [initial] = useState(() => initialState(page.url));
    const [view, setView] = useState<CalendarView>(initial.view);
    const [anchor, setAnchor] = useState(initial.anchor);
    const [mine, setMine] = useState(initial.mine);
    const [reloadKey, setReloadKey] = useState(0);
    const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);

    const events = useHttp<Record<string, never>, CalendarResponse>({});
    const assignees = useHttp<Record<string, never>, { data: TaskPerson[] }>(
        {},
    );
    const range = useMemo(() => visibleRange(view, anchor), [view, anchor]);

    useEffect(() => {
        events
            .get(
                calendarApi.index.url({
                    query: {
                        start: range.start,
                        end: range.end,
                        mine: mine ? 1 : 0,
                    },
                }),
            )
            .then(() => setLoadError(false))
            .catch(() => {
                setLoadError(true);
                toast.error('Unable to load the calendar. Please try again.');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range.start, range.end, mine, reloadKey]);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('view', view);
        url.searchParams.set('date', anchor);
        url.searchParams.set('mine', mine ? '1' : '0');
        window.history.replaceState(window.history.state, '', url);
    }, [view, anchor, mine]);

    useEffect(() => {
        if (canAddTask) {
            void assignees
                .get(taskApi.assignableUsers().url)
                .catch(() => undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canAddTask]);

    // Before the first response (and during SSR) avoid clock-dependent text,
    // so server and client render the same markup.
    const response = events.response;
    const today = response?.today ?? '';
    const eventsByDate = useMemo(
        () => groupByDate(response?.data ?? []),
        [response],
    );
    const visibleEvents = response?.data ?? [];
    const eventCounts = [
        {
            label: 'Follow-ups',
            value: visibleEvents.filter((event) => event.source === 'follow_up')
                .length,
        },
        {
            label: 'Tasks',
            value: visibleEvents.filter((event) => event.source === 'task')
                .length,
        },
        {
            label: 'Deadlines',
            value: visibleEvents.filter((event) => event.source === 'deadline')
                .length,
        },
    ];
    const scheduledEvents = visibleEvents.slice(0, 5);
    const isFirstLoad = !response;

    const goToToday = (): void => {
        const target = today || toDateKey(new Date());
        setAnchor(
            view === 'month'
                ? toDateKey(startOfMonth(parseISO(target)))
                : target,
        );
    };

    const showDay = (date: string): void => {
        setView('day');
        setAnchor(date);
    };

    const onAdd = canAdd ? setQuickAddDate : null;

    return (
        <>
            <Head title="Calendar" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-linear-to-br from-primary to-teal-600 text-primary-foreground shadow-sm">
                            <CalendarDays className="size-5" />
                        </span>
                        <div className="flex flex-col gap-1">
                            <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                                Workspace / Schedule
                            </p>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                Calendar
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Follow-ups, tasks and application deadlines in
                                one place.
                            </p>
                        </div>
                    </div>
                    {canAdd && (
                        <Button
                            type="button"
                            onClick={() =>
                                setQuickAddDate(today || toDateKey(new Date()))
                            }
                            className="self-start bg-linear-to-br from-primary to-teal-600 hover:opacity-90 sm:self-auto"
                        >
                            <Plus className="size-4" />
                            New
                        </Button>
                    )}
                </header>

                <section className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Previous"
                                        onClick={() =>
                                            setAnchor(
                                                shiftAnchor(view, anchor, -1),
                                            )
                                        }
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Previous</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Next"
                                        onClick={() =>
                                            setAnchor(
                                                shiftAnchor(view, anchor, 1),
                                            )
                                        }
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Next</TooltipContent>
                            </Tooltip>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={goToToday}
                            >
                                Today
                            </Button>
                            <h2
                                className="ml-1 truncate text-base font-semibold tracking-tight sm:text-lg"
                                aria-live="polite"
                            >
                                {rangeLabel(view, anchor)}
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Toggle
                                variant="outline"
                                pressed={mine}
                                onPressedChange={setMine}
                                aria-label="Show only my items"
                                className="data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                            >
                                <UserRound className="size-4" />
                                Mine only
                            </Toggle>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                value={view}
                                onValueChange={(value) => {
                                    if (value) {
                                        setView(value as CalendarView);
                                    }
                                }}
                                aria-label="Calendar view"
                            >
                                {CALENDAR_VIEWS.map((option) => (
                                    <ToggleGroupItem
                                        key={option}
                                        value={option}
                                        className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                    >
                                        {VIEW_LABELS[option]}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                    </div>

                    <ul
                        aria-label="Event types"
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
                    >
                        {CALENDAR_EVENT_TYPES.map((type) => (
                            <li
                                key={type}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'size-2 rounded-full',
                                        EVENT_TYPE_STYLES[type].dot,
                                    )}
                                />
                                {type}
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                        {isFirstLoad && !loadError ? (
                            <Skeleton className="h-120 w-full rounded-lg" />
                        ) : isFirstLoad ? (
                            <section className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border bg-card px-6 text-center">
                                <CalendarDays className="size-6 text-muted-foreground" />
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-sm font-semibold">
                                        Calendar unavailable
                                    </h2>
                                    <p className="max-w-sm text-xs text-muted-foreground">
                                        Your schedule could not be loaded. Try
                                        again to see your events.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setReloadKey((key) => key + 1)
                                    }
                                >
                                    Try again
                                </Button>
                            </section>
                        ) : (
                            <div
                                className={cn(
                                    'transition-opacity',
                                    events.processing && 'opacity-60',
                                )}
                                aria-busy={events.processing}
                            >
                                {view === 'month' && (
                                    <MonthView
                                        anchor={anchor}
                                        start={range.start}
                                        end={range.end}
                                        today={today}
                                        eventsByDate={eventsByDate}
                                        onAdd={onAdd}
                                        onShowDay={showDay}
                                    />
                                )}
                                {(view === 'week' || view === 'day') && (
                                    <DayColumns
                                        start={range.start}
                                        end={range.end}
                                        today={today}
                                        eventsByDate={eventsByDate}
                                        onAdd={onAdd}
                                        onShowDay={showDay}
                                    />
                                )}
                                {view === 'agenda' && (
                                    <AgendaView
                                        start={range.start}
                                        end={range.end}
                                        today={today}
                                        eventsByDate={eventsByDate}
                                        onAdd={onAdd}
                                        onShowDay={showDay}
                                    />
                                )}
                            </div>
                        )}

                        {response &&
                            response.data.length === 0 &&
                            view !== 'agenda' && (
                                <p className="mt-3 text-center text-xs text-muted-foreground">
                                    Nothing scheduled{' '}
                                    {view === 'month'
                                        ? `in ${format(parseISO(anchor), 'MMMM')}`
                                        : 'for this period'}
                                    {canAdd
                                        ? '. Click a day to add something.'
                                        : '.'}
                                </p>
                            )}
                    </div>

                    <aside
                        aria-label="Calendar summary"
                        className="flex min-w-0 flex-col gap-3"
                    >
                        <section className="rounded-lg border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        In this view
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                                        {visibleEvents.length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        scheduled items
                                    </p>
                                </div>
                                <CalendarDays className="size-4 text-primary" />
                            </div>
                            <dl className="mt-4 grid grid-cols-3 divide-x border-t pt-3">
                                {eventCounts.map((count) => (
                                    <div
                                        key={count.label}
                                        className="flex flex-col gap-1 px-2 first:pl-0 last:pr-0"
                                    >
                                        <dt className="text-[10px] text-muted-foreground">
                                            {count.label}
                                        </dt>
                                        <dd className="text-sm font-semibold tabular-nums">
                                            {count.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <section className="rounded-lg border bg-card p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        Schedule
                                    </p>
                                    <h2 className="truncate text-sm font-semibold">
                                        {rangeLabel(view, anchor)}
                                    </h2>
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {visibleEvents.length}
                                </span>
                            </div>
                            <div className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
                                {isFirstLoad ? (
                                    <Skeleton className="h-24 w-full rounded-md" />
                                ) : scheduledEvents.length > 0 ? (
                                    scheduledEvents.map((event) => (
                                        <EventChip
                                            key={event.id}
                                            event={event}
                                        />
                                    ))
                                ) : (
                                    <p className="rounded-md bg-muted/50 px-3 py-5 text-center text-xs text-muted-foreground">
                                        No events in this period.
                                    </p>
                                )}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            <QuickAddDialog
                date={quickAddDate}
                canAddTask={canAddTask}
                canAddFollowUp={canAddFollowUp}
                assignableUsers={assignees.response?.data ?? []}
                onClose={() => setQuickAddDate(null)}
                onSaved={() => setReloadKey((key) => key + 1)}
            />
        </>
    );
}

Calendar.layout = {
    breadcrumbs: [
        {
            title: 'Calendar',
            href: calendar(),
        },
    ],
};
