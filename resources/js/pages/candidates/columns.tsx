import { createColumnHelper } from '@tanstack/react-table';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DataTableFeatures } from '@/components/data-table/table-features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export type CandidateRow = {
    id: number;
    avatar: string | null;
    name: string;
    email: string;
    phone: string;
    desiredCountry: string;
    desiredCourse: string;
    currentStep: string;
    status: string;
    assignee: string;
    invoiceCount: number;
    createdAt: string;
};

const statusTone: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    Active: 'default',
    'On Hold': 'secondary',
    Completed: 'default',
    Withdrawn: 'destructive',
};

const stepTone: Record<string, 'default' | 'secondary' | 'outline'> = {
    Application: 'outline',
    Documents: 'secondary',
    Submission: 'secondary',
    Offer: 'default',
    Visa: 'default',
    Enrollment: 'default',
};

function RowActions({ candidate }: { candidate: CandidateRow }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${candidate.name}`}
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onSelect={() => toast(`Viewing ${candidate.name}`)}
                >
                    <Eye />
                    View candidate
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => toast(`Editing ${candidate.name}`)}
                >
                    <Pencil />
                    Edit candidate
                </DropdownMenuItem>
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => toast(`${candidate.name} removed`)}
                >
                    <Trash2 />
                    Delete candidate
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const columnHelper = createColumnHelper<DataTableFeatures, CandidateRow>();

export const candidateColumns = columnHelper.columns([
    columnHelper.accessor('name', {
        id: 'candidate',
        header: 'Candidate',
        sortFn: 'alphanumeric',
        cell: (info) => (
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {info.row.original.avatar ? (
                        <img
                            src={info.row.original.avatar}
                            alt={info.getValue()}
                            className="h-full w-full rounded-full object-cover"
                        />
                    ) : (
                        info.getValue().substring(0, 2).toUpperCase()
                    )}
                </div>
                <span className="font-medium text-foreground">
                    {info.getValue()}
                </span>
            </div>
        ),
    }),
    columnHelper.display({
        id: 'contact',
        header: 'Contact',
        cell: (props) => (
            <div className="space-y-0.5">
                <p className="text-foreground">{props.row.original.email}</p>
                <p className="text-xs text-muted-foreground">
                    {props.row.original.phone}
                </p>
            </div>
        ),
    }),
    columnHelper.display({
        id: 'interest',
        header: 'Interest',
        cell: (props) => (
            <div className="space-y-0.5">
                <p className="text-foreground">
                    {props.row.original.desiredCourse}
                </p>
                <p className="text-xs text-muted-foreground">
                    {props.row.original.desiredCountry}
                </p>
            </div>
        ),
    }),
    columnHelper.accessor('currentStep', {
        header: 'Step',
        sortFn: 'alphanumeric',
        cell: (info) => {
            const value = info.getValue();
            return (
                <Badge variant={stepTone[value] ?? 'outline'}>{value}</Badge>
            );
        },
    }),
    columnHelper.accessor('status', {
        header: 'Status',
        sortFn: 'alphanumeric',
        cell: (info) => {
            const value = info.getValue();
            return (
                <Badge variant={statusTone[value] ?? 'outline'}>{value}</Badge>
            );
        },
    }),
    columnHelper.accessor('assignee', {
        header: 'Assignee',
        sortFn: 'alphanumeric',
    }),
    columnHelper.accessor('invoiceCount', {
        header: 'Invoices',
        sortFn: 'numeric',
    }),
    columnHelper.accessor('createdAt', {
        header: 'Created',
        sortFn: 'datetime',
        cell: (info) => {
            const date = new Date(info.getValue());
            return (
                <span className="text-muted-foreground">
                    {formatDistanceToNow(date, { addSuffix: true })}
                </span>
            );
        },
    }),
    columnHelper.display({
        id: 'actions',
        header: '',
        cell: (props) => (
            <div
                className="flex justify-end"
                onClick={(event) => event.stopPropagation()}
            >
                <RowActions candidate={props.row.original} />
            </div>
        ),
    }),
]);
