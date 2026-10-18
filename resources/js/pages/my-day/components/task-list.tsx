import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CircleCheckBig } from 'lucide-react';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Kbd } from '@/components/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskView } from '@/types';
import { TaskRow } from './task-row';

type TaskGroup = {
    key: string;
    label: string;
    tasks: Task[];
    isAlert?: boolean;
};

const GROUP_ORDER = [
    { key: 'overdue', label: 'Overdue', isAlert: true },
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'this_week', label: 'This week' },
    { key: 'later', label: 'Later' },
    { key: 'no_date', label: 'No due date' },
    { key: 'done', label: 'Done' },
] as const;

const EMPTY_MESSAGES: Record<TaskView, { title: string; body: string }> = {
    my_day: {
        title: 'Nothing due today — nice.',
        body: 'Tasks due today and anything overdue will show up here.',
    },
    assigned: {
        title: 'No open tasks assigned to you.',
        body: 'When a colleague assigns you a task, it appears here.',
    },
    created: {
        title: "You haven't created any tasks yet.",
        body: 'Create a task to plan a follow-up or hand work to a colleague.',
    },
    upcoming: {
        title: 'Nothing scheduled ahead.',
        body: 'Tasks with a future due date will be listed here.',
    },
    completed: {
        title: 'No completed tasks yet.',
        body: 'Finished tasks are kept here for reference.',
    },
    all: {
        title: 'No tasks yet.',
        body: 'Tasks from everyone in the agency appear here.',
    },
};

function groupKey(task: Task, today: string): string {
    if (task.due_state === 'completed' || task.due_state === 'cancelled') {
        return 'done';
    }

    if (task.due_state === 'overdue' || task.due_state === 'today') {
        return task.due_state;
    }

    if (!task.due_date) {
        return 'no_date';
    }

    const days = differenceInCalendarDays(
        parseISO(task.due_date),
        parseISO(today),
    );

    if (days === 1) {
        return 'tomorrow';
    }

    return days <= 7 ? 'this_week' : 'later';
}

function groupTasks(tasks: Task[], view: TaskView, today: string): TaskGroup[] {
    if (view === 'completed') {
        return tasks.length
            ? [{ key: 'completed', label: 'Completed', tasks }]
            : [];
    }

    const buckets = new Map<string, Task[]>();

    for (const task of tasks) {
        const key = groupKey(task, today);
        buckets.set(key, [...(buckets.get(key) ?? []), task]);
    }

    return GROUP_ORDER.filter((group) => buckets.has(group.key)).map(
        (group) => ({ ...group, tasks: buckets.get(group.key) ?? [] }),
    );
}

export function TaskList({
    tasks,
    view,
    today,
    isLoading,
    hasFilters,
    onOpen,
    onToggleComplete,
    onChangeStatus,
    onDelete,
}: {
    tasks: Task[];
    view: TaskView;
    today: string;
    isLoading: boolean;
    hasFilters: boolean;
    onOpen: (task: Task) => void;
    onToggleComplete: (task: Task) => void;
    onChangeStatus: (task: Task, status: TaskStatus) => void;
    onDelete: (task: Task) => void;
}) {
    const rowRefs = useRef(new Map<number, HTMLLIElement>());
    const [activeId, setActiveId] = useState<number | null>(null);
    const groups = groupTasks(tasks, view, today);
    const orderedTasks = groups.flatMap((group) => group.tasks);
    const activeTask =
        orderedTasks.find((task) => task.id === activeId) ?? orderedTasks[0];

    const focusTask = (task: Task | undefined): void => {
        if (!task) {
            return;
        }

        setActiveId(task.id);
        rowRefs.current.get(task.id)?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;

        if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            target.closest('input, textarea, [role="menu"]')
        ) {
            return;
        }

        const index = activeTask ? orderedTasks.indexOf(activeTask) : -1;
        const key = event.key.toLowerCase();

        if (key === 'j' || event.key === 'ArrowDown') {
            event.preventDefault();
            focusTask(
                orderedTasks[Math.min(index + 1, orderedTasks.length - 1)],
            );
        } else if (key === 'k' || event.key === 'ArrowUp') {
            event.preventDefault();
            focusTask(orderedTasks[Math.max(index - 1, 0)]);
        } else if (key === 'x' && activeTask?.can.update) {
            event.preventDefault();
            onToggleComplete(activeTask);
        }
    };

    if (isLoading && tasks.length === 0) {
        return (
            <div
                className="space-y-2"
                aria-busy="true"
                aria-label="Loading tasks"
            >
                {[0, 1, 2, 3].map((row) => (
                    <div
                        key={row}
                        className="flex items-center gap-3 rounded-xl bg-card px-4 py-3"
                    >
                        <Skeleton className="size-5 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-md" />
                    </div>
                ))}
            </div>
        );
    }

    if (tasks.length === 0) {
        const message = hasFilters
            ? {
                  title: 'No tasks match these filters.',
                  body: 'Try clearing the search or filters.',
              }
            : EMPTY_MESSAGES[view];

        return (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <CircleCheckBig
                    className="size-10 stroke-[1.5] text-primary"
                    aria-hidden="true"
                />
                <p className="font-display text-xl font-medium">
                    {message.title}
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                    {message.body}
                </p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'space-y-4 transition-opacity',
                isLoading && 'opacity-60',
            )}
            onKeyDown={handleKeyDown}
            aria-busy={isLoading}
        >
            {groups.map((group) => {
                const headingId = `task-group-${group.key}`;

                return (
                    <section
                        key={group.key}
                        aria-labelledby={headingId}
                        className={cn(
                            'rounded-2xl border border-border bg-card p-2 shadow-xs',
                            group.isAlert && 'border-primary/60',
                        )}
                    >
                        <h2
                            id={headingId}
                            className={cn(
                                'flex items-center gap-2 px-3 pt-2 pb-1 font-sans text-[11px] font-semibold tracking-wider text-muted-foreground uppercase',
                                group.isAlert && 'text-accent-foreground',
                            )}
                        >
                            {group.label}
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
                                {group.tasks.length}
                            </span>
                        </h2>
                        <ul className="space-y-1">
                            {group.tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    today={today}
                                    isActive={task.id === activeTask?.id}
                                    rowRef={(element) => {
                                        if (element) {
                                            rowRefs.current.set(
                                                task.id,
                                                element,
                                            );
                                        } else {
                                            rowRefs.current.delete(task.id);
                                        }
                                    }}
                                    onFocus={() => setActiveId(task.id)}
                                    onOpen={() => onOpen(task)}
                                    onToggleComplete={() =>
                                        onToggleComplete(task)
                                    }
                                    onChangeStatus={(status) =>
                                        onChangeStatus(task, status)
                                    }
                                    onDelete={() => onDelete(task)}
                                />
                            ))}
                        </ul>
                    </section>
                );
            })}
            <p className="hidden items-center justify-center gap-1.5 text-xs text-muted-foreground md:flex">
                <Kbd>J</Kbd>
                <Kbd>K</Kbd> move · <Kbd>X</Kbd> complete · <Kbd>Enter</Kbd>{' '}
                open
            </p>
        </div>
    );
}
