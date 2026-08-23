import { Head, router, useHttp } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    CalendarClock,
    CalendarDays,
    Globe,
    GraduationCap,
    Plus,
    Trash2,
    Trophy,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import universityApi from '@/routes/api/universities';
import opportunitiesRoute from '@/routes/opportunities';
import { AddOpportunityDialog } from '../opportunities/add-opportunity-dialog';
import { EditUniversityDialog } from './edit-university-dialog';
import type { EditableUniversity } from './edit-university-dialog';

type OpportunitySummary = {
    id: number;
    title: string;
    program: string | null;
    level: string | null;
    intake: string | null;
    deadline: string | null;
    tuition_fee: string | null;
    currency: string | null;
    status: string;
    applications_count: number;
};

type University = {
    id: number;
    name: string;
    country: string;
    city: string | null;
    website: string | null;
    ranking: number | null;
    logo_url: string | null;
    description: string | null;
    programs: string[];
    is_active: boolean;
    opportunities: OpportunitySummary[];
    opportunities_count: number;
    created_at: string;
    updated_at: string;
};

type UniversityResponse = { data: University };

const statusTone: Record<string, string> = {
    Open: 'bg-primary/10 text-primary',
    Limited: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Closed: 'bg-destructive/10 text-destructive',
};

export default function UniversityShow({
    universityId,
}: {
    universityId: number;
}) {
    const { can } = usePermission();
    const { response, submit } = useHttp<
        Record<string, never>,
        UniversityResponse
    >(universityApi.show(universityId), {});
    const destroyRequest = useHttp<Record<string, never>>(
        universityApi.destroy(universityId),
        {},
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [addOpportunityOpen, setAddOpportunityOpen] = useState(false);

    const loadUniversity = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load this university. Please refresh and try again.',
            );
        }
    }, [submit]);

    useEffect(() => {
        void loadUniversity();
    }, [loadUniversity]);

    const handleDelete = async (): Promise<void> => {
        try {
            await destroyRequest.submit();
            toast.success('University deleted.');
            router.visit(`${opportunitiesRoute.index()}?tab=universities`);
        } catch {
            toast.error('Unable to delete this university.');
        }
    };

    const university = response?.data;

    if (!university) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Loading university details...
            </div>
        );
    }

    const editableUniversity: EditableUniversity = {
        id: university.id,
        name: university.name,
        country: university.country,
        city: university.city,
        website: university.website,
        ranking: university.ranking,
        logo_url: university.logo_url,
        description: university.description,
        programs: university.programs,
        is_active: university.is_active,
    };

    const openOpportunities = university.opportunities.filter(
        (opportunity) => opportunity.status === 'Open',
    ).length;
    const totalApplications = university.opportunities.reduce(
        (total, opportunity) => total + opportunity.applications_count,
        0,
    );

    return (
        <>
            <Head title={university.name} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <UniversityAvatar
                            logoUrl={university.logo_url}
                            name={university.name}
                            size="lg"
                        />
                        <div className="space-y-1">
                            <p className="text-xs font-medium tracking-wider text-primary uppercase">
                                University details
                            </p>
                            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
                                {university.name}
                                {!university.is_active && (
                                    <Badge variant="secondary">Inactive</Badge>
                                )}
                            </h1>
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span>
                                    {getCountryFlag(university.country)}
                                </span>
                                {[university.city, university.country]
                                    .filter(Boolean)
                                    .join(', ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <EditUniversityDialog
                            canEdit={can('opportunity.edit')}
                            onUpdated={loadUniversity}
                            university={editableUniversity}
                        />
                        {can('opportunity.create') && (
                            <Button
                                onClick={() => setAddOpportunityOpen(true)}
                                type="button"
                                variant="outline"
                            >
                                <Plus />
                                Add Opportunity
                            </Button>
                        )}
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

                <AddOpportunityDialog
                    initialData={{ university_id: university.id }}
                    onCreated={loadUniversity}
                    onOpenChange={setAddOpportunityOpen}
                    open={addOpportunityOpen}
                    showBulkImport={false}
                    trigger={null}
                />
                <DeleteConfirmDialog
                    description={`This will permanently delete "${university.name}" along with all of its programs and related candidate applications. This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onOpenChange={setDeleteOpen}
                    open={deleteOpen}
                    title="Delete this university?"
                />

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>About</CardTitle>
                                <CardDescription>
                                    {university.description ||
                                        'No description provided.'}
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Programs offered</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {university.programs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No programs listed.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {university.programs.map((program) => (
                                            <Badge
                                                key={program}
                                                variant="secondary"
                                            >
                                                {program}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCap className="size-4" />
                                    Opportunities (
                                    {university.opportunities_count})
                                </CardTitle>
                                <CardDescription>
                                    Programs available under this university.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {university.opportunities.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No opportunities created yet.
                                    </p>
                                ) : (
                                    university.opportunities.map(
                                        (opportunity) => {
                                            const deadlineStatus =
                                                getDeadlineStatus(
                                                    opportunity.deadline,
                                                );
                                            const currencySymbol =
                                                opportunity.currency
                                                    ? (CURRENCY_SYMBOL[
                                                          opportunity.currency
                                                      ] ??
                                                      `${opportunity.currency} `)
                                                    : '';

                                            return (
                                                <button
                                                    className="flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                                                    key={opportunity.id}
                                                    onClick={() =>
                                                        router.visit(
                                                            opportunitiesRoute.show(
                                                                opportunity.id,
                                                            ),
                                                        )
                                                    }
                                                    type="button"
                                                >
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {opportunity.title}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {opportunity.level && (
                                                                <Badge variant="secondary">
                                                                    {
                                                                        opportunity.level
                                                                    }
                                                                </Badge>
                                                            )}
                                                            {opportunity.intake && (
                                                                <Badge variant="outline">
                                                                    {
                                                                        opportunity.intake
                                                                    }
                                                                </Badge>
                                                            )}
                                                            <Badge
                                                                className={
                                                                    statusTone[
                                                                        opportunity
                                                                            .status
                                                                    ] ?? ''
                                                                }
                                                                variant="outline"
                                                            >
                                                                {
                                                                    opportunity.status
                                                                }
                                                            </Badge>
                                                            {deadlineStatus && (
                                                                <Badge
                                                                    className={
                                                                        deadlineStatus.className
                                                                    }
                                                                    variant="outline"
                                                                >
                                                                    <CalendarClock className="size-3" />
                                                                    {
                                                                        deadlineStatus.label
                                                                    }
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="font-medium text-foreground">
                                                            {opportunity.tuition_fee
                                                                ? `${currencySymbol}${Number(opportunity.tuition_fee).toLocaleString()}`
                                                                : 'Fee not set'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="size-3.5" />
                                                            {
                                                                opportunity.applications_count
                                                            }
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        },
                                    )
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Country
                                    </span>
                                    <span className="font-medium">
                                        {getCountryFlag(university.country)}{' '}
                                        {university.country}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        City
                                    </span>
                                    <span className="font-medium">
                                        {university.city || '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Trophy className="size-3" />
                                        World ranking
                                    </span>
                                    <span className="font-medium">
                                        {university.ranking
                                            ? `#${university.ranking}`
                                            : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Globe className="size-3" />
                                        Website
                                    </span>
                                    {university.website ? (
                                        <a
                                            className="font-medium text-primary hover:underline"
                                            href={university.website}
                                            rel="noreferrer"
                                            target="_blank"
                                        >
                                            Visit site
                                        </a>
                                    ) : (
                                        <span className="font-medium">—</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Total programs
                                    </span>
                                    <span className="font-medium">
                                        {university.opportunities_count}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Open opportunities
                                    </span>
                                    <span className="font-medium">
                                        {openOpportunities}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Total applications
                                    </span>
                                    <span className="font-medium">
                                        {totalApplications}
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
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <CalendarDays className="size-3" />
                                        Created
                                    </span>
                                    <span>
                                        {new Date(
                                            university.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Last updated
                                    </span>
                                    <span>
                                        {formatDistanceToNow(
                                            new Date(university.updated_at),
                                            { addSuffix: true },
                                        )}
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

UniversityShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Opportunities', href: opportunitiesRoute.index() },
        { title: 'University details', href: '#' },
    ],
};
