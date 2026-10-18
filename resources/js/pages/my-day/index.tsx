import { Head, useHttp, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { myDay } from '@/routes';
import taskApi from '@/routes/api/tasks';
import type {
    Auth,
    Task,
    TaskDetail,
    TaskFilters,
    TaskPerson,
    TaskStatus,
    TasksResponse,
    TaskView,
} from '@/types';
import { TASK_VIEWS } from '@/types/task';
import { TaskDrawer } from './components/task-drawer';
import type { DrawerState } from './components/task-drawer';
import { TaskList } from './components/task-list';
import {
    hasActiveFilters,
    TaskFilterBar,
    TaskViewTabs,
} from './components/task-toolbar';

const EMPTY_FILTERS: Omit<TaskFilters, 'view'> = {
    search: '',
    status: [],
    priority: '',
    due_from: '',
    due_to: '',
    assigned_to_id: '',
    page: 1,
};

/**
 * Query params from the Inertia page URL, which is identical during SSR and
 * hydration (unlike window.location).
 */
function pageQuery(pageUrl: string): URLSearchParams {
    return new URLSearchParams(pageUrl.split('?')[1] ?? '');
}

function initialView(pageUrl: string): TaskView {
    const view = pageQuery(pageUrl).get('view');

    return TASK_VIEWS.includes(view as TaskView)
        ? (view as TaskView)
        : 'my_day';
}

function greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good morning';
    }

    return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function MyDay() {
    const page = usePage<{ auth: Auth }>();
    const { auth } = page.props;
    const { can } = usePermission();
    const canCreate = can('task.create');
    const firstName = auth.user?.name.split(' ')[0] ?? '';

    const list = useHttp<TaskFilters, TasksResponse>(taskApi.index(), {
        ...EMPTY_FILTERS,
        view: initialView(page.url),
    });
    const { data: filters, setData: setFilters, response, processing } = list;
    const assignees = useHttp<Record<string, never>, { data: TaskPerson[] }>(
        {},
    );
    const statusRequest = useHttp<{ status: TaskStatus }, { data: TaskDetail }>(
        { status: 'Pending' },
    );
    const deleteRequest = useHttp<Record<string, never>>({});

    const [drawer, setDrawer] = useState<DrawerState | null>(() =>
        pageQuery(page.url).get('new') === '1' ? { mode: 'create' } : null,
    );
    const [pendingDelete, setPendingDelete] = useState<
        Task | TaskDetail | null
    >(null);

    const loadTasks = useCallback(async (): Promise<void> => {
        try {
            await list.submit();
        } catch {
            toast.error('Unable to load tasks. Please refresh and try again.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list.submit]);

    useEffect(() => {
        const handle = window.setTimeout(() => void loadTasks(), 250);

        return () => window.clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('view', filters.view);
        url.searchParams.delete('new');
        window.history.replaceState(window.history.state, '', url);
    }, [filters.view]);

    useEffect(() => {
        if (canCreate) {
            void assignees
                .get(taskApi.assignableUsers().url)
                .catch(() => undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canCreate]);

    const updateFilters = (changes: Partial<TaskFilters>): void => {
        setFilters((current) => ({ ...current, ...changes, page: 1 }));
    };

    const changeStatus = async (
        task: Task,
        status: TaskStatus,
    ): Promise<void> => {
        statusRequest.setData('status', status);

        try {
            const updated = await statusRequest.patch(
                taskApi.status.update(task.id).url,
            );

            if (status === 'Completed' && updated.data.next_occurrence_id) {
                toast.success('Done. The next occurrence is scheduled.');
            } else {
                toast.success(
                    status === 'Completed'
                        ? `Completed “${task.title}”.`
                        : `“${task.title}” is now ${status}.`,
                );
            }

            await loadTasks();
        } catch {
            toast.error('Could not update the task status.');
        }
    };

    const restoreFocus = (taskId: number | null): void => {
        if (taskId === null) {
            return;
        }

        window.requestAnimationFrame(() =>
            document
                .querySelector<HTMLElement>(`[data-task-id="${taskId}"]`)
                ?.focus(),
        );
    };

    const closeDrawer = (): void => {
        const openTaskId = drawer?.mode === 'view' ? drawer.taskId : null;
        setDrawer(null);
        restoreFocus(openTaskId);
    };

    const confirmDelete = async (): Promise<void> => {
        if (!pendingDelete) {
            return;
        }

        try {
            await deleteRequest.delete(taskApi.destroy(pendingDelete.id).url);
            toast.success('Task deleted.');
            setPendingDelete(null);
            setDrawer(null);
            await loadTasks();
        } catch {
            toast.error('Could not delete the task.');
        }
    };

    // Before the first response (and during SSR) avoid clock-dependent text,
    // so server and client render the same markup.
    const today = response?.today ?? '';
    const tasks = response?.data ?? [];
    const meta = response?.meta;

    return (
        <>
            <Head title="My Day" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="min-h-4 text-[11px] font-semibold tracking-wider text-primary uppercase">
                            {today &&
                                format(parseISO(today), 'EEEE, d MMMM yyyy')}
                        </p>
                        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                            {response ? greeting() : 'My Day'}
                            {response && firstName && `, ${firstName}`}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {response
                                ? response.counts.my_day === 0
                                    ? 'Nothing due today. Plan ahead or help a colleague.'
                                    : `${response.counts.my_day} task${response.counts.my_day === 1 ? '' : 's'} for today${response.counts.overdue ? `, ${response.counts.overdue} overdue` : ''}.`
                                : 'Loading your day…'}
                        </p>
                    </div>
                    {canCreate && (
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => setDrawer({ mode: 'create' })}
                            className="self-start sm:self-auto"
                        >
                            <Plus className="size-4" />
                            New task
                        </Button>
                    )}
                </header>

                <TaskViewTabs
                    view={filters.view}
                    counts={response?.counts}
                    onChange={(view) => updateFilters({ view })}
                />

                <TaskFilterBar
                    filters={filters}
                    assignableUsers={assignees.response?.data ?? []}
                    onChange={updateFilters}
                    onClear={() =>
                        setFilters({ ...EMPTY_FILTERS, view: filters.view })
                    }
                />

                <TaskList
                    tasks={tasks}
                    view={filters.view}
                    today={today}
                    isLoading={processing || !response}
                    hasFilters={hasActiveFilters(filters)}
                    onOpen={(task) =>
                        setDrawer({ mode: 'view', taskId: task.id })
                    }
                    onToggleComplete={(task) =>
                        changeStatus(
                            task,
                            task.status === 'Completed'
                                ? 'Pending'
                                : 'Completed',
                        )
                    }
                    onChangeStatus={changeStatus}
                    onDelete={setPendingDelete}
                />

                {meta && meta.last_page > 1 && (
                    <nav
                        aria-label="Task pages"
                        className="flex items-center justify-center gap-3 text-sm"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={meta.current_page <= 1}
                            onClick={() =>
                                setFilters((current) => ({
                                    ...current,
                                    page: current.page - 1,
                                }))
                            }
                        >
                            <ChevronLeft className="size-4" />
                            Previous
                        </Button>
                        <span className="text-muted-foreground tabular-nums">
                            Page {meta.current_page} of {meta.last_page}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={meta.current_page >= meta.last_page}
                            onClick={() =>
                                setFilters((current) => ({
                                    ...current,
                                    page: current.page + 1,
                                }))
                            }
                        >
                            Next
                            <ChevronRight className="size-4" />
                        </Button>
                    </nav>
                )}
            </div>

            <TaskDrawer
                state={drawer}
                today={today}
                assignableUsers={assignees.response?.data ?? []}
                onClose={closeDrawer}
                onChanged={() => void loadTasks()}
                onDelete={setPendingDelete}
            />

            <DeleteConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDelete(null);
                    }
                }}
                title="Delete this task?"
                description={`“${pendingDelete?.title ?? ''}” will be removed from everyone's lists. Its history is kept.`}
                onConfirm={confirmDelete}
            />
        </>
    );
}

MyDay.layout = {
    breadcrumbs: [
        {
            title: 'My Day',
            href: myDay(),
        },
    ],
};
