import { Head, useHttp } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Download,
    Eye,
    FileCheck2,
    FileText,
    GraduationCap,
    Languages,
    Mail,
    Phone,
    Search,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboard } from '@/routes';
import candidateApi from '@/routes/api/candidates';
import documentsApi from '@/routes/api/documents';
import documents from '@/routes/documents';

type DocumentSummary = {
    label: string;
    total: number;
    verified: number;
    percent: number;
};

type CandidateDocuments = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    documents_count: number;
    verified_documents_count: number;
};

type CandidateDocumentFile = {
    id: number;
    name: string;
    type: string;
    status: string;
    uploaded_at: string;
};

type DocumentsResponse = {
    data: CandidateDocuments[];
    summary: DocumentSummary[];
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        per_page: number;
        to: number | null;
        total: number;
    };
};

type DocumentsFilters = {
    search: string;
    page: number;
    per_page: number;
};

const summaryIcons = [ShieldCheck, GraduationCap, BriefcaseBusiness, Languages];

function initialFilters(): DocumentsFilters {
    if (typeof window === 'undefined') {
        return { search: '', page: 1, per_page: 9 };
    }

    const params = new URLSearchParams(window.location.search);

    return {
        search: params.get('search') ?? '',
        page: Number(params.get('page') ?? 1),
        per_page: 9,
    };
}

function SummaryCard({
    summary,
    Icon,
}: {
    summary: DocumentSummary;
    Icon: (typeof summaryIcons)[number];
}) {
    return (
        <Card className="min-w-0">
            <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-muted-foreground">
                        {summary.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                        {summary.verified} / {summary.total}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                        Approved documents
                    </p>
                </div>
                <div
                    role="meter"
                    aria-label={`${summary.label} approval`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={summary.percent}
                    className="grid size-10 shrink-0 place-items-center rounded-full p-0.75"
                    style={{
                        background: `conic-gradient(var(--primary) ${summary.percent}%, var(--muted) ${summary.percent}% 100%)`,
                    }}
                >
                    <span className="grid size-full place-items-center rounded-full bg-card text-[10px] font-semibold tabular-nums">
                        {summary.percent}%
                    </span>
                </div>
                <Icon className="hidden size-4 text-muted-foreground sm:block" />
            </CardContent>
        </Card>
    );
}

function CandidateCard({
    candidate,
    onViewDocuments,
}: {
    candidate: CandidateDocuments;
    onViewDocuments: (candidate: CandidateDocuments) => void;
}) {
    const percent =
        candidate.documents_count > 0
            ? Math.round(
                  (candidate.verified_documents_count /
                      candidate.documents_count) *
                      100,
              )
            : 0;

    return (
        <Card className="min-w-0 transition-colors hover:border-primary/40">
            <CardContent className="flex h-full flex-col p-3 sm:p-4">
                <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {candidate.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold">
                            {candidate.name}
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            CG-{String(candidate.id).padStart(6, '0')}
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        {candidate.documents_count} docs
                    </span>
                </div>

                <div className="mt-3 grid gap-1.5 border-y py-3 text-xs text-muted-foreground">
                    {candidate.phone && (
                        <p className="flex min-w-0 items-center gap-2">
                            <Phone className="size-3 shrink-0" />
                            <span className="truncate">{candidate.phone}</span>
                        </p>
                    )}
                    {candidate.email && (
                        <p className="flex min-w-0 items-center gap-2">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{candidate.email}</span>
                        </p>
                    )}
                </div>

                <div className="mt-auto pt-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted-foreground">
                            {candidate.verified_documents_count} of{' '}
                            {candidate.documents_count} approved
                        </span>
                        <span className="font-medium tabular-nums">
                            {percent}%
                        </span>
                    </div>
                    <div
                        role="progressbar"
                        aria-label={`${candidate.name} approved documents`}
                        aria-valuemin={0}
                        aria-valuemax={candidate.documents_count}
                        aria-valuenow={candidate.verified_documents_count}
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                    >
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-[width]"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        onClick={() => onViewDocuments(candidate)}
                    >
                        <FileCheck2 className="size-3.5" />
                        View Documents
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DocumentsIndex() {
    const [loadFailed, setLoadFailed] = useState(false);
    const [selectedCandidate, setSelectedCandidate] =
        useState<CandidateDocuments | null>(null);
    const [candidateDocuments, setCandidateDocuments] = useState<
        CandidateDocumentFile[]
    >([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsFailed, setDetailsFailed] = useState(false);
    const candidateDetails = useHttp<
        Record<string, never>,
        { data: { documents: CandidateDocumentFile[] } }
    >({});
    const {
        data: filters,
        response,
        processing,
        setData: setFilters,
        submit,
    } = useHttp<DocumentsFilters, DocumentsResponse>(
        documentsApi.index(),
        initialFilters(),
    );

    const loadDocuments = useCallback(async (): Promise<void> => {
        try {
            await submit();
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
            toast.error('Unable to load documents. Please try again.');
        }
    }, [submit]);

    const openCandidateDocuments = async (
        candidate: CandidateDocuments,
    ): Promise<void> => {
        setSelectedCandidate(candidate);
        setCandidateDocuments([]);
        setDetailsLoading(true);
        setDetailsFailed(false);

        try {
            const result = await candidateDetails.get(
                candidateApi.show(candidate.id).url,
            );
            setCandidateDocuments(result?.data.documents ?? []);
        } catch {
            setDetailsFailed(true);
            toast.error('Unable to load this candidate’s documents.');
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            void loadDocuments();
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [filters, loadDocuments]);

    const summaries = response?.summary ?? [];
    const candidatesWithDocuments = response?.data ?? [];

    return (
        <>
            <Head title="Documents" />
            <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
                <header className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">
                            Students
                        </p>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Documents
                        </h1>
                    </div>
                </header>

                <section
                    aria-label="Document approval summaries"
                    className="grid grid-cols-2 gap-3 xl:grid-cols-4"
                >
                    {summaries.length > 0
                        ? summaries.map((summary, index) => (
                              <SummaryCard
                                  key={summary.label}
                                  summary={summary}
                                  Icon={summaryIcons[index] ?? FileCheck2}
                              />
                          ))
                        : Array.from({ length: 4 }, (_, index) => (
                              <Skeleton
                                  key={index}
                                  className="h-22 w-full rounded-lg"
                              />
                          ))}
                </section>

                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label="Search candidate documents"
                        className="h-11 bg-card pl-9"
                        onChange={(event) =>
                            setFilters((current) => ({
                                ...current,
                                search: event.target.value,
                                page: 1,
                            }))
                        }
                        placeholder="Search by student name, phone, email, or document..."
                        value={filters.search}
                    />
                </div>

                {response && (
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <p>
                            Showing {response.meta.from ?? 0}–
                            {response.meta.to ?? 0} of {response.meta.total}{' '}
                            students with uploaded documents
                        </p>
                        {processing && <span>Updating…</span>}
                    </div>
                )}

                {!response && !loadFailed ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 4 }, (_, index) => (
                            <Skeleton
                                key={index}
                                className="h-22 w-full rounded-lg"
                            />
                        ))}
                    </div>
                ) : loadFailed ? (
                    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card px-6 text-center">
                        <FileCheck2 className="size-6 text-muted-foreground" />
                        <p className="text-sm font-medium">
                            Documents couldn&apos;t be loaded
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void loadDocuments()}
                            disabled={processing}
                        >
                            Try again
                        </Button>
                    </div>
                ) : candidatesWithDocuments.length > 0 ? (
                    <section
                        aria-label="Candidates with documents"
                        aria-busy={processing}
                        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    >
                        {candidatesWithDocuments.map((candidate) => (
                            <CandidateCard
                                key={candidate.id}
                                candidate={candidate}
                                onViewDocuments={(selected) =>
                                    void openCandidateDocuments(selected)
                                }
                            />
                        ))}
                    </section>
                ) : (
                    <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card px-6 text-center">
                        <Users className="size-6 text-muted-foreground" />
                        <p className="text-sm font-medium">
                            {filters.search
                                ? 'No matching documents'
                                : 'No uploaded documents yet'}
                        </p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                            {filters.search
                                ? 'Try a different name, phone number, email, or document name.'
                                : 'Uploaded candidate documents will appear here.'}
                        </p>
                    </div>
                )}

                {response && response.meta.last_page > 1 && (
                    <nav
                        aria-label="Document search pages"
                        className="flex items-center justify-between border-t pt-3"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                                response.meta.current_page <= 1 || processing
                            }
                            onClick={() =>
                                setFilters((current) => ({
                                    ...current,
                                    page: current.page - 1,
                                }))
                            }
                        >
                            <ArrowLeft className="size-4" />
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {response.meta.current_page} of{' '}
                            {response.meta.last_page}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                                response.meta.current_page >=
                                    response.meta.last_page || processing
                            }
                            onClick={() =>
                                setFilters((current) => ({
                                    ...current,
                                    page: current.page + 1,
                                }))
                            }
                        >
                            Next
                            <ArrowRight className="size-4" />
                        </Button>
                    </nav>
                )}

                <Dialog
                    open={selectedCandidate !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedCandidate(null);
                            setCandidateDocuments([]);
                            setDetailsFailed(false);
                        }
                    }}
                >
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedCandidate?.name}&apos;s documents
                            </DialogTitle>
                            <DialogDescription>
                                {candidateDocuments.length} of{' '}
                                {selectedCandidate?.documents_count ?? 0}{' '}
                                documents, with{' '}
                                {selectedCandidate?.verified_documents_count ??
                                    0}{' '}
                                verified.
                            </DialogDescription>
                        </DialogHeader>

                        {detailsLoading ? (
                            <div className="grid gap-2">
                                <Skeleton className="h-16 w-full rounded-md" />
                                <Skeleton className="h-16 w-full rounded-md" />
                                <Skeleton className="h-16 w-full rounded-md" />
                            </div>
                        ) : detailsFailed ? (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Documents could not be loaded.
                                </p>
                                {selectedCandidate && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            void openCandidateDocuments(
                                                selectedCandidate,
                                            )
                                        }
                                    >
                                        Try again
                                    </Button>
                                )}
                            </div>
                        ) : candidateDocuments.length > 0 ? (
                            <div className="divide-y rounded-md border">
                                {candidateDocuments.map((document) => (
                                    <div
                                        key={document.id}
                                        className="flex flex-wrap items-center justify-between gap-3 p-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                                                <FileText className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {document.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {document.type} · Uploaded{' '}
                                                    {new Date(
                                                        document.uploaded_at,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Badge
                                                variant={
                                                    document.status ===
                                                    'Verified'
                                                        ? 'default'
                                                        : document.status ===
                                                            'Rejected'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {document.status}
                                            </Badge>
                                            {selectedCandidate && (
                                                <>
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Preview ${document.name}`}
                                                    >
                                                        <a
                                                            href={
                                                                candidateApi.documents.preview(
                                                                    [
                                                                        selectedCandidate.id,
                                                                        document.id,
                                                                    ],
                                                                ).url
                                                            }
                                                            rel="noreferrer"
                                                            target="_blank"
                                                        >
                                                            <Eye className="size-4" />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Download ${document.name}`}
                                                    >
                                                        <a
                                                            href={
                                                                candidateApi.documents.download(
                                                                    [
                                                                        selectedCandidate.id,
                                                                        document.id,
                                                                    ],
                                                                ).url
                                                            }
                                                        >
                                                            <Download className="size-4" />
                                                        </a>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <FileText className="size-6 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    No documents are attached to this candidate.
                                </p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </>
    );
}

DocumentsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Documents', href: documents.index() },
    ],
};
