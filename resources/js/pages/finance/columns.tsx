import { createColumnHelper } from '@tanstack/react-table';
import { Eye, Wallet } from 'lucide-react';
import type { DataTableFeatures } from '@/components/data-table/table-features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/constants';

export type InvoiceRow = {
    id: number;
    invoiceNumber: string;
    clientName: string;
    clientEmail: string;
    candidateId: number | null;
    issueDate: string;
    dueDate: string | null;
    total: number;
    amountPaid: number;
    balanceDue: number;
    status: string;
};

const statusTone: Record<string, string> = {
    Unpaid: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    Partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Paid: 'bg-primary/10 text-primary',
    Overdue: 'bg-destructive/10 text-destructive',
    Cancelled: 'bg-muted text-muted-foreground',
};

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const columnHelper = createColumnHelper<DataTableFeatures, InvoiceRow>();

export function createInvoiceColumns({
    onView,
    onQuickPay,
}: {
    onView: (invoice: InvoiceRow) => void;
    onQuickPay: (invoice: InvoiceRow) => void;
}) {
    return columnHelper.columns([
        columnHelper.accessor('invoiceNumber', {
            header: 'Invoice #',
            sortFn: 'alphanumeric',
            cell: (info) => (
                <span className="font-mono text-sm font-medium text-foreground">
                    {info.getValue()}
                </span>
            ),
        }),
        columnHelper.display({
            id: 'client',
            header: 'Client',
            cell: (props) => (
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">
                            {props.row.original.clientName || '—'}
                        </span>
                        {props.row.original.candidateId && (
                            <Badge
                                className="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                variant="outline"
                            >
                                Candidate
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {props.row.original.clientEmail || '—'}
                    </p>
                </div>
            ),
        }),
        columnHelper.display({
            id: 'dates',
            header: 'Dates',
            cell: (props) => (
                <div className="space-y-0.5 text-xs">
                    <p className="text-foreground">
                        Issued {formatDate(props.row.original.issueDate)}
                    </p>
                    <p className="text-muted-foreground">
                        Due {formatDate(props.row.original.dueDate)}
                    </p>
                </div>
            ),
        }),
        columnHelper.display({
            id: 'financials',
            header: 'Financials',
            cell: (props) => (
                <div className="space-y-0.5">
                    <p className="font-medium text-foreground">
                        {formatCurrency(props.row.original.total, 'BDT')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Paid{' '}
                        {formatCurrency(props.row.original.amountPaid, 'BDT')}
                    </p>
                    {props.row.original.balanceDue > 0 &&
                        props.row.original.status !== 'Cancelled' && (
                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                Due{' '}
                                {formatCurrency(
                                    props.row.original.balanceDue,
                                    'BDT',
                                )}
                            </p>
                        )}
                </div>
            ),
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            sortFn: 'alphanumeric',
            cell: (info) => {
                const value = info.getValue();

                return (
                    <Badge
                        className={statusTone[value] ?? ''}
                        variant="outline"
                    >
                        {value}
                    </Badge>
                );
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: (props) => (
                <div
                    className="flex justify-end gap-1"
                    onClick={(event) => event.stopPropagation()}
                >
                    {props.row.original.balanceDue > 0 &&
                        !['Cancelled'].includes(props.row.original.status) && (
                            <Button
                                aria-label={`Quick pay ${props.row.original.invoiceNumber}`}
                                onClick={() => onQuickPay(props.row.original)}
                                size="icon"
                                title="Quick pay"
                                type="button"
                                variant="ghost"
                            >
                                <Wallet className="size-4 text-primary" />
                            </Button>
                        )}
                    <Button
                        aria-label={`View ${props.row.original.invoiceNumber}`}
                        onClick={() => onView(props.row.original)}
                        size="icon"
                        title="View invoice"
                        type="button"
                        variant="ghost"
                    >
                        <Eye className="size-4" />
                    </Button>
                </div>
            ),
        }),
    ]);
}
