import { useHttp } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import leadApi from '@/routes/api/leads';

const sources = [
    'Facebook',
    'Website',
    'Referral',
    'Walk-in',
    'Phone',
    'Instagram',
    'YouTube',
    'Other',
];

const statuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
const priorities = ['Low', 'Medium', 'High'];

type AssignableUser = { id: number; name: string };

export type EditableLead = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    source: string;
    interest_country: string | null;
    interest_course: string | null;
    interest_intake: string | null;
    status: string;
    priority: string;
    budget: string | null;
    notes: string | null;
    assigned_to: { id: number | null } | null;
};

type LeadForm = {
    name: string;
    email: string;
    phone: string;
    address: string;
    source: string;
    interest_country: string;
    interest_course: string;
    interest_intake: string;
    status: string;
    priority: string;
    budget: string | null;
    notes: string;
    assigned_to_id: number | null;
};

type FieldProps = {
    children: React.ReactNode;
    error?: string;
    label: string;
    name: string;
};

function Field({ children, error, label, name }: FieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

function buildForm(lead: EditableLead): LeadForm {
    return {
        name: lead.name,
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        address: lead.address ?? '',
        source: lead.source,
        interest_country: lead.interest_country ?? '',
        interest_course: lead.interest_course ?? '',
        interest_intake: lead.interest_intake ?? '',
        status: lead.status,
        priority: lead.priority,
        budget: lead.budget,
        notes: lead.notes ?? '',
        assigned_to_id: lead.assigned_to?.id ?? null,
    };
}

export function EditLeadDialog({
    canEdit,
    lead,
    onUpdated,
}: {
    canEdit: boolean;
    lead: EditableLead;
    onUpdated?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const { clearErrors, data, errors, processing, setData, submit } =
        useHttp<LeadForm>(leadApi.update(lead.id), buildForm(lead));
    const usersRequest = useHttp<
        Record<string, never>,
        { data: AssignableUser[] }
    >(leadApi.assignableUsers(), {});

    const handleOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);

        if (isOpen) {
            setData(buildForm(lead));
            clearErrors();
            usersRequest.submit().catch(() => {
                toast.error('Unable to load assignable users.');
            });
        } else if (!processing) {
            clearErrors();
        }
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        try {
            const response = await submit();

            if (!response) {
                return;
            }

            setOpen(false);
            clearErrors();
            onUpdated?.();
            toast.success('Lead updated successfully.');
        } catch {
            toast.error(
                'Unable to update the lead. Please review the form and try again.',
            );
        }
    };

    if (!canEdit) {
        return null;
    }

    const users = usersRequest.response?.data ?? [];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline">
                    <Pencil />
                    Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-5 text-primary" />
                        Edit lead
                    </DialogTitle>
                    <DialogDescription>
                        Update this prospect&apos;s contact details and status.
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            error={errors.name}
                            label="Full name *"
                            name="edit_name"
                        >
                            <Input
                                aria-invalid={Boolean(errors.name)}
                                id="edit_name"
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                                value={data.name}
                            />
                        </Field>
                        <Field
                            error={errors.phone}
                            label="Phone"
                            name="edit_phone"
                        >
                            <Input
                                aria-invalid={Boolean(errors.phone)}
                                id="edit_phone"
                                onChange={(event) =>
                                    setData('phone', event.target.value)
                                }
                                value={data.phone}
                            />
                        </Field>
                        <Field
                            error={errors.email}
                            label="Email"
                            name="edit_email"
                        >
                            <Input
                                aria-invalid={Boolean(errors.email)}
                                id="edit_email"
                                onChange={(event) =>
                                    setData('email', event.target.value)
                                }
                                type="email"
                                value={data.email}
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field
                                error={errors.address}
                                label="Address"
                                name="edit_address"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.address)}
                                    id="edit_address"
                                    onChange={(event) =>
                                        setData('address', event.target.value)
                                    }
                                    placeholder="Full address"
                                    value={data.address}
                                />
                            </Field>
                        </div>
                        <Field
                            error={errors.source}
                            label="Source *"
                            name="edit_source"
                        >
                            <Select
                                onValueChange={(value) =>
                                    setData('source', value)
                                }
                                value={data.source}
                            >
                                <SelectTrigger
                                    aria-invalid={Boolean(errors.source)}
                                    className="w-full"
                                    id="edit_source"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sources.map((source) => (
                                        <SelectItem key={source} value={source}>
                                            {source}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            error={errors.status}
                            label="Status *"
                            name="edit_status"
                        >
                            <Select
                                onValueChange={(value) =>
                                    setData('status', value)
                                }
                                value={data.status}
                            >
                                <SelectTrigger
                                    aria-invalid={Boolean(errors.status)}
                                    className="w-full"
                                    id="edit_status"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            error={errors.priority}
                            label="Priority *"
                            name="edit_priority"
                        >
                            <Select
                                onValueChange={(value) =>
                                    setData('priority', value)
                                }
                                value={data.priority}
                            >
                                <SelectTrigger
                                    aria-invalid={Boolean(errors.priority)}
                                    className="w-full"
                                    id="edit_priority"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorities.map((priority) => (
                                        <SelectItem
                                            key={priority}
                                            value={priority}
                                        >
                                            {priority}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            error={errors.interest_country}
                            label="Country"
                            name="edit_interest_country"
                        >
                            <Input
                                aria-invalid={Boolean(errors.interest_country)}
                                id="edit_interest_country"
                                onChange={(event) =>
                                    setData(
                                        'interest_country',
                                        event.target.value,
                                    )
                                }
                                value={data.interest_country}
                            />
                        </Field>
                        <Field
                            error={errors.assigned_to_id}
                            label="Assign to"
                            name="edit_assigned_to_id"
                        >
                            <Select
                                onValueChange={(value) =>
                                    setData(
                                        'assigned_to_id',
                                        value === 'unassigned'
                                            ? null
                                            : Number(value),
                                    )
                                }
                                value={
                                    data.assigned_to_id !== null
                                        ? String(data.assigned_to_id)
                                        : 'unassigned'
                                }
                            >
                                <SelectTrigger
                                    aria-invalid={Boolean(
                                        errors.assigned_to_id,
                                    )}
                                    className="w-full"
                                    id="edit_assigned_to_id"
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
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button
                            disabled={processing}
                            onClick={() => handleOpenChange(false)}
                            type="button"
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                            disabled={processing}
                            type="submit"
                        >
                            {processing ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
