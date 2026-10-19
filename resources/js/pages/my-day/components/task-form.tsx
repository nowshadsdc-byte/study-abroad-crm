import { useHttp } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { StudentPicker } from '@/components/student-picker';
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
