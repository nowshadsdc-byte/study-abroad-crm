import { router, useHttp } from '@inertiajs/react';
import {
    Award,
    CalendarClock,
    Eye,
    ListChecks,
    MoreHorizontal,
    Pencil,
    Trash2,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UniversityAvatar } from '@/components/university-avatar';
import { CURRENCY_SYMBOL, getCountryFlag } from '@/lib/constants';
import { getDeadlineStatus } from '@/lib/deadline';
import opportunityApi from '@/routes/api/opportunities';
import opportunities from '@/routes/opportunities';
import { EditOpportunityDialog } from './edit-opportunity-dialog';
import type { EditableOpportunity } from './edit-opportunity-dialog';

export type ProgramCardData = {
    id: number;
    university_id: number;
    title: string;
    program: string | null;
    level: string | null;
    intake: string | null;
    deadline: string | null;
    tuition_fee: string | null;
    currency: string | null;
    scholarship: string | null;
    requirements: string | null;
    eligibility_criteria: EditableOpportunity['eligibility_criteria'];
    status: string;
    applications_count: number;
    university: {
        id: number;
        name: string;
        country: string | null;
        city: string | null;
        logo_url: string | null;
    } | null;
};

const statusTone: Record<string, string> = {
    Open: 'bg-primary/10 text-primary',
    Limited: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Closed: 'bg-destructive/10 text-destructive',
};

function requirementCount(requirements: string | null): number {
    if (!requirements) {
        return 0;
    }

    return requirements
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean).length;
}

export function ProgramCard({
    program,
    canEdit,
    canDelete,
    onChanged,
}: {
    program: ProgramCardData;
    canEdit: boolean;
    canDelete: boolean;
    onChanged: () => void;
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const destroyRequest = useHttp<Record<string, never>>(
        opportunityApi.destroy(program.id),
        {},
    );
    const deadlineStatus = getDeadlineStatus(program.deadline);
    const currencySymbol = program.currency
        ? (CURRENCY_SYMBOL[program.currency] ?? `${program.currency} `)
        : '';

    const editableOpportunity: EditableOpportunity = {
        id: program.id,
        university_id: program.university_id,
        title: program.title,
        program: program.program,
        level: program.level,
        intake: program.intake,
        deadline: program.deadline,
        tuition_fee: program.tuition_fee,
        currency: program.currency,
        scholarship: program.scholarship,
        requirements: program.requirements,
        eligibility_criteria: program.eligibility_criteria,
        status: program.status,
    };

    const handleDelete = async (): Promise<void> => {
        try {
            await destroyRequest.submit();
            toast.success('Program deleted.');
            onChanged();
        } catch {
            toast.error('Unable to delete this program.');
        }
    };

    return (
        <Card className="gap-3 py-4 transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-3 px-4">
                <div className="flex items-start justify-between gap-2">
                    <button
                        className="flex flex-1 items-start gap-3 text-left"
                        onClick={() =>
                            router.visit(opportunities.show(program.id))
                        }
                        type="button"
                    >
                        <UniversityAvatar
                            logoUrl={program.university?.logo_url}
                            name={program.university?.name ?? '?'}
                            size="md"
                        />
                        <div className="min-w-0 space-y-0.5">
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>
                                    {getCountryFlag(
                                        program.university?.country,
                                    )}
                                </span>
                                <span className="truncate">
                                    {program.university?.name ??
                                        'Unknown university'}
                                </span>
                            </p>
                            <p className="truncate text-sm font-semibold text-foreground">
                                {program.title}
                            </p>
                            {program.program && (
                                <p className="truncate text-xs text-muted-foreground">
                                    {program.program}
                                </p>
                            )}
                        </div>
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                aria-label={`Actions for ${program.title}`}
                                size="icon"
                                variant="ghost"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() =>
                                    router.visit(opportunities.show(program.id))
                                }
                            >
                                <Eye />
                                View program
                            </DropdownMenuItem>
                            {canEdit && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        setEditOpen(true);
                                    }}
                                >
                                    <Pencil />
                                    Edit program
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        setDeleteOpen(true);
                                    }}
                                    variant="destructive"
                                >
                                    <Trash2 />
                                    Delete program
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {program.level && (
                        <Badge variant="secondary">{program.level}</Badge>
                    )}
                    {program.intake && (
                        <Badge variant="outline">{program.intake}</Badge>
                    )}
                    <Badge
                        className={statusTone[program.status] ?? ''}
                        variant="outline"
                    >
                        {program.status}
                    </Badge>
                    {deadlineStatus && (
                        <Badge
                            className={deadlineStatus.className}
                            variant="outline"
                        >
                            <CalendarClock className="size-3" />
                            {deadlineStatus.label}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                        {program.tuition_fee
                            ? `${currencySymbol}${Number(program.tuition_fee).toLocaleString()}`
                            : 'Fee not set'}
                    </span>
                    <div className="flex items-center gap-3">
                        {program.scholarship && (
                            <span
                                className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
                                title={program.scholarship}
                            >
                                <Award className="size-3.5" />
                                Scholarship
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <ListChecks className="size-3.5" />
                            {requirementCount(program.requirements)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {program.applications_count}
                        </span>
                    </div>
                </div>
            </CardContent>

            {canEdit && (
                <EditOpportunityDialog
                    canEdit={canEdit}
                    onOpenChange={setEditOpen}
                    onUpdated={onChanged}
                    open={editOpen}
                    opportunity={editableOpportunity}
                    trigger={null}
                />
            )}
            {canDelete && (
                <DeleteConfirmDialog
                    description={`This will permanently delete "${program.title}" and all related candidate applications. This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onOpenChange={setDeleteOpen}
                    open={deleteOpen}
                    title="Delete this program?"
                />
            )}
        </Card>
    );
}
