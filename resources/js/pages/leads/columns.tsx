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

export type LeadRow = {
    id: number;
    name: string;
    email: string;
    phone: string;
    interestCourse: string;
    interestCountry: string;
    source: string;
    status: string;
    priority: string;
    assignee: string;
};

const statusTone: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    New: 'secondary',
    Qualified: 'default',
    'Follow-up due': 'outline',
    'Awaiting reply': 'secondary',
    Lost: 'destructive',
};

const priorityTone: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    High: 'destructive',
    Medium: 'secondary',
    Low: 'outline',
};

function RowActions({ lead }: { lead: LeadRow }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${lead.name}`}
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onSelect={() => toast(`Viewing ${lead.name}`)}
                >
                    <Eye />
                    View lead
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => toast(`Editing ${lead.name}`)}
                >
                    <Pencil />
                    Edit lead
                </DropdownMenuItem>
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => toast(`${lead.name} removed`)}
                >
                    <Trash2 />
                    Delete lead
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const columnHelper = createColumnHelper<DataTableFeatures, LeadRow>();

export const leadColumns = columnHelper.columns([
    columnHelper.accessor('name', {
        id: 'lead',
        header: 'Lead',
        sortFn: 'alphanumeric',
        cell: (info) => (
            <span className="font-medium text-foreground">
                {info.getValue()}
            </span>
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
    columnHelper.accessor('interestCourse', {
        header: 'Interested Course',
        sortFn: 'alphanumeric',
    }),
    columnHelper.accessor('interestCountry', {
        header: 'Interested Country',
        sortFn: 'alphanumeric',
    }),
    columnHelper.accessor('source', {
        header: 'Source',
        sortFn: 'alphanumeric',
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
    columnHelper.accessor('priority', {
        header: 'Priority',
        sortFn: 'alphanumeric',
        cell: (info) => {
            const value = info.getValue();

            return (
                <Badge variant={priorityTone[value] ?? 'outline'}>
                    {value}
                </Badge>
            );
        },
    }),
    columnHelper.accessor('assignee', {
        header: 'Assignee',
        sortFn: 'alphanumeric',
    }),
    columnHelper.display({
        id: 'actions',
        header: '',
        cell: (props) => (
            <div
                className="flex justify-end"
                onClick={(event) => event.stopPropagation()}
            >
                <RowActions lead={props.row.original} />
            </div>
        ),
    }),
]);
