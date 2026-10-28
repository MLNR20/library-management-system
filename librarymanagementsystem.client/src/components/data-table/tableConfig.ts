import {
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFn_equalsString,
    filterFn_includesString,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_datetime,
    sortFn_text,
    tableFeatures,
} from '@tanstack/react-table';
import type { ColumnDef, RowData } from '@tanstack/react-table';

// Keep at module scope: the table needs a stable feature set.
export const dataTableFeatures = tableFeatures({
    columnFilteringFeature,
    globalFilteringFeature,
    rowSortingFeature,
    rowPaginationFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: {
        includesString: filterFn_includesString,
        equalsString: filterFn_equalsString,
    },
    sortFns: {
        alphanumeric: sortFn_alphanumeric,
        text: sortFn_text,
        datetime: sortFn_datetime,
    },
});

export type DataTableColumn<TData extends RowData> = ColumnDef<typeof dataTableFeatures, TData>;

export function createDataTableColumnHelper<TData extends RowData>() {
    return createColumnHelper<typeof dataTableFeatures, TData>();
}

export interface DataTableFilter {
    /** Id of the column to filter. That column should use `filterFn: 'equalsString'`. */
    columnId: string;
    label: string;
    options: { label: string; value: string }[];
}
