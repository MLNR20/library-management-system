interface DataTablePaginationProps {
    pageIndex: number;
    pageCount: number;
    pageSize: number;
    rowCount: number;
    pageSizeOptions: number[];
    onFirst: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onLast: () => void;
    onPageSizeChange: (size: number) => void;
}

export function DataTablePagination({
    pageIndex,
    pageCount,
    pageSize,
    rowCount,
    pageSizeOptions,
    onFirst,
    onPrevious,
    onNext,
    onLast,
    onPageSizeChange,
}: DataTablePaginationProps) {
    const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
    const to = Math.min((pageIndex + 1) * pageSize, rowCount);
    const canPrevious = pageIndex > 0;
    const canNext = pageIndex < pageCount - 1;

    return (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3 text-sm">
                <span>
                    {from}–{to} of {rowCount}
                </span>
                <label className="flex items-center gap-2">
                    <span className="opacity-70">Rows per page</span>
                    <select
                        className="select select-sm w-20"
                        value={pageSize}
                        onChange={e => onPageSizeChange(Number(e.target.value))}
                        aria-label="Rows per page"
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="join">
                <button className="btn join-item btn-sm" onClick={onFirst} disabled={!canPrevious} aria-label="First page">
                    «
                </button>
                <button className="btn join-item btn-sm" onClick={onPrevious} disabled={!canPrevious} aria-label="Previous page">
                    ‹
                </button>
                <span className="btn join-item btn-sm pointer-events-none">
                    Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
                </span>
                <button className="btn join-item btn-sm" onClick={onNext} disabled={!canNext} aria-label="Next page">
                    ›
                </button>
                <button className="btn join-item btn-sm" onClick={onLast} disabled={!canNext} aria-label="Last page">
                    »
                </button>
            </div>
        </div>
    );
}
