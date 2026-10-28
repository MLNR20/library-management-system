import { useTable } from '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';
import { SearchInput } from '../ui/SearchInput.tsx';
import { DataTablePagination } from './DataTablePagination.tsx';
import { dataTableFeatures } from './tableConfig.ts';
import type { DataTableColumn, DataTableFilter } from './tableConfig.ts';

interface DataTableProps<TData extends RowData> {
    /** Keep this array referentially stable (state, memo or query data). */
    data: TData[] | undefined;
    /** Keep this array referentially stable too (module scope or useMemo). */
    columns: DataTableColumn<TData>[];
    filters?: DataTableFilter[];
    searchPlaceholder?: string;
    pageSizeOptions?: number[];
    initialPageSize?: number;
    isLoading?: boolean;
    emptyMessage?: string;
}

const emptyRows: never[] = [];

export function DataTable<TData extends RowData>({
    data,
    columns,
    filters = [],
    searchPlaceholder = 'Search...',
    pageSizeOptions = [5, 10, 20, 50],
    initialPageSize = 10,
    isLoading = false,
    emptyMessage = 'No results found.',
}: DataTableProps<TData>) {
    const table = useTable({
        features: dataTableFeatures,
        columns,
        data: data ?? emptyRows,
        globalFilterFn: 'includesString',
        initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
    });

    const { pagination, globalFilter, columnFilters } = table.state;
    const hasActiveFilters = Boolean(globalFilter) || columnFilters.length > 0;
    const columnCount = table.getAllLeafColumns().length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="sm:max-w-sm sm:flex-1">
                    <SearchInput
                        value={(globalFilter as string | undefined) ?? ''}
                        onChange={value => table.setGlobalFilter(value || undefined)}
                        placeholder={searchPlaceholder}
                    />
                </div>
                {filters.map(filter => (
                    <select
                        key={filter.columnId}
                        className="select sm:w-48"
                        aria-label={filter.label}
                        value={(table.getColumn(filter.columnId)?.getFilterValue() as string | undefined) ?? ''}
                        onChange={e => table.getColumn(filter.columnId)?.setFilterValue(e.target.value || undefined)}
                    >
                        <option value="">All {filter.label.toLowerCase()}</option>
                        {filter.options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ))}
                {hasActiveFilters && (
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            table.resetGlobalFilter(true);
                            table.resetColumnFilters(true);
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                <table className="table">
                    <thead>
                        {table.getHeaderGroups().map(group => (
                            <tr key={group.id}>
                                {group.headers.map(header => {
                                    const canSort = header.column.getCanSort();
                                    const sorted = header.column.getIsSorted();
                                    return (
                                        <th
                                            key={header.id}
                                            aria-sort={
                                                sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                                            }
                                        >
                                            {header.isPlaceholder ? null : canSort ? (
                                                <button
                                                    className="flex cursor-pointer items-center gap-1 font-semibold select-none"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    <table.FlexRender header={header} />
                                                    <span aria-hidden="true" className={sorted ? '' : 'opacity-30'}>
                                                        {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <table.FlexRender header={header} />
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: Math.min(pagination.pageSize, 5) }, (_, i) => (
                                <tr key={i} aria-hidden="true">
                                    <td colSpan={columnCount}>
                                        <div className="skeleton h-5 w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columnCount} className="py-10 text-center opacity-70">
                                    {hasActiveFilters ? 'No results match your search or filters.' : emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-base-200">
                                    {row.getAllCells().map(cell => (
                                        <td key={cell.id}>
                                            <table.FlexRender cell={cell} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DataTablePagination
                pageIndex={pagination.pageIndex}
                pageCount={table.getPageCount()}
                pageSize={pagination.pageSize}
                rowCount={table.getRowCount()}
                pageSizeOptions={pageSizeOptions}
                onFirst={() => table.firstPage()}
                onPrevious={() => table.previousPage()}
                onNext={() => table.nextPage()}
                onLast={() => table.lastPage()}
                onPageSizeChange={size => table.setPageSize(size)}
            />
        </div>
    );
}
