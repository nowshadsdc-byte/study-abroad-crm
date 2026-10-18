import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { TaskDueState, TaskPriority, TaskStatus } from '@/types';

/**
 * Human label for a due date, relative to the server's business "today"
 * (Asia/Dhaka), so the browser's own clock never changes the bucket.
 */
export function dueLabel(
    dueDate: string | null,
    dueTime: string | null,
    dueState: TaskDueState,
    today: string,
): string | null {
    if (!dueDate) {
        return null;
    }

    const time = dueTime ? formatTime(dueTime) : null;
    const days = differenceInCalendarDays(parseISO(dueDate), parseISO(today));

    if (dueState === 'completed' || dueState === 'cancelled') {
        return format(parseISO(dueDate), 'd MMM yyyy');
    }

    if (days < 0) {
        const ago = Math.abs(days);

        return `overdue · ${ago === 1 ? 'yesterday' : `${ago} days`}`;
    }

    if (days === 0) {
        return time ? `today · ${time}` : 'today';
    }

    if (days === 1) {
        return time ? `tomorrow · ${time}` : 'tomorrow';
    }

    return `in ${days} days`;
}

export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const suffix = hours >= 12 ? 'PM' : 'AM';

    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function formatDate(value: string): string {
    return format(parseISO(value), 'd MMM yyyy');
}

export function formatDateTime(value: string): string {
    return format(new Date(value), 'd MMM yyyy, h:mm a');
}

export const dueChipClass: Record<TaskDueState, string> = {
    overdue: 'border-primary bg-accent text-accent-foreground',
    today: 'border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400',
    upcoming: 'border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-400',
    none: 'border-transparent bg-muted text-muted-foreground',
    completed: 'border-transparent bg-muted text-muted-foreground',
    cancelled: 'border-transparent bg-muted text-muted-foreground',
};

export const statusBadgeClass: Record<TaskStatus, string> = {
    Pending: 'bg-muted text-muted-foreground',
    'In Progress': 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    'On Hold': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    Cancelled: 'bg-accent text-accent-foreground',
};

export const priorityBadgeClass: Record<TaskPriority, string> = {
    Low: 'bg-muted text-muted-foreground',
    Medium: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    High: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Urgent: 'border border-primary bg-card text-accent-foreground',
};
