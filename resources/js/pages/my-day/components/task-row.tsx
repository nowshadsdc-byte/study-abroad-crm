import { Link } from '@inertiajs/react';
import { Check, MoreHorizontal } from 'lucide-react';
import type { Ref } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import candidates from '@/routes/candidates';
import leads from '@/routes/leads';
import type { Task, TaskStatus } from '@/types';
import { TASK_STATUSES } from '@/types/task';
import {
    ChecklistProgress,
    DueChip,
    PriorityBadge,
    StatusBadge,
} from './task-badges';

export function TaskRow({
    task,
    today,
    isActive,
    rowRef,
    onOpen,
    onToggleComplete,
    onChangeStatus,
    onDelete,
    onFocus,
}: {
    task: Task;
    today: string;
    isActive: boolean;
    rowRef: Ref<HTMLLIElement>;
    onOpen: () => void;
    onToggleComplete: () => void;
    onChangeStatus: (status: TaskStatus) => void;
    onDelete: () => void;
    onFocus: () => void;
}) {
    const getInitials = useInitials();
    const isDone = task.status === 'Completed';
    const isClosed = isDone || task.status === 'Cancelled';
    const studentHref = task.student
        ? task.student.type === 'lead'
            ? leads.show(task.student.id)
            : candidates.show(task.student.id)
        : null;

    return (
        <li
            ref={rowRef}
            tabIndex={isActive ? 0 : -1}
            data-task-id={task.id}
            aria-label={`${task.title}, ${task.status}`}
            onFocus={onFocus}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }

                if (event.key === 'Enter') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            className={cn(
                'group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border-l-[3px] border-transparent bg-card px-3 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring sm:px-4',
                task.due_state === 'overdue' && 'border-l-primary',
                isActive && 'bg-muted/60',
            )}
        >
            <button
                type="button"
                onClick={onToggleComplete}
                disabled={!task.can.update}
                aria-pressed={isDone}
                aria-label={
                    isDone
                        ? `Mark "${task.title}" as not done`
                        : `Mark "${task.title}" as done`
                }
                className={cn(
                    'grid size-5 place-items-center rounded-full border-[1.5px] border-(--border-strong) transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    isDone &&
                        'border-primary bg-primary text-primary-foreground',
                )}
            >
                {isDone && <Check className="size-3" strokeWidth={3} />}
            </button>

            <button
                type="button"
                onClick={onOpen}
                tabIndex={-1}
                className="min-w-0 text-left"
            >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'truncate text-sm font-semibold text-foreground',
                            isClosed && 'text-muted-foreground line-through',
                        )}
                    >
                        {task.title}
                    </span>
                    {(task.priority === 'High' || task.priority === 'Urgent') &&
                        !isClosed && <PriorityBadge priority={task.priority} />}
                    {task.status !== 'Pending' && (
                        <StatusBadge status={task.status} />
                    )}
                </span>
                <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {task.student && studentHref && (
                        <Link
                            href={studentHref}
                            onClick={(event) => event.stopPropagation()}
                            className="truncate font-medium text-accent-foreground hover:underline"
                        >
                            {task.student.name}
                        </Link>
                    )}
                    {task.student && task.checklist.total > 0 && (
                        <span aria-hidden="true">·</span>
                    )}
                    <ChecklistProgress {...task.checklist} />
                    {!task.student &&
                        task.checklist.total === 0 &&
                        task.creator && (
                            <span className="truncate">
                                from {task.creator.name}
                            </span>
                        )}
                </span>
            </button>

            <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex">
                    <DueChip task={task} today={today} />
                </span>
                {task.assignee && (
                    <Avatar
                        className="hidden size-7 md:flex"
                        title={`Assigned to ${task.assignee.name}`}
                    >
                        <AvatarImage
                            src={task.assignee.avatar ?? undefined}
                            alt=""
                        />
                        <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                            {getInitials(task.assignee.name)}
                        </AvatarFallback>
                    </Avatar>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`More actions for "${task.title}"`}
                            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <MoreHorizontal className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={onOpen}>
                            Open
                        </DropdownMenuItem>
                        {task.can.update && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    Status
                                </DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={task.status}
                                    onValueChange={(value) =>
                                        onChangeStatus(value as TaskStatus)
                                    }
                                >
                                    {TASK_STATUSES.map((status) => (
                                        <DropdownMenuRadioItem
                                            key={status}
                                            value={status}
                                        >
                                            {status}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </>
                        )}
                        {task.can.delete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={onDelete}
                                >
                                    Delete task
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <span className="col-start-2 sm:hidden">
                <DueChip task={task} today={today} />
            </span>
        </li>
    );
}
