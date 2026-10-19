export const REPORT_PERIODS = [
    { value: 'this_month', label: 'This month' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'this_quarter', label: 'This quarter' },
    { value: 'year_to_date', label: 'Year to date' },
    { value: 'last_year', label: 'Last year' },
    { value: 'all_time', label: 'All time' },
] as const;

export const REPORT_TABS = [
    { value: 'briefing', label: 'Executive Briefing (Printable)' },
    { value: 'channels', label: 'Lead Sources & Conversion' },
    { value: 'funnel', label: 'Full Agency Funnel' },
    { value: 'destinations', label: 'Destination Breakdown' },
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number]['value'];
export type ReportTab = (typeof REPORT_TABS)[number]['value'];

/** Percentages are 0–100 with one decimal; null when there is nothing to divide by. */
export type ReportRate = number | null;

export type ReportKpis = {
    leads: number;
    converted: number;
    conversion_rate: ReportRate;
    clients: number;
    applications_lodged: number;
    visa_approved: number;
    visa_refused: number;
    visa_rate: ReportRate;
    collections: number;
};

export type ReportChannel = {
    source: string;
    leads: number;
    converted: number;
    paid_clients: number;
    conversion_rate: ReportRate;
    efficiency: ReportRate;
};

export type ReportFunnelStage = {
    stage: string;
    count: number;
    rate_of_leads: ReportRate;
    rate_of_previous: ReportRate;
};

export type ReportDestination = {
    country: string;
    clients: number;
    lodged: number;
    visa_approved: number;
    visa_refused: number;
    visa_rate: ReportRate;
    collections: number;
};

export type Report = {
    period: {
        key: ReportPeriod;
        label: string;
        from: string | null;
        to: string | null;
    };
    generated_at: string;
    kpis: ReportKpis;
    channels: ReportChannel[];
    funnel: ReportFunnelStage[];
    destinations: ReportDestination[];
};
