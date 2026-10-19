import { useHttp } from '@inertiajs/react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { StudentPicker } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import leadApi from '@/routes/api/leads';
import type { TaskStudent } from '@/types';

export const FOLLOW_UP_TYPES = [
    'Call',
    'Email',
    'Meeting',
    'WhatsApp',
    'Visit',
] as const;

export const FOLLOW_UP_OUTCOMES = [
    'Interested',
    'Not Interested',
    'Callback',
    'Converted',
    'No Response',
] as const;

type FollowUpFormData = {
    lead: TaskStudent | null;
    type: string;
    outcome: string;
    follow_up_date: string;
    next_follow_up_date: string;
    notes: string;
};

/**
 * The current browser time as a `datetime-local` input value.
 */
export function nowForDateTimeInput(): string {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

/**
 * `datetime-local` values carry no zone; send them to the API as UTC instants.
 */
function toUtc(localDateTime: string): string | null {
    return localDateTime ? new Date(localDateTime).toISOString() : null;
}

/**
 * Record a follow-up for a lead. Without a `leadId` the user picks the lead first.
 */
export function FollowUpForm({
    leadId = null,
    defaultDateTime,
    onSaved,
    onCancel,
    showNextFollowUp = false,
}: {
    leadId?: number | null;
    defaultDateTime: string;
    onSaved: () => void;
    onCancel?: () => void;
    showNextFollowUp?: boolean;
}) {
    const form = useHttp<FollowUpFormData>({
        lead: null,
        type: 'Call',
        outcome: 'Callback',
        follow_up_date: defaultDateTime,
        next_follow_up_date: '',
        notes: '',
    });
    const { data, setData, errors, processing } = form;
    const fieldErrors = errors as Partial<Record<string, string>>;
    const targetLeadId = leadId ?? data.lead?.id ?? null;

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (targetLeadId === null) {
            form.setError('lead', 'Choose the lead this follow-up is for.');

            return;
        }

        form.transform((values) => ({
            type: values.type,
            outcome: values.outcome || null,
            follow_up_date: toUtc(values.follow_up_date),
            next_follow_up_date: toUtc(values.next_follow_up_date),
            notes: values.notes,
        }));

        try {
            await form.submit(leadApi.followUps.store(targetLeadId));
            form.reset();
            form.clearErrors();
            toast.success('Follow-up added successfully.');
            onSaved();
        } catch {
            toast.error('Unable to add the follow-up. Please try again.');
        }
    };

    return (
        <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit}
            aria-label="Add follow-up"
            noValidate
        >
            {leadId === null && (
                <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="follow-up-lead">Lead</Label>
                    <StudentPicker
                        inputId="follow-up-lead"
                        types={['lead']}
                        value={data.lead}
                        onChange={(lead) => {
                            setData('lead', lead);
                            form.clearErrors('lead');
                        }}
                        error={fieldErrors.lead}
                    />
                    <InputError
                        message={fieldErrors.lead}
                        className="text-xs"
                    />
                </div>
            )}
            <div className="grid gap-2">
                <Label htmlFor="follow-up-type">Follow-up medium</Label>
                <Select
                    value={data.type}
                    onValueChange={(value) => setData('type', value)}
                >
                    <SelectTrigger className="w-full" id="follow-up-type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FOLLOW_UP_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={fieldErrors.type} className="text-xs" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="follow-up-outcome">Follow-up status</Label>
                <Select
                    value={data.outcome}
                    onValueChange={(value) => setData('outcome', value)}
                >
                    <SelectTrigger className="w-full" id="follow-up-outcome">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FOLLOW_UP_OUTCOMES.map((outcome) => (
                            <SelectItem key={outcome} value={outcome}>
                                {outcome}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={fieldErrors.outcome} className="text-xs" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="follow-up-date">Date</Label>
                <Input
                    aria-invalid={Boolean(fieldErrors.follow_up_date)}
                    id="follow-up-date"
                    onChange={(event) =>
                        setData('follow_up_date', event.target.value)
                    }
                    type="datetime-local"
                    value={data.follow_up_date}
                />
                <InputError
                    message={fieldErrors.follow_up_date}
                    className="text-xs"
                />
            </div>
            {showNextFollowUp && (
                <div className="grid gap-2">
                    <Label htmlFor="next-follow-up-date">
                        Next follow-up (optional)
                    </Label>
                    <Input
                        aria-invalid={Boolean(fieldErrors.next_follow_up_date)}
                        id="next-follow-up-date"
                        min={data.follow_up_date}
                        onChange={(event) =>
                            setData('next_follow_up_date', event.target.value)
                        }
                        type="datetime-local"
                        value={data.next_follow_up_date}
                    />
                    <InputError
                        message={fieldErrors.next_follow_up_date}
                        className="text-xs"
                    />
                </div>
            )}
            <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="follow-up-notes">Follow-up note</Label>
                <Textarea
                    aria-invalid={Boolean(fieldErrors.notes)}
                    className="min-h-24"
                    id="follow-up-notes"
                    onChange={(event) => setData('notes', event.target.value)}
                    placeholder="What was discussed and what happens next?"
                    value={data.notes}
                />
                <InputError message={fieldErrors.notes} className="text-xs" />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button
                    className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                    disabled={processing}
                    type="submit"
                >
                    {processing ? <Spinner /> : <Plus />}
                    {processing ? 'Adding...' : 'Add Follow Up'}
                </Button>
            </div>
        </form>
    );
}
