import { flexRender, useTable } from '@tanstack/react-table';
import type { ColumnDef, RowData } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { dataTableFeatures } from './table-features';
import type { DataTableFeatures } from './table-features';

type DataTableProps<TData extends RowData> = {
    columns: ColumnDef<DataTableFeatures, TData>[];
    data: TData[];
    searchPlaceholder?: string;
    emptyMessage?: string;
    onRowClick?: (row: TData) => void;
    toolbar?: ReactNode;
};

export function DataTable<TData extends RowData>({
    columns,
    data,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No results found.',
    onRowClick,
    toolbar,
}: DataTableProps<TData>) {
    const table = useTable(
        {
            features: dataTableFeatures,
            columns,
            data,
            globalFilterFn: 'includesString',
        },
        (state) => ({ globalFilter: state.globalFilter, sorting: state.sorting }),
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={table.state.globalFilter ?? ''}
                        onChange={(event) =>
                            table.setGlobalFilter(event.target.value)
                        }
                        placeholder={searchPlaceholder}
                        className="pl-8"
                        aria-label="Search records"
                    />
                </div>
                {toolbar}
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const sortDirection =
                                        header.column.getIsSorted();

                                    return (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                'px-4 py-3',
                                                canSort &&
                                                    'cursor-pointer select-none',
                                            )}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <span className="inline-flex items-center gap-1">
                                                    {flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext(),
                                                    )}
                                                    {canSort &&
                                                        (sortDirection ===
                                                        'asc' ? (
                                                            <ChevronUp className="size-3" />
                                                        ) : sortDirection ===
                                                            'desc' ? (
                                                            <ChevronDown className="size-3" />
                                                        ) : (
                                                            <ChevronsUpDown className="size-3 opacity-40" />
                                                        ))}
                                                </span>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y">
                        {table.getRowModel().rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                        {table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                className={cn(
                                    'transition-colors hover:bg-muted/30',
                                    onRowClick && 'cursor-pointer',
                                )}
                                onClick={() => onRowClick?.(row.original)}
                            >
                                {row.getAllCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className="px-4 py-3 align-top"
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
