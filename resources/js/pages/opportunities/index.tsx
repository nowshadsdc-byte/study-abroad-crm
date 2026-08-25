import { Head, useHttp } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    CircleDashed,
    Send,
    Users,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TabGroup } from '@/components/tab-group';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/use-permission';
import { dashboard } from '@/routes';
import opportunityApi from '@/routes/api/opportunities';
import universityApi from '@/routes/api/universities';
import opportunitiesRoute from '@/routes/opportunities';
import { AddUniversityDialog } from '../universities/add-university-dialog';
import { UniversityCard } from '../universities/university-card';
import type { UniversityCardData } from '../universities/university-card';
import {
    AddOpportunityDialog,
    useUniversityOptions,
} from './add-opportunity-dialog';
import { ProgramCard } from './program-card';
import type { ProgramCardData } from './program-card';

const levels = ['Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD'];

type ProgramFilters = {
    search: string;
    status: string;
    level: string;
    university_id: string;
};

function initialProgramFilters(): ProgramFilters {
    const status =
        typeof window === 'undefined'
            ? ''
            : (new URLSearchParams(window.location.search).get('status') ?? '');

    return { search: '', status, level: '', university_id: '' };
}

type ProgramsResponse = {
    data: ProgramCardData[];
    status_counts?: Record<string, number>;
    total_applications?: number;
};

type UniversityFilters = {
    search: string;
    country: string;
    is_active: string;
};

function initialUniversityFilters(): UniversityFilters {
    const isActive =
        typeof window === 'undefined'
            ? ''
            : (new URLSearchParams(window.location.search).get('is_active') ??
              '');

    return { search: '', country: '', is_active: isActive };
}

type UniversitiesResponse = {
    data: UniversityCardData[];
    countries?: string[];
};

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

function initialTab(): 'programs' | 'universities' {
    if (typeof window === 'undefined') {
        return 'programs';
    }

    return new URLSearchParams(window.location.search).get('tab') ===
        'universities'
        ? 'universities'
        : 'programs';
}

export default function OpportunitiesIndex() {
    const { can } = usePermission();
    const canCreate = can('opportunity.create');
    const canEdit = can('opportunity.edit');
    const canDelete = can('opportunity.delete');
    const [tab, setTab] = useState<'programs' | 'universities'>(initialTab);

    const handleTabChange = (value: string): void => {
        const nextTab = value === 'universities' ? 'universities' : 'programs';
        setTab(nextTab);

        const url = new URL(window.location.href);
        url.searchParams.set('tab', nextTab);
        window.history.replaceState(null, '', url);
    };

    // Programs
    const programsRequest = useHttp<ProgramFilters, ProgramsResponse>(
        opportunityApi.index(),
        initialProgramFilters(),
    );
    const { data: programFilters, setData: setProgramFilters } =
        programsRequest;
    const universityOptions = useUniversityOptions();

    const loadPrograms = useCallback(async (): Promise<void> => {
        try {
            await programsRequest.submit();
        } catch {
            toast.error(
                'Unable to load programs. Please refresh the page and try again.',
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programsRequest.submit]);

    useEffect(() => {
        universityOptions
            .submit()
            .catch(() => toast.error('Unable to load universities.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useDebouncedEffect(
        () => {
            void loadPrograms();
        },
        [programFilters],
        300,
    );

    const setStatusFilter = (status: string): void => {
        setProgramFilters((current) => ({
            ...current,
            status: current.status === status ? '' : status,
        }));
    };

    // Universities
    const universitiesRequest = useHttp<
        UniversityFilters,
        UniversitiesResponse
    >(universityApi.index(), initialUniversityFilters());
    const { data: universityFilters, setData: setUniversityFilters } =
        universitiesRequest;

    const loadUniversities = useCallback(async (): Promise<void> => {
        try {
            await universitiesRequest.submit();
        } catch {
            toast.error(
                'Unable to load universities. Please refresh the page and try again.',
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [universitiesRequest.submit]);

    useDebouncedEffect(
        () => {
            void loadUniversities();
        },
        [universityFilters],
        300,
    );

    const programs = programsRequest.response?.data ?? [];
    const statusCounts = programsRequest.response?.status_counts ?? {};
    const totalApplications = programsRequest.response?.total_applications ?? 0;

    const universitiesList = universitiesRequest.response?.data ?? [];
    const countries = universitiesRequest.response?.countries ?? [];
    const universities = universityOptions.response?.data ?? [];

    return (
        <>
            <Head title="Opportunities" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium tracking-wider text-primary uppercase">
                            Confidence Global Bd CRM
                        </p>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Opportunities
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            University partnerships, available programs, and
                            admissions opportunities.
                        </p>
                    </div>
                    {canCreate &&
                        (tab === 'programs' ? (
                            <AddOpportunityDialog onCreated={loadPrograms} />
                        ) : (
                            <AddUniversityDialog onCreated={loadUniversities} />
                        ))}
                </header>

                <TabGroup
                    onChange={handleTabChange}
                    options={[
                        { value: 'programs', label: 'Programs' },
                        { value: 'universities', label: 'Universities' },
                    ]}
                    value={tab}
                />

                {tab === 'programs' && (
                    <>
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                {
                                    key: 'Open',
                                    label: 'Open',
                                    icon: CheckCircle2,
                                    tone: 'bg-primary/10 text-primary',
                                },
                                {
                                    key: 'Limited',
                                    label: 'Limited',
                                    icon: CircleDashed,
                                    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                },
                                {
                                    key: 'Closed',
                                    label: 'Closed',
                                    icon: XCircle,
                                    tone: 'bg-destructive/10 text-destructive',
                                },
                            ].map((tile) => {
                                const Icon = tile.icon;
                                const isActive =
                                    programFilters.status === tile.key;

                                return (
                                    <button
                                        className="text-left"
                                        key={tile.key}
                                        onClick={() =>
                                            setStatusFilter(tile.key)
                                        }
                                        type="button"
                                    >
                                        <Card
                                            className={`gap-3 py-4 transition-shadow hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''}`}
                                        >
                                            <CardContent className="flex items-start justify-between px-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">
                                                        {tile.label}
                                                    </p>
                                                    <p className="text-2xl font-semibold tracking-tight">
                                                        {statusCounts[
                                                            tile.key
                                                        ] ?? 0}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Click to filter
                                                    </p>
                                                </div>
                                                <div
                                                    className={`flex size-9 items-center justify-center rounded-lg ${tile.tone}`}
                                                >
                                                    <Icon className="size-[18px]" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </button>
                                );
                            })}
                            <button
                                className="text-left"
                                onClick={() =>
                                    setProgramFilters(initialProgramFilters())
                                }
                                type="button"
                            >
                                <Card className="gap-3 py-4 transition-shadow hover:shadow-md">
                                    <CardContent className="flex items-start justify-between px-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                Total Applications
                                            </p>
                                            <p className="text-2xl font-semibold tracking-tight">
                                                {totalApplications}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Click to clear filters
                                            </p>
                                        </div>
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                            <Users className="size-[18px]" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        </section>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Input
                                className="sm:max-w-xs"
                                onChange={(event) =>
                                    setProgramFilters((current) => ({
                                        ...current,
                                        search: event.target.value,
                                    }))
                                }
                                placeholder="Search by title or program..."
                                value={programFilters.search}
                            />
                            <Select
                                onValueChange={(value) =>
                                    setProgramFilters((current) => ({
                                        ...current,
                                        status: value === 'all' ? '' : value,
                                    }))
                                }
                                value={programFilters.status || 'all'}
                            >
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Limited">
                                        Limited
                                    </SelectItem>
                                    <SelectItem value="Closed">
                                        Closed
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                onValueChange={(value) =>
                                    setProgramFilters((current) => ({
                                        ...current,
                                        level: value === 'all' ? '' : value,
                                    }))
                                }
                                value={programFilters.level || 'all'}
                            >
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All levels
                                    </SelectItem>
                                    {levels.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            {level}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                onValueChange={(value) =>
                                    setProgramFilters((current) => ({
                                        ...current,
                                        university_id:
                                            value === 'all' ? '' : value,
                                    }))
                                }
                                value={programFilters.university_id || 'all'}
                            >
                                <SelectTrigger className="w-full sm:w-52">
                                    <SelectValue placeholder="University" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All universities
                                    </SelectItem>
                                    {universities.map((university) => (
                                        <SelectItem
                                            key={university.id}
                                            value={String(university.id)}
                                        >
                                            {university.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {programs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border py-16 text-center text-muted-foreground">
                                <Building2 className="size-6" />
                                <p className="text-sm">
                                    No programs match your filters.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {programs.map((program) => (
                                    <ProgramCard
                                        canDelete={canDelete}
                                        canEdit={canEdit}
                                        key={program.id}
                                        onChanged={loadPrograms}
                                        program={program}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {tab === 'universities' && (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Input
                                className="sm:max-w-xs"
                                onChange={(event) =>
                                    setUniversityFilters((current) => ({
                                        ...current,
                                        search: event.target.value,
                                    }))
                                }
                                placeholder="Search by university name or city..."
                                value={universityFilters.search}
                            />
                            <Select
                                onValueChange={(value) =>
                                    setUniversityFilters((current) => ({
                                        ...current,
                                        country: value === 'all' ? '' : value,
                                    }))
                                }
                                value={universityFilters.country || 'all'}
                            >
                                <SelectTrigger className="w-full sm:w-52">
                                    <SelectValue placeholder="Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All countries
                                    </SelectItem>
                                    {countries.map((country) => (
                                        <SelectItem
                                            key={country}
                                            value={country}
                                        >
                                            {country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                onValueChange={(value) =>
                                    setUniversityFilters((current) => ({
                                        ...current,
                                        is_active: value === 'all' ? '' : value,
                                    }))
                                }
                                value={universityFilters.is_active || 'all'}
                            >
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All universities
                                    </SelectItem>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {universitiesList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border py-16 text-center text-muted-foreground">
                                <Send className="size-6" />
                                <p className="text-sm">
                                    No universities match your filters.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {universitiesList.map((university) => (
                                    <UniversityCard
                                        canDelete={canDelete}
                                        canEdit={canEdit}
                                        key={university.id}
                                        onChanged={loadUniversities}
                                        university={university}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

OpportunitiesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Opportunities', href: opportunitiesRoute.index() },
    ],
};
