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

export type OpportunityEligibilityCriteria = {
    minimum_ielts_band: number | null;
    minimum_gpa: number | null;
    maximum_study_gap_years: number | null;
    minimum_education_level: string | null;
    required_subjects: string[];
    minimum_work_experience_years: number | null;
    accepted_qualification_countries: string[];
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
    eligibility_criteria: OpportunityEligibilityCriteria;
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
    eligibility_criteria: {
        minimum_ielts_band: null,
        minimum_gpa: null,
        maximum_study_gap_years: null,
        minimum_education_level: null,
        required_subjects: [],
        minimum_work_experience_years: null,
        accepted_qualification_countries: [],
    },
    status: 'Open',
};

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
    errors: Partial<Record<keyof OpportunityForm, string>> &
        Record<string, string | undefined>;
    setData: <K extends keyof OpportunityForm>(
        key: K,
        value: OpportunityForm[K],
    ) => void;
    universities: UniversityOption[];
    idPrefix?: string;
}) {
    const updateCriteria = <K extends keyof OpportunityEligibilityCriteria>(
        key: K,
        value: OpportunityEligibilityCriteria[K],
    ): void => {
        setData('eligibility_criteria', {
            ...data.eligibility_criteria,
            [key]: value,
        });
    };

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
            <section className="col-span-full grid gap-3 rounded-lg border bg-muted/20 p-4">
                <div>
                    <h3 className="text-sm font-semibold">
                        Eligibility criteria
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Enter confirmed programme requirements. Unstructured
                        requirements below are always sent for manual review.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field
                        error={
                            errors['eligibility_criteria.minimum_ielts_band']
                        }
                        label="Minimum IELTS / band"
                        name={`${idPrefix}minimum_ielts_band`}
                    >
                        <Input
                            id={`${idPrefix}minimum_ielts_band`}
                            min="0"
                            max="9"
                            step="0.5"
                            type="number"
                            value={
                                data.eligibility_criteria.minimum_ielts_band ??
                                ''
                            }
                            onChange={(event) =>
                                updateCriteria(
                                    'minimum_ielts_band',
                                    event.target.value === ''
                                        ? null
                                        : Number(event.target.value),
                                )
                            }
                        />
                    </Field>
                    <Field
                        error={errors['eligibility_criteria.minimum_gpa']}
                        label="Minimum CGPA (out of 5)"
                        name={`${idPrefix}minimum_gpa`}
                    >
                        <Input
                            id={`${idPrefix}minimum_gpa`}
                            min="0"
                            max="5"
                            step="0.01"
                            type="number"
                            value={
                                data.eligibility_criteria.minimum_gpa ?? ''
                            }
                            onChange={(event) =>
                                updateCriteria(
                                    'minimum_gpa',
                                    event.target.value === ''
                                        ? null
                                        : Number(event.target.value),
                                )
                            }
                        />
                    </Field>
                    <Field
                        error={
                            errors[
                                'eligibility_criteria.maximum_study_gap_years'
                            ]
                        }
                        label="Maximum study gap (years)"
                        name={`${idPrefix}maximum_study_gap_years`}
                    >
                        <Input
                            id={`${idPrefix}maximum_study_gap_years`}
                            min="0"
                            max="100"
                            step="1"
                            type="number"
                            value={
                                data.eligibility_criteria
                                    .maximum_study_gap_years ?? ''
                            }
                            onChange={(event) =>
                                updateCriteria(
                                    'maximum_study_gap_years',
                                    event.target.value === ''
                                        ? null
                                        : Number(event.target.value),
                                )
                            }
                        />
                    </Field>
                    <Field
                        error={
                            errors[
                                'eligibility_criteria.minimum_education_level'
                            ]
                        }
                        label="Minimum prior education"
                        name={`${idPrefix}minimum_education_level`}
                    >
                        <Select
                            value={
                                data.eligibility_criteria
                                    .minimum_education_level ?? 'none'
                            }
                            onValueChange={(value) =>
                                updateCriteria(
                                    'minimum_education_level',
                                    value === 'none' ? null : value,
                                )
                            }
                        >
                            <SelectTrigger
                                id={`${idPrefix}minimum_education_level`}
                                className="w-full"
                            >
                                <SelectValue placeholder="Not specified" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Not specified</SelectItem>
                                {educationLevels.map((educationLevel) => (
                                    <SelectItem
                                        key={educationLevel}
                                        value={educationLevel}
                                    >
                                        {educationLevel}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field
                        error={
                            errors[
                                'eligibility_criteria.minimum_work_experience_years'
                            ]
                        }
                        label="Minimum work experience (years)"
                        name={`${idPrefix}minimum_work_experience_years`}
                    >
                        <Input
                            id={`${idPrefix}minimum_work_experience_years`}
                            min="0"
                            max="80"
                            step="0.5"
                            type="number"
                            value={
                                data.eligibility_criteria
                                    .minimum_work_experience_years ?? ''
                            }
                            onChange={(event) =>
                                updateCriteria(
                                    'minimum_work_experience_years',
                                    event.target.value === ''
                                        ? null
                                        : Number(event.target.value),
                                )
                            }
                        />
                    </Field>
                    <Field
                        error={
                            errors['eligibility_criteria.required_subjects']
                        }
                        label="Required subjects (one per line)"
                        name={`${idPrefix}required_subjects`}
                    >
                        <textarea
                            id={`${idPrefix}required_subjects`}
                            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            value={
                                data.eligibility_criteria.required_subjects.join(
                                    '\n',
                                )
                            }
                            onChange={(event) =>
                                updateCriteria(
                                    'required_subjects',
                                    event.target.value
                                        .split('\n')
                                        .map((subject) => subject.trim())
                                        .filter(Boolean),
                                )
                            }
                        />
                    </Field>
                    <Field
                        error={
                            errors[
                                'eligibility_criteria.accepted_qualification_countries'
                            ]
                        }
                        label="Accepted qualification countries (one per line)"
                        name={`${idPrefix}accepted_qualification_countries`}
                    >
                        <textarea
                            id={`${idPrefix}accepted_qualification_countries`}
                            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            value={data.eligibility_criteria.accepted_qualification_countries.join(
                                '\n',
                            )}
                            onChange={(event) =>
                                updateCriteria(
                                    'accepted_qualification_countries',
                                    event.target.value
                                        .split('\n')
                                        .map((country) => country.trim())
                                        .filter(Boolean),
                                )
                            }
                        />
                    </Field>
                </div>
            </section>
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
