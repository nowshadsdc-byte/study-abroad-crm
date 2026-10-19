import { getCountryFlag } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ReportDestination } from '@/types';
import { formatCount, formatRate, formatTaka } from './report-format';

/**
 * Clients enrolled in the period by desired study destination.
 */
export function DestinationsTable({
    destinations,
    limit,
}: {
    destinations: ReportDestination[];
    limit?: number;
}) {
    if (destinations.length === 0) {
        return (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No clients were enrolled in this period.
            </p>
        );
    }

    const rows = limit ? destinations.slice(0, limit) : destinations;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
                <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase print:bg-transparent">
                        <th className="px-4 py-2.5">Destination</th>
                        <th className="px-4 py-2.5 text-right">Clients</th>
                        <th className="px-4 py-2.5 text-right">Lodged</th>
                        <th className="px-4 py-2.5 text-right">
                            Visas approved
                        </th>
                        <th className="px-4 py-2.5 text-right">Refused</th>
                        <th className="px-4 py-2.5 text-right">Visa rate</th>
                        <th className="px-4 py-2.5 text-right">Collections</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((destination) => (
                        <tr
                            key={destination.country}
                            className="border-b last:border-b-0 print:break-inside-avoid"
                        >
                            <td className="px-4 py-2.5 font-medium">
                                <span className="mr-1.5" aria-hidden="true">
                                    {getCountryFlag(destination.country)}
                                </span>
                                {destination.country}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                                {formatCount(destination.clients)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                                {formatCount(destination.lodged)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-emerald-700 tabular-nums dark:text-emerald-400">
                                {formatCount(destination.visa_approved)}
                            </td>
                            <td
                                className={cn(
                                    'px-4 py-2.5 text-right tabular-nums',
                                    destination.visa_refused > 0
                                        ? 'text-rose-700 dark:text-rose-400'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {formatCount(destination.visa_refused)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                                {formatRate(destination.visa_rate)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                                {formatTaka(destination.collections)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {limit && destinations.length > limit && (
                <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                    Showing the top {limit} of {destinations.length}{' '}
                    destinations.
                </p>
            )}
        </div>
    );
}
