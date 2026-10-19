import { usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';
import { ChannelsTable } from './channels-table';
import { DestinationsTable } from './destinations-table';
import { FunnelView } from './funnel-view';
import { formatCount, formatRate, formatTaka } from './report-format';
import { ReportSection } from './report-section';

type SharedSettings = {
    name?: string;
    settings?: { site_name?: string | null; address?: string | null };
};

function periodRange(report: Report): string {
    const { from, to, label } = report.period;

    if (!from || !to) {
        return label;
    }

    return `${label} (${format(parseISO(from), 'd MMM yyyy')} – ${format(parseISO(to), 'd MMM yyyy')})`;
}

function BriefingStat({
    label,
    value,
    note,
    noteClassName,
    valueClassName,
}: {
    label: string;
    value: string;
    note: string;
    noteClassName?: string;
    valueClassName?: string;
}) {
    return (
        <div className="rounded-lg border bg-card p-4 print:break-inside-avoid">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums',
                    valueClassName,
                )}
            >
                {value}
            </p>
            <p
                className={cn(
                    'mt-1 text-xs text-muted-foreground',
                    noteClassName,
                )}
            >
                {note}
            </p>
        </div>
    );
}

/**
 * The management briefing. It is the only part of the page that prints.
 */
export function ExecutiveBriefing({ report }: { report: Report }) {
    const { name, settings } = usePage<SharedSettings>().props;
    const companyName = settings?.site_name || name || 'Agency';
    const { kpis } = report;

    return (
        <article
            aria-label="Executive briefing"
            className="grid gap-6 rounded-xl border bg-card p-4 shadow-sm sm:p-6 print:gap-5 print:border-none print:p-0 print:shadow-none"
        >
            <header className="flex flex-col gap-4 border-b-2 border-primary/60 pb-4 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
                <div className="min-w-0">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-primary uppercase sm:text-3xl print:text-3xl">
                        {companyName}
                    </h1>
                    <p className="mt-1 text-sm font-semibold">
                        Agency Performance &amp; Strategic Operations Report
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Reporting period:{' '}
                        <span className="font-medium text-foreground">
                            {periodRange(report)}
                        </span>{' '}
                        · Generated on{' '}
                        {format(parseISO(report.generated_at), 'd MMMM yyyy')}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end print:items-end">
                    <span className="rounded-sm border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-rose-700 uppercase [print-color-adjust:exact] dark:text-rose-300">
                        Confidential · Management copy
                    </span>
                    {settings?.address && (
                        <p className="max-w-64 text-[11px] text-muted-foreground sm:text-right print:text-right">
                            {settings.address}
                        </p>
                    )}
                </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
                <BriefingStat
                    label="Leads acquired"
                    value={formatCount(kpis.leads)}
                    note={`Across ${report.channels.length} acquisition ${report.channels.length === 1 ? 'channel' : 'channels'}`}
                />
                <BriefingStat
                    label="Converted clients"
                    value={formatCount(kpis.converted)}
                    note={`${formatRate(kpis.conversion_rate)} conversion rate`}
                    noteClassName={
                        kpis.conversion_rate
                            ? 'font-medium text-emerald-700 dark:text-emerald-400'
                            : undefined
                    }
                />
                <BriefingStat
                    label="Lodged applications"
                    value={formatCount(kpis.applications_lodged)}
                    note={
                        kpis.visa_rate === null
                            ? 'No visa decisions yet'
                            : `${formatRate(kpis.visa_rate)} visa approval (${kpis.visa_approved} of ${kpis.visa_approved + kpis.visa_refused})`
                    }
                />
                <BriefingStat
                    label="Collections"
                    value={formatTaka(kpis.collections)}
                    note="Payments received in the period"
                    valueClassName="text-emerald-700 dark:text-emerald-400"
                />
            </div>

            <ReportSection
                title="Acquisition Channels & Conversion Efficiency"
                description="Leads, conversions and conversion percentages by channel."
            >
                <ChannelsTable channels={report.channels} />
            </ReportSection>

            <ReportSection
                title="Agency Funnel"
                description="Leads captured in the period, followed through the pipeline."
            >
                <FunnelView stages={report.funnel} compact />
            </ReportSection>

            <ReportSection
                title="Top Destinations"
                description="Clients enrolled in the period by study destination."
            >
                <DestinationsTable
                    destinations={report.destinations}
                    limit={5}
                />
            </ReportSection>

            <p className="text-[11px] text-muted-foreground">
                Converted clients are leads with a client record. Visa approval
                counts decisions recorded on the Visa step during the period.
                Collections are payments received, by payment date.
            </p>
        </article>
    );
}
