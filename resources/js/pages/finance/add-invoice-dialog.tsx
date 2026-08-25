import { useHttp } from '@inertiajs/react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TabGroup } from '@/components/tab-group';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/constants';
import candidateApi from '@/routes/api/candidates';
import invoiceApi from '@/routes/api/invoices';

export type InvoiceItemForm = {
    description: string;
    quantity: string;
    unit_price: string;
};

export type InvoiceForm = {
    candidate_id: number | null;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    issue_date: string;
    due_date: string;
    discount_amount: string;
    tax_rate: string;
    notes: string;
    items: InvoiceItemForm[];
};

const emptyItem: InvoiceItemForm = {
    description: '',
    quantity: '1',
    unit_price: '0',
};

export function initialInvoiceForm(): InvoiceForm {
    return {
        candidate_id: null,
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        discount_amount: '0',
        tax_rate: '0',
        notes: '',
        items: [{ ...emptyItem }],
    };
}

export type CandidateOption = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

export function useCandidateOptions() {
    return useHttp<Record<string, never>, { data: CandidateOption[] }>(
        candidateApi.index({ query: { per_page: 100 } }),
        {},
    );
}

type FieldProps = {
    children: React.ReactNode;
    error?: string;
    label: string;
    name: string;
};

function Field({ children, error, label, name }: FieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

function computeTotals(
    items: InvoiceItemForm[],
    discountAmount: string,
    taxRate: string,
): { subtotal: number; discount: number; tax: number; total: number } {
    const subtotal = items.reduce(
        (sum, item) =>
            sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0,
    );
    const discount = Number(discountAmount) || 0;
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * ((Number(taxRate) || 0) / 100);

    return { subtotal, discount, tax, total: taxable + tax };
}

export function InvoiceFormFields({
    data,
    errors,
    setData,
    candidates,
    idPrefix = '',
}: {
    data: InvoiceForm;
    errors: Partial<Record<keyof InvoiceForm, string>>;
    setData: <K extends keyof InvoiceForm>(
        key: K,
        value: InvoiceForm[K],
    ) => void;
    candidates: CandidateOption[];
    idPrefix?: string;
}) {
    const [billTo, setBillTo] = useState<'candidate' | 'client'>(
        data.candidate_id ? 'candidate' : 'client',
    );

    const updateItem = (
        index: number,
        key: keyof InvoiceItemForm,
        value: string,
    ): void => {
        setData(
            'items',
            data.items.map((item, i) =>
                i === index ? { ...item, [key]: value } : item,
            ),
        );
    };

    const addItem = (): void =>
        setData('items', [...data.items, { ...emptyItem }]);
    const removeItem = (index: number): void =>
        setData(
            'items',
            data.items.filter((_, i) => i !== index),
        );

    const totals = computeTotals(
        data.items,
        data.discount_amount,
        data.tax_rate,
    );

    return (
        <div className="grid gap-5">
            <div className="grid gap-2">
                <Label>Bill to</Label>
                <TabGroup
                    onChange={(value) => {
                        const next =
                            value === 'candidate' ? 'candidate' : 'client';
                        setBillTo(next);

                        if (next === 'client') {
                            setData('candidate_id', null);
                        }
                    }}
                    options={[
                        { value: 'candidate', label: 'Candidate' },
                        { value: 'client', label: 'External Client' },
                    ]}
                    value={billTo}
                />
            </div>

            {billTo === 'candidate' ? (
                <Field
                    error={errors.candidate_id || errors.client_name}
                    label="Candidate *"
                    name={`${idPrefix}candidate_id`}
                >
                    <Select
                        onValueChange={(value) =>
                            setData('candidate_id', Number(value))
                        }
                        value={
                            data.candidate_id
                                ? String(data.candidate_id)
                                : undefined
                        }
                    >
                        <SelectTrigger
                            aria-invalid={Boolean(
                                errors.candidate_id || errors.client_name,
                            )}
                            className="w-full"
                            id={`${idPrefix}candidate_id`}
                        >
                            <SelectValue placeholder="Select a candidate" />
                        </SelectTrigger>
                        <SelectContent>
                            {candidates.map((candidate) => (
                                <SelectItem
                                    key={candidate.id}
                                    value={String(candidate.id)}
                                >
                                    {candidate.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        error={errors.client_name}
                        label="Client name *"
                        name={`${idPrefix}client_name`}
                    >
                        <Input
                            aria-invalid={Boolean(errors.client_name)}
                            id={`${idPrefix}client_name`}
                            onChange={(event) =>
                                setData('client_name', event.target.value)
                            }
                            placeholder="e.g. Acme Corp"
                            value={data.client_name}
                        />
                    </Field>
                    <Field
                        error={errors.client_email}
                        label="Client email"
                        name={`${idPrefix}client_email`}
                    >
                        <Input
                            aria-invalid={Boolean(errors.client_email)}
                            id={`${idPrefix}client_email`}
                            onChange={(event) =>
                                setData('client_email', event.target.value)
                            }
                            placeholder="billing@client.com"
                            type="email"
                            value={data.client_email}
                        />
                    </Field>
                    <Field
                        error={errors.client_phone}
                        label="Client phone"
                        name={`${idPrefix}client_phone`}
                    >
                        <Input
                            aria-invalid={Boolean(errors.client_phone)}
                            id={`${idPrefix}client_phone`}
                            onChange={(event) =>
                                setData('client_phone', event.target.value)
                            }
                            placeholder="+880 1..."
                            value={data.client_phone}
                        />
                    </Field>
                    <Field
                        error={errors.client_address}
                        label="Client address"
                        name={`${idPrefix}client_address`}
                    >
                        <Input
                            aria-invalid={Boolean(errors.client_address)}
                            id={`${idPrefix}client_address`}
                            onChange={(event) =>
                                setData('client_address', event.target.value)
                            }
                            placeholder="Full address"
                            value={data.client_address}
                        />
                    </Field>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    error={errors.issue_date}
                    label="Issue date *"
                    name={`${idPrefix}issue_date`}
                >
                    <Input
                        aria-invalid={Boolean(errors.issue_date)}
                        id={`${idPrefix}issue_date`}
                        onChange={(event) =>
                            setData('issue_date', event.target.value)
                        }
                        type="date"
                        value={data.issue_date}
                    />
                </Field>
                <Field
                    error={errors.due_date}
                    label="Due date"
                    name={`${idPrefix}due_date`}
                >
                    <Input
                        aria-invalid={Boolean(errors.due_date)}
                        id={`${idPrefix}due_date`}
                        onChange={(event) =>
                            setData('due_date', event.target.value)
                        }
                        type="date"
                        value={data.due_date}
                    />
                </Field>
            </div>

            <div className="grid gap-2">
                <Label>Line items *</Label>
                <div className="space-y-2 rounded-lg border p-3">
                    <div className="hidden grid-cols-[1fr_90px_120px_120px_36px] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                        <span>Description</span>
                        <span>Qty</span>
                        <span>Unit price</span>
                        <span>Line total</span>
                        <span />
                    </div>
                    {data.items.map((item, index) => {
                        const lineTotal =
                            (Number(item.quantity) || 0) *
                            (Number(item.unit_price) || 0);

                        return (
                            <div
                                className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_120px_120px_36px] sm:items-center"
                                key={index}
                            >
                                <Input
                                    aria-label="Item description"
                                    className="col-span-2 sm:col-span-1"
                                    onChange={(event) =>
                                        updateItem(
                                            index,
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Consultation fee"
                                    value={item.description}
                                />
                                <Input
                                    aria-label="Quantity"
                                    min="0"
                                    onChange={(event) =>
                                        updateItem(
                                            index,
                                            'quantity',
                                            event.target.value,
                                        )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={item.quantity}
                                />
                                <Input
                                    aria-label="Unit price"
                                    min="0"
                                    onChange={(event) =>
                                        updateItem(
                                            index,
                                            'unit_price',
                                            event.target.value,
                                        )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={item.unit_price}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {formatCurrency(lineTotal, 'BDT')}
                                </p>
                                <Button
                                    aria-label="Remove item"
                                    disabled={data.items.length === 1}
                                    onClick={() => removeItem(index)}
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                >
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                        );
                    })}
                    <Button
                        className="mt-1"
                        onClick={addItem}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        <Plus />
                        Add item
                    </Button>
                </div>
                {errors.items && (
                    <p className="text-xs text-destructive">{errors.items}</p>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    error={errors.discount_amount}
                    label="Discount amount"
                    name={`${idPrefix}discount_amount`}
                >
                    <Input
                        aria-invalid={Boolean(errors.discount_amount)}
                        id={`${idPrefix}discount_amount`}
                        min="0"
                        onChange={(event) =>
                            setData('discount_amount', event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={data.discount_amount}
                    />
                </Field>
                <Field
                    error={errors.tax_rate}
                    label="Tax rate (%)"
                    name={`${idPrefix}tax_rate`}
                >
                    <Input
                        aria-invalid={Boolean(errors.tax_rate)}
                        id={`${idPrefix}tax_rate`}
                        max="100"
                        min="0"
                        onChange={(event) =>
                            setData('tax_rate', event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={data.tax_rate}
                    />
                </Field>
            </div>

            <Field error={errors.notes} label="Notes" name={`${idPrefix}notes`}>
                <textarea
                    aria-invalid={Boolean(errors.notes)}
                    className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                    id={`${idPrefix}notes`}
                    onChange={(event) => setData('notes', event.target.value)}
                    placeholder="Payment instructions or additional notes..."
                    value={data.notes}
                />
            </Field>

            <div className="grid gap-1.5 rounded-lg border bg-muted/20 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.subtotal, 'BDT')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discount, 'BDT')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatCurrency(totals.tax, 'BDT')}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 text-base font-semibold text-foreground">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total, 'BDT')}</span>
                </div>
            </div>
        </div>
    );
}

export function AddInvoiceDialog({ onCreated }: { onCreated?: () => void }) {
    const [open, setOpen] = useState(false);
    const { clearErrors, data, errors, processing, reset, setData, submit } =
        useHttp<InvoiceForm>(invoiceApi.store(), initialInvoiceForm());
    const candidatesRequest = useCandidateOptions();

    const handleOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);

        if (isOpen) {
            setData(initialInvoiceForm());
            candidatesRequest.submit().catch(() => {
                toast.error('Unable to load candidates.');
            });
        } else if (!processing) {
            reset();
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

            setOpen(false);
            reset();
            clearErrors();
            onCreated?.();
            toast.success('Invoice created successfully.');
        } catch {
            toast.error(
                'Unable to create the invoice. Please review the form and try again.',
            );
        }
    };

    const candidates = candidatesRequest.response?.data ?? [];

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            <DialogTrigger asChild>
                <Button
                    className="bg-linear-to-br from-primary to-teal-600 hover:opacity-90"
                    type="button"
                >
                    <Plus />
                    New Invoice
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="size-5 text-primary" />
                        New invoice
                    </DialogTitle>
                    <DialogDescription>
                        Bill a candidate or an external client for services
                        rendered.
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <InvoiceFormFields
                        candidates={candidates}
                        data={data}
                        errors={errors}
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
                            {processing ? 'Creating...' : 'Create invoice'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
