import {
    columnFilteringFeature,
    createFilteredRowModel,
    createSortedRowModel,
    filterFn_includesString,
    globalFilteringFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    tableFeatures,
} from '@tanstack/react-table';

/**
 * Stable, module-level feature set shared by every data table instance.
 * Only the plugins, row-model factories, and function registries the app
 * actually uses are registered, keeping the table headless and tree-shakeable.
 */
export const dataTableFeatures = tableFeatures({
    columnFilteringFeature,
    globalFilteringFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    filterFns: { includesString: filterFn_includesString },
    sortFns: { alphanumeric: sortFn_alphanumeric },
});

export type DataTableFeatures = typeof dataTableFeatures;
