import { Link, useHttp } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/task-due';
import taskApi from '@/routes/api/tasks';
import candidates from '@/routes/candidates';
import leads from '@/routes/leads';
import type { TaskDetail, TaskPerson } from '@/types';
import { TaskActivity } from './task-activity';
import { DueChip, PriorityBadge, StatusBadge } from './task-badges';
import { TaskChecklist } from './task-checklist';
import { TaskForm } from './task-form';
import { TaskNotes } from './task-notes';

export type DrawerState = { mode: 'create' } | { mode: 'view'; taskId: number };

function TaskSummary({ task, today }: { task: TaskDetail; today: string }) {
    const studentHref = task.student
        ? task.student.type === 'lead'
            ? leads.show(task.student.id)
            : candidates.show(task.student.id)
        : null;

    return (
        <dl className="grid grid-cols-[minmax(96px,120px)_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Due</dt>
            <dd>
                {task.due_date ? (
                    <DueChip task={task} today={today} />
                ) : (
                    'No due date'
                )}
            </dd>
            <dt className="text-muted-foreground">Assignee</dt>
            <dd>{task.assignee?.name ?? 'Unassigned'}</dd>
            <dt className="text-muted-foreground">Created by</dt>
            <dd>{task.creator?.name ?? '—'}</dd>
            {task.student && studentHref && (
                <>
                    <dt className="text-muted-foreground">Student</dt>
                    <dd>
                        <Link
                            href={studentHref}
                            className="font-medium text-accent-foreground hover:underline"
                        >
                            {task.student.name}
                        </Link>
                    </dd>
                </>
            )}
            {task.description && (
                <>
                    <dt className="text-muted-foreground">Details</dt>
                    <dd className="whitespace-pre-line">{task.description}</dd>
                </>
            )}
        </dl>
    );
}

export function TaskDrawer({
    state,
    today,
    assignableUsers,
    onClose,
    onChanged,
    onDelete,
}: {
    state: DrawerState | null;
    today: string;
    assignableUsers: TaskPerson[];
    onClose: () => void;
    onChanged: () => void;
    onDelete: (task: TaskDetail) => void;
}) {
    const taskId = state?.mode === 'view' ? state.taskId : null;
    const detailRequest = useHttp<Record<string, never>, { data: TaskDetail }>(
        {},
    );
    const [detail, setDetail] = useState<TaskDetail | null>(null);
    const [tab, setTab] = useState('details');
    const task = detail?.id === taskId ? detail : null;

    useEffect(() => {
        if (taskId === null) {
            return;
        }

        detailRequest
            .get(taskApi.show(taskId).url)
            .then((response) => {
                setDetail(response.data);
                setTab('details');
            })
            .catch(() => onClose());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    const handleSaved = (saved: TaskDetail): void => {
        setDetail(saved);
        onChanged();
    };

    const patchDetail = (changes: Partial<TaskDetail>): void => {
        setDetail((current) =>
            current ? { ...current, ...changes } : current,
        );
        onChanged();
    };

    return (
        <Sheet
            open={state !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-160">
                {state?.mode === 'create' && (
                    <>
                        <SheetHeader className="border-b border-border px-6 py-5">
                            <SheetTitle className="font-display text-[22px] font-medium">
                                New task
                            </SheetTitle>
                            <SheetDescription>
                                Plan a follow-up for yourself or assign it to a
                                colleague.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="px-6 py-5">
                            <TaskForm
                                task={null}
                                today={today}
                                assignableUsers={assignableUsers}
                                onSaved={() => {
                                    onChanged();
                                    onClose();
                                }}
                                onCancel={onClose}
                            />
                        </div>
                    </>
                )}

                {state?.mode === 'view' && !task && (
                    <div className="grid gap-4 p-6" aria-busy="true">
                        <SheetTitle className="sr-only">
                            Loading task
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Loading task details
                        </SheetDescription>
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                )}

                {state?.mode === 'view' && task && (
                    <>
                        <SheetHeader className="gap-3 border-b border-border px-6 py-5 pr-12">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={task.status} />
                                <PriorityBadge priority={task.priority} />
                                {task.recurrence && (
                                    <span className="text-xs text-muted-foreground capitalize">
                                        Repeats {task.recurrence}
                                    </span>
                                )}
                            </div>
                            <SheetTitle className="font-display text-[22px] leading-7 font-medium">
                                {task.title}
                            </SheetTitle>
                            <SheetDescription>
                                Updated{' '}
                                <time
                                    dateTime={task.updated_at}
                                    title={formatDateTime(task.updated_at)}
                                >
                                    {formatDistanceToNow(
                                        new Date(task.updated_at),
                                        { addSuffix: true },
                                    )}
                                </time>
                                {task.completed_by &&
                                    task.completed_at &&
                                    ` · completed by ${task.completed_by.name}`}
                            </SheetDescription>
                        </SheetHeader>

                        <Tabs
                            value={tab}
                            onValueChange={setTab}
                            className="px-6 py-5"
                        >
                            <TabsList className="w-full">
                                <TabsTrigger value="details">
                                    Details
                                </TabsTrigger>
                                <TabsTrigger value="checklist">
                                    Checklist (
                                    {
                                        task.checklist_items.filter(
                                            (item) => item.is_completed,
                                        ).length
                                    }
                                    /{task.checklist_items.length})
                                </TabsTrigger>
                                <TabsTrigger value="notes">
                                    Notes ({task.notes.length})
                                </TabsTrigger>
                                <TabsTrigger value="activity">
                                    Activity
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="pt-4">
                                {task.can.update ? (
                                    <TaskForm
                                        key={task.updated_at}
                                        task={task}
                                        today={today}
                                        assignableUsers={assignableUsers}
                                        onSaved={handleSaved}
                                        onCancel={onClose}
                                    />
                                ) : (
                                    <TaskSummary task={task} today={today} />
                                )}
                            </TabsContent>
                            <TabsContent value="checklist" className="pt-4">
                                <TaskChecklist
                                    taskId={task.id}
                                    items={task.checklist_items}
                                    canEdit={task.can.update}
                                    onItemsChange={(items) =>
                                        patchDetail({ checklist_items: items })
                                    }
                                />
                            </TabsContent>
                            <TabsContent value="notes" className="pt-4">
                                <TaskNotes
                                    taskId={task.id}
                                    notes={task.notes}
                                    onNotesChange={(notes) =>
                                        patchDetail({ notes })
                                    }
                                />
                            </TabsContent>
                            <TabsContent value="activity" className="pt-4">
                                <TaskActivity
                                    taskId={task.id}
                                    refreshKey={`${task.updated_at}-${task.notes.length}-${task.checklist_items.map((item) => `${item.id}${item.is_completed}`).join()}`}
                                />
                            </TabsContent>
                        </Tabs>

                        {task.can.delete && (
                            <div className="border-t border-border px-6 py-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => onDelete(task)}
                                >
                                    <Trash2 className="size-4" />
                                    Delete task
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
