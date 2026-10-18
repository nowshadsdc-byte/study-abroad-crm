import { useHttp } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Kbd } from '@/components/kbd';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { formatDateTime } from '@/lib/task-due';
import taskApi from '@/routes/api/tasks';
import type { TaskNote } from '@/types';

function saveOnCtrlEnter(
    event: KeyboardEvent<HTMLTextAreaElement>,
    save: () => void,
): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        save();
    }
}

export function TaskNotes({
    taskId,
    notes,
    onNotesChange,
}: {
    taskId: number;
    notes: TaskNote[];
    onNotesChange: (notes: TaskNote[]) => void;
}) {
    const getInitials = useInitials();
    const composer = useHttp<{ body: string }, { data: TaskNote }>({
        body: '',
    });
    const editForm = useHttp<{ body: string }, { data: TaskNote }>({
        body: '',
    });
    const deleteForm = useHttp<Record<string, never>>({});
    const [editingId, setEditingId] = useState<number | null>(null);

    const addNote = async (
        event?: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event?.preventDefault();

        if (!composer.data.body.trim()) {
            return;
        }

        try {
            const response = await composer.post(
                taskApi.notes.store(taskId).url,
            );
            onNotesChange([response.data, ...notes]);
            composer.reset();
        } catch {
            // Validation errors are shown inline.
        }
    };

    const saveEdit = async (noteId: number): Promise<void> => {
        if (!editForm.data.body.trim()) {
            return;
        }

        try {
            const response = await editForm.patch(
                taskApi.notes.update([taskId, noteId]).url,
            );
            onNotesChange(
                notes.map((note) =>
                    note.id === noteId ? response.data : note,
                ),
            );
            setEditingId(null);
        } catch {
            toast.error('Could not save the note.');
        }
    };

    const removeNote = async (note: TaskNote): Promise<void> => {
        if (!window.confirm('Remove this note?')) {
            return;
        }

        try {
            await deleteForm.delete(
                taskApi.notes.destroy([taskId, note.id]).url,
            );
            onNotesChange(notes.filter((current) => current.id !== note.id));
        } catch {
            toast.error('Could not remove the note.');
        }
    };

    return (
        <div className="grid gap-4">
            <form onSubmit={addNote} className="grid gap-2">
                <label htmlFor="task-note" className="sr-only">
                    Add a note
                </label>
                <Textarea
                    id="task-note"
                    value={composer.data.body}
                    onChange={(event) =>
                        composer.setData('body', event.target.value)
                    }
                    onKeyDown={(event) =>
                        saveOnCtrlEnter(event, () => void addNote())
                    }
                    placeholder="Add a note…"
                    rows={3}
                    maxLength={5000}
                    aria-invalid={Boolean(composer.errors.body)}
                />
                <InputError
                    message={composer.errors.body}
                    className="text-xs"
                />
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Kbd>Ctrl</Kbd>
                        <Kbd>Enter</Kbd> to save
                    </span>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={
                            composer.processing || !composer.data.body.trim()
                        }
                    >
                        Add note
                    </Button>
                </div>
            </form>

            {notes.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                    No notes yet.
                </p>
            ) : (
                <ul className="grid gap-3" aria-label="Notes">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className="flex gap-3 rounded-lg border border-border bg-card p-3"
                        >
                            <Avatar className="size-8">
                                <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                                    {getInitials(note.user?.name ?? '?')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                                    <span className="text-sm font-semibold text-foreground">
                                        {note.user?.name ?? 'Former user'}
                                    </span>
                                    <time
                                        dateTime={note.created_at}
                                        title={formatDateTime(note.created_at)}
                                    >
                                        {formatDistanceToNow(
                                            new Date(note.created_at),
                                            { addSuffix: true },
                                        )}
                                    </time>
                                    {note.is_edited && (
                                        <span
                                            title={`Edited ${formatDateTime(note.updated_at)}`}
                                        >
                                            (edited)
                                        </span>
                                    )}
                                </div>
                                {editingId === note.id ? (
                                    <div className="mt-2 grid gap-2">
                                        <Textarea
                                            autoFocus
                                            value={editForm.data.body}
                                            aria-label="Edit note"
                                            onChange={(event) =>
                                                editForm.setData(
                                                    'body',
                                                    event.target.value,
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === 'Escape') {
                                                    event.stopPropagation();
                                                    setEditingId(null);
                                                }

                                                saveOnCtrlEnter(
                                                    event,
                                                    () =>
                                                        void saveEdit(note.id),
                                                );
                                            }}
                                            rows={3}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setEditingId(null)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={editForm.processing}
                                                onClick={() =>
                                                    saveEdit(note.id)
                                                }
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm whitespace-pre-line">
                                        {note.body}
                                    </p>
                                )}
                            </div>
                            {note.can.manage && editingId !== note.id && (
                                <div className="flex shrink-0 items-start">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        aria-label="Edit note"
                                        onClick={() => {
                                            editForm.setData('body', note.body);
                                            setEditingId(note.id);
                                        }}
                                    >
                                        <Pencil className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        aria-label="Remove note"
                                        onClick={() => removeNote(note)}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
