import { useHttp } from '@inertiajs/react';
import { GraduationCap } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useUniversityOptions } from '@/pages/opportunities/add-opportunity-dialog';
import candidateApi from '@/routes/api/candidates';
import opportunityApi from '@/routes/api/opportunities';

type OpportunityOption = { id: number; title: string };

export type ApplicationProgress = {
    id: number;
    status: string;
    notes: string | null;
    opportunity_id: number | null;
    opportunity: {
        id: number;
        title: string;
        university: {
            id: number;
            name: string;
            country: string | null;
            logo_url: string | null;
        } | null;
    } | null;
};

type ProgressForm = {
    status: string;
    notes: string;
    opportunity_id: number | null;
};

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'Completed':
            return 'bg-green-500 text-white border-green-500';
        case 'In Progress':
            return 'bg-blue-500 text-white border-blue-500';
        case 'Skipped':
            return 'bg-gray-300 text-gray-700 border-gray-300';
        default:
            return 'bg-white text-gray-400 border-gray-300 dark:bg-gray-800 dark:border-gray-700';
    }
};

export function ApplicationStepDialog({
    candidateId,
    progress,
    canEdit,
    onChanged,
}: {
    candidateId: number;
    progress: ApplicationProgress;
    canEdit: boolean;
    onChanged: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [universityId, setUniversityId] = useState<number | null>(null);
    const [opportunityId, setOpportunityId] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [programs, setPrograms] = useState<OpportunityOption[]>([]);
    const [loadingPrograms, setLoadingPrograms] = useState(false);

    const universitiesRequest = useUniversityOptions();
    const programsRequest = useHttp<
        Record<string, never>,
        { data: OpportunityOption[] }
    >({});
    const saveForm = useHttp<ProgressForm>(
        candidateApi.progress.update([candidateId, progress.id]),
        {
            status: progress.status,
            notes: progress.notes ?? '',
            opportunity_id: progress.opportunity_id,
        },
    );

    const loadProgramsForUniversity = (id: number): void => {
        setLoadingPrograms(true);
        programsRequest
            .get(
                opportunityApi.index({
                    query: { university_id: id, per_page: 100 },
                }).url,
            )
            .then((response) => setPrograms(response?.data ?? []))
            .catch(() =>
                toast.error('Unable to load programs for this university.'),
            )
            .finally(() => setLoadingPrograms(false));
    };

    const handleOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);

        if (isOpen) {
            universitiesRequest
                .submit()
                .catch(() => toast.error('Unable to load universities.'));

            const savedUniversityId =
                progress.opportunity?.university?.id ?? null;
            setUniversityId(savedUniversityId);
            setOpportunityId(progress.opportunity_id);
            setNotes(progress.notes ?? '');
            setPrograms([]);

            if (savedUniversityId) {
                loadProgramsForUniversity(savedUniversityId);
            }
        }
    };

    const handleUniversityChange = (value: string): void => {
        const id = Number(value);
        setUniversityId(id);
        setOpportunityId(null);
        setPrograms([]);
        loadProgramsForUniversity(id);
    };

    const handleSave = async (): Promise<void> => {
        try {
            await saveForm
                .optimistic(() => ({
                    status: opportunityId ? 'Completed' : 'Pending',
                    notes,
                    opportunity_id: opportunityId,
                }))
                .submit();

            toast.success(
                opportunityId
                    ? 'Application step marked as completed.'
                    : 'Application details saved.',
            );
            setOpen(false);
            onChanged();
        } catch {
            toast.error(
                'Unable to save application details. Please try again.',
            );
        }
    };

    const universities = universitiesRequest.response?.data ?? [];
    const summary = progress.opportunity
        ? `${progress.opportunity.university?.name ?? 'Unknown university'} — ${progress.opportunity.title}`
        : null;

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            <DialogTrigger asChild>
                <button
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${getStatusColor(progress.status)} ${canEdit && progress.id !== 0 ? 'cursor-pointer hover:scale-110' : 'cursor-default'} `}
                    disabled={!canEdit || progress.id === 0}
                    title={
                        canEdit
                            ? 'Click to edit application details'
                            : progress.status
                    }
                    type="button"
                >
                    <GraduationCap className="size-4" />
                </button>
            </DialogTrigger>

            <div className="ml-4 flex w-full flex-col md:mt-4 md:ml-0 md:w-auto md:items-center">
                <span className="text-sm font-semibold">Application</span>
                <span className="text-xs text-muted-foreground">
                    {progress.status}
                </span>
                <div className="mt-2 w-full max-w-[150px] text-xs break-all text-muted-foreground md:text-center">
                    {summary ? (
                        <p className="line-clamp-2 font-medium text-foreground">
                            {summary}
                        </p>
                    ) : (
                        <span className="italic opacity-50">
                            No application yet
                        </span>
                    )}
                </div>
            </div>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GraduationCap className="size-5 text-primary" />
                        Application details
                    </DialogTitle>
                    <DialogDescription>
                        Select the university and program this candidate is
                        applying to.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="application_university">
                            University
                        </Label>
                        <Select
                            onValueChange={handleUniversityChange}
                            value={
                                universityId ? String(universityId) : undefined
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                id="application_university"
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
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="application_program">
                            University Program
                        </Label>
                        <Select
                            disabled={!universityId || loadingPrograms}
                            onValueChange={(value) =>
                                setOpportunityId(Number(value))
                            }
                            value={
                                opportunityId
                                    ? String(opportunityId)
                                    : undefined
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                id="application_program"
                            >
                                <SelectValue
                                    placeholder={
                                        !universityId
                                            ? 'Select a university first'
                                            : loadingPrograms
                                              ? 'Loading programs...'
                                              : 'Select a program'
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {programs.map((program) => (
                                    <SelectItem
                                        key={program.id}
                                        value={String(program.id)}
                                    >
                                        {program.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="application_notes">Note</Label>
                        <Textarea
                            id="application_notes"
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Optional note about this application..."
                            value={notes}
                        />
                    </div>
                    {!opportunityId && (
                        <p className="text-xs text-muted-foreground">
                            Select both a university and a program to mark this
                            step as completed.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={() => handleOpenChange(false)}
                        type="button"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                        disabled={saveForm.processing}
                        onClick={handleSave}
                        type="button"
                    >
                        {saveForm.processing ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
