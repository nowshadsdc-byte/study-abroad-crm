import { Head, useHttp, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    FileCheck2,
    GraduationCap,
    Printer,
    UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import reportApi from '@/routes/api/reports';
import reports from '@/routes/reports';
import type { Report, ReportPeriod, ReportTab } from '@/types';
import { REPORT_PERIODS, REPORT_TABS } from '@/types/report';
import { ChannelsTable } from './components/channels-table';
import { DestinationsTable } from './components/destinations-table';
import { ExecutiveBriefing } from './components/executive-briefing';
import { FunnelView } from './components/funnel-view';
import { formatCount, formatRate } from './components/report-format';
import { ReportSection } from './components/report-section';

/**
 * Query params from the Inertia page URL, which is identical during SSR and
 * hydration (unlike window.location).
 */
function pageQuery(pageUrl: string): URLSearchParams {
    return new URLSearchParams(pageUrl.split('?')[1] ?? '');
}

function initialPeriod(pageUrl: string): ReportPeriod {
    const period = pageQuery(pageUrl).get('period');

    return REPORT_PERIODS.some((option) => option.value === period)
        ? (period as ReportPeriod)
        : 'year_to_date';
}

function initialTab(pageUrl: string): ReportTab {
    const tab = pageQuery(pageUrl).get('tab');

    return REPORT_TABS.some((option) => option.value === tab)
        ? (tab as ReportTab)
        : 'briefing';
}

function KpiCard({
    icon: Icon,
    label,
    value,
    note,
    iconClassName,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    note: string;
    iconClassName: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className={cn('size-4', iconClassName)} />
                {label}
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
                {value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
        </div>
    );
}

export default function Reports() {
    const page = usePage();
    const [period, setPeriod] = useState<ReportPeriod>(() =>
        initialPeriod(page.url),
    );
    const [tab, setTab] = useState<ReportTab>(() => initialTab(page.url));
    const request = useHttp<Record<string, never>, { data: Report }>({});
    const report = request.response?.data;

    useEffect(() => {
        request
            .get(reportApi.index.url({ query: { period } }))
            .catch(() =>
                toast.error(
                    'Unable to load the report. Please refresh and try again.',
                ),
            );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('period', period);
        url.searchParams.set('tab', tab);
        window.history.replaceState(window.history.state, '', url);
    }, [period, tab]);

    const printBriefing = (): void => {
        // Render the briefing tab first so it is what gets printed.
        flushSync(() => setTab('briefing'));
        window.print();
    };

    return (
        <>
            <Head title="Reports" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 print:gap-0 print:p-0">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
                    <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                            Money
                        </p>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Reports
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Acquisition, conversion, pipeline and destination
                            performance.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={period}
                            onValueChange={(value) =>
                                setPeriod(value as ReportPeriod)
                            }
                        >
                            <SelectTrigger
                                className="w-[160px]"
                                aria-label="Reporting period"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {REPORT_PERIODS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            onClick={printBriefing}
                            disabled={!report}
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                        >
                            <Printer className="size-4" />
                            Print briefing
                        </Button>
                    </div>
                </header>

                {!report ? (
                    <div className="grid gap-4" aria-busy="true">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {[0, 1, 2, 3].map((key) => (
                                <Skeleton
                                    key={key}
                                    className="h-28 rounded-xl"
                                />
                            ))}
                        </div>
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-[420px] w-full rounded-xl" />
                    </div>
                ) : (
                    <>
                        <section
                            aria-label="Key figures"
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
                        >
                            <KpiCard
                                icon={UsersRound}
                                iconClassName="text-sky-600"
                                label="Total Leads Captured"
                                value={formatCount(report.kpis.leads)}
                                note={`${report.period.label} · ${report.channels.length} ${report.channels.length === 1 ? 'channel' : 'channels'}`}
                            />
                            <KpiCard
                                icon={GraduationCap}
                                iconClassName="text-emerald-600"
                                label="Enrolled Clients"
                                value={formatCount(report.kpis.clients)}
                                note={`Lead conversion rate: ${formatRate(report.kpis.conversion_rate)}`}
                            />
                            <KpiCard
                                icon={FileCheck2}
                                iconClassName="text-violet-600"
                                label="Applications Lodged"
                                value={formatCount(
                                    report.kpis.applications_lodged,
                                )}
                                note="Submitted to institutions"
                            />
                            <KpiCard
                                icon={BadgeCheck}
                                iconClassName="text-teal-600"
                                label="Overall Visa Rate"
                                value={formatRate(report.kpis.visa_rate)}
                                note={
                                    report.kpis.visa_rate === null
                                        ? 'No visa decisions yet'
                                        : `${report.kpis.visa_approved} approved · ${report.kpis.visa_refused} refused`
                                }
                            />
                        </section>

                        <nav
                            aria-label="Report sections"
                            className="flex flex-wrap gap-2 print:hidden"
                        >
                            {REPORT_TABS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setTab(option.value)}
                                    aria-current={
                                        tab === option.value
                                            ? 'page'
                                            : undefined
                                    }
                                    className={cn(
                                        'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                                        tab === option.value
                                            ? 'bg-linear-to-br from-primary to-teal-600 text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    )}
                                >
                                    {option.value === 'briefing' && (
                                        <Printer className="size-3.5" />
                                    )}
                                    {option.label}
                                </button>
                            ))}
                        </nav>

                        <div
                            className={cn(
                                'transition-opacity',
                                request.processing && 'opacity-60',
                            )}
                            aria-busy={request.processing}
                        >
                            {tab === 'briefing' && (
                                <ExecutiveBriefing report={report} />
                            )}
                            {tab === 'channels' && (
                                <ReportSection
                                    title="Lead Sources & Conversion"
                                    description={`Leads captured ${report.period.label.toLowerCase()}, by acquisition channel.`}
                                >
                                    <ChannelsTable channels={report.channels} />
                                </ReportSection>
                            )}
                            {tab === 'funnel' && (
                                <ReportSection
                                    title="Full Agency Funnel"
                                    description="Every lead captured in the period, followed from first contact to enrolment."
                                >
                                    <FunnelView stages={report.funnel} />
                                </ReportSection>
                            )}
                            {tab === 'destinations' && (
                                <ReportSection
                                    title="Destination Breakdown"
                                    description="Clients enrolled in the period by desired study destination."
                                >
                                    <DestinationsTable
                                        destinations={report.destinations}
                                    />
                                </ReportSection>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

Reports.layout = {
    breadcrumbs: [
        {
            title: 'Reports',
            href: reports.index(),
        },
    ],
};
