import { useHttp } from '@inertiajs/react';
import { History } from 'lucide-react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/task-due';
import taskApi from '@/routes/api/tasks';
import type { TaskActivity as TaskActivityEntry } from '@/types';

type ActivityResponse = {
    data: TaskActivityEntry[];
    current_page: number;
    last_page: number;
};

/**
 * Change history for one task, newest first. `refreshKey` changes whenever
 * the task is edited so the timeline reloads.
 */
export function TaskActivity({
    taskId,
    refreshKey,
}: {
    taskId: number;
    refreshKey: string;
}) {
    const { response, processing, get } = useHttp<
        Record<string, never>,
        ActivityResponse
    >({});

    useEffect(() => {
        void get(taskApi.activity.index(taskId).url).catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId, refreshKey]);

    if (!response && processing) {
        return (
            <div className="grid gap-3" aria-busy="true">
                {[0, 1, 2].map((row) => (
                    <Skeleton key={row} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    const entries = response?.data ?? [];

    if (entries.length === 0) {
        return (
            <p className="text-center text-sm text-muted-foreground">
                No activity yet.
            </p>
        );
    }

    return (
        <ol className="relative grid gap-4 border-l border-border pl-5">
            {entries.map((entry) => (
                <li key={entry.id} className="relative">
                    <span
                        className="absolute top-1 -left-[27px] grid size-3.5 place-items-center rounded-full border-2 border-card bg-primary"
                        aria-hidden="true"
                    />
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                        by {entry.user?.name ?? 'System'} ·{' '}
                        <time dateTime={entry.created_at}>
                            {formatDateTime(entry.created_at)}
                        </time>
                    </p>
                </li>
            ))}
            {response && response.last_page > 1 && (
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <History className="size-3.5" aria-hidden="true" />
                    Showing the latest {entries.length} changes.
                </li>
            )}
        </ol>
    );
}
