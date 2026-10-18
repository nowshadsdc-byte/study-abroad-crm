import { ChevronDown, Search, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
    TaskCounts,
    TaskFilters,
    TaskPerson,
    TaskPriority,
    TaskStatus,
    TaskView,
} from '@/types';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_VIEWS } from '@/types/task';

const VIEW_LABELS: Record<TaskView, string> = {
    my_day: 'My Day',
    assigned: 'Assigned to me',
    created: 'Created by me',
    upcoming: 'Upcoming',
    completed: 'Completed',
    all: 'All tasks',
};

export function TaskViewTabs({
    view,
    counts,
    onChange,
}: {
    view: TaskView;
    counts: TaskCounts | undefined;
    onChange: (view: TaskView) => void;
}) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const index = TASK_VIEWS.indexOf(view);
        const offset =
            event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

        if (offset === 0) {
            return;
        }

        event.preventDefault();
        const next =
            TASK_VIEWS[
                (index + offset + TASK_VIEWS.length) % TASK_VIEWS.length
            ];
        onChange(next);
        document.getElementById(`task-view-${next}`)?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label="Task views"
            onKeyDown={handleKeyDown}
            className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
        >
            {TASK_VIEWS.map((option) => {
                const isSelected = option === view;
                const count = counts?.[option];

                return (
                    <button
                        key={option}
                        id={`task-view-${option}`}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => onChange(option)}
                        className={cn(
                            'flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            isSelected &&
                                'bg-primary font-semibold text-primary-foreground hover:text-primary-foreground',
                        )}
                    >
                        {VIEW_LABELS[option]}
                        {count !== undefined && (
                            <span
                                className={cn(
                                    'min-w-5 rounded-full px-1.5 text-[11px] tabular-nums',
                                    isSelected
                                        ? 'bg-primary-foreground/20'
                                        : 'bg-muted',
                                    option === 'my_day' &&
                                        !isSelected &&
                                        (counts?.overdue ?? 0) > 0 &&
                                        'bg-accent text-accent-foreground',
                                )}
                            >
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function hasActiveFilters(filters: TaskFilters): boolean {
    return Boolean(
        filters.search ||
        filters.status.length ||
        filters.priority ||
        filters.due_from ||
        filters.due_to ||
        filters.assigned_to_id,
    );
}

export function TaskFilterBar({
    filters,
    assignableUsers,
    onChange,
    onClear,
}: {
    filters: TaskFilters;
    assignableUsers: TaskPerson[];
    onChange: (changes: Partial<TaskFilters>) => void;
    onClear: () => void;
}) {
    const toggleStatus = (status: TaskStatus, checked: boolean): void => {
        onChange({
            status: checked
                ? [...filters.status, status]
                : filters.status.filter((value) => value !== status),
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-56">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                />
                <Input
                    type="search"
                    value={filters.search}
                    onChange={(event) =>
                        onChange({ search: event.target.value })
                    }
                    placeholder="Search tasks…"
                    aria-label="Search tasks"
                    className="h-9 pl-9"
                />
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={filters.status.length > 0}
                        className={cn(
                            'h-9',
                            filters.status.length > 0 &&
                                'border-primary bg-accent text-accent-foreground',
                        )}
                    >
                        {filters.status.length
                            ? `Status: ${filters.status.join(', ')}`
                            : 'Status'}
                        <ChevronDown className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                    {TASK_STATUSES.map((status) => (
                        <DropdownMenuCheckboxItem
                            key={status}
                            checked={filters.status.includes(status)}
                            onCheckedChange={(checked) =>
                                toggleStatus(status, checked === true)
                            }
                            onSelect={(event) => event.preventDefault()}
                        >
                            {status}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Select
                value={filters.priority || 'any'}
                onValueChange={(value) =>
                    onChange({
                        priority:
                            value === 'any' ? '' : (value as TaskPriority),
                    })
                }
            >
                <SelectTrigger
                    className="h-9 w-[150px]"
                    aria-label="Filter by priority"
                >
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="any">Any priority</SelectItem>
                    {TASK_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                            {priority}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {filters.view === 'all' && assignableUsers.length > 0 && (
                <Select
                    value={filters.assigned_to_id || 'anyone'}
                    onValueChange={(value) =>
                        onChange({
                            assigned_to_id: value === 'anyone' ? '' : value,
                        })
                    }
                >
                    <SelectTrigger
                        className="h-9 w-[170px]"
                        aria-label="Filter by assignee"
                    >
                        <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="anyone">Any assignee</SelectItem>
                        {assignableUsers.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                                {user.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <div className="flex items-center gap-1">
                <Input
                    type="date"
                    value={filters.due_from}
                    max={filters.due_to || undefined}
                    onChange={(event) =>
                        onChange({ due_from: event.target.value })
                    }
                    aria-label="Due from"
                    className="h-9 w-[150px]"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                    type="date"
                    value={filters.due_to}
                    min={filters.due_from || undefined}
                    onChange={(event) =>
                        onChange({ due_to: event.target.value })
                    }
                    aria-label="Due to"
                    className="h-9 w-[150px]"
                />
            </div>

            {hasActiveFilters(filters) && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="h-9"
                >
                    <X className="size-4" />
                    Clear
                </Button>
            )}
        </div>
    );
}
