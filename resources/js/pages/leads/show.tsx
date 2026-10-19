import { Head, useHttp } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Mail,
    Phone,
    UserRound,
    UserRoundPlus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { usePermission } from '@/hooks/use-permission';
import { dashboard } from '@/routes';
import leadApi from '@/routes/api/leads';
import leads from '@/routes/leads';
import { AddCandidateDialog } from '../candidates/add-candidate-dialog';
import { EditLeadDialog } from './edit-lead-dialog';
import { FollowUpForm, nowForDateTimeInput } from './follow-up-form';

type AssignedUser = {
    id: number | null;
    name: string | null;
    avatar: string | null;
};

type FollowUp = {
    id: number;
    type: string;
    notes: string;
    outcome: string | null;
    follow_up_date: string;
    created_by: AssignedUser | null;
};

type Lead = {
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
    assigned_to: AssignedUser | null;
    candidate: { id: number; name: string } | null;
    follow_ups: FollowUp[];
};

type LeadResponse = { data: Lead };
function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-BD', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function LeadField({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {label}
            </p>
            <p className="text-sm font-medium text-foreground">
                {value || '—'}
            </p>
        </div>
    );
}

export default function LeadShow({ leadId }: { leadId: number }) {
    const { can } = usePermission();
    const { response, submit } = useHttp<Record<string, never>, LeadResponse>(
        leadApi.show(leadId),
        {},
    );
    const [addCandidateOpen, setAddCandidateOpen] = useState(false);

    const loadLead = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load this lead. Please refresh and try again.',
            );
        }
    }, [submit]);

    useEffect(() => {
        void loadLead();
    }, [loadLead]);

    const lead = response?.data;

    if (!lead) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Loading lead details...
            </div>
        );
    }

    return (
        <>
            <Head title={lead.name} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-medium tracking-wider text-primary uppercase">
                            Lead details
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {lead.name}
                            </h1>
                            <Badge
                                variant={
                                    lead.priority === 'High'
                                        ? 'destructive'
                                        : 'secondary'
                                }
                            >
                                {lead.priority} priority
                            </Badge>
                            <Badge variant="outline">{lead.source}</Badge>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <a
                                href={
                                    lead.phone ? `tel:${lead.phone}` : undefined
                                }
                            >
                                <Phone />
                                Call
                            </a>
                        </Button>
                        <EditLeadDialog
                            canEdit={can('lead.edit')}
                            lead={lead}
                            onUpdated={loadLead}
                        />
                        <Button
                            asChild
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                        >
                            <a
                                href={
                                    lead.email
                                        ? `mailto:${lead.email}`
                                        : undefined
                                }
                            >
                                <Mail />
                                Email
                            </a>
                        </Button>
                        {can('candidate.create') && (
                            <Button
                                disabled={Boolean(lead.candidate)}
                                onClick={() => setAddCandidateOpen(true)}
                                title={
                                    lead.candidate
                                        ? 'This lead is already linked to a candidate.'
                                        : undefined
                                }
                                type="button"
                                variant="outline"
                            >
                                <UserRoundPlus />
                                Add as Candidate
                            </Button>
                        )}
                    </div>
                </section>

                <AddCandidateDialog
                    initialData={{
                        lead_id: lead.id,
                        name: lead.name,
                        email: lead.email ?? '',
                        phone: lead.phone ?? '',
                        desired_country: lead.interest_country ?? '',
                        desired_course: lead.interest_course ?? '',
                        desired_intake: lead.interest_intake ?? '',
                        notes: lead.notes ?? '',
                    }}
                    onCreated={loadLead}
                    onOpenChange={setAddCandidateOpen}
                    open={addCandidateOpen}
                    showBulkImport={false}
                    trigger={null}
                />

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead information</CardTitle>
                            <CardDescription>
                                Contact and study preferences for this prospect.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                            <LeadField label="Email" value={lead.email} />
                            <LeadField label="Phone" value={lead.phone} />
                            <LeadField label="Address" value={lead.address} />
                            <LeadField
                                label="Interested country"
                                value={lead.interest_country}
                            />
                            <LeadField
                                label="Interested course"
                                value={lead.interest_course}
                            />
                            <LeadField
                                label="Preferred intake"
                                value={lead.interest_intake}
                            />
                            <LeadField
                                label="Current status"
                                value={lead.status}
                            />
                            <LeadField label="Budget" value={lead.budget} />
                            <LeadField label="Notes" value={lead.notes} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned person</CardTitle>
                            <CardDescription>
                                Responsible for this lead.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-teal-600 text-primary-foreground">
                                    <UserRound className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">
                                        {lead.assigned_to?.name ?? 'Unassigned'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {lead.assigned_to
                                            ? 'Lead owner'
                                            : 'No owner assigned yet'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-4">
                    <div>
                        <p className="text-xs font-medium tracking-wider text-primary uppercase">
                            Activity
                        </p>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Follow-up history
                        </h2>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Add follow-up</CardTitle>
                            <CardDescription>
                                Record the latest interaction with this lead.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FollowUpForm
                                leadId={lead.id}
                                defaultDateTime={nowForDateTimeInput()}
                                onSaved={() => void loadLead()}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            {lead.follow_ups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                    <Clock3 className="size-6" />
                                    <p className="text-sm">
                                        No follow-ups have been recorded yet.
                                    </p>
                                </div>
                            ) : (
                                <ol className="relative space-y-6 border-l border-primary/30 pl-6">
                                    {[...lead.follow_ups]
                                        .sort(
                                            (a, b) =>
                                                new Date(
                                                    b.follow_up_date,
                                                ).getTime() -
                                                new Date(
                                                    a.follow_up_date,
                                                ).getTime(),
                                        )
                                        .map((item) => (
                                            <li
                                                className="relative"
                                                key={item.id}
                                            >
                                                <span className="absolute top-1 -left-[33px] flex size-4 items-center justify-center rounded-full bg-primary ring-4 ring-card">
                                                    <CheckCircle2 className="size-2.5 text-primary-foreground" />
                                                </span>
                                                <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-1.5">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold">
                                                                {item.type}
                                                            </p>
                                                            {item.outcome && (
                                                                <Badge variant="secondary">
                                                                    {
                                                                        item.outcome
                                                                    }
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {item.notes}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            By{' '}
                                                            {item.created_by
                                                                ?.name ??
                                                                'Unknown user'}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                                        <CalendarDays className="size-3.5" />
                                                        {formatDate(
                                                            item.follow_up_date,
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                </ol>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </>
    );
}

LeadShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Leads', href: leads.index() },
        { title: 'Lead details', href: '#' },
    ],
};
