import { Head, router, useHttp } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    CalendarClock,
    CheckCircle2,
    ContactRound,
    GraduationCap,
    ShieldCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import dashboardApi from '@/routes/api/dashboard';
import candidates from '@/routes/candidates';
import leads from '@/routes/leads';
import opportunities from '@/routes/opportunities';
import * as users from '@/routes/users';

type DashboardMetrics = {
    total_leads: number;
    new_leads: number;
    followup_leads: number;
    total_candidates: number;
    completed_candidates: number;
    active_programs: number;
    active_universities: number;
    total_users: number;
};

type DashboardResponse = {
    data: DashboardMetrics;
};

type DashboardCard = {
    key: keyof DashboardMetrics;
    label: string;
    detail: string;
    icon: typeof ContactRound;
    tone: string;
    href: string;
};

export default function Dashboard() {
    const { response, submit } = useHttp<Record<string, never>, DashboardResponse>(
        dashboardApi.metrics(),
        {},
    );

    const loadMetrics = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load dashboard metrics. Please refresh the page and try again.',
            );
        }
    }, [submit]);

    useEffect(() => {
        void loadMetrics();
    }, [loadMetrics]);

    const metrics = response?.data;

    const cards: DashboardCard[] = [
        {
            key: 'total_leads',
            label: 'Total Leads',
            detail: 'All leads in the pipeline',
            icon: ContactRound,
            tone: 'bg-primary/10 text-primary',
            href: leads.index().url,
        },
        {
            key: 'new_leads',
            label: 'New Leads',
            detail: 'Awaiting first contact',
            icon: UserPlus,
            tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
            href: leads.index({ query: { status: 'New' } }).url,
        },
        {
            key: 'followup_leads',
            label: 'Follow-up Leads',
            detail: 'Due or overdue for follow-up',
            icon: CalendarClock,
            tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            href: leads.index({ query: { needs_follow_up: 1 } }).url,
        },
        {
            key: 'total_candidates',
            label: 'Total Candidates',
            detail: 'All candidates in progress',
            icon: GraduationCap,
            tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
            href: candidates.index().url,
        },
        {
            key: 'completed_candidates',
            label: 'Completed Candidates',
            detail: 'Finished the full process',
            icon: CheckCircle2,
            tone: 'bg-primary/10 text-primary',
            href: candidates.index({ query: { status: 'Completed' } }).url,
        },
        {
            key: 'active_programs',
            label: 'Active Programs',
            detail: 'Currently open for applications',
            icon: BookOpen,
            tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
            href: opportunities.index({ query: { tab: 'programs', status: 'Open' } }).url,
        },
        {
            key: 'active_universities',
            label: 'Active Universities',
            detail: 'Active partner universities',
            icon: Building2,
            tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
            href: opportunities.index({ query: { tab: 'universities', is_active: 1 } }).url,
        },
        {
            key: 'total_users',
            label: 'Website Users',
            detail: 'Registered staff accounts',
            icon: ShieldCheck,
            tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            href: users.index().url,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-medium tracking-wider text-primary uppercase">
                            Confidence Global Bd CRM
                        </p>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Dashboard overview
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            A quick snapshot of leads, candidates, programs,
                            and users. Click any card to jump straight to the
                            filtered view.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="size-4 text-primary" />
                        Live overview
                    </div>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        const value = metrics ? metrics[card.key] : null;

                        return (
                            <button
                                className="text-left"
                                key={card.key}
                                onClick={() => router.visit(card.href)}
                                type="button"
                            >
                                <Card className="gap-3 py-4 transition-shadow hover:shadow-md">
                                    <CardContent className="flex items-start justify-between px-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <p className="text-2xl font-semibold tracking-tight">
                                                {value ?? '—'}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {card.detail}
                                            </p>
                                        </div>
                                        <div
                                            className={`flex size-9 items-center justify-center rounded-lg ${card.tone}`}
                                        >
                                            <Icon className="size-[18px]" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        );
                    })}
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
