import { Head, Link, router, useHttp } from '@inertiajs/react';
import {
    CheckCircle2,
    HandCoins,
    Pencil,
    Printer,
    ReceiptText,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { formatCurrency } from '@/lib/constants';
import { dashboard } from '@/routes';
import invoiceApi from '@/routes/api/invoices';
import candidates from '@/routes/candidates';
import finance from '@/routes/finance';
import { EditInvoiceDialog } from './edit-invoice-dialog';
import type { EditableInvoice } from './edit-invoice-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';

const COMPANY = {
    name: 'Confidence Global Bd',
    tagline: 'Study Abroad & Admissions Consultancy',
    address: 'House 12, Road 5, Banani, Dhaka 1213, Bangladesh',
    email: 'info@confidenceglobalbd.com',
    phone: '+880 1700 000000',
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

type InvoiceItem = {
    id: number;
    description: string;
    quantity: string;
    unit_price: string;
    total: string;
};

type InvoicePayment = {
    id: number;
    amount: string;
    method: string;
    paid_at: string;
    note: string | null;
    recorded_by: { id: number; name: string } | null;
};

type InvoiceDetail = {
    id: number;
    invoice_number: string;
    candidate_id: number | null;
    candidate: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
    } | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    client_address: string | null;
    issue_date: string;
    due_date: string | null;
    subtotal: string;
    discount_amount: string;
    tax_rate: string;
    tax_amount: string;
    total: string;
    amount_paid: string;
    balance_due: string;
    status: string;
    notes: string | null;
    items: InvoiceItem[];
    payments: InvoicePayment[];
};

type InvoiceResponse = {
    data: InvoiceDetail;
};

export default function InvoiceShow({ invoiceId }: { invoiceId: number }) {
    const { can } = usePermission();
    const { response, submit } = useHttp<Record<string, never>, InvoiceResponse>(
        invoiceApi.show(invoiceId),
        {},
    );
    const [editOpen, setEditOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const markPaidRequest = useHttp<Record<string, never>>(
        invoiceApi.markPaid(invoiceId),
        {},
    );
    const cancelRequest = useHttp<Record<string, never>>(
        invoiceApi.cancel(invoiceId),
        {},
    );
    const destroyRequest = useHttp<Record<string, never>>(
        invoiceApi.destroy(invoiceId),
        {},
    );

    const loadInvoice = useCallback(async (): Promise<void> => {
        try {
            await submit();
        } catch {
            toast.error(
                'Unable to load this invoice. Please refresh and try again.',
            );
        }
    }, [submit]);

    useEffect(() => {
        void loadInvoice();
    }, [loadInvoice]);

    const invoice = response?.data;

    if (!invoice) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Loading invoice...
            </div>
        );
    }

    const canEdit = can('finance.edit');
    const canDelete = can('finance.delete');
    const balanceDue = Number(invoice.balance_due);

    const editableInvoice: EditableInvoice = {
        id: invoice.id,
        candidate_id: invoice.candidate_id,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_phone: invoice.client_phone,
        client_address: invoice.client_address,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        discount_amount: invoice.discount_amount,
        tax_rate: invoice.tax_rate,
        notes: invoice.notes,
        items: invoice.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
        })),
    };

    const handleMarkPaid = async (): Promise<void> => {
        try {
            await markPaidRequest.submit();
            toast.success('Invoice marked as paid.');
            void loadInvoice();
        } catch {
            toast.error('Unable to mark this invoice as paid.');
        }
    };

    const handleCancel = async (): Promise<void> => {
        try {
            await cancelRequest.submit();
            toast.success('Invoice cancelled.');
            void loadInvoice();
        } catch {
            toast.error('Unable to cancel this invoice.');
        }
    };

    const handleDelete = async (): Promise<void> => {
        try {
            await destroyRequest.submit();
            toast.success('Invoice deleted.');
            router.visit(finance.index().url);
        } catch {
            toast.error('Unable to delete this invoice.');
        }
    };

    const billedTo = invoice.candidate
        ? {
              name: invoice.candidate.name,
              email: invoice.candidate.email,
              phone: invoice.candidate.phone,
              address: invoice.candidate.address,
          }
        : {
              name: invoice.client_name,
              email: invoice.client_email,
              phone: invoice.client_phone,
              address: invoice.client_address,
          };

    return (
        <>
            <Head title={`Invoice ${invoice.invoice_number}`} />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 sm:p-6 print:p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3 print:hidden">
                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit && invoice.status !== 'Cancelled' && (
                            <Button
                                onClick={() => setEditOpen(true)}
                                type="button"
                                variant="outline"
                            >
                                <Pencil />
                                Edit
                            </Button>
                        )}
                        <Button
                            onClick={() => window.print()}
                            type="button"
                            variant="outline"
                        >
                            <Printer />
                            Print
                        </Button>
                        {canEdit && balanceDue > 0 && invoice.status !== 'Cancelled' && (
                            <>
                                <Button
                                    className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                                    disabled={markPaidRequest.processing}
                                    onClick={() => void handleMarkPaid()}
                                    type="button"
                                >
                                    <CheckCircle2 />
                                    Mark as Paid
                                </Button>
                                <Button
                                    onClick={() => setPayOpen(true)}
                                    type="button"
                                    variant="outline"
                                >
                                    <HandCoins />
                                    Mark as Partial
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit && invoice.status !== 'Cancelled' && (
                            <Button
                                disabled={cancelRequest.processing}
                                onClick={() => void handleCancel()}
                                type="button"
                                variant="outline"
                            >
                                <XCircle />
                                Cancel invoice
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                onClick={() => setDeleteOpen(true)}
                                type="button"
                                variant="destructive"
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border shadow-sm print:border-none print:shadow-none">
                    <div className="bg-linear-to-br from-primary to-teal-700 p-6 text-primary-foreground sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-12 items-center justify-center rounded-xl bg-white/15">
                                    <ReceiptText className="size-6" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold tracking-tight">
                                        {COMPANY.name}
                                    </p>
                                    <p className="text-xs text-primary-foreground/80">
                                        {COMPANY.tagline}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs tracking-widest text-primary-foreground/80 uppercase">
                                    Invoice
                                </p>
                                <p className="font-mono text-2xl font-bold">
                                    {invoice.invoice_number}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-6 py-3 sm:px-8">
                        <Badge
                            className={statusTone[invoice.status] ?? ''}
                            variant="outline"
                        >
                            {invoice.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                            Issued {formatDate(invoice.issue_date)}
                            {invoice.due_date &&
                                ` · Due ${formatDate(invoice.due_date)}`}
                        </p>
                    </div>

                    <div className="grid gap-6 border-b p-6 sm:grid-cols-2 sm:p-8">
                        <div>
                            <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                Bill From
                            </p>
                            <p className="font-medium text-foreground">
                                {COMPANY.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {COMPANY.address}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {COMPANY.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {COMPANY.phone}
                            </p>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                Bill To
                            </p>
                            <p className="font-medium text-foreground">
                                {billedTo.name || '—'}
                            </p>
                            {billedTo.address && (
                                <p className="text-sm text-muted-foreground">
                                    {billedTo.address}
                                </p>
                            )}
                            {billedTo.email && (
                                <p className="text-sm text-muted-foreground">
                                    {billedTo.email}
                                </p>
                            )}
                            {billedTo.phone && (
                                <p className="text-sm text-muted-foreground">
                                    {billedTo.phone}
                                </p>
                            )}
                            {invoice.candidate && (
                                <Link
                                    className="mt-1 inline-block text-sm text-primary hover:underline print:hidden"
                                    href={candidates.show(invoice.candidate.id).url}
                                >
                                    View candidate profile
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto p-6 sm:p-8">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                <tr>
                                    <th className="pb-2">Description</th>
                                    <th className="pb-2 text-right">Qty</th>
                                    <th className="pb-2 text-right">
                                        Unit Price
                                    </th>
                                    <th className="pb-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invoice.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-2.5 text-foreground">
                                            {item.description}
                                        </td>
                                        <td className="py-2.5 text-right text-muted-foreground">
                                            {Number(item.quantity)}
                                        </td>
                                        <td className="py-2.5 text-right text-muted-foreground">
                                            {formatCurrency(
                                                item.unit_price,
                                                'BDT',
                                            )}
                                        </td>
                                        <td className="py-2.5 text-right font-medium text-foreground">
                                            {formatCurrency(item.total, 'BDT')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-6 flex justify-end">
                            <div className="w-full max-w-xs space-y-1.5 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>
                                        {formatCurrency(
                                            invoice.subtotal,
                                            'BDT',
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Discount</span>
                                    <span>
                                        -
                                        {formatCurrency(
                                            invoice.discount_amount,
                                            'BDT',
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tax ({Number(invoice.tax_rate)}%)</span>
                                    <span>
                                        {formatCurrency(
                                            invoice.tax_amount,
                                            'BDT',
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-1.5 text-base font-semibold text-foreground">
                                    <span>Grand Total</span>
                                    <span>
                                        {formatCurrency(invoice.total, 'BDT')}
                                    </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Amount Paid</span>
                                    <span>
                                        {formatCurrency(
                                            invoice.amount_paid,
                                            'BDT',
                                        )}
                                    </span>
                                </div>
                                <div
                                    className={`flex justify-between rounded-md px-2 py-1.5 font-semibold ${
                                        balanceDue > 0
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            : 'text-primary'
                                    }`}
                                >
                                    <span>Balance Due</span>
                                    <span>
                                        {formatCurrency(balanceDue, 'BDT')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {invoice.notes && (
                            <div className="mt-6 border-t pt-4">
                                <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Notes
                                </p>
                                <p className="text-sm whitespace-pre-line text-muted-foreground">
                                    {invoice.notes}
                                </p>
                            </div>
                        )}

                        {invoice.payments.length > 0 && (
                            <div className="mt-6 border-t pt-4 print:hidden">
                                <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Payment History
                                </p>
                                <div className="space-y-2">
                                    {invoice.payments.map((payment) => (
                                        <div
                                            className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                                            key={payment.id}
                                        >
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {formatCurrency(
                                                        payment.amount,
                                                        'BDT',
                                                    )}{' '}
                                                    <span className="font-normal text-muted-foreground">
                                                        via {payment.method}
                                                    </span>
                                                </p>
                                                {payment.note && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {payment.note}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(payment.paid_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {canEdit && (
                <EditInvoiceDialog
                    invoice={editableInvoice}
                    onOpenChange={setEditOpen}
                    onUpdated={loadInvoice}
                    open={editOpen}
                    trigger={null}
                />
            )}
            <RecordPaymentDialog
                amountPaid={Number(invoice.amount_paid)}
                balanceDue={balanceDue}
                invoiceId={invoice.id}
                onOpenChange={setPayOpen}
                onRecorded={loadInvoice}
                open={payOpen}
                total={Number(invoice.total)}
            />
            {canDelete && (
                <DeleteConfirmDialog
                    description={`This will permanently delete invoice "${invoice.invoice_number}" and all of its recorded payments. This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onOpenChange={setDeleteOpen}
                    open={deleteOpen}
                    title="Delete this invoice?"
                />
            )}
        </>
    );
}

InvoiceShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Finance', href: finance.index() },
        { title: 'Invoice', href: '#' },
    ],
};
