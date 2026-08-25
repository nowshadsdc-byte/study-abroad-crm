import { Head, router, useHttp } from '@inertiajs/react';
import { Briefcase, Clock, ContactRound, UserX } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { CrmListPage } from '@/components/crm-list-page';
import { DataTable } from '@/components/data-table/data-table';
import type { PaginationMeta } from '@/components/data-table/data-table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import candidateApi from '@/routes/api/candidates';
import { AddCandidateDialog } from './add-candidate-dialog';
import { candidateColumns } from './columns';
import type { CandidateRow } from './columns';

type CandidateApiRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    desired_course: string | null;
    desired_country: string | null;
    current_step: string;
    status: string;
    invoices_count: number;
    created_at: string;
    assigned_to: { name: string | null; avatar: string | null } | null;
};

type CandidatesResponse = {
    data: CandidateApiRow[];
    status_counts: Record<string, number>;
    meta: PaginationMeta;
};

type CandidateFilters = {
    status: string;
    page?: number;
    search?: string;
};

function initialCandidateFilters(): CandidateFilters {
    if (typeof window === 'undefined') {
        return { status: '', page: 1 };
    }

    const searchParams = new URLSearchParams(window.location.search);

    return {
        status: searchParams.get('status') ?? '',
        page: searchParams.has('page') ? Number(searchParams.get('page')) : 1,
    };
}

function mapCandidateRow(candidate: CandidateApiRow): CandidateRow {
    return {
        id: candidate.id,
        avatar: candidate.assigned_to?.avatar ?? null,
        name: candidate.name,
        email: candidate.email ?? '—',
        phone: candidate.phone ?? '—',
        desiredCourse: candidate.desired_course ?? '—',
        desiredCountry: candidate.desired_country ?? '—',
        currentStep: candidate.current_step,
        status: candidate.status,
        assignee: candidate.assigned_to?.name ?? 'Unassigned',
        invoiceCount: candidate.invoices_count ?? 0,
        createdAt: candidate.created_at,
    };
}

function useDebouncedEffect(
    callback: () => void,
    deps: unknown[],
    delay: number,
): void {
    useEffect(() => {
        const handle = setTimeout(callback, delay);

        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default function CandidatesIndex() {
    const {
        data: filters,
        response,
        setData: setFilters,
        submit,
    } = useHttp<CandidateFilters, CandidatesResponse>(
        candidateApi.index(),
        initialCandidateFilters(),
    );

    const loadCandidates = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load candidates. Please refresh the page and try again.',
            );
        }
    }, [submit]);

    useDebouncedEffect(
        () => {
            void loadCandidates();
        },
        [filters],
        300,
    );

    const candidateRows = response?.data.map(mapCandidateRow) ?? [];
    const counts = response?.status_counts ?? {};

    const setStatusFilter = (status: string): void => {
        setFilters((current) => ({
            ...current,
            status: current.status === status ? '' : status,
            page: 1,
        }));
    };

    const setSearchFilter = (search: string): void => {
        setFilters((current) => ({
            ...current,
            search,
            page: 1,
        }));
    };

    return (
        <>
            <Head title="Candidates" />
            <CrmListPage
                description="Manage the full lifecycle of student applicants."
                headerAction={<AddCandidateDialog onCreated={loadCandidates} />}
                metrics={[
                    {
                        label: 'Active Candidates',
                        value: String(counts['Active'] ?? 0),
                        detail: 'Currently processing',
                        icon: ContactRound,
                        tone: 'bg-primary/10 text-primary',
                    },
                    {
                        label: 'On Hold',
                        value: String(counts['On Hold'] ?? 0),
                        detail: 'Awaiting action',
                        icon: Clock,
                        tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    },
                    {
                        label: 'Completed',
                        value: String(counts['Completed'] ?? 0),
                        detail: 'Successfully enrolled',
                        icon: Briefcase,
                        tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                    },
                    {
                        label: 'Withdrawn',
                        value: String(counts['Withdrawn'] ?? 0),
                        detail: 'Applications cancelled',
                        icon: UserX,
                        tone: 'bg-destructive/10 text-destructive',
                    },
                ]}
                title="Candidates"
            />

            <div className="-mt-2 flex flex-wrap gap-2 px-4 sm:px-6">
                {['Active', 'On Hold', 'Completed', 'Withdrawn'].map(
                    (status) => (
                        <button
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                filters.status === status
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-accent'
                            }`}
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            type="button"
                        >
                            {status}
                        </button>
                    ),
                )}
            </div>

            <div className="px-4 pb-6 sm:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Candidates directory</CardTitle>
                        <CardDescription>
                            Search, sort, and manage every student in the
                            pipeline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={candidateColumns}
                            data={candidateRows}
                            emptyMessage="No candidates match your search."
                            onRowClick={(candidate) => {
                                router.visit(`/candidates/${candidate.id}`);
                            }}
                            searchPlaceholder="Search candidates by name, contact, or interest..."
                            meta={response?.meta}
                            onPageChange={(page) =>
                                setFilters((current) => ({ ...current, page }))
                            }
                            search={filters.search}
                            onSearchChange={setSearchFilter}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CandidatesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Candidates', href: '/candidates' },
    ],
};
