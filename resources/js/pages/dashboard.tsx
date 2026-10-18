import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Bell,
    BookOpen,
    BriefcaseBusiness,
    Building2,
    CalendarCheck2,
    Check,
    ChevronDown,
    ChevronRight,
    CircleDashed,
    Clock3,
    CreditCard,
    Folder,
    GraduationCap,
    House,
    LayoutGrid,
    Landmark,
    Menu,
    Moon,
    Plus,
    Search,
    Sparkles,
    Sun,
    Target,
    Wallet,
    Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type SummaryResponse = {
    greeting_name: string;
    today: {
        followups_due: number;
        followups_mine: number;
        overdue: number;
    };
    kpis: {
        new_leads: { value: number; trend_pct: number; spark: number[] };
        followups_today: { value: number; mine: number };
        conversions: { value: number; spark: number[] };
        active_applications: number;
        offers: number;
        visas_approved: { value: number; grant_rate: number };
        collections_bdt: number;
        outstanding_bdt: number;
    };
};

const defaultSummary: SummaryResponse = {
    greeting_name: 'Joy',
    today: { followups_due: 0, followups_mine: 0, overdue: 0 },
    kpis: {
        new_leads: { value: 0, trend_pct: 0, spark: [0, 1, 2, 1, 3, 2, 4, 3, 5, 4] },
        followups_today: { value: 0, mine: 0 },
        conversions: { value: 0, spark: [0, 0, 1, 2, 1, 3, 2, 5, 4, 6] },
        active_applications: 0,
        offers: 0,
        visas_approved: { value: 0, grant_rate: 0 },
        collections_bdt: 0,
        outstanding_bdt: 0,
    },
};

const currency = new Intl.NumberFormat('en-IN');

function formatMoney(amount: number): string {
    return `৳${currency.format(amount)}`;
}

function formatRelativeDay(days: number): string {
    if (days === 0) return 'today';
    if (days === 1) return 'in 1 day';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    return `in ${days} days`;
}

export default function Dashboard() {
    const [summary, setSummary] = useState<SummaryResponse>(defaultSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/dashboard/summary', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) {
                    throw new Error('Request failed');
                }

                const data = (await response.json()) as SummaryResponse;
                if (!cancelled) {
                    setSummary(data);
                    setError(null);
                }
            } catch {
                if (!cancelled) {
                    setError('We could not load this. Your data is safe — try again in a moment.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const todayLabel = useMemo(() => {
        const now = new Date();
        const day = new Intl.DateTimeFormat('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(now);

        return day;
    }, []);

    const cards = [
        {
            title: 'New Leads · 30 days',
            value: summary.kpis.new_leads.value,
            trend: `${summary.kpis.new_leads.trend_pct}%`,
            trendTone: summary.kpis.new_leads.trend_pct >= 0 ? 'success' : 'danger',
            icon: Target,
            meta: 'Last 30 days',
            spark: summary.kpis.new_leads.spark,
            href: '/leads',
        },
        {
            title: 'Follow-ups Due Today',
            value: summary.kpis.followups_today.value,
            sub: `${summary.kpis.followups_today.mine} yours`,
            icon: CalendarCheck2,
            meta: summary.kpis.followups_today.value === 1 ? '1 follow-up' : `${summary.kpis.followups_today.value} follow-ups`,
            href: '/my-day',
        },
        {
            title: 'Conversions (Clients)',
            value: summary.kpis.conversions.value,
            icon: GraduationCap,
            meta: 'Enrolled students',
            spark: summary.kpis.conversions.spark,
            href: '/candidates',
        },
        {
            title: 'Active Applications',
            value: summary.kpis.active_applications,
            icon: LayoutGrid,
            meta: 'In stage pipelines',
            href: '/opportunities',
        },
        {
            title: 'University Offers',
            value: summary.kpis.offers,
            icon: Sparkles,
            meta: 'Conditional & Unconditional',
            href: '/opportunities',
        },
        {
            title: 'Visas Approved',
            value: summary.kpis.visas_approved.value,
            icon: Check,
            meta: `${summary.kpis.visas_approved.grant_rate}% visa grant rate`,
            href: '/opportunities',
        },
        {
            title: 'Collections (BDT)',
            value: formatMoney(summary.kpis.collections_bdt),
            icon: CreditCard,
            meta: 'Cash & Bank deposits',
            href: '/finance',
        },
        {
            title: 'Outstanding Dues',
            value: formatMoney(summary.kpis.outstanding_bdt),
            icon: AlertCircle,
            meta: 'Pending installments',
            href: '/finance',
        },
    ];

    const deadlines = [
        { student: 'Nusrat Jahan', institution: 'Deakin University', days: 3 },
        { student: 'Arafat Rahman', institution: 'Coventry University', days: 5 },
        { student: 'Mehzabin Chowdhury', institution: 'University of South Florida', days: 7 },
        { student: 'Sadia Islam', institution: 'University of Hertfordshire', days: 8 },
        { student: 'Fahim Hossain', institution: 'University of Europe for Applied Sciences', days: 10 },
        { student: 'Tanvir Ahmed', institution: 'University of Windsor', days: 12 },
    ];

    const tasks = [
        { title: 'Visa appointment booking', description: 'Passport & interview docs', student: 'Nusrat Jahan', status: 'overdue', time: '3:28 PM', steps: '1/3', priority: 'Urgent' },
        { title: 'Offer review follow-up', description: 'Confirm acceptance letter from Deakin', student: 'Arafat Rahman', status: 'overdue', time: '4:10 PM', steps: '2/4', priority: 'High' },
        { title: 'Deposit reminder', description: 'Tuition deposit to be settled', student: 'Mehzabin Chowdhury', status: 'today', time: '9:15 AM', steps: '1/2', priority: 'Medium' },
    ];

    return (
        <>
            <Head title="Home" />
            <div className="dashboard-home-shell">
                <main className="dashboard-main">
                    <header className="dashboard-topbar">
                        <h1>Home</h1>
                        <div className="dashboard-topbar-tools">
                            <div className="dashboard-search">
                                <Search size={15} />
                                <input type="text" placeholder="Search students, IDs, passport…" />
                                <div className="dashboard-keybinds">
                                    <kbd>Ctrl</kbd>
                                    <kbd>K</kbd>
                                </div>
                            </div>
                            <div className="dashboard-split-button">
                                <button type="button" className="dashboard-primary-button">
                                    <Plus size={15} />
                                    New lead
                                </button>
                                <button type="button" className="dashboard-chevron-button" aria-label="Create submenu">
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            <button type="button" className="dashboard-icon-button" aria-label="Notifications">
                                <Bell size={18} />
                                <span className="dashboard-badge-dot" />
                            </button>
                            <button type="button" className="dashboard-icon-button" aria-label="Toggle theme">
                                <Moon size={18} />
                            </button>
                            <div className="dashboard-user-bubble">JA</div>
                        </div>
                    </header>

                    <div className="dashboard-content">
                        <div className="dashboard-header-row">
                            <div>
                                <h2>Good afternoon, {summary.greeting_name}</h2>
                                <p>{todayLabel} · {summary.today.followups_due} follow-ups due today, {summary.today.overdue} overdue</p>
                            </div>
                            <div className="dashboard-header-actions">
                                <button type="button" className="dashboard-primary-button small"> <Plus size={15} /> New Lead</button>
                                <button type="button" className="dashboard-outline-button"><CreditCard size={15} /> Financials</button>
                            </div>
                        </div>

                        <section className="dashboard-kpi-grid">
                            {cards.map((card) => {
                                const Icon = card.icon;
                                const value = typeof card.value === 'number' ? card.value.toLocaleString('en-US') : card.value;
                                return (
                                    <a key={card.title} href={card.href} className="dashboard-stat-card">
                                        <div className="dashboard-stat-head">
                                            <span className="dashboard-stat-icon"><Icon size={16} /></span>
                                            <span>{card.title}</span>
                                        </div>
                                        <div className="dashboard-stat-value">{value}</div>
                                        <div className="dashboard-stat-subline">
                                            <span>{card.meta}</span>
                                            {card.trend ? (
                                                <span className={`dashboard-trend ${card.trendTone === 'success' ? 'is-success' : 'is-danger'}`}>
                                                    {card.trendTone === 'success' ? '↗' : '↘'} {card.trend}
                                                </span>
                                            ) : null}
                                        </div>
                                        {card.spark ? (
                                            <svg viewBox="0 0 90 36" className="dashboard-sparkline" aria-hidden="true">
                                                <polyline
                                                    points={card.spark.map((point, index) => `${index * 7},${36 - point * 4}`).join(' ')}
                                                    fill="none"
                                                    stroke="var(--primary)"
                                                    strokeWidth="1.5"
                                                    strokeLinejoin="round"
                                                    strokeLinecap="round"
                                                />
                                                <circle cx="84" cy={36 - card.spark.at(-1)! * 4} r="2.5" fill="var(--primary)" />
                                            </svg>
                                        ) : null}
                                    </a>
                                );
                            })}
                        </section>

                        <section className="dashboard-lower-grid">
                            <div className="dashboard-panel">
                                <div className="dashboard-panel-header">
                                    <div className="dashboard-panel-title"><CalendarCheck2 size={18} /> Today</div>
                                    <div className="dashboard-panel-subline">{summary.today.overdue} overdue · {summary.today.followups_due} due today</div>
                                    <a href="/my-day" className="dashboard-panel-link">My Day <ArrowRight size={14} /></a>
                                </div>
                                <div className="dashboard-task-list">
                                    {tasks.map((task, index) => (
                                        <div key={`${task.title}-${index}`} className={`dashboard-task-row ${task.status === 'overdue' ? 'is-overdue' : ''}`}>
                                            <button type="button" className="dashboard-task-check" aria-label="Complete task"><span /></button>
                                            <div className={`dashboard-task-type ${task.status === 'overdue' ? 'danger' : 'warning'}`}>
                                                {task.status === 'overdue' ? <CircleDashed size={14} /> : <Check size={14} />}
                                            </div>
                                            <div className="dashboard-task-body">
                                                <div className="dashboard-task-title-row">
                                                    <strong>{task.title}</strong>
                                                    {task.priority !== 'Medium' ? (
                                                        <span className={`dashboard-priority ${task.priority === 'Urgent' ? 'danger' : 'warning'}`}>
                                                            {task.priority}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="dashboard-task-meta">{task.description} · {task.student} · {task.steps}</div>
                                            </div>
                                            <div className="dashboard-task-time">{task.time}</div>
                                            <div className={`dashboard-deadline-chip ${task.status === 'overdue' ? 'is-overdue' : 'is-due'}`} title={`${task.status === 'overdue' ? 'Overdue' : 'Due'} · ${task.time}`}>
                                                {task.status === 'overdue' ? <AlertCircle size={12} /> : <Clock3 size={12} />}
                                                <span>{task.status === 'overdue' ? `overdue · ${task.time}` : `today · ${task.time}`}</span>
                                            </div>
                                            <button type="button" className="dashboard-more-button" aria-label="Task actions">⋯</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="dashboard-panel">
                                <div className="dashboard-panel-header">
                                    <div className="dashboard-panel-title"><Clock3 size={18} /> Deadline Radar</div>
                                    <div className="dashboard-panel-subline">Next 14 days of offer acceptances, deposits and visa appointments.</div>
                                </div>
                                <div className="dashboard-deadline-list">
                                    {deadlines.map((deadline, index) => (
                                        <div key={`${deadline.student}-${index}`} className="dashboard-deadline-row">
                                            <div>
                                                <div className="dashboard-deadline-student">{deadline.student}</div>
                                                <div className="dashboard-deadline-institution">{deadline.institution}</div>
                                            </div>
                                            <div className="dashboard-deadline-pill" title={`Deposit due · ${deadline.days} days`}>
                                                <Clock3 size={12} />
                                                {formatRelativeDay(deadline.days)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <a href="/opportunities" className="dashboard-panel-footer-link">View all deadlines</a>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </>
    );
}
