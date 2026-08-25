import { Head, router, useHttp } from '@inertiajs/react';
import { Activity, Clock, Sparkles, Target, Users } from 'lucide-react';
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
import leadApi from '@/routes/api/leads';
import { AddLeadDialog } from './add-lead-dialog';
import { leadColumns } from './columns';
import type { LeadRow } from './columns';

type LeadApiRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    source: string;
    course_interest: string | null;
    country_interest: string | null;
    score: number;
    status: string;
    last_contact_date: string | null;
    created_at: string;
    assigned_to: { name: string | null; avatar: string | null } | null;
};

type LeadMetrics = {
    newThisWeek: { value: string; detail: string };
    followUps: { value: string; detail: string };
    qualified: { value: string; detail: string };
    pipeline: { value: string; detail: string };
};

type LeadsResponse = {
    data: LeadApiRow[];
    status_counts: Record<string, number>;
    metrics: LeadMetrics;
    meta: PaginationMeta;
};

type LeadFilters = {
    status: string;
    page?: number;
    search?: string;
};

function initialLeadFilters(): LeadFilters {
    if (typeof window === 'undefined') {
        return { status: '', page: 1 };
    }

    const searchParams = new URLSearchParams(window.location.search);

    return {
        status: searchParams.get('status') ?? '',
        page: searchParams.has('page') ? Number(searchParams.get('page')) : 1,
    };
}

function mapLeadRow(lead: LeadApiRow): LeadRow {
    return {
        id: lead.id,
        name: lead.name,
        email: lead.email ?? '—',
        phone: lead.phone ?? '—',
        address: lead.address ?? '—',
        interestCourse: lead.interest_course ?? '—',
        interestCountry: lead.interest_country ?? '—',
        source: lead.source ?? '—',
        status: lead.status,
        priority: lead.priority ?? '—',
        assignee: lead.assigned_to?.name ?? 'Unassigned',
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

export default function LeadsIndex() {
    const {
        data: filters,
        response,
        setData: setFilters,
        submit,
    } = useHttp<LeadFilters, LeadsResponse>(
        leadApi.index(),
        initialLeadFilters(),
    );

    const loadLeads = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load leads. Please refresh the page and try again.',
            );
        }
    }, [submit]);

    useDebouncedEffect(
        () => {
            void loadLeads();
        },
        [filters],
        300,
    );

    const leadRows = response?.data.map(mapLeadRow) ?? [];
    const metrics = response?.metrics;

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
            <Head title="Leads" />
            <CrmListPage
                description="Manage prospective students and initial inquiries."
                headerAction={<AddLeadDialog onCreated={loadLeads} />}
                metrics={[
                    {
                        label: 'New This Week',
                        value: metrics?.newThisWeek?.value ?? '0',
                        detail: metrics?.newThisWeek?.detail ?? 'Fresh inquiries',
                        icon: Sparkles,
                        tone: 'bg-primary/10 text-primary',
                    },
                    {
                        label: 'Follow Ups',
                        value: metrics?.followUps?.value ?? '0',
                        detail: metrics?.followUps?.detail ?? 'Action required',
                        icon: Clock,
                        tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    },
                    {
                        label: 'Qualified',
                        value: metrics?.qualified?.value ?? '0%',
                        detail: metrics?.qualified?.detail ?? 'Target: 65%',
                        icon: Target,
                        tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    },
                    {
                        label: 'In Pipeline',
                        value: metrics?.pipeline?.value ?? '0',
                        detail: metrics?.pipeline?.detail ?? 'Total active leads',
                        icon: Users,
                        tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                    },
                ]}
                title="Leads"
            />

            <div className="-mt-2 flex flex-wrap gap-2 px-4 sm:px-6">
                {['New', 'Contacted', 'Qualified', 'Lost'].map((status) => (
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
                ))}
            </div>

            <div className="px-4 pb-6 sm:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Leads directory</CardTitle>
                        <CardDescription>
                            Search, sort, and manage prospective students.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={leadColumns}
                            data={leadRows}
                            emptyMessage="No leads match your search."
                            onRowClick={(lead) => {
                                router.visit(`/leads/${lead.id}`);
                            }}
                            searchPlaceholder="Search leads by name, contact, or interest..."
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

LeadsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Leads', href: '/leads' },
    ],
};
