import { useHttp } from '@inertiajs/react';
import { Plus, UserRoundPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TabGroup } from '@/components/tab-group';
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
import { BulkLeadImport } from './bulk-lead-import';

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
    budget: string;
    notes: string;
};

const initialForm: LeadForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
    source: 'Website',
    interest_country: '',
    interest_course: '',
    interest_intake: '',
    status: 'New',
    priority: 'Medium',
    budget: '',
    notes: '',
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

export function AddLeadDialog({ onCreated }: { onCreated?: () => void }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const { clearErrors, data, errors, processing, reset, setData, submit } =
        useHttp<LeadForm>(leadApi.store(), initialForm);

    const handleOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);

        if (!isOpen) {
            setMode('single');

            if (!processing) {
                reset();
                clearErrors();
            }
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
            reset();
            clearErrors();
            onCreated?.();
            toast.success('Lead saved successfully.');
        } catch {
            toast.error(
                'Unable to save the lead. Please review the form and try again.',
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                    type="button"
                >
                    <Plus />
                    Add Leads
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserRoundPlus className="size-5 text-primary" />
                        Add lead
                    </DialogTitle>
                    <DialogDescription>
                        Capture a new prospect and their study preferences.
                    </DialogDescription>
                </DialogHeader>

                <TabGroup
                    onChange={(value) =>
                        setMode(value === 'bulk' ? 'bulk' : 'single')
                    }
                    options={[
                        { value: 'single', label: 'Single Lead' },
                        { value: 'bulk', label: 'Bulk Import' },
                    ]}
                    value={mode}
                />

                {mode === 'bulk' ? (
                    <>
                        <BulkLeadImport onImported={onCreated} />
                        <DialogFooter>
                            <Button
                                onClick={() => handleOpenChange(false)}
                                type="button"
                                variant="outline"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form className="grid gap-4" onSubmit={handleSubmit}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                error={errors.name}
                                label="Full name *"
                                name="name"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.name)}
                                    id="name"
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                    placeholder="e.g. Arif Hossain"
                                    value={data.name}
                                />
                            </Field>
                            <Field
                                error={errors.phone}
                                label="Phone"
                                name="phone"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.phone)}
                                    id="phone"
                                    onChange={(event) =>
                                        setData('phone', event.target.value)
                                    }
                                    placeholder="+880 1..."
                                    value={data.phone}
                                />
                            </Field>
                            <Field
                                error={errors.email}
                                label="Email"
                                name="email"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.email)}
                                    id="email"
                                    onChange={(event) =>
                                        setData('email', event.target.value)
                                    }
                                    placeholder="lead@example.com"
                                    type="email"
                                    value={data.email}
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field
                                    error={errors.address}
                                    label="Address"
                                    name="address"
                                >
                                    <Input
                                        aria-invalid={Boolean(errors.address)}
                                        id="address"
                                        onChange={(event) =>
                                            setData(
                                                'address',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Full address"
                                        value={data.address}
                                    />
                                </Field>
                            </div>
                            <Field
                                error={errors.source}
                                label="Source *"
                                name="source"
                            >
                                <Select
                                    value={data.source}
                                    onValueChange={(value) =>
                                        setData('source', value)
                                    }
                                >
                                    <SelectTrigger
                                        aria-invalid={Boolean(errors.source)}
                                        id="source"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sources.map((source) => (
                                            <SelectItem
                                                key={source}
                                                value={source}
                                            >
                                                {source}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                error={errors.interest_country}
                                label="Interested country"
                                name="interest_country"
                            >
                                <Input
                                    aria-invalid={Boolean(
                                        errors.interest_country,
                                    )}
                                    id="interest_country"
                                    onChange={(event) =>
                                        setData(
                                            'interest_country',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. United Kingdom"
                                    value={data.interest_country}
                                />
                            </Field>
                            <Field
                                error={errors.interest_course}
                                label="Interested course"
                                name="interest_course"
                            >
                                <Input
                                    aria-invalid={Boolean(
                                        errors.interest_course,
                                    )}
                                    id="interest_course"
                                    onChange={(event) =>
                                        setData(
                                            'interest_course',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. MSc Data Analytics"
                                    value={data.interest_course}
                                />
                            </Field>
                            <Field
                                error={errors.interest_intake}
                                label="Preferred intake"
                                name="interest_intake"
                            >
                                <Input
                                    aria-invalid={Boolean(
                                        errors.interest_intake,
                                    )}
                                    id="interest_intake"
                                    onChange={(event) =>
                                        setData(
                                            'interest_intake',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Fall 2026"
                                    value={data.interest_intake}
                                />
                            </Field>
                            <Field
                                error={errors.status}
                                label="Status *"
                                name="status"
                            >
                                <Select
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData('status', value)
                                    }
                                >
                                    <SelectTrigger
                                        aria-invalid={Boolean(errors.status)}
                                        id="status"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                error={errors.priority}
                                label="Priority *"
                                name="priority"
                            >
                                <Select
                                    value={data.priority}
                                    onValueChange={(value) =>
                                        setData('priority', value)
                                    }
                                >
                                    <SelectTrigger
                                        aria-invalid={Boolean(errors.priority)}
                                        id="priority"
                                        className="w-full"
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
                                error={errors.budget}
                                label="Budget"
                                name="budget"
                            >
                                <Select
                                    value={data.budget}
                                    onValueChange={(value) =>
                                        setData('budget', value)
                                    }
                                >
                                    <SelectTrigger
                                        aria-invalid={Boolean(errors.budget)}
                                        id="budget"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select budget" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorities.map((budget) => (
                                            <SelectItem
                                                key={budget}
                                                value={budget}
                                            >
                                                {budget}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                error={errors.notes}
                                label="Notes"
                                name="notes"
                            >
                                <textarea
                                    aria-invalid={Boolean(errors.notes)}
                                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                                    id="notes"
                                    onChange={(event) =>
                                        setData('notes', event.target.value)
                                    }
                                    placeholder="Additional notes about this lead..."
                                    value={data.notes}
                                />
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
                                {processing ? 'Saving...' : 'Save lead'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
