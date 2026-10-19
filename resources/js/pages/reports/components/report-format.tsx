import { cn } from '@/lib/utils';
import type { ReportRate } from '@/types';

const indianNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
});

/** Taka with Indian digit grouping, e.g. ৳6,90,000. */
export function formatTaka(amount: number): string {
    return `৳${indianNumber.format(amount)}`;
}

export function formatCount(value: number): string {
    return indianNumber.format(value);
}

export function formatRate(rate: ReportRate): string {
    if (rate === null) {
        return '—';
    }

    return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
}

/**
 * A thin horizontal bar for a 0–100 rate. Prints in colour.
 */
export function RateBar({
    rate,
    className,
    tone = 'primary',
}: {
    rate: ReportRate;
    className?: string;
    tone?: 'primary' | 'sky';
}) {
    const width = Math.max(0, Math.min(100, rate ?? 0));

    return (
        <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={width}
            aria-label={formatRate(rate)}
            className={cn(
                'h-1.5 w-full overflow-hidden rounded-full bg-muted print:bg-slate-200',
                className,
            )}
        >
            <div
                className={cn(
                    'h-full rounded-full [print-color-adjust:exact]',
                    tone === 'primary'
                        ? 'bg-linear-to-r from-primary to-teal-600'
                        : 'bg-sky-500',
                )}
                style={{ width: `${width}%` }}
            />
        </div>
    );
}
