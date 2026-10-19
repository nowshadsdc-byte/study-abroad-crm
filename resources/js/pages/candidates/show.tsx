import { Head, Link, useHttp } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    GraduationCap,
    Link2,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    UserRound,
    Wallet,
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
import { RecordPaymentDialog } from '@/pages/finance/record-payment-dialog';
import { dashboard } from '@/routes';
import candidateApi from '@/routes/api/candidates';
import { AssignedCounselorDialog } from './components/assigned-counselor-dialog';
import { DocumentsCard } from './components/documents-card';
import { ProgressPipeline } from './components/progress-pipeline';
import { EditCandidateDialog } from './edit-candidate-dialog';

type CandidateResponse = {
    data: any;
};

type InvoiceRecord = {
    id: number;
    invoice_number: string;
    total: string | number;
    balance_due: string | number;
    status: string;
    issue_date: string;
};

function formatMoney(value: string | number): string {
    return `৳${Number(value || 0).toLocaleString('en-IN')}`;
}

function CandidateField({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
}) {
    return (
        <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {label}
            </p>
            <p className="truncate text-sm font-medium text-foreground">
                {value || '—'}
            </p>
        </div>
    );
}

function OverviewField({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
}) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
            <span className="shrink-0 text-xs text-muted-foreground">
                {label}
            </span>
            <span className="truncate text-right text-xs font-medium">
                {value || '—'}
            </span>
        </div>
    );
}

function SummaryMetric({
    icon: Icon,
    label,
    value,
    detail,
}: {
    icon: typeof GraduationCap;
    label: string;
    value: string | number;
    detail: string;
}) {
    return (
        <Card className="min-w-0">
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                        {label}
                    </p>
                    <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums">
                        {value}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                        {detail}
                    </p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                </span>
            </CardContent>
        </Card>
    );
}

export default function CandidateShow({
    candidateId,
}: {
    candidateId: number;
}) {
    const { can } = usePermission();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState<number | null>(
        null,
    );
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

    const applications = candidate.applications ?? [];
    const documents = candidate.documents ?? [];
    const invoices: InvoiceRecord[] = candidate.invoices ?? [];
    const selectedInvoice = invoices.find(
        (invoice) => invoice.id === paymentInvoiceId,
    );
    const nextPaymentInvoice = invoices.find(
        (invoice) => Number(invoice.balance_due) > 0,
    );
    const totalInvoiced = invoices.reduce(
        (total, invoice) => total + Number(invoice.total || 0),
        0,
    );
    const totalOutstanding = invoices.reduce(
        (total, invoice) => total + Number(invoice.balance_due || 0),
        0,
    );
    const verifiedDocuments = documents.filter(
        (document: { status: string }) => document.status === 'Verified',
    ).length;
    const completedSteps =
        candidate.progress?.filter(
            (progress: { status: string }) =>
                progress.status === 'Completed' ||
                progress.status === 'Skipped',
        ).length || 0;
    const progressPercent = (completedSteps / 6) * 100;
    const whatsappNumber = candidate.phone?.replace(/\D/g, '');
    const primaryApplication = applications[0];

    const sections = [
        { href: '#overview', label: 'Overview' },
        { href: '#profile', label: 'Profile' },
        { href: '#applications', label: 'Applications' },
        { href: '#documents', label: 'Documents' },
        { href: '#finances', label: 'Finances & Receipts' },
    ];

    return (
        <>
            <Head title={candidate.name} />
            <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
                <header className="flex flex-col justify-between gap-4 border-b pb-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {candidate.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                                    {candidate.name}
                                </h1>
                                <span className="text-xs font-medium text-muted-foreground">
                                    ID #{candidate.id}
                                </span>
                                <Badge
                                    variant={
                                        candidate.status === 'Active'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {candidate.status}
                                </Badge>
                                <Badge variant="outline">
                                    {candidate.current_step}
                                </Badge>
                                {candidate.lead_id && (
                                    <Badge variant="secondary">
                                        <Link2 className="mr-1 size-3" />
                                        From Lead
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {candidate.phone && (
                                    <span className="inline-flex items-center gap-1">
                                        <Phone className="size-3" />
                                        {candidate.phone}
                                    </span>
                                )}
                                {candidate.email && (
                                    <span className="inline-flex items-center gap-1">
                                        <Mail className="size-3" />
                                        {candidate.email}
                                    </span>
                                )}
                                {candidate.desired_country && (
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="size-3" />
                                        {candidate.desired_country}
                                    </span>
                                )}
                                {candidate.assigned_to?.name && (
                                    <span>
                                        Counselor: {candidate.assigned_to.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {nextPaymentInvoice && can('finance.edit') && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setPaymentInvoiceId(nextPaymentInvoice.id);
                                    setPaymentOpen(true);
                                }}
                            >
                                <Wallet className="size-4" />
                                Record Payment
                            </Button>
                        )}
                        <EditCandidateDialog
                            canEdit={can('candidate.edit')}
                            candidate={candidate}
                            onUpdated={loadCandidate}
                        />
                        {whatsappNumber && (
                            <Button asChild variant="outline">
                                <a
                                    href={`https://wa.me/${whatsappNumber}`}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    <MessageCircle className="size-4" />
                                    WhatsApp
                                </a>
                            </Button>
                        )}
                        {candidate.phone && (
                            <Button asChild variant="outline">
                                <a href={`tel:${candidate.phone}`}>
                                    <Phone className="size-4" />
                                    Call
                                </a>
                            </Button>
                        )}
                        {candidate.email && (
                            <Button asChild variant="outline">
                                <a href={`mailto:${candidate.email}`}>
                                    <Mail className="size-4" />
                                    Email
                                </a>
                            </Button>
                        )}
                    </div>
                </header>

                <nav
                    aria-label="Candidate sections"
                    className="-mb-1 flex gap-5 overflow-x-auto border-b"
                >
                    {sections.map((section, index) => (
                        <a
                            key={section.href}
                            href={section.href}
                            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                                index === 0
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                            }`}
                        >
                            {section.label}
                        </a>
                    ))}
                </nav>

                {selectedInvoice && (
                    <RecordPaymentDialog
                        invoiceId={selectedInvoice.id}
                        total={Number(selectedInvoice.total)}
                        amountPaid={
                            Number(selectedInvoice.total) -
                            Number(selectedInvoice.balance_due)
                        }
                        balanceDue={Number(selectedInvoice.balance_due)}
                        open={paymentOpen}
                        onOpenChange={setPaymentOpen}
                        onRecorded={loadCandidate}
                    />
                )}

                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
                    <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                        <SummaryMetric
                            icon={GraduationCap}
                            label="Applications"
                            value={
                                primaryApplication
                                    ? `${applications.length} ${primaryApplication.status}`
                                    : applications.length
                            }
                            detail={
                                primaryApplication?.opportunity?.university
                                    ?.name ?? 'University applications'
                            }
                        />
                        <SummaryMetric
                            icon={FileText}
                            label="Documents"
                            value={`${documents.length} Uploaded`}
                            detail={`${verifiedDocuments} verified`}
                        />
                        <SummaryMetric
                            icon={Wallet}
                            label="Finances"
                            value={formatMoney(totalInvoiced)}
                            detail={
                                totalOutstanding > 0
                                    ? `${formatMoney(totalOutstanding)} outstanding`
                                    : invoices.length > 0
                                      ? 'Fully paid'
                                      : 'No invoices yet'
                            }
                        />
                    </div>
                    <Card id="overview" className="scroll-mt-24">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-base">
                                Candidate Overview
                            </CardTitle>
                            <EditCandidateDialog
                                canEdit={can('candidate.edit')}
                                candidate={candidate}
                                onUpdated={loadCandidate}
                            />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <OverviewField
                                label="Study Level"
                                value={candidate.education_level}
                            />
                            <OverviewField
                                label="Country"
                                value={candidate.desired_country}
                            />
                            <OverviewField
                                label="City / Location"
                                value={candidate.address}
                            />
                            <OverviewField
                                label="Institution"
                                value={candidate.institution}
                            />
                            <OverviewField
                                label="Enrolled On"
                                value={
                                    candidate.created_at
                                        ? new Date(
                                              candidate.created_at,
                                          ).toLocaleDateString()
                                        : '—'
                                }
                            />
                            <OverviewField
                                label="IELTS Score"
                                value={candidate.ielts_score}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
                    <div className="flex min-w-0 flex-col gap-4">
                        <section id="applications" className="scroll-mt-24">
                            <Card>
                                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                                    <div className="min-w-0">
                                        <CardTitle className="text-base">
                                            Primary Application Journey
                                        </CardTitle>
                                        <CardDescription className="mt-1 truncate">
                                            {primaryApplication?.opportunity
                                                ?.title ||
                                                candidate.desired_course ||
                                                'Application progress and status'}
                                        </CardDescription>
                                    </div>
                                    {candidate.desired_intake && (
                                        <Badge variant="outline">
                                            <CalendarDays className="mr-1 size-3" />
                                            Intake: {candidate.desired_intake}
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <div className="mb-4 flex items-center justify-between gap-3 text-xs">
                                        <span className="truncate text-muted-foreground">
                                            {primaryApplication?.opportunity
                                                ?.university?.name ||
                                                candidate.desired_country ||
                                                'No university selected'}
                                        </span>
                                        <span className="shrink-0 font-medium tabular-nums">
                                            {completedSteps} of 6 complete
                                        </span>
                                    </div>
                                    <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-linear-to-r from-primary to-teal-600 transition-[width]"
                                            style={{
                                                width: `${progressPercent}%`,
                                            }}
                                        />
                                    </div>
                                    <ProgressPipeline
                                        candidateId={candidate.id}
                                        progressRecords={
                                            candidate.progress || []
                                        }
                                        canEdit={can('candidate.edit')}
                                        onChanged={loadCandidate}
                                    />
                                </CardContent>
                            </Card>
                        </section>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Action Items &amp; Follow-ups
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex min-h-16 items-center gap-3 rounded-md border border-dashed px-3 py-3">
                                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                                        <Clock3 className="size-4" />
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        No action items or follow-ups are linked
                                        to this candidate yet.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <section className="scroll-mt-24">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Applications
                                    </CardTitle>
                                    <CardDescription>
                                        University programs linked to this
                                        candidate.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {applications.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                            No applications created yet.
                                        </p>
                                    ) : (
                                        <div className="divide-y">
                                            {applications.map(
                                                (application: any) => (
                                                    <div
                                                        key={application.id}
                                                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                                                <GraduationCap className="size-4" />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">
                                                                    {application
                                                                        .opportunity
                                                                        ?.university
                                                                        ?.name ||
                                                                        'Unknown University'}
                                                                </p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {application
                                                                        .opportunity
                                                                        ?.title ||
                                                                        'Program not selected'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary">
                                                            {application.status}
                                                        </Badge>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        <section id="profile" className="scroll-mt-24">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Profile Information
                                    </CardTitle>
                                    <CardDescription>
                                        Personal, contact and academic details.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                    <CandidateField
                                        label="Email"
                                        value={candidate.email}
                                    />
                                    <CandidateField
                                        label="Phone"
                                        value={candidate.phone}
                                    />
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
                        </section>

                        <section id="documents" className="scroll-mt-24">
                            <DocumentsCard
                                candidateId={candidate.id}
                                documents={documents}
                                canEdit={can('candidate.edit')}
                                onChanged={loadCandidate}
                            />
                        </section>
                    </div>

                    <aside className="flex min-w-0 flex-col gap-4">
                        <section>
                            <DocumentsCard
                                candidateId={candidate.id}
                                documents={documents}
                                canEdit={can('candidate.edit')}
                                onChanged={loadCandidate}
                                compact
                            />
                        </section>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Assigned Counselor
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                        <UserRound className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <AssignedCounselorDialog
                                            assignedTo={candidate.assigned_to}
                                            candidateId={candidate.id}
                                            canEdit={can('candidate.edit')}
                                            onUpdated={loadCandidate}
                                        />
                                        <p className="truncate text-xs text-muted-foreground">
                                            {candidate.assigned_to?.job_title ||
                                                'Counselor'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card id="finances" className="scroll-mt-24">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-base">
                                    Finances & Receipts
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">
                                    {invoices.length} invoices
                                </span>
                            </CardHeader>
                            <CardContent>
                                {invoices.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No invoices generated.
                                    </p>
                                ) : (
                                    <div className="divide-y">
                                        {invoices.map((invoice) => (
                                            <div
                                                key={invoice.id}
                                                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                            >
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/finance/${invoice.id}`}
                                                        className="truncate text-sm font-medium text-primary hover:underline"
                                                    >
                                                        {invoice.invoice_number}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(
                                                            invoice.issue_date,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-medium tabular-nums">
                                                        {formatMoney(
                                                            invoice.total,
                                                        )}
                                                    </p>
                                                    <Badge
                                                        variant={
                                                            Number(
                                                                invoice.balance_due,
                                                            ) > 0
                                                                ? 'outline'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {invoice.status}
                                                    </Badge>
                                                </div>
                                                {Number(invoice.balance_due) >
                                                    0 &&
                                                    can('finance.edit') && (
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            aria-label={`Record payment for ${invoice.invoice_number}`}
                                                            onClick={() => {
                                                                setPaymentInvoiceId(
                                                                    invoice.id,
                                                                );
                                                                setPaymentOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            <ArrowRight className="size-4" />
                                                        </Button>
                                                    )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {candidate.lead && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Lead Source
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
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
                                <CardTitle className="text-base">
                                    Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                                        <Clock3 className="size-3.5" />
                                        Created
                                    </span>
                                    <span>
                                        {new Date(
                                            candidate.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="size-3.5" />
                                        Last updated
                                    </span>
                                    <span>
                                        {formatDistanceToNow(
                                            new Date(candidate.updated_at),
                                            { addSuffix: true },
                                        )}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                                    <div>
                                        <p className="text-sm font-semibold tabular-nums">
                                            {documents.length}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Documents
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold tabular-nums">
                                            {applications.length}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Applications
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold tabular-nums">
                                            {invoices.length}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Invoices
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </main>
        </>
    );
}

CandidateShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Clients', href: '/candidates' },
        { title: 'Client profile', href: '#' },
    ],
};
