import { Hourglass, Repeat } from 'lucide-react';
import {
    dueChipClass,
    dueLabel,
    formatDate,
    priorityBadgeClass,
    statusBadgeClass,
} from '@/lib/task-due';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority, TaskStatus } from '@/types';

export function StatusBadge({ status }: { status: TaskStatus }) {
    return (
        <span
            className={cn(
                'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium',
                statusBadgeClass[status],
            )}
        >
            <span
                className="size-1.5 rounded-full bg-current"
                aria-hidden="true"
            />
            {status}
        </span>
    );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
    return (
        <span
            className={cn(
                'inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold',
                priorityBadgeClass[priority],
            )}
        >
            {priority}
            <span className="sr-only"> priority</span>
        </span>
    );
}

export function DueChip({ task, today }: { task: Task; today: string }) {
    const label = dueLabel(task.due_date, task.due_time, task.due_state, today);

    if (!label) {
        return null;
    }

    return (
        <span
            title={
                task.due_date
                    ? `Due ${formatDate(task.due_date)}${task.due_time ? ` at ${task.due_time}` : ''}`
                    : undefined
            }
            className={cn(
                'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold whitespace-nowrap',
                dueChipClass[task.due_state],
            )}
        >
            <Hourglass className="size-3.5" aria-hidden="true" />
            {label}
            {task.recurrence && (
                <Repeat
                    className="size-3.5"
                    aria-label={`Repeats ${task.recurrence}`}
                />
            )}
        </span>
    );
}

export function ChecklistProgress({
    completed,
    total,
}: {
    completed: number;
    total: number;
}) {
    if (total === 0) {
        return null;
    }

    return (
        <span className="text-xs text-muted-foreground tabular-nums">
            {completed}/{total} steps
        </span>
    );
}
