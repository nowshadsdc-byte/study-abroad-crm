import { useHttp } from '@inertiajs/react';
import { GraduationCap, Plus, Trash2, UserRoundSearch, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/use-permission';
import { MIN_RECORD_QUERY_LENGTH, searchRecords } from '@/lib/record-search';
import type { RecordHit } from '@/lib/record-search';
import { cn } from '@/lib/utils';
import taskApi from '@/routes/api/tasks';
import type {
    TaskDetail,
    TaskPerson,
    TaskPriority,
    TaskRecurrence,
    TaskStatus,
    TaskStudent,
} from '@/types';
import { TASK_PRIORITIES, TASK_RECURRENCES, TASK_STATUSES } from '@/types/task';

type TaskFormData = {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string;
    due_time: string;
    recurrence: TaskRecurrence | '';
    recurrence_until: string;
    assigned_to_id: string;
    student: TaskStudent | null;
    checklist: string[];
};

const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
};

function initialData(task: TaskDetail | null, today: string): TaskFormData {
    return {
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? 'Pending',
        priority: task?.priority ?? 'Medium',
        due_date: task ? (task.due_date ?? '') : today,
        due_time: task?.due_time ?? '',
        recurrence: task?.recurrence ?? '',
        recurrence_until: task?.recurrence_until ?? '',
        assigned_to_id: task?.assigned_to_id ? String(task.assigned_to_id) : '',
        student: task?.student ?? null,
        checklist: task ? [] : [''],
    };
}

function Field({
    label,
    htmlFor,
    error,
    required,
    className,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('grid gap-1.5', className)}>
            <Label htmlFor={htmlFor} className="text-[13px] font-semibold">
                {label}
                {required && (
                    <span className="text-accent-foreground" aria-hidden="true">
                        *
                    </span>
                )}
            </Label>
            {children}
            <InputError message={error} className="text-xs" />
        </div>
    );
}

function StudentPicker({
    value,
    onChange,
    error,
}: {
    value: TaskStudent | null;
    onChange: (student: TaskStudent | null) => void;
    error?: string;
}) {
    const { can } = usePermission();
    const types = (['lead', 'client'] as const).filter((type) =>
        can(type === 'lead' ? 'lead.view' : 'candidate.view'),
    );
    const [type, setType] = useState<'lead' | 'client'>(types[0] ?? 'lead');
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<{ key: string; items: RecordHit[] }>({
        key: '',
        items: [],
    });
    const listId = useId();
    const trimmed = query.trim();
    const searchKey = `${type}:${trimmed}`;
    const shouldSearch = trimmed.length >= MIN_RECORD_QUERY_LENGTH;

    useEffect(() => {
        if (!shouldSearch) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const items = await searchRecords(
                    type,
                    trimmed,
                    controller.signal,
                );
                setHits({ key: searchKey, items });
            } catch {
                if (!controller.signal.aborted) {
                    setHits({ key: searchKey, items: [] });
                }
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [shouldSearch, type, trimmed, searchKey]);

    if (types.length === 0) {
        return null;
    }

    if (value) {
        const Icon = value.type === 'lead' ? UserRoundSearch : GraduationCap;

        return (
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <span className="truncate font-medium">{value.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                    {value.type}
                </span>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-label={`Remove link to ${value.name}`}
                    className="ml-auto grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="size-3.5" />
                </button>
            </div>
        );
    }

    const results = hits.key === searchKey ? hits.items : [];
    const isSearching = shouldSearch && hits.key !== searchKey;

    return (
        <div className="grid gap-2">
            <div className="flex gap-2">
                {types.length > 1 && (
                    <Select
                        value={type}
                        onValueChange={(next) =>
                            setType(next as 'lead' | 'client')
                        }
                    >
                        <SelectTrigger
                            className="w-[110px]"
                            aria-label="Student type"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                    </Select>
                )}
                <Input
                    id="task-student"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Search ${type === 'lead' ? 'leads' : 'clients'} by name or phone`}
                    aria-controls={listId}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                />
            </div>
            {shouldSearch && (
                <ul
                    id={listId}
                    aria-label="Matching students"
                    className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1"
                >
                    {isSearching && (
                        <li className="px-3 py-2 text-xs text-muted-foreground">
                            Searching…
                        </li>
                    )}
                    {!isSearching && results.length === 0 && (
                        <li className="px-3 py-2 text-xs text-muted-foreground">
                            No {type === 'lead' ? 'leads' : 'clients'} match “
                            {trimmed}”.
                        </li>
                    )}
                    {results.map((hit) => (
                        <li key={hit.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange({
                                        type,
                                        id: hit.id,
                                        name: hit.name,
                                    });
                                    setQuery('');
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                            >
                                <span className="truncate">{hit.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {hit.phone ?? hit.email}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Create or edit a task. On create it also takes an initial checklist.
 */
export function TaskForm({
    task,
    today,
    assignableUsers,
    onSaved,
    onCancel,
}: {
    task: TaskDetail | null;
    today: string;
    assignableUsers: TaskPerson[];
    onSaved: (task: TaskDetail) => void;
    onCancel: () => void;
}) {
    const isEditing = task !== null;
    const form = useHttp<TaskFormData, { data: TaskDetail }>(
        initialData(task, today),
    );
    const { data, setData, errors, processing } = form;
    const fieldErrors = errors as Partial<Record<string, string>>;

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        form.transform((values) => ({
            title: values.title,
            description: values.description || null,
            priority: values.priority,
            ...(isEditing ? { status: values.status } : {}),
            due_date: values.due_date || null,
            due_time:
                values.due_date && values.due_time ? values.due_time : null,
            recurrence:
                values.due_date && values.recurrence ? values.recurrence : null,
            recurrence_until:
                values.due_date && values.recurrence && values.recurrence_until
                    ? values.recurrence_until
                    : null,
            assigned_to_id: values.assigned_to_id
                ? Number(values.assigned_to_id)
                : null,
            lead_id: values.student?.type === 'lead' ? values.student.id : null,
            candidate_id:
                values.student?.type === 'client' ? values.student.id : null,
            ...(isEditing
                ? {}
                : {
                      checklist: values.checklist.filter(
                          (item) => item.trim() !== '',
                      ),
                  }),
        }));

        try {
            const response = await form.submit(
                isEditing ? taskApi.update(task.id) : taskApi.store(),
            );
            toast.success(isEditing ? 'Task updated.' : 'Task created.');
            onSaved(response.data);
        } catch {
            toast.error('Please review the highlighted fields.');
        }
    };

    const updateChecklistItem = (index: number, value: string): void => {
        setData(
            'checklist',
            data.checklist.map((item, itemIndex) =>
                itemIndex === index ? value : item,
            ),
        );
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="grid gap-4"
            aria-label={isEditing ? 'Edit task' : 'New task'}
            noValidate
        >
            <Field
                label="Title"
                htmlFor="task-title"
                error={fieldErrors.title}
                required
            >
                <Input
                    id="task-title"
                    value={data.title}
                    onChange={(event) => setData('title', event.target.value)}
                    placeholder="e.g. Call Ariana about IELTS dates"
                    maxLength={160}
                    autoFocus={!isEditing}
                    aria-invalid={Boolean(fieldErrors.title)}
                    required
                />
            </Field>

            <Field
                label="Details"
                htmlFor="task-description"
                error={fieldErrors.description}
            >
                <Textarea
                    id="task-description"
                    value={data.description}
                    onChange={(event) =>
                        setData('description', event.target.value)
                    }
                    placeholder="What needs to happen?"
                    rows={3}
                />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Due date"
                    htmlFor="task-due-date"
                    error={fieldErrors.due_date}
                >
                    <Input
                        id="task-due-date"
                        type="date"
                        value={data.due_date}
                        onChange={(event) =>
                            setData('due_date', event.target.value)
                        }
                        aria-invalid={Boolean(fieldErrors.due_date)}
                    />
                </Field>
                <Field
                    label="Time"
                    htmlFor="task-due-time"
                    error={fieldErrors.due_time}
                >
                    <Input
                        id="task-due-time"
                        type="time"
                        value={data.due_time}
                        disabled={!data.due_date}
                        onChange={(event) =>
                            setData('due_time', event.target.value)
                        }
                        aria-invalid={Boolean(fieldErrors.due_time)}
                    />
                </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Priority"
                    htmlFor="task-priority"
                    error={fieldErrors.priority}
                    required
                >
                    <Select
                        value={data.priority}
                        onValueChange={(value) =>
                            setData('priority', value as TaskPriority)
                        }
                    >
                        <SelectTrigger id="task-priority">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TASK_PRIORITIES.map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                    {priority}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                {isEditing ? (
                    <Field
                        label="Status"
                        htmlFor="task-status"
                        error={fieldErrors.status}
                    >
                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setData('status', value as TaskStatus)
                            }
                        >
                            <SelectTrigger id="task-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                ) : (
                    <Field
                        label="Repeat"
                        htmlFor="task-recurrence"
                        error={fieldErrors.recurrence}
                    >
                        <RecurrenceSelect
                            value={data.recurrence}
                            disabled={!data.due_date}
                            onChange={(value) => setData('recurrence', value)}
                        />
                    </Field>
                )}
            </div>

            {isEditing && (
                <Field
                    label="Repeat"
                    htmlFor="task-recurrence"
                    error={fieldErrors.recurrence}
                >
                    <RecurrenceSelect
                        value={data.recurrence}
                        disabled={!data.due_date}
                        onChange={(value) => setData('recurrence', value)}
                    />
                </Field>
            )}

            {data.recurrence && data.due_date && (
                <Field
                    label="Repeat until (optional)"
                    htmlFor="task-recurrence-until"
                    error={fieldErrors.recurrence_until}
                >
                    <Input
                        id="task-recurrence-until"
                        type="date"
                        min={data.due_date}
                        value={data.recurrence_until}
                        onChange={(event) =>
                            setData('recurrence_until', event.target.value)
                        }
                        aria-invalid={Boolean(fieldErrors.recurrence_until)}
                    />
                </Field>
            )}

            <Field
                label="Assignee"
                htmlFor="task-assignee"
                error={fieldErrors.assigned_to_id}
            >
                <Select
                    value={data.assigned_to_id || 'none'}
                    onValueChange={(value) =>
                        setData('assigned_to_id', value === 'none' ? '' : value)
                    }
                >
                    <SelectTrigger
                        id="task-assignee"
                        aria-invalid={Boolean(fieldErrors.assigned_to_id)}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Unassigned (me)</SelectItem>
                        {assignableUsers.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                                {user.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            <Field
                label="Student"
                htmlFor="task-student"
                error={fieldErrors.lead_id ?? fieldErrors.candidate_id}
            >
                <StudentPicker
                    value={data.student}
                    onChange={(student) => setData('student', student)}
                    error={fieldErrors.lead_id ?? fieldErrors.candidate_id}
                />
            </Field>

            {!isEditing && (
                <fieldset className="grid gap-2">
                    <legend className="mb-1.5 text-[13px] font-semibold">
                        Checklist
                    </legend>
                    {data.checklist.map((item, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                value={item}
                                onChange={(event) =>
                                    updateChecklistItem(
                                        index,
                                        event.target.value,
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        setData('checklist', [
                                            ...data.checklist,
                                            '',
                                        ]);
                                    }
                                }}
                                placeholder={`Step ${index + 1}`}
                                aria-label={`Checklist step ${index + 1}`}
                                maxLength={255}
                            />
                            {data.checklist.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove step ${index + 1}`}
                                    onClick={() =>
                                        setData(
                                            'checklist',
                                            data.checklist.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index,
                                            ),
                                        )
                                    }
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() =>
                            setData('checklist', [...data.checklist, ''])
                        }
                    >
                        <Plus className="size-4" />
                        Add step
                    </Button>
                </fieldset>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    {isEditing ? 'Save task' : 'Create task'}
                </Button>
            </div>
        </form>
    );
}

function RecurrenceSelect({
    value,
    disabled,
    onChange,
}: {
    value: TaskRecurrence | '';
    disabled: boolean;
    onChange: (value: TaskRecurrence | '') => void;
}) {
    return (
        <Select
            value={value || 'none'}
            disabled={disabled}
            onValueChange={(next) =>
                onChange(next === 'none' ? '' : (next as TaskRecurrence))
            }
        >
            <SelectTrigger id="task-recurrence">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                {TASK_RECURRENCES.map((recurrence) => (
                    <SelectItem key={recurrence} value={recurrence}>
                        {RECURRENCE_LABELS[recurrence]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
