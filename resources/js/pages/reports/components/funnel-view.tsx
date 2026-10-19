import { ArrowDown } from 'lucide-react';
import type { ReportFunnelStage } from '@/types';
import { formatCount, formatRate, RateBar } from './report-format';

/**
 * The period's lead cohort followed through every pipeline stage, with the
 * share kept from the previous stage.
 */
export function FunnelView({
    stages,
    compact = false,
}: {
    stages: ReportFunnelStage[];
    compact?: boolean;
}) {
    if ((stages[0]?.count ?? 0) === 0) {
        return (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No leads were captured in this period.
            </p>
        );
    }

    return (
        <ol className="grid gap-2 p-4">
            {stages.map((stage, index) => (
                <li
                    key={stage.stage}
                    className="grid gap-1 print:break-inside-avoid"
                >
                    {!compact && index > 0 && (
                        <span className="flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
                            <ArrowDown className="size-3" />
                            {formatRate(stage.rate_of_previous)} kept from{' '}
                            {stages[index - 1].stage.toLowerCase()}
                        </span>
                    )}
                    <div className="grid grid-cols-[minmax(120px,180px)_1fr_auto] items-center gap-3">
                        <span className="truncate text-sm font-medium">
                            {stage.stage}
                        </span>
                        <RateBar
                            rate={stage.rate_of_leads}
                            className={compact ? 'h-1.5' : 'h-3'}
                        />
                        <span className="w-24 text-right text-sm tabular-nums">
                            <span className="font-semibold">
                                {formatCount(stage.count)}
                            </span>{' '}
                            <span className="text-[11px] text-muted-foreground">
                                {formatRate(stage.rate_of_leads)}
                            </span>
                        </span>
                    </div>
                </li>
            ))}
        </ol>
    );
}
