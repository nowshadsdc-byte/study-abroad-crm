import { useHttp } from '@inertiajs/react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import taskApi from '@/routes/api/tasks';
import type { TaskChecklistItem } from '@/types';

export function TaskChecklist({
    taskId,
    items,
    canEdit,
    onItemsChange,
}: {
    taskId: number;
    items: TaskChecklistItem[];
    canEdit: boolean;
    onItemsChange: (items: TaskChecklistItem[]) => void;
}) {
    const addForm = useHttp<{ body: string }, { data: TaskChecklistItem }>({
        body: '',
    });
    const updateForm = useHttp<
        { body?: string; is_completed?: boolean },
        { data: TaskChecklistItem }
    >({});
    const deleteForm = useHttp<Record<string, never>>({});
    const [editing, setEditing] = useState<{ id: number; body: string } | null>(
        null,
    );

    const completed = items.filter((item) => item.is_completed).length;
    const percentage = items.length ? (completed / items.length) * 100 : 0;

    const replaceItem = (updated: TaskChecklistItem): void => {
        onItemsChange(
            items.map((item) => (item.id === updated.id ? updated : item)),
        );
    };

    const toggle = async (item: TaskChecklistItem): Promise<void> => {
        const previous = items;
        replaceItem({ ...item, is_completed: !item.is_completed });
        updateForm.setData({ is_completed: !item.is_completed });

        try {
            const response = await updateForm.patch(
                taskApi.checklist.update([taskId, item.id]).url,
            );
            onItemsChange(
                previous.map((current) =>
                    current.id === item.id ? response.data : current,
                ),
            );
        } catch {
            onItemsChange(previous);
            toast.error('Could not update that checklist item.');
        }
    };

    const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        if (!addForm.data.body.trim()) {
            return;
        }

        try {
            const response = await addForm.post(
                taskApi.checklist.store(taskId).url,
            );
            onItemsChange([...items, response.data]);
            addForm.reset();
        } catch {
            // Validation errors are shown inline.
        }
    };

    const saveEdit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (!editing || !editing.body.trim()) {
            return;
        }

        updateForm.setData({ body: editing.body });

        try {
            const response = await updateForm.patch(
                taskApi.checklist.update([taskId, editing.id]).url,
            );
            replaceItem(response.data);
            setEditing(null);
        } catch {
            toast.error('Could not save that checklist item.');
        }
    };

    const remove = async (item: TaskChecklistItem): Promise<void> => {
        const previous = items;
        onItemsChange(items.filter((current) => current.id !== item.id));

        try {
            await deleteForm.delete(
                taskApi.checklist.destroy([taskId, item.id]).url,
            );
        } catch {
            onItemsChange(previous);
            toast.error('Could not remove that checklist item.');
        }
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Progress</span>
                    <span className="text-muted-foreground tabular-nums">
                        {completed}/{items.length} completed
                    </span>
                </div>
                <Progress
                    value={percentage}
                    aria-label={`${completed} of ${items.length} checklist items completed`}
                />
            </div>

            {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No checklist yet.{' '}
                    {canEdit && 'Break the task into steps below.'}
                </p>
            ) : (
                <ul className="grid gap-1" aria-label="Checklist">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="group flex min-h-10 items-center gap-3 rounded-lg px-2 hover:bg-muted/60"
                        >
                            <Checkbox
                                id={`checklist-${item.id}`}
                                checked={item.is_completed}
                                disabled={!canEdit}
                                onCheckedChange={() => toggle(item)}
                            />
                            {editing?.id === item.id ? (
                                <form
                                    onSubmit={saveEdit}
                                    className="flex flex-1 gap-2 py-1"
                                >
                                    <Input
                                        autoFocus
                                        value={editing.body}
                                        maxLength={255}
                                        aria-label="Edit checklist item"
                                        onChange={(event) =>
                                            setEditing({
                                                id: item.id,
                                                body: event.target.value,
                                            })
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                                event.stopPropagation();
                                                setEditing(null);
                                            }
                                        }}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        aria-label="Save checklist item"
                                    >
                                        <Check className="size-4" />
                                    </Button>
                                </form>
                            ) : (
                                <>
                                    <label
                                        htmlFor={`checklist-${item.id}`}
                                        className={cn(
                                            'flex-1 text-sm',
                                            item.is_completed &&
                                                'text-muted-foreground line-through',
                                        )}
                                    >
                                        {item.body}
                                    </label>
                                    {canEdit && (
                                        <span className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                aria-label={`Edit "${item.body}"`}
                                                onClick={() =>
                                                    setEditing({
                                                        id: item.id,
                                                        body: item.body,
                                                    })
                                                }
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                aria-label={`Remove "${item.body}"`}
                                                onClick={() => remove(item)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </span>
                                    )}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canEdit && (
                <form onSubmit={add} className="grid gap-1">
                    <div className="flex gap-2">
                        <Input
                            value={addForm.data.body}
                            onChange={(event) =>
                                addForm.setData('body', event.target.value)
                            }
                            placeholder="Add a step…"
                            aria-label="New checklist item"
                            maxLength={255}
                        />
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={
                                addForm.processing || !addForm.data.body.trim()
                            }
                        >
                            <Plus className="size-4" />
                            Add
                        </Button>
                    </div>
                    <InputError
                        message={addForm.errors.body}
                        className="text-xs"
                    />
                </form>
            )}
        </div>
    );
}
