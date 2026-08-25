import { useHttp } from '@inertiajs/react';
import { GraduationCap, Plus } from 'lucide-react';
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
import { CURRENCIES } from '@/lib/constants';
import opportunityApi from '@/routes/api/opportunities';
import universityApi from '@/routes/api/universities';
import { BulkOpportunityImport } from './bulk-opportunity-import';

const levels = ['Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD'];
const statuses = ['Open', 'Limited', 'Closed'];

export type UniversityOption = {
    id: number;
    name: string;
    country: string | null;
};

export type OpportunityForm = {
    university_id: number | null;
    title: string;
    program: string;
    level: string;
    intake: string;
    deadline: string;
    tuition_fee: string;
    currency: string;
    scholarship: string;
    requirements: string;
    status: string;
};

export const initialOpportunityForm: OpportunityForm = {
    university_id: null,
    title: '',
    program: '',
    level: '',
    intake: '',
    deadline: '',
    tuition_fee: '',
    currency: 'USD',
    scholarship: '',
    requirements: '',
    status: 'Open',
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

export function OpportunityFormFields({
    data,
    errors,
    setData,
    universities,
    idPrefix = '',
}: {
    data: OpportunityForm;
    errors: Partial<Record<keyof OpportunityForm, string>>;
    setData: <K extends keyof OpportunityForm>(
        key: K,
        value: OpportunityForm[K],
    ) => void;
    universities: UniversityOption[];
    idPrefix?: string;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field
                error={errors.title}
                label="Program title *"
                name={`${idPrefix}title`}
            >
                <Input
                    aria-invalid={Boolean(errors.title)}
                    id={`${idPrefix}title`}
                    onChange={(event) => setData('title', event.target.value)}
                    placeholder="e.g. Bachelor of Computer Science"
                    value={data.title}
                />
            </Field>
            <Field
                error={errors.university_id}
                label="University *"
                name={`${idPrefix}university_id`}
            >
                <Select
                    onValueChange={(value) =>
                        setData('university_id', Number(value))
                    }
                    value={
                        data.university_id
                            ? String(data.university_id)
                            : undefined
                    }
                >
                    <SelectTrigger
                        aria-invalid={Boolean(errors.university_id)}
                        className="w-full"
                        id={`${idPrefix}university_id`}
                    >
                        <SelectValue placeholder="Select a university" />
                    </SelectTrigger>
                    <SelectContent>
                        {universities.map((university) => (
                            <SelectItem
                                key={university.id}
                                value={String(university.id)}
                            >
                                {university.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field
                error={errors.program}
                label="Program / subject"
                name={`${idPrefix}program`}
            >
                <Input
                    aria-invalid={Boolean(errors.program)}
                    id={`${idPrefix}program`}
                    onChange={(event) => setData('program', event.target.value)}
                    placeholder="e.g. Computer Science"
                    value={data.program}
                />
            </Field>
            <Field error={errors.level} label="Level" name={`${idPrefix}level`}>
                <Select
                    onValueChange={(value) =>
                        setData('level', value === 'none' ? '' : value)
                    }
                    value={data.level || 'none'}
                >
                    <SelectTrigger
                        aria-invalid={Boolean(errors.level)}
                        className="w-full"
                        id={`${idPrefix}level`}
                    >
                        <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {levels.map((level) => (
                            <SelectItem key={level} value={level}>
                                {level}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field
                error={errors.intake}
                label="Intake"
                name={`${idPrefix}intake`}
            >
                <Input
                    aria-invalid={Boolean(errors.intake)}
                    id={`${idPrefix}intake`}
                    onChange={(event) => setData('intake', event.target.value)}
                    placeholder="e.g. Fall 2025"
                    value={data.intake}
                />
            </Field>
            <Field
                error={errors.deadline}
                label="Application deadline"
                name={`${idPrefix}deadline`}
            >
                <Input
                    aria-invalid={Boolean(errors.deadline)}
                    id={`${idPrefix}deadline`}
                    onChange={(event) =>
                        setData('deadline', event.target.value)
                    }
                    type="date"
                    value={data.deadline}
                />
            </Field>
            <Field
                error={errors.status}
                label="Status *"
                name={`${idPrefix}status`}
            >
                <Select
                    onValueChange={(value) => setData('status', value)}
                    value={data.status}
                >
                    <SelectTrigger
                        aria-invalid={Boolean(errors.status)}
                        className="w-full"
                        id={`${idPrefix}status`}
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
                error={errors.tuition_fee}
                label="Tuition fee"
                name={`${idPrefix}tuition_fee`}
            >
                <div className="flex gap-2">
                    <Select
                        onValueChange={(value) => setData('currency', value)}
                        value={data.currency}
                    >
                        <SelectTrigger
                            className="w-24"
                            id={`${idPrefix}currency`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCIES.map((currency) => (
                                <SelectItem key={currency} value={currency}>
                                    {currency}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        aria-invalid={Boolean(errors.tuition_fee)}
                        id={`${idPrefix}tuition_fee`}
                        min="0"
                        onChange={(event) =>
                            setData('tuition_fee', event.target.value)
                        }
                        placeholder="0.00"
                        type="number"
                        value={data.tuition_fee}
                    />
                </div>
            </Field>
            <Field
                error={errors.scholarship}
                label="Scholarship information"
                name={`${idPrefix}scholarship`}
            >
                <Input
                    aria-invalid={Boolean(errors.scholarship)}
                    id={`${idPrefix}scholarship`}
                    onChange={(event) =>
                        setData('scholarship', event.target.value)
                    }
                    placeholder="e.g. 50% tuition waiver for GPA 3.5+"
                    value={data.scholarship}
                />
            </Field>
            <Field
                error={errors.requirements}
                label="Requirements (one per line)"
                name={`${idPrefix}requirements`}
            >
                <textarea
                    aria-invalid={Boolean(errors.requirements)}
                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                    id={`${idPrefix}requirements`}
                    onChange={(event) =>
                        setData('requirements', event.target.value)
                    }
                    placeholder={
                        'IELTS 6.5+\nBachelor degree with 3.0 GPA\nTwo reference letters'
                    }
                    value={data.requirements}
                />
            </Field>
        </div>
    );
}

export function useUniversityOptions() {
    return useHttp<Record<string, never>, { data: UniversityOption[] }>(
        universityApi.index({ query: { per_page: 100 } }),
        {},
    );
}

export function AddOpportunityDialog({
    initialData,
    onCreated,
    onOpenChange,
    open: openProp,
    showBulkImport = true,
    trigger,
}: {
    initialData?: Partial<OpportunityForm>;
    onCreated?: () => void;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    showBulkImport?: boolean;
    trigger?: React.ReactNode | null;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const open = openProp ?? internalOpen;
    const { clearErrors, data, errors, processing, reset, setData, submit } =
        useHttp<OpportunityForm>(opportunityApi.store(), {
            ...initialOpportunityForm,
            ...initialData,
        });
    const universitiesRequest = useUniversityOptions();

    const handleOpenChange = (isOpen: boolean): void => {
        setInternalOpen(isOpen);
        onOpenChange?.(isOpen);

        if (isOpen) {
            setData({ ...initialOpportunityForm, ...initialData });
            universitiesRequest.submit().catch(() => {
                toast.error('Unable to load universities.');
            });
        } else {
            setMode('single');
        }

        if (!isOpen && !processing) {
            reset();
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

            handleOpenChange(false);
            onCreated?.();
            toast.success('Program saved successfully.');
        } catch {
            toast.error(
                'Unable to save the program. Please review the form and try again.',
            );
        }
    };

    const universities = universitiesRequest.response?.data ?? [];

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                            type="button"
                        >
                            <Plus />
                            Add Program
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GraduationCap className="size-5 text-primary" />
                        Add program
                    </DialogTitle>
                    <DialogDescription>
                        Add a new study program under a partner university.
                    </DialogDescription>
                </DialogHeader>

                {showBulkImport && (
                    <TabGroup
                        onChange={(value) =>
                            setMode(value === 'bulk' ? 'bulk' : 'single')
                        }
                        options={[
                            { value: 'single', label: 'Single Program' },
                            { value: 'bulk', label: 'Bulk Import' },
                        ]}
                        value={mode}
                    />
                )}

                {showBulkImport && mode === 'bulk' ? (
                    <>
                        <BulkOpportunityImport onImported={onCreated} />
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
                        <OpportunityFormFields
                            data={data}
                            errors={errors}
                            setData={setData}
                            universities={universities}
                        />
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
                                {processing ? 'Saving...' : 'Save program'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
