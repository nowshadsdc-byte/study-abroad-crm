import { useHttp } from '@inertiajs/react';
import { HandCoins } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { formatCurrency } from '@/lib/constants';
import invoiceApi from '@/routes/api/invoices';

const paymentMethods = ['Cash', 'Bank Transfer', 'Card', 'Mobile Banking', 'Other'];

type PaymentForm = {
    amount: string;
    method: string;
    paid_at: string;
    note: string;
};

function initialPaymentForm(balanceDue: number): PaymentForm {
    return {
        amount: balanceDue.toFixed(2),
        method: 'Cash',
        paid_at: new Date().toISOString().slice(0, 10),
        note: '',
    };
}

export function RecordPaymentDialog({
    invoiceId,
    total,
    amountPaid,
    balanceDue,
    open,
    onOpenChange,
    onRecorded,
}: {
    invoiceId: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRecorded?: () => void;
}) {
    const { data, errors, processing, setData, submit, reset, clearErrors } =
        useHttp<PaymentForm>(
            invoiceApi.payments.store(invoiceId),
            initialPaymentForm(balanceDue),
        );

    const handleOpenChange = (isOpen: boolean): void => {
        onOpenChange(isOpen);

        if (isOpen) {
            setData(initialPaymentForm(balanceDue));
            clearErrors();
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

            handleOpenChange(false);
            onRecorded?.();
            toast.success('Payment recorded successfully.');
        } catch {
            toast.error(
                'Unable to record the payment. Please review the form and try again.',
            );
        }
    };

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HandCoins className="size-5 text-primary" />
                        Record a payment
                    </DialogTitle>
                    <DialogDescription>
                        Log a partial or full payment against this invoice.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-center text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">
                            {formatCurrency(total, 'BDT')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold">
                            {formatCurrency(amountPaid, 'BDT')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Balance due
                        </p>
                        <p className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatCurrency(balanceDue, 'BDT')}
                        </p>
                    </div>
                </div>

                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="payment_amount">Amount *</Label>
                        <Input
                            aria-invalid={Boolean(errors.amount)}
                            id="payment_amount"
                            max={balanceDue}
                            min="0.01"
                            onChange={(event) =>
                                setData('amount', event.target.value)
                            }
                            step="0.01"
                            type="number"
                            value={data.amount}
                        />
                        {errors.amount && (
                            <p className="text-xs text-destructive">
                                {errors.amount}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="payment_method">Payment method *</Label>
                        <Select
                            onValueChange={(value) => setData('method', value)}
                            value={data.method}
                        >
                            <SelectTrigger
                                aria-invalid={Boolean(errors.method)}
                                className="w-full"
                                id="payment_method"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((method) => (
                                    <SelectItem key={method} value={method}>
                                        {method}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.method && (
                            <p className="text-xs text-destructive">
                                {errors.method}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="payment_paid_at">Payment date</Label>
                        <Input
                            aria-invalid={Boolean(errors.paid_at)}
                            id="payment_paid_at"
                            onChange={(event) =>
                                setData('paid_at', event.target.value)
                            }
                            type="date"
                            value={data.paid_at}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="payment_note">Note</Label>
                        <Input
                            aria-invalid={Boolean(errors.note)}
                            id="payment_note"
                            onChange={(event) =>
                                setData('note', event.target.value)
                            }
                            placeholder="Optional reference or note"
                            value={data.note}
                        />
                    </div>
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
                            {processing ? 'Recording...' : 'Record payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
