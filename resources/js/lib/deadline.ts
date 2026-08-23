import { differenceInCalendarDays } from 'date-fns';

export type DeadlineStatus = {
    label: string;
    className: string;
};

export function getDeadlineStatus(
    deadline: string | null | undefined,
): DeadlineStatus | null {
    if (!deadline) {
        return null;
    }

    const days = differenceInCalendarDays(new Date(deadline), new Date());

    if (days < 0) {
        return {
            label: 'Deadline passed',
            className: 'bg-destructive/10 text-destructive',
        };
    }

    if (days === 0) {
        return {
            label: 'Deadline today',
            className: 'bg-destructive/10 text-destructive',
        };
    }

    if (days <= 14) {
        return {
            label: `${days} day${days === 1 ? '' : 's'} left`,
            className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
    }

    return {
        label: `${days} days left`,
        className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    };
}
