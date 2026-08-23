import { useHttp } from '@inertiajs/react';
import { Check, Clock, Edit2, Play, SkipForward } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import candidateApi from '@/routes/api/candidates';
import { ApplicationStepDialog } from './application-step-dialog';
import type { ApplicationProgress } from './application-step-dialog';

type ProgressRecord = ApplicationProgress & {
    step: string;
    completed_at: string | null;
};

const STEPS = [
    'Application',
    'Documents',
    'Submission',
    'Offer',
    'Visa',
    'Enrollment',
];
const STATUS_CYCLE = ['Pending', 'In Progress', 'Completed', 'Skipped'];

const emptyRecord = (step: string): ProgressRecord => ({
    id: 0,
    step,
    status: 'Pending',
    notes: null,
    completed_at: null,
    opportunity_id: null,
    opportunity: null,
});

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'Completed':
            return <Check className="size-4" />;
        case 'In Progress':
            return <Play className="size-4" />;
        case 'Skipped':
            return <SkipForward className="size-4" />;
        default:
            return <Clock className="size-4" />;
    }
};

const getStatusColor = (status: string) => {
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

function StepConnector({ isLast }: { isLast: boolean }) {
    return (
        <>
            <div className="absolute top-6 right-0 left-0 -z-10 mx-10 hidden h-0.5 bg-gray-200 md:block dark:bg-gray-800" />
            {!isLast && (
                <div className="absolute top-10 bottom-[-2rem] left-6 -z-10 w-0.5 bg-gray-200 md:hidden dark:bg-gray-800" />
            )}
        </>
    );
}

function GenericStep({
    candidateId,
    record,
    canEdit,
    onChanged,
}: {
    candidateId: number;
    record: ProgressRecord;
    canEdit: boolean;
    onChanged: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(record.notes ?? '');
    const form = useHttp<{
        status: string;
        notes: string;
        opportunity_id: number | null;
    }>(candidateApi.progress.update([candidateId, record.id]), {
        status: record.status,
        notes: record.notes ?? '',
        opportunity_id: record.opportunity_id,
    });

    const handleCycleStatus = async (): Promise<void> => {
        if (!canEdit || record.id === 0) {
            return;
        }

        const nextStatus =
            STATUS_CYCLE[
                (STATUS_CYCLE.indexOf(record.status) + 1) % STATUS_CYCLE.length
            ];

        try {
            await form
                .optimistic(() => ({
                    status: nextStatus,
                    notes: record.notes ?? '',
                    opportunity_id: record.opportunity_id,
                }))
                .submit();
            toast.success(`Step marked as ${nextStatus}`);
            onChanged();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleSaveNotes = async (): Promise<void> => {
        try {
            await form
                .optimistic(() => ({
                    status: record.status,
                    notes,
                    opportunity_id: record.opportunity_id,
                }))
                .submit();
            toast.success('Notes saved successfully');
            setIsEditing(false);
            onChanged();
        } catch {
            toast.error('Failed to save notes');
        }
    };

    return (
        <>
            <button
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${getStatusColor(record.status)} ${canEdit && record.id !== 0 ? 'cursor-pointer hover:scale-110' : 'cursor-default'} `}
                disabled={!canEdit || record.id === 0}
                onClick={() => void handleCycleStatus()}
                title={canEdit ? 'Click to change status' : record.status}
                type="button"
            >
                <StatusIcon status={record.status} />
            </button>

            <div className="ml-4 flex w-full flex-col md:mt-4 md:ml-0 md:w-auto md:items-center">
                <span className="text-sm font-semibold">{record.step}</span>
                <span className="text-xs text-muted-foreground">
                    {record.status}
                </span>

                {canEdit && record.id !== 0 && !isEditing && (
                    <div className="group/note relative mt-2 w-full max-w-[150px] text-xs break-all text-muted-foreground md:text-center">
                        {record.notes ? (
                            <p className="line-clamp-2">{record.notes}</p>
                        ) : (
                            <span className="italic opacity-50">No notes</span>
                        )}
                        <button
                            className="absolute top-0 right-0 rounded-full bg-white p-1 opacity-0 transition-opacity group-hover/note:opacity-100 dark:bg-black"
                            onClick={() => {
                                setIsEditing(true);
                                setNotes(record.notes ?? '');
                            }}
                            type="button"
                        >
                            <Edit2 className="size-3" />
                        </button>
                    </div>
                )}

                {isEditing && (
                    <div className="z-10 mt-2 w-full max-w-[200px] rounded border bg-card p-2 shadow-lg">
                        <Textarea
                            className="mb-2 min-h-[80px] resize-none text-xs"
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Add notes..."
                            value={notes}
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                className="h-7 text-xs"
                                onClick={() => setIsEditing(false)}
                                size="sm"
                                variant="ghost"
                            >
                                Cancel
                            </Button>
                            <Button
                                className="h-7 text-xs"
                                onClick={() => void handleSaveNotes()}
                                size="sm"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export function ProgressPipeline({
    candidateId,
    progressRecords,
    canEdit = true,
    onChanged = () => {},
}: {
    candidateId: number;
    progressRecords: ProgressRecord[];
    canEdit?: boolean;
    onChanged?: () => void;
}) {
    return (
        <div className="w-full">
            <div className="relative flex flex-col md:flex-row md:justify-between">
                {STEPS.map((stepName, index) => {
                    const record =
                        progressRecords.find((r) => r.step === stepName) ??
                        emptyRecord(stepName);

                    return (
                        <div
                            className="group relative mb-8 flex items-start md:mb-0 md:flex-1 md:flex-col md:items-center"
                            key={stepName}
                        >
                            <StepConnector
                                isLast={index === STEPS.length - 1}
                            />

                            {stepName === 'Application' ? (
                                <ApplicationStepDialog
                                    candidateId={candidateId}
                                    canEdit={canEdit}
                                    onChanged={onChanged}
                                    progress={record}
                                />
                            ) : (
                                <GenericStep
                                    candidateId={candidateId}
                                    canEdit={canEdit}
                                    onChanged={onChanged}
                                    record={record}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
