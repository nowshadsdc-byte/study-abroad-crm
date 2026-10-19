import { useHttp } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    CircleX,
    Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StudentPicker } from '@/components/student-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EDUCATION_LEVELS, getCountryFlag } from '@/lib/constants';
import { cn } from '@/lib/utils';
import eligibilityApi from '@/routes/api/eligibility';
import type { TaskStudent } from '@/types';

type StudentProfile = {
    id: number;
    type: 'lead' | 'candidate';
    name: string;
    credentials: {
        ielts_score: number | null;
        gpa: number | null;
        education_level: string | null;
        desired_course: string | null;
        desired_country: string | null;
    };
};

type Credentials = {
    ielts_score: number | null;
    gpa: number | null;
    study_gap_years: number | null;
    education_level: string | null;
};

type EligibilityStatus = 'Eligible' | 'Not Eligible' | 'Needs Review';

type EligibilityCheck = {
    label: string;
    status: 'Met' | 'Not Met' | 'Needs Review';
    detail: string;
};

type ProgrammeMatch = {
    id: number;
    title: string;
    program: string | null;
    level: string | null;
    university: string | null;
    country: string | null;
    status: EligibilityStatus;
    checks: EligibilityCheck[];
};

type EvaluationResponse = {
    data: ProgrammeMatch[];
    student: { type: string; id: number; name: string };
    matches_count: number;
    status_counts: Record<EligibilityStatus, number>;
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

const EMPTY_CREDENTIALS: Credentials = {
    ielts_score: null,
    gpa: null,
    study_gap_years: null,
    education_level: null,
};

const PER_PAGE = 24;

const statusStyle: Record<EligibilityStatus, string> = {
    Eligible:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    'Not Eligible':
        'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
    'Needs Review':
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
};

function CheckIcon({ status }: { status: EligibilityCheck['status'] }) {
    if (status === 'Met') {
        return (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
        );
    }

    if (status === 'Not Met') {
        return <CircleX className="mt-0.5 size-3.5 shrink-0 text-rose-600" />;
    }

    return <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />;
}

function ResultSkeleton() {
    return (
        <div className="grid gap-2">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
        </div>
    );
}

function numberOrNull(value: string): number | null {
    return value === '' ? null : Number(value);
}

/**
 * Pick a lead or client, adjust their credentials, and see every open
 * programme ranked by eligibility (best matches first).
 */
export function EligibilityMatcher({
    initialStudent = null,
    onStudentChange,
    resultsClassName,
}: {
    initialStudent?: TaskStudent | null;
    onStudentChange?: (student: TaskStudent | null) => void;
    resultsClassName?: string;
}) {
    const [student, setStudent] = useState<TaskStudent | null>(initialStudent);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [profileError, setProfileError] = useState(false);
    const [credentials, setCredentials] =
        useState<Credentials>(EMPTY_CREDENTIALS);
    const [page, setPage] = useState(1);
    const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(
        null,
    );
    const [evaluationError, setEvaluationError] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const latestRequest = useRef(0);

    const profileRequest = useHttp<
        Record<string, never>,
        { data: StudentProfile }
    >({});
    const evaluationRequest = useHttp<
        Record<string, never>,
        EvaluationResponse
    >(eligibilityApi.evaluate(), {});

    const studentType = student?.type === 'client' ? 'candidate' : 'lead';
    const isProfileLoading =
        student !== null && profile === null && !profileError;

    // Load the academic profile whenever the selected student changes.
    useEffect(() => {
        if (!student) {
            return;
        }

        let cancelled = false;

        profileRequest
            .get(eligibilityApi.students.show([studentType, student.id]).url)
            .then((response) => {
                if (cancelled) {
                    return;
                }

                setProfile(response.data);
                setCredentials({
                    ...EMPTY_CREDENTIALS,
                    ielts_score: response.data.credentials.ielts_score,
                    gpa: response.data.credentials.gpa,
                    education_level: response.data.credentials.education_level,
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setProfileError(true);
                }
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student?.id, studentType]);

    // Re-evaluate (debounced) once the profile is loaded and whenever the
    // credentials or page change. Out-of-order responses are ignored.
    useEffect(() => {
        if (!student || !profile) {
            return;
        }

        const requestId = latestRequest.current + 1;
        latestRequest.current = requestId;

        const timer = window.setTimeout(() => {
            setIsEvaluating(true);
            setEvaluationError(false);
            evaluationRequest.transform(() => ({
                student_type: studentType,
                student_id: student.id,
                ...credentials,
                page,
                per_page: PER_PAGE,
            }));

            evaluationRequest
                .submit()
                .then((response) => {
                    if (requestId === latestRequest.current) {
                        setEvaluation(response);
                    }
                })
                .catch(() => {
                    if (requestId === latestRequest.current) {
                        setEvaluationError(true);
                    }
                })
                .finally(() => {
                    if (requestId === latestRequest.current) {
                        setIsEvaluating(false);
                    }
                });
        }, 300);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, credentials, page, retryKey]);

    const selectStudent = (nextStudent: TaskStudent | null): void => {
        latestRequest.current += 1;
        setStudent(nextStudent);
        setProfile(null);
        setProfileError(false);
        setCredentials(EMPTY_CREDENTIALS);
        setPage(1);
        setEvaluation(null);
        setEvaluationError(false);
        setIsEvaluating(false);
        onStudentChange?.(nextStudent);
    };

    const setCredential = <K extends keyof Credentials>(
        key: K,
        value: Credentials[K],
    ): void => {
        setCredentials((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    const inputValue = (value: number | null): string =>
        value === null ? '' : String(value);
    const credentialsDisabled = !profile;

    return (
        <div className="grid gap-4">
            <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase">
                    <Sparkles className="size-4" />
                    Select a client or lead to auto-match
                </div>
                <StudentPicker
                    value={student}
                    onChange={selectStudent}
                    inputId="eligibility-student-picker"
                />
                {profile?.credentials.desired_course && (
                    <p className="text-xs text-muted-foreground">
                        Interested in {profile.credentials.desired_course}
                        {profile.credentials.desired_country
                            ? ` · ${profile.credentials.desired_country}`
                            : ''}
                    </p>
                )}
                {isProfileLoading && (
                    <p className="text-xs text-muted-foreground">
                        Loading academic profile…
                    </p>
                )}
                {profileError && (
                    <p className="text-xs text-destructive">
                        The academic profile could not be loaded. You may not
                        have access to this record — choose another student.
                    </p>
                )}
            </section>

            <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Evaluation credentials
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="grid gap-2">
                        <Label htmlFor="eligibility-ielts">
                            IELTS / Band score
                        </Label>
                        <Input
                            id="eligibility-ielts"
                            type="number"
                            min="0"
                            max="9"
                            step="0.5"
                            value={inputValue(credentials.ielts_score)}
                            onChange={(event) =>
                                setCredential(
                                    'ielts_score',
                                    numberOrNull(event.target.value),
                                )
                            }
                            disabled={credentialsDisabled}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="eligibility-gpa">CGPA</Label>
                        <Input
                            id="eligibility-gpa"
                            type="number"
                            min="0"
                            max="5"
                            step="0.01"
                            value={inputValue(credentials.gpa)}
                            onChange={(event) =>
                                setCredential(
                                    'gpa',
                                    numberOrNull(event.target.value),
                                )
                            }
                            disabled={credentialsDisabled}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="eligibility-study-gap">
                            Study gap (years)
                        </Label>
                        <Input
                            id="eligibility-study-gap"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={inputValue(credentials.study_gap_years)}
                            onChange={(event) =>
                                setCredential(
                                    'study_gap_years',
                                    numberOrNull(event.target.value),
                                )
                            }
                            disabled={credentialsDisabled}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="eligibility-education">
                            Prior education
                        </Label>
                        <Select
                            value={credentials.education_level ?? 'none'}
                            onValueChange={(value) =>
                                setCredential(
                                    'education_level',
                                    value === 'none' ? null : value,
                                )
                            }
                            disabled={credentialsDisabled}
                        >
                            <SelectTrigger
                                id="eligibility-education"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    Not specified
                                </SelectItem>
                                {EDUCATION_LEVELS.map((level) => (
                                    <SelectItem key={level} value={level}>
                                        {level}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {profile && !credentials.education_level && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        Prior education is not specified; programmes that
                        require a minimum level will need manual review.
                    </p>
                )}
            </section>

            <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-semibold tracking-tight">
                        Matched programmes
                    </h2>
                    {evaluation && (
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-medium">
                            {(
                                [
                                    'Eligible',
                                    'Needs Review',
                                    'Not Eligible',
                                ] as const
                            ).map((status) => (
                                <span
                                    key={status}
                                    className={cn(
                                        'rounded-full border px-2 py-0.5',
                                        statusStyle[status],
                                    )}
                                >
                                    {evaluation.status_counts[status]} {status}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div
                    className={cn(
                        'grid gap-2 transition-opacity',
                        isEvaluating && evaluation && 'opacity-60',
                        resultsClassName,
                    )}
                    aria-busy={isEvaluating}
                >
                    {!student ? (
                        <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed px-4 text-center text-xs text-muted-foreground">
                            Select a lead or client to evaluate available
                            programmes.
                        </div>
                    ) : profileError ? null : evaluationError ? (
                        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Programme results could not be loaded.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRetryKey((key) => key + 1)}
                                disabled={isEvaluating}
                            >
                                Try again
                            </Button>
                        </div>
                    ) : !evaluation ? (
                        <ResultSkeleton />
                    ) : evaluation.data.length === 0 ? (
                        <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed px-4 text-center text-xs text-muted-foreground">
                            No open programmes are available to evaluate.
                        </div>
                    ) : (
                        evaluation.data.map((programme) => (
                            <article
                                key={programme.id}
                                className={cn(
                                    'grid gap-2 rounded-md border p-3',
                                    statusStyle[programme.status],
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-semibold text-foreground">
                                            {programme.title}
                                        </h3>
                                        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                            <span>
                                                {getCountryFlag(
                                                    programme.country,
                                                )}
                                            </span>
                                            <span>
                                                {programme.university ??
                                                    'Institution not specified'}
                                            </span>
                                            {programme.level && (
                                                <span>· {programme.level}</span>
                                            )}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="shrink-0"
                                    >
                                        {programme.status}
                                    </Badge>
                                </div>
                                {programme.checks.length > 0 && (
                                    <ul className="grid gap-1 border-t border-current/10 pt-2">
                                        {programme.checks.map(
                                            (check, index) => (
                                                <li
                                                    key={`${check.label}-${index}`}
                                                    className="flex items-start gap-2 text-xs"
                                                >
                                                    <CheckIcon
                                                        status={check.status}
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="font-medium">
                                                            {check.label}:{' '}
                                                        </span>
                                                        {check.detail}
                                                    </span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </article>
                        ))
                    )}
                </div>

                {evaluation && evaluation.meta.last_page > 1 && (
                    <div className="flex items-center justify-between border-t pt-3">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                                evaluation.meta.current_page <= 1 ||
                                isEvaluating
                            }
                            onClick={() =>
                                setPage(evaluation.meta.current_page - 1)
                            }
                        >
                            <ArrowLeft className="size-4" /> Previous
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            Page {evaluation.meta.current_page} of{' '}
                            {evaluation.meta.last_page}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                                evaluation.meta.current_page >=
                                    evaluation.meta.last_page || isEvaluating
                            }
                            onClick={() =>
                                setPage(evaluation.meta.current_page + 1)
                            }
                        >
                            Next <ArrowRight className="size-4" />
                        </Button>
                    </div>
                )}
            </section>

            <p className="text-[11px] text-muted-foreground">
                Eligibility results are preliminary guidance based on configured
                criteria and do not guarantee admission. Requirements needing
                unavailable student information are marked for review.
            </p>
        </div>
    );
}

/**
 * The matcher in a modal, for opening from other screens.
 */
export function EligibilityMatcherDialog({
    open,
    onOpenChange,
    initialStudent = null,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialStudent?: TaskStudent | null;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        Match by student
                    </DialogTitle>
                    <DialogDescription>
                        Compare a student’s profile with configured programme
                        criteria.
                    </DialogDescription>
                </DialogHeader>
                {open && (
                    <EligibilityMatcher
                        initialStudent={initialStudent}
                        resultsClassName="max-h-[42vh] overflow-y-auto pr-1"
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
