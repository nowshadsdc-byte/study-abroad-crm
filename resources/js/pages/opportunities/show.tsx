import { Head, router, useHttp } from '@inertiajs/react';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import {
    Award,
    Building2,
    CalendarClock,
    CalendarDays,
    ClipboardList,
    ListChecks,
    Trash2,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableFeatures } from '@/components/data-table/table-features';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { UniversityAvatar } from '@/components/university-avatar';
import { usePermission } from '@/hooks/use-permission';
import { CURRENCY_SYMBOL, getCountryFlag } from '@/lib/constants';
import { getDeadlineStatus } from '@/lib/deadline';
import { dashboard } from '@/routes';
import opportunityApi from '@/routes/api/opportunities';
import opportunitiesRoute from '@/routes/opportunities';
import universitiesRoute from '@/routes/universities';
import { EditOpportunityDialog } from './edit-opportunity-dialog';
import type { EditableOpportunity } from './edit-opportunity-dialog';

type ApplicationRow = {
    id: number;
    candidate: { id: number; name: string } | null;
    status: string;
    applied_at: string;
};

type Opportunity = {
    id: number;
    title: string;
    program: string | null;
    level: string | null;
    intake: string | null;
    deadline: string | null;
    tuition_fee: string | null;
    currency: string | null;
    scholarship: string | null;
    requirements: string | null;
    status: string;
    university_id: number;
    university: {
        id: number;
        name: string;
        country: string | null;
        city: string | null;
        logo_url: string | null;
    } | null;
    applications: ApplicationRow[];
    applications_count: number;
    created_at: string;
    updated_at: string;
};

type OpportunityResponse = { data: Opportunity };

const statusTone: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    Open: 'default',
    Limited: 'secondary',
    Closed: 'destructive',
    Draft: 'outline',
    Submitted: 'secondary',
    'Under Review': 'secondary',
    Accepted: 'default',
    Rejected: 'destructive',
    Waitlisted: 'outline',
};

const columnHelper = createColumnHelper<DataTableFeatures, ApplicationRow>();

const applicationColumns = columnHelper.columns([
    columnHelper.display({
        id: 'candidate',
        header: 'Candidate',
        cell: (props) => (
            <span className="font-medium text-foreground">
                {props.row.original.candidate?.name ?? 'Unknown candidate'}
            </span>
        ),
    }),
    columnHelper.accessor('applied_at', {
        header: 'Applied',
        sortFn: 'alphanumeric',
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.accessor('status', {
        header: 'Status',
        sortFn: 'alphanumeric',
        cell: (info) => {
            const value = info.getValue();

            return (
                <Badge variant={statusTone[value] ?? 'outline'}>{value}</Badge>
            );
        },
    }),
]);

export default function OpportunityShow({
    opportunityId,
}: {
    opportunityId: number;
}) {
    const { can } = usePermission();
    const { response, submit } = useHttp<
        Record<string, never>,
        OpportunityResponse
    >(opportunityApi.show(opportunityId), {});
    const destroyRequest = useHttp<Record<string, never>>(
        opportunityApi.destroy(opportunityId),
        {},
    );
    const [deleteOpen, setDeleteOpen] = useState(false);

    const loadOpportunity = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load this program. Please refresh and try again.',
            );
        }
    }, [submit]);

    useEffect(() => {
        void loadOpportunity();
    }, [loadOpportunity]);

    const handleDelete = async (): Promise<void> => {
        try {
            await destroyRequest.submit();
            toast.success('Program deleted.');
            router.visit(opportunitiesRoute.index());
        } catch {
            toast.error('Unable to delete this program.');
        }
    };

    const opportunity = response?.data;

    if (!opportunity) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Loading program details...
            </div>
        );
    }

    const deadlineStatus = getDeadlineStatus(opportunity.deadline);
    const currencySymbol = opportunity.currency
        ? (CURRENCY_SYMBOL[opportunity.currency] ?? `${opportunity.currency} `)
        : '';
    const requirements = (opportunity.requirements ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const editableOpportunity: EditableOpportunity = {
        id: opportunity.id,
        university_id: opportunity.university_id,
        title: opportunity.title,
        program: opportunity.program,
        level: opportunity.level,
        intake: opportunity.intake,
        deadline: opportunity.deadline,
        tuition_fee: opportunity.tuition_fee,
        currency: opportunity.currency,
        scholarship: opportunity.scholarship,
        requirements: opportunity.requirements,
        status: opportunity.status,
    };

    return (
        <>
            <Head title={opportunity.title} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-medium tracking-wider text-primary uppercase">
                            Program details
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {opportunity.title}
                            </h1>
                            <Badge
                                variant={
                                    statusTone[opportunity.status] ?? 'outline'
                                }
                            >
                                {opportunity.status}
                            </Badge>
                            {opportunity.level && (
                                <Badge variant="secondary">
                                    {opportunity.level}
                                </Badge>
                            )}
                        </div>
                        {opportunity.university && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span>
                                    {getCountryFlag(
                                        opportunity.university.country,
                                    )}
                                </span>
                                {opportunity.university.name}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {opportunity.university && (
                            <Button
                                onClick={() =>
                                    router.visit(
                                        universitiesRoute.show(
                                            opportunity.university!.id,
                                        ),
                                    )
                                }
                                type="button"
                                variant="outline"
                            >
                                <Building2 />
                                View University
                            </Button>
                        )}
                        <EditOpportunityDialog
                            canEdit={can('opportunity.edit')}
                            onUpdated={loadOpportunity}
                            opportunity={editableOpportunity}
                        />
                        {can('opportunity.delete') && (
                            <Button
                                onClick={() => setDeleteOpen(true)}
                                type="button"
                                variant="outline"
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        )}
                    </div>
                </section>

                <DeleteConfirmDialog
                    description={`This will permanently delete "${opportunity.title}" and all related candidate applications. This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onOpenChange={setDeleteOpen}
                    open={deleteOpen}
                    title="Delete this program?"
                />

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Program information</CardTitle>
                                <CardDescription>
                                    Everything a candidate needs to know before
                                    applying.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                            Program
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {opportunity.program || '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                            Level
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {opportunity.level || '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                            Intake
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {opportunity.intake || '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                            Application deadline
                                        </p>
                                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <CalendarDays className="size-3.5 text-muted-foreground" />
                                            {opportunity.deadline
                                                ? new Date(
                                                      opportunity.deadline,
                                                  ).toLocaleDateString()
                                                : '—'}
                                            {deadlineStatus && (
                                                <Badge
                                                    className={
                                                        deadlineStatus.className
                                                    }
                                                    variant="outline"
                                                >
                                                    <CalendarClock className="size-3" />
                                                    {deadlineStatus.label}
                                                </Badge>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        <Award className="size-3.5" />
                                        Scholarship
                                    </p>
                                    <p className="text-sm text-foreground">
                                        {opportunity.scholarship ||
                                            'No scholarship information provided.'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <p className="flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        <ListChecks className="size-3.5" />
                                        Requirements
                                    </p>
                                    {requirements.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No requirements listed.
                                        </p>
                                    ) : (
                                        <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                                            {requirements.map(
                                                (requirement, index) => (
                                                    <li
                                                        key={`${requirement}-${index}`}
                                                    >
                                                        {requirement}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardList className="size-4" />
                                    Applications (
                                    {opportunity.applications_count})
                                </CardTitle>
                                <CardDescription>
                                    Candidates who have applied to this program.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DataTable
                                    columns={applicationColumns}
                                    data={opportunity.applications}
                                    emptyMessage="No applications yet."
                                    searchPlaceholder="Search applications..."
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>University information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {opportunity.university ? (
                                    <button
                                        className="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50"
                                        onClick={() =>
                                            router.visit(
                                                universitiesRoute.show(
                                                    opportunity.university!.id,
                                                ),
                                            )
                                        }
                                        type="button"
                                    >
                                        <UniversityAvatar
                                            logoUrl={
                                                opportunity.university.logo_url
                                            }
                                            name={opportunity.university.name}
                                            size="md"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {opportunity.university.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {getCountryFlag(
                                                    opportunity.university
                                                        .country,
                                                )}{' '}
                                                {[
                                                    opportunity.university.city,
                                                    opportunity.university
                                                        .country,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                        </div>
                                    </button>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No university linked.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Tuition & Fees</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Tuition
                                    </span>
                                    <span className="font-medium">
                                        {opportunity.tuition_fee
                                            ? `${currencySymbol}${Number(opportunity.tuition_fee).toLocaleString()}`
                                            : 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Currency
                                    </span>
                                    <span className="font-medium">
                                        {opportunity.currency || '—'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Timeline</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Created
                                    </span>
                                    <span>
                                        {new Date(
                                            opportunity.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Last updated
                                    </span>
                                    <span>
                                        {formatDistanceToNow(
                                            new Date(opportunity.updated_at),
                                            { addSuffix: true },
                                        )}
                                    </span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Users className="size-3" />
                                        Applications
                                    </span>
                                    <span>
                                        {opportunity.applications_count}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>
        </>
    );
}

OpportunityShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Opportunities', href: opportunitiesRoute.index() },
        { title: 'Program details', href: '#' },
    ],
};
