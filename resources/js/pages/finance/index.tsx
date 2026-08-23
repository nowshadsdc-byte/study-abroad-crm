import { Head, router, useHttp } from '@inertiajs/react';
import {
    BadgeDollarSign,
    CircleDollarSign,
    ReceiptText,
    Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CrmListPage } from '@/components/crm-list-page';
import { DataTable } from '@/components/data-table/data-table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/constants';
import { dashboard } from '@/routes';
import invoiceApi from '@/routes/api/invoices';
import finance from '@/routes/finance';
import { AddInvoiceDialog } from './add-invoice-dialog';
import { createInvoiceColumns } from './columns';
import type { InvoiceRow } from './columns';
import { RecordPaymentDialog } from './record-payment-dialog';

const statuses = ['Unpaid', 'Partial', 'Paid', 'Overdue', 'Cancelled'];

type InvoiceFilters = {
    status: string;
};

const initialFilters: InvoiceFilters = { status: '' };

type InvoiceApiRow = {
    id: number;
    invoice_number: string;
    client_name: string | null;
    client_email: string | null;
    candidate: { id: number; name: string; email: string | null } | null;
    issue_date: string;
    due_date: string | null;
    total: string;
    amount_paid: string;
    balance_due: string;
    status: string;
};

type InvoicesResponse = {
    data: InvoiceApiRow[];
    metrics: {
        total_revenue: number;
        outstanding: number;
        overdue: number;
        total_invoiced: number;
    };
};

function mapInvoiceRow(invoice: InvoiceApiRow): InvoiceRow {
    return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.candidate?.name ?? invoice.client_name ?? '',
        clientEmail: invoice.candidate?.email ?? invoice.client_email ?? '',
        candidateId: invoice.candidate?.id ?? null,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        total: Number(invoice.total),
        amountPaid: Number(invoice.amount_paid),
        balanceDue: Number(invoice.balance_due),
        status: invoice.status,
    };
}

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

export default function FinanceIndex() {
    const { data: filters, response, setData: setFilters, submit } = useHttp<
        InvoiceFilters,
        InvoicesResponse
    >(invoiceApi.index(), initialFilters);
    const [payingInvoice, setPayingInvoice] = useState<InvoiceRow | null>(null);

    const loadInvoices = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load invoices. Please refresh the page and try again.',
            );
        }
    }, [submit]);

    useDebouncedEffect(
        () => {
            void loadInvoices();
        },
        [filters],
        300,
    );

    const invoices = response?.data.map(mapInvoiceRow) ?? [];
    const metrics = response?.metrics ?? {
        total_revenue: 0,
        outstanding: 0,
        overdue: 0,
        total_invoiced: 0,
    };

    const columns = createInvoiceColumns({
        onView: (invoice) => router.visit(finance.show(invoice.id).url),
        onQuickPay: (invoice) => setPayingInvoice(invoice),
    });

    return (
        <>
            <Head title="Finance" />
            <CrmListPage
                description="Invoices, payment collection, revenue, and billing activity."
                headerAction={<AddInvoiceDialog onCreated={loadInvoices} />}
                metrics={[
                    {
                        label: 'Total Revenue',
                        value: formatCurrency(metrics.total_revenue, 'BDT'),
                        detail: 'Fully collected invoices',
                        icon: CircleDollarSign,
                        tone: 'bg-primary/10 text-primary',
                    },
                    {
                        label: 'Outstanding',
                        value: formatCurrency(metrics.outstanding, 'BDT'),
                        detail: 'Unpaid, partial, and overdue',
                        icon: ReceiptText,
                        tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    },
                    {
                        label: 'Overdue',
                        value: formatCurrency(metrics.overdue, 'BDT'),
                        detail: 'Past their due date',
                        icon: Wallet,
                        tone: 'bg-destructive/10 text-destructive',
                    },
                    {
                        label: 'Total Invoiced',
                        value: formatCurrency(metrics.total_invoiced, 'BDT'),
                        detail: 'All active invoices',
                        icon: BadgeDollarSign,
                        tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
                    },
                ]}
                title="Finance"
            />

            <div className="px-4 pb-6 sm:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Invoices</CardTitle>
                        <CardDescription>
                            Search, filter, and manage every invoice.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={invoices}
                            emptyMessage="No invoices match your search."
                            onRowClick={(invoice) =>
                                router.visit(finance.show(invoice.id).url)
                            }
                            searchPlaceholder="Search by invoice #, client name, or email..."
                            toolbar={
                                <Select
                                    onValueChange={(value) =>
                                        setFilters((current) => ({
                                            ...current,
                                            status: value === 'all' ? '' : value,
                                        }))
                                    }
                                    value={filters.status || 'all'}
                                >
                                    <SelectTrigger className="w-full sm:w-44">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All statuses
                                        </SelectItem>
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            }
                        />
                    </CardContent>
                </Card>
            </div>

            {payingInvoice && (
                <RecordPaymentDialog
                    amountPaid={payingInvoice.amountPaid}
                    balanceDue={payingInvoice.balanceDue}
                    invoiceId={payingInvoice.id}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setPayingInvoice(null);
                        }
                    }}
                    onRecorded={loadInvoices}
                    open={Boolean(payingInvoice)}
                    total={payingInvoice.total}
                />
            )}
        </>
    );
}

FinanceIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Finance', href: finance.index() },
    ],
};
