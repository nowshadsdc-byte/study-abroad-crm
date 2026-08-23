import { Head, useHttp } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    Briefcase,
    Calendar,
    CalendarDays,
    Clock,
    FileText,
    GraduationCap,
    Link,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { usePermission } from '@/hooks/use-permission';
import { dashboard } from '@/routes';
import candidateApi from '@/routes/api/candidates';
import { AssignedCounselorDialog } from './components/assigned-counselor-dialog';
import { DocumentsCard } from './components/documents-card';
import { ProgressPipeline } from './components/progress-pipeline';
import { EditCandidateDialog } from './edit-candidate-dialog';

type CandidateResponse = {
    data: any;
};

function CandidateField({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
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

export default function CandidateShow({
    candidateId,
}: {
    candidateId: number;
}) {
    const { can } = usePermission();
    const { response, submit } = useHttp<
        Record<string, never>,
        CandidateResponse
    >(candidateApi.show(candidateId), {});

    const loadCandidate = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load this candidate. Please refresh and try again.',
            );
        }
    }, [submit]);

    useEffect(() => {
        void loadCandidate();
    }, [loadCandidate]);

    const candidate = response?.data;

    if (!candidate) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Loading candidate details...
            </div>
        );
    }

    const completedSteps =
        candidate.progress?.filter(
            (p: any) => p.status === 'Completed' || p.status === 'Skipped',
        ).length || 0;
    const progressPercent = (completedSteps / 6) * 100;

    return (
        <>
            <Head title={candidate.name} />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <section className="flex flex-col gap-6 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                                {candidate.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        {candidate.name}
                                    </h1>
                                    <Badge
                                        variant={
                                            candidate.status === 'Active'
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {candidate.status}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="bg-sky-50"
                                    >
                                        {candidate.current_step}
                                    </Badge>
                                    {candidate.lead_id && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-amber-100 text-amber-800 hover:bg-amber-100"
                                        >
                                            <Link className="mr-1 size-3" />{' '}
                                            From Lead
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    {candidate.desired_country && (
                                        <span>
                                            📍 {candidate.desired_country}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline">
                                <a
                                    href={
                                        candidate.phone
                                            ? `tel:${candidate.phone}`
                                            : undefined
                                    }
                                >
                                    <Phone className="mr-2 size-4" />
                                    Call
                                </a>
                            </Button>
                            <Button
                                asChild
                                className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                            >
                                <a
                                    href={
                                        candidate.email
                                            ? `mailto:${candidate.email}`
                                            : undefined
                                    }
                                >
                                    <Mail className="mr-2 size-4" />
                                    Email
                                </a>
                            </Button>
                            <EditCandidateDialog
                                canEdit={can('candidate.edit')}
                                candidate={candidate}
                                onUpdated={loadCandidate}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">
                                Pipeline Progress
                            </span>
                            <span className="text-muted-foreground">
                                {completedSteps} of 6 steps completed
                            </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    Personal and academic details.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                <CandidateField
                                    label="Date of Birth"
                                    value={
                                        candidate.date_of_birth
                                            ? new Date(
                                                  candidate.date_of_birth,
                                              ).toLocaleDateString()
                                            : '—'
                                    }
                                />
                                <CandidateField
                                    label="Gender"
                                    value={candidate.gender}
                                />
                                <CandidateField
                                    label="Address"
                                    value={candidate.address}
                                />
                                <CandidateField
                                    label="Email"
                                    value={candidate.email}
                                />
                                <CandidateField
                                    label="Phone"
                                    value={candidate.phone}
                                />
                                <CandidateField
                                    label="Education Level"
                                    value={candidate.education_level}
                                />
                                <CandidateField
                                    label="Institution"
                                    value={candidate.institution}
                                />
                                <CandidateField
                                    label="GPA"
                                    value={candidate.gpa}
                                />
                                <CandidateField
                                    label="Passing Year"
                                    value={candidate.passing_year}
                                />
                                <CandidateField
                                    label="IELTS Score"
                                    value={candidate.ielts_score}
                                />
                                <CandidateField
                                    label="Desired Country"
                                    value={candidate.desired_country}
                                />
                                <CandidateField
                                    label="Desired Course"
                                    value={candidate.desired_course}
                                />
                                <CandidateField
                                    label="Desired Intake"
                                    value={candidate.desired_intake}
                                />
                                <CandidateField
                                    label="Notes"
                                    value={candidate.notes}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Processing Pipeline</CardTitle>
                                <CardDescription>
                                    Track application progress and status.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ProgressPipeline
                                    candidateId={candidate.id}
                                    progressRecords={candidate.progress || []}
                                    canEdit={can('candidate.edit')}
                                    onChanged={loadCandidate}
                                />
                            </CardContent>
                        </Card>

                        <DocumentsCard
                            candidateId={candidate.id}
                            documents={candidate.documents || []}
                            canEdit={can('candidate.edit')}
                            onChanged={loadCandidate}
                        />

                        <Card>
                            <CardHeader>
                                <CardTitle>University Applications</CardTitle>
                                <CardDescription>
                                    Opportunities linked to this candidate.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!candidate.applications ||
                                candidate.applications.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No applications created yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {candidate.applications.map(
                                            (app: any) => (
                                                <div
                                                    key={app.id}
                                                    className="flex items-center justify-between rounded-lg border p-3"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {app.opportunity
                                                                ?.university
                                                                ?.name ||
                                                                'Unknown University'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {
                                                                app.opportunity
                                                                    ?.title
                                                            }
                                                        </p>
                                                    </div>
                                                    <Badge>{app.status}</Badge>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Assigned Counselor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                                    <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-teal-600 text-primary-foreground">
                                        <UserRound className="size-5" />
                                    </div>
                                    <div>
                                        <AssignedCounselorDialog
                                            assignedTo={candidate.assigned_to}
                                            candidateId={candidate.id}
                                            canEdit={can('candidate.edit')}
                                            onUpdated={loadCandidate}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {candidate.assigned_to
                                                ? candidate.assigned_to
                                                      .job_title || 'Counselor'
                                                : 'No counselor assigned'}
                                        </p>
                                        {candidate.assigned_to?.email && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {candidate.assigned_to.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Invoices</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!candidate.invoices ||
                                candidate.invoices.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No invoices generated.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {candidate.invoices.map((inv: any) => (
                                            <div
                                                key={inv.id}
                                                className="flex items-center justify-between rounded bg-muted/20 p-2 text-sm"
                                            >
                                                <div>
                                                    <a
                                                        href={`/finance/${inv.id}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {inv.invoice_number}
                                                    </a>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(
                                                            inv.issue_date,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">
                                                        ৳
                                                        {parseFloat(
                                                            inv.total,
                                                        ).toLocaleString()}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        {inv.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {candidate.lead && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Lead Source</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <CandidateField
                                        label="Original Source"
                                        value={candidate.lead.source}
                                    />
                                    <CandidateField
                                        label="Lead Notes"
                                        value={candidate.lead.notes}
                                    />
                                </CardContent>
                            </Card>
                        )}

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
                                            candidate.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Last updated
                                    </span>
                                    <span>
                                        {formatDistanceToNow(
                                            new Date(candidate.updated_at),
                                            { addSuffix: true },
                                        )}
                                    </span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <FileText className="size-3" />{' '}
                                        Documents
                                    </span>
                                    <span>
                                        {candidate.documents?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <GraduationCap className="size-3" />{' '}
                                        Applications
                                    </span>
                                    <span>
                                        {candidate.applications?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Briefcase className="size-3" />{' '}
                                        Invoices
                                    </span>
                                    <span>
                                        {candidate.invoices?.length || 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

CandidateShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Candidates', href: '/candidates' },
        { title: 'Candidate profile', href: '#' },
    ],
};
