import { Head, router, useHttp } from '@inertiajs/react';
import { Clock, Sparkles, Target, Users } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    address: string | null;
    source: string;
    interest_course: string | null;
    interest_country: string | null;
    status: string;
    priority: string | null;
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
    filter_options: {
        sources: string[];
        countries: string[];
        counselors: { id: number; name: string }[];
    };
    meta: PaginationMeta;
};

type LeadFilters = {
    status: string;
    source: string;
    interest_country: string;
    assigned_to_id: string;
    needs_follow_up: string;
    page?: number;
    search?: string;
};

const leadStatuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];

function LeadFilter({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <Select
            value={value || 'all'}
            onValueChange={(selected) =>
                onChange(selected === 'all' ? '' : selected)
            }
        >
            <SelectTrigger
                aria-label={`${label} filter`}
                className="h-9 min-w-28 bg-background"
            >
                <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{label}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function initialLeadFilters(): LeadFilters {
    if (typeof window === 'undefined') {
        return {
            status: '',
            source: '',
            interest_country: '',
            assigned_to_id: '',
            needs_follow_up: '',
            page: 1,
        };
    }

    const searchParams = new URLSearchParams(window.location.search);

    return {
        status: searchParams.get('status') ?? '',
        source: searchParams.get('source') ?? '',
        interest_country: searchParams.get('interest_country') ?? '',
        assigned_to_id: searchParams.get('assigned_to_id') ?? '',
        needs_follow_up: searchParams.get('needs_follow_up') ?? '',
        page: searchParams.has('page') ? Number(searchParams.get('page')) : 1,
    };
}

function mapLeadRow(lead: LeadApiRow): LeadRow {
    return {
        id: lead.id,
        name: lead.name,
        email: lead.email ?? '—',
        phone: lead.phone ?? '—',
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

    const setFilter = (
        key:
            | 'status'
            | 'source'
            | 'interest_country'
            | 'assigned_to_id'
            | 'needs_follow_up',
        value: string,
    ): void => {
        setFilters((current) => ({
            ...current,
            [key]: value,
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
                        detail:
                            metrics?.newThisWeek?.detail ?? 'Fresh inquiries',
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
                        detail:
                            metrics?.pipeline?.detail ?? 'Total active leads',
                        icon: Users,
                        tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                    },
                ]}
                title="Leads"
            />

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
                            toolbar={
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <LeadFilter
                                        label="Status"
                                        value={filters.status}
                                        options={leadStatuses.map((status) => ({
                                            value: status,
                                            label: status,
                                        }))}
                                        onChange={(value) =>
                                            setFilter('status', value)
                                        }
                                    />
                                    <LeadFilter
                                        label="Source"
                                        value={filters.source}
                                        options={(
                                            response?.filter_options.sources ??
                                            []
                                        ).map((source) => ({
                                            value: source,
                                            label: source,
                                        }))}
                                        onChange={(value) =>
                                            setFilter('source', value)
                                        }
                                    />
                                    <LeadFilter
                                        label="Counselor"
                                        value={filters.assigned_to_id}
                                        options={(
                                            response?.filter_options
                                                .counselors ?? []
                                        ).map((counselor) => ({
                                            value: String(counselor.id),
                                            label: counselor.name,
                                        }))}
                                        onChange={(value) =>
                                            setFilter('assigned_to_id', value)
                                        }
                                    />
                                    <LeadFilter
                                        label="Country"
                                        value={filters.interest_country}
                                        options={(
                                            response?.filter_options
                                                .countries ?? []
                                        ).map((country) => ({
                                            value: country,
                                            label: country,
                                        }))}
                                        onChange={(value) =>
                                            setFilter('interest_country', value)
                                        }
                                    />
                                    <LeadFilter
                                        label="Follow-up"
                                        value={filters.needs_follow_up}
                                        options={[
                                            {
                                                value: '1',
                                                label: 'Due',
                                            },
                                        ]}
                                        onChange={(value) =>
                                            setFilter('needs_follow_up', value)
                                        }
                                    />
                                </div>
                            }
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
