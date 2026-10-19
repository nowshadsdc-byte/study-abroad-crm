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
import opportunityApi from '@/routes/api/opportunities';
import type {
    OpportunityEligibilityCriteria,
    OpportunityForm,
} from './add-opportunity-dialog';
import {
    OpportunityFormFields,
    useUniversityOptions,
} from './add-opportunity-dialog';

export type EditableOpportunity = {
    id: number;
    university_id: number;
    title: string;
    program: string | null;
    level: string | null;
    intake: string | null;
    deadline: string | null;
    tuition_fee: string | null;
    currency: string | null;
    scholarship: string | null;
    requirements: string | null;
    eligibility_criteria: OpportunityEligibilityCriteria | null;
    status: string;
};

function buildForm(opportunity: EditableOpportunity): OpportunityForm {
    return {
        university_id: opportunity.university_id,
        title: opportunity.title,
        program: opportunity.program ?? '',
        level: opportunity.level ?? '',
        intake: opportunity.intake ?? '',
        deadline: opportunity.deadline ? opportunity.deadline.slice(0, 10) : '',
        tuition_fee: opportunity.tuition_fee ?? '',
        currency: opportunity.currency ?? 'USD',
        scholarship: opportunity.scholarship ?? '',
        requirements: opportunity.requirements ?? '',
        eligibility_criteria: {
            minimum_ielts_band:
                opportunity.eligibility_criteria?.minimum_ielts_band ?? null,
            minimum_gpa: opportunity.eligibility_criteria?.minimum_gpa ?? null,
            maximum_study_gap_years:
                opportunity.eligibility_criteria?.maximum_study_gap_years ??
                null,
            minimum_education_level:
                opportunity.eligibility_criteria?.minimum_education_level ??
                null,
            required_subjects:
                opportunity.eligibility_criteria?.required_subjects ?? [],
            minimum_work_experience_years:
                opportunity.eligibility_criteria
                    ?.minimum_work_experience_years ?? null,
            accepted_qualification_countries:
                opportunity.eligibility_criteria
                    ?.accepted_qualification_countries ?? [],
        },
        status: opportunity.status,
    };
}

export function EditOpportunityDialog({
    canEdit,
    opportunity,
    onUpdated,
    onOpenChange,
    open: openProp,
    trigger,
}: {
    canEdit: boolean;
    opportunity: EditableOpportunity;
    onUpdated?: () => void;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    trigger?: React.ReactNode | null;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const { clearErrors, data, errors, processing, setData, submit } =
        useHttp<OpportunityForm>(
            opportunityApi.update(opportunity.id),
            buildForm(opportunity),
        );
    const universitiesRequest = useUniversityOptions();

    const handleOpenChange = (isOpen: boolean): void => {
        setInternalOpen(isOpen);
        onOpenChange?.(isOpen);

        if (isOpen) {
            setData(buildForm(opportunity));
            clearErrors();
            universitiesRequest.submit().catch(() => {
                toast.error('Unable to load universities.');
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

            handleOpenChange(false);
            onUpdated?.();
            toast.success('Program updated successfully.');
        } catch {
            toast.error(
                'Unable to update the program. Please review the form and try again.',
            );
        }
    };

    if (!canEdit) {
        return null;
    }

    const universities = universitiesRequest.response?.data ?? [];

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button type="button" variant="outline">
                            <Pencil />
                            Edit
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-5 text-primary" />
                        Edit program
                    </DialogTitle>
                    <DialogDescription>
                        Update this program&apos;s details and requirements.
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <OpportunityFormFields
                        data={data}
                        errors={errors}
                        idPrefix="edit_"
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
                            {processing ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
