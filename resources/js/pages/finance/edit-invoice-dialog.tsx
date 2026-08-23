import { useHttp } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import invoiceApi from '@/routes/api/invoices';
import type { InvoiceForm, InvoiceItemForm } from './add-invoice-dialog';
import { InvoiceFormFields, useCandidateOptions } from './add-invoice-dialog';

export type EditableInvoice = {
    id: number;
    candidate_id: number | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    client_address: string | null;
    issue_date: string;
    due_date: string | null;
    discount_amount: string;
    tax_rate: string;
    notes: string | null;
    items: { description: string; quantity: string; unit_price: string }[];
};

function buildForm(invoice: EditableInvoice): InvoiceForm {
    const items: InvoiceItemForm[] = invoice.items.length
        ? invoice.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
          }))
        : [{ description: '', quantity: '1', unit_price: '0' }];

    return {
        candidate_id: invoice.candidate_id,
        client_name: invoice.client_name ?? '',
        client_email: invoice.client_email ?? '',
        client_phone: invoice.client_phone ?? '',
        client_address: invoice.client_address ?? '',
        issue_date: invoice.issue_date.slice(0, 10),
        due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
        discount_amount: invoice.discount_amount,
        tax_rate: invoice.tax_rate,
        notes: invoice.notes ?? '',
        items,
    };
}

export function EditInvoiceDialog({
    invoice,
    onUpdated,
    onOpenChange,
    open: openProp,
    trigger,
}: {
    invoice: EditableInvoice;
    onUpdated?: () => void;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    trigger?: React.ReactNode | null;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const { clearErrors, data, errors, processing, setData, submit } =
        useHttp<InvoiceForm>(invoiceApi.update(invoice.id), buildForm(invoice));
    const candidatesRequest = useCandidateOptions();

    const handleOpenChange = (isOpen: boolean): void => {
        setInternalOpen(isOpen);
        onOpenChange?.(isOpen);

        if (isOpen) {
            setData(buildForm(invoice));
            clearErrors();
            candidatesRequest.submit().catch(() => {
                toast.error('Unable to load candidates.');
            });
        } else if (!processing) {
            clearErrors();
        }
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        try {
            const response = await submit();

            if (!response) {
                return;
            }

            handleOpenChange(false);
            onUpdated?.();
            toast.success('Invoice updated successfully.');
        } catch {
            toast.error(
                'Unable to update the invoice. Please review the form and try again.',
            );
        }
    };

    const candidates = candidatesRequest.response?.data ?? [];

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button type="button" variant="outline">
                            <Pencil />
                            Edit
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="size-5 text-primary" />
                        Edit invoice
                    </DialogTitle>
                    <DialogDescription>
                        Update the billing details and line items.
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <InvoiceFormFields
                        candidates={candidates}
                        data={data}
                        errors={errors}
                        idPrefix="edit_"
                        setData={setData}
                    />
                    <DialogFooter>
                        <Button
                            disabled={processing}
                            onClick={() => handleOpenChange(false)}
                            type="button"
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                            disabled={processing}
                            type="submit"
                        >
                            {processing ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
