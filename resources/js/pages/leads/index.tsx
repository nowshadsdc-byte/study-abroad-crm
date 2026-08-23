import { Head, router, useHttp } from '@inertiajs/react';
import {
    CalendarClock,
    ContactRound,
    Filter,
    UserRoundCheck,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { CrmListPage } from '@/components/crm-list-page';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
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
import leads from '@/routes/leads';
import { AddLeadDialog } from './add-lead-dialog';
import { leadColumns } from './columns';
import type { LeadRow } from './columns';

const statuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];

type LeadApiRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    interest_course: string | null;
    interest_country: string | null;
    source: string;
    status: string;
    priority: string;
    assigned_to: { name: string | null } | null;
};

type LeadsResponse = {
    data: LeadApiRow[];
    metrics?: {
        newThisWeek: { value: string; detail: string };
        followUps: { value: string; detail: string };
        qualified: { value: string; detail: string };
        pipeline: { value: string; detail: string };
    };
};

type LeadFilters = {
    status: string;
    needs_follow_up: boolean;
};

function initialLeadFilters(): LeadFilters {
    if (typeof window === 'undefined') {
        return { status: '', needs_follow_up: false };
    }

    const params = new URLSearchParams(window.location.search);

    return {
        status: params.get('status') ?? '',
        needs_follow_up: params.get('needs_follow_up') === '1',
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
        source: lead.source,
        status: lead.status,
        priority: lead.priority,
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
    const { data: filters, response, setData: setFilters, submit } = useHttp<
        LeadFilters,
        LeadsResponse
    >(leadApi.index(), initialLeadFilters());

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

    return (
        <>
            <Head title="Leads" />
            <CrmListPage
                description="Prospects, outreach, and follow-ups across your admissions pipeline."
                headerAction={<AddLeadDialog onCreated={loadLeads} />}
                metrics={[
                    {
                        label: 'New this week',
                        value: response?.metrics?.newThisWeek.value ?? '—',
                        detail: response?.metrics?.newThisWeek.detail ?? 'Loading...',
                        icon: ContactRound,
                        tone: 'bg-primary/10 text-primary',
                    },
                    {
                        label: 'Follow-ups due',
                        value: response?.metrics?.followUps.value ?? '—',
                        detail: response?.metrics?.followUps.detail ?? 'Loading...',
                        icon: CalendarClock,
                        tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    },
                    {
                        label: 'Qualified',
                        value: response?.metrics?.qualified.value ?? '—',
                        detail: response?.metrics?.qualified.detail ?? 'Loading...',
                        icon: UserRoundCheck,
                        tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                    },
                    {
                        label: 'In pipeline',
                        value: response?.metrics?.pipeline.value ?? '—',
                        detail: response?.metrics?.pipeline.detail ?? 'Loading...',
                        icon: Filter,
                        tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
                    },
                ]}
                title="Leads"
            />

            <div className="px-4 pb-6 sm:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Leads directory</CardTitle>
                        <CardDescription>
                            Search, sort, and manage every lead in the pipeline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={leadColumns}
                            data={leadRows}
                            emptyMessage="No leads match your search."
                            onRowClick={(lead) => {
                                router.visit(leads.show(lead.id));
                            }}
                            searchPlaceholder="Search leads by name, contact, or interest..."
                            toolbar={
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select
                                        onValueChange={(value) =>
                                            setFilters((current) => ({
                                                ...current,
                                                status:
                                                    value === 'all' ? '' : value,
                                            }))
                                        }
                                        value={filters.status || 'all'}
                                    >
                                        <SelectTrigger className="w-full sm:w-40">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All statuses
                                            </SelectItem>
                                            {statuses.map((status) => (
                                                <SelectItem
                                                    key={status}
                                                    value={status}
                                                >
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={() =>
                                            setFilters((current) => ({
                                                ...current,
                                                needs_follow_up:
                                                    !current.needs_follow_up,
                                            }))
                                        }
                                        type="button"
                                        variant={
                                            filters.needs_follow_up
                                                ? 'default'
                                                : 'outline'
                                        }
                                    >
                                        <CalendarClock />
                                        Follow-up due
                                    </Button>
                                </div>
                            }
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
        { title: 'Leads', href: leads.index() },
    ],
};
