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
import candidateApi from '@/routes/api/candidates';
import { BulkCandidateImport } from './bulk-candidate-import';

const statuses = ['Active', 'On Hold', 'Completed', 'Withdrawn'];

const educationLevels = [
    'Below Secondary / SSC',
    'SSC / Secondary School Certificate',
    'HSC / Higher Secondary Certificate',
    'Diploma',
    "Bachelor's Degree",
    "Master's Degree",
    'MPhil',
    'PhD / Doctorate',
    'Professional Qualification',
    'Vocational / Technical Qualification',
    'Other',
];

type CandidateForm = {
    lead_id: number | null;
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
    address: string;
    education_level: string;
    institution: string;
    gpa: string;
    passing_year: string;
    ielts_score: string;
    desired_country: string;
    desired_course: string;
    desired_intake: string;
    status: string;
    notes: string;
};

const initialForm: CandidateForm = {
    lead_id: null,
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    education_level: '',
    institution: '',
    gpa: '',
    passing_year: '',
    ielts_score: '',
    desired_country: '',
    desired_course: '',
    desired_intake: '',
    status: 'Active',
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

type AddCandidateDialogProps = {
    initialData?: Partial<CandidateForm>;
    onCreated?: () => void;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    showBulkImport?: boolean;
    trigger?: React.ReactNode | null;
};

export function AddCandidateDialog({
    initialData,
    onCreated,
    onOpenChange,
    open: openProp,
    showBulkImport = true,
    trigger,
}: AddCandidateDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const open = openProp ?? internalOpen;

    const { clearErrors, data, errors, processing, reset, setData, submit } =
        useHttp<CandidateForm>(candidateApi.store(), {
            ...initialForm,
            ...initialData,
        });

    const handleOpenChange = (isOpen: boolean): void => {
        setInternalOpen(isOpen);
        onOpenChange?.(isOpen);

        if (isOpen) {
            setData({ ...initialForm, ...initialData });
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
            reset();
            clearErrors();
            onCreated?.();
            toast.success('Candidate saved successfully.');
        } catch {
            toast.error(
                'Unable to save the candidate. Please review the form and try again.',
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                            type="button"
                        >
                            <Plus />
                            Add Candidate
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserRoundPlus className="size-5 text-primary" />
                        Add candidate
                    </DialogTitle>
                    <DialogDescription>
                        Create a new student application profile.
                    </DialogDescription>
                </DialogHeader>

                {showBulkImport && (
                    <TabGroup
                        onChange={(value) =>
                            setMode(value === 'bulk' ? 'bulk' : 'single')
                        }
                        options={[
                            { value: 'single', label: 'Single Candidate' },
                            { value: 'bulk', label: 'Bulk Import' },
                        ]}
                        value={mode}
                    />
                )}

                {showBulkImport && mode === 'bulk' ? (
                    <>
                        <BulkCandidateImport onImported={onCreated} />
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
                        {errors.lead_id && (
                            <p className="text-sm text-destructive">
                                {errors.lead_id}
                            </p>
                        )}
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
                                    placeholder="student@example.com"
                                    type="email"
                                    value={data.email}
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
                                error={errors.date_of_birth}
                                label="Date of Birth"
                                name="date_of_birth"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.date_of_birth)}
                                    id="date_of_birth"
                                    onChange={(event) =>
                                        setData(
                                            'date_of_birth',
                                            event.target.value,
                                        )
                                    }
                                    type="date"
                                    value={data.date_of_birth}
                                />
                            </Field>
                            <Field
                                error={errors.gender}
                                label="Gender"
                                name="gender"
                            >
                                <Select
                                    value={data.gender}
                                    onValueChange={(value) =>
                                        setData('gender', value)
                                    }
                                >
                                    <SelectTrigger
                                        aria-invalid={Boolean(errors.gender)}
                                        id="gender"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">
                                            Male
                                        </SelectItem>
                                        <SelectItem value="Female">
                                            Female
                                        </SelectItem>
                                        <SelectItem value="Other">
                                            Other
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field
                                error={errors.education_level}
                                label="Education Level"
                                name="education_level"
                            >
                                <Select
                                    value={data.education_level}
                                    onValueChange={(value) =>
                                        setData('education_level', value)
                                    }
                                >
                                    <SelectTrigger
                                        aria-invalid={Boolean(
                                            errors.education_level,
                                        )}
                                        id="education_level"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select education level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {educationLevels.map((level) => (
                                            <SelectItem
                                                key={level}
                                                value={level}
                                            >
                                                {level}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                error={errors.institution}
                                label="Institution"
                                name="institution"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.institution)}
                                    id="institution"
                                    onChange={(event) =>
                                        setData(
                                            'institution',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Dhaka University"
                                    value={data.institution}
                                />
                            </Field>
                            <Field error={errors.gpa} label="GPA" name="gpa">
                                <Input
                                    aria-invalid={Boolean(errors.gpa)}
                                    id="gpa"
                                    onChange={(event) =>
                                        setData('gpa', event.target.value)
                                    }
                                    placeholder="e.g. 3.75"
                                    type="number"
                                    step="0.01"
                                    value={data.gpa}
                                />
                            </Field>
                            <Field
                                error={errors.passing_year}
                                label="Passing Year"
                                name="passing_year"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.passing_year)}
                                    id="passing_year"
                                    onChange={(event) =>
                                        setData(
                                            'passing_year',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. 2024"
                                    type="number"
                                    value={data.passing_year}
                                />
                            </Field>
                            <Field
                                error={errors.ielts_score}
                                label="IELTS Score"
                                name="ielts_score"
                            >
                                <Input
                                    aria-invalid={Boolean(errors.ielts_score)}
                                    id="ielts_score"
                                    onChange={(event) =>
                                        setData(
                                            'ielts_score',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. 7.0"
                                    type="number"
                                    step="0.5"
                                    value={data.ielts_score}
                                />
                            </Field>

                            <Field
                                error={errors.desired_country}
                                label="Interested country"
                                name="desired_country"
                            >
                                <Input
                                    aria-invalid={Boolean(
                                        errors.desired_country,
                                    )}
                                    id="desired_country"
                                    onChange={(event) =>
                                        setData(
                                            'desired_country',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. United Kingdom"
                                    value={data.desired_country}
                                />
                            </Field>
                            <Field
                                error={errors.desired_course}
                                label="Interested course"
                                name="desired_course"
                            >
                                <Input
                                    aria-invalid={Boolean(
                                        errors.desired_course,
                                    )}
                                    id="desired_course"
                                    onChange={(event) =>
                                        setData(
                                            'desired_course',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. MSc Data Analytics"
                                    value={data.desired_course}
                                />
                            </Field>
                            <Field
                                error={errors.desired_intake}
                                label="Preferred intake"
                                name="desired_intake"
                            >
                                <Input
                                    aria-invalid={Boolean(
                                        errors.desired_intake,
                                    )}
                                    id="desired_intake"
                                    onChange={(event) =>
                                        setData(
                                            'desired_intake',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Fall 2026"
                                    value={data.desired_intake}
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

                            <div className="sm:col-span-2">
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
                                        placeholder="Additional notes about this candidate..."
                                        value={data.notes}
                                    />
                                </Field>
                            </div>
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
                                {processing ? 'Saving...' : 'Save candidate'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
