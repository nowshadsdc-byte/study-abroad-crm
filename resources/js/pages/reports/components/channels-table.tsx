import { cn } from '@/lib/utils';
import type { ReportChannel } from '@/types';
import { formatCount, formatRate, RateBar } from './report-format';

/**
 * Acquisition channels: leads, conversions and paying clients per lead source.
 */
export function ChannelsTable({ channels }: { channels: ReportChannel[] }) {
    if (channels.length === 0) {
        return (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No leads were captured in this period.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
                <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase print:bg-transparent">
                        <th className="px-4 py-2.5">Acquisition source</th>
                        <th className="px-4 py-2.5 text-right">Leads</th>
                        <th className="px-4 py-2.5 text-right">Converted</th>
                        <th className="px-4 py-2.5 text-right">Paid clients</th>
                        <th className="w-[22%] px-4 py-2.5">Efficiency</th>
                        <th className="px-4 py-2.5 text-right">
                            Conversion rate
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {channels.map((channel) => (
                        <tr
                            key={channel.source}
                            className="border-b last:border-b-0 print:break-inside-avoid"
                        >
                            <td className="px-4 py-2.5 font-medium">
                                {channel.source}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                                {formatCount(channel.leads)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                                {formatCount(channel.converted)}
                            </td>
                            <td
                                className={cn(
                                    'px-4 py-2.5 text-right tabular-nums',
                                    channel.paid_clients === 0 &&
                                        'text-muted-foreground',
                                )}
                            >
                                {formatCount(channel.paid_clients)}
                            </td>
                            <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <RateBar rate={channel.efficiency} />
                                    <span className="w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                                        {formatRate(channel.efficiency)}
                                    </span>
                                </div>
                            </td>
                            <td
                                className={cn(
                                    'px-4 py-2.5 text-right font-semibold tabular-nums',
                                    channel.conversion_rate
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {formatRate(channel.conversion_rate)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                Efficiency is the share of leads who became paying clients.
                Conversion rate is the share who became clients.
            </p>
        </div>
    );
}
