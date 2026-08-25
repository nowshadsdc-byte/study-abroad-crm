import { useHttp } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import candidateApi from '@/routes/api/candidates';

type AssignedUser = {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
};

type AssignableUser = { id: number; name: string };

export function AssignedCounselorDialog({
    candidateId,
    assignedTo,
    canEdit,
    onUpdated,
}: {
    candidateId: number;
    assignedTo: AssignedUser | null;
    canEdit: boolean;
    onUpdated?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState<AssignableUser[]>([]);
    const usersRequest = useHttp<
        Record<string, never>,
        { data: AssignableUser[] }
    >(candidateApi.assignableUsers(), {});
    const assignForm = useHttp<{ assigned_to_id: number | null }>({
        assigned_to_id: assignedTo?.id ?? null,
    });

    const handleOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);

        if (isOpen) {
            assignForm.setData('assigned_to_id', assignedTo?.id ?? null);
            assignForm.clearErrors();
            usersRequest
                .submit()
                .then((response) => setUsers(response?.data ?? []))
                .catch(() => toast.error('Unable to load counselors.'));
        }
    };

    const handleUpdate = async (): Promise<void> => {
        try {
            await assignForm.patch(candidateApi.assign(candidateId).url);
            toast.success('Assigned counselor updated successfully.');
            setOpen(false);
            onUpdated?.();
        } catch {
            toast.error(
                'Unable to update the assigned counselor. Please try again.',
            );
        }
    };

    if (!canEdit) {
        return (
            <p className="text-sm font-semibold">
                {assignedTo?.name ?? 'Unassigned'}
            </p>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button
                    className="text-left text-sm font-semibold hover:underline"
                    type="button"
                >
                    {assignedTo?.name ?? 'Unassigned'}
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assigned Counselor</DialogTitle>
                    <DialogDescription>
                        Review the current assignment and choose a new
                        counselor.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-1 rounded-lg border bg-muted/30 p-4 text-sm">
                    <p className="font-medium">
                        {assignedTo?.name ?? 'Unassigned'}
                    </p>
                    <p className="text-muted-foreground">
                        {assignedTo?.email || '—'}
                    </p>
                    <p className="text-muted-foreground">
                        {assignedTo?.phone || '—'}
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="assigned_counselor">Assign to</Label>
                    <Select
                        onValueChange={(value) =>
                            assignForm.setData(
                                'assigned_to_id',
                                value === 'unassigned' ? null : Number(value),
                            )
                        }
                        value={
                            assignForm.data.assigned_to_id !== null
                                ? String(assignForm.data.assigned_to_id)
                                : 'unassigned'
                        }
                    >
                        <SelectTrigger
                            aria-invalid={Boolean(
                                assignForm.errors.assigned_to_id,
                            )}
                            className="w-full"
                            id="assigned_counselor"
                        >
                            <SelectValue placeholder="Select a person" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">
                                Unassigned
                            </SelectItem>
                            {users.map((user) => (
                                <SelectItem
                                    key={user.id}
                                    value={String(user.id)}
                                >
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {assignForm.errors.assigned_to_id && (
                        <p className="text-xs text-destructive">
                            {assignForm.errors.assigned_to_id}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        disabled={assignForm.processing}
                        onClick={() => handleOpenChange(false)}
                        type="button"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={assignForm.processing}
                        onClick={handleUpdate}
                        type="button"
                    >
                        {assignForm.processing ? 'Updating...' : 'Update'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
