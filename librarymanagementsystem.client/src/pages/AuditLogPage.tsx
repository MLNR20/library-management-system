import { useState } from 'react';
import { DataTablePagination } from '../components/data-table/DataTablePagination.tsx';
import { Page } from '../components/layout/Page.tsx';
import { SearchInput } from '../components/ui/SearchInput.tsx';
import { emptyAuditFilters, useAuditActions, useAuditLogs } from '../api/admin.ts';
import type { AuditLogFilters } from '../api/admin.ts';
import { getErrorMessage } from '../lib/api.ts';

const pageSizeOptions = [10, 20, 50, 100];
const columnCount = 6;

export function AuditLogPage() {
    const [filters, setFilters] = useState<AuditLogFilters>(emptyAuditFilters);
    const logs = useAuditLogs(filters);
    const actions = useAuditActions();

    // Any filter change goes back to the first page.
    const setFilter = (patch: Partial<AuditLogFilters>) => setFilters(current => ({ ...current, ...patch, page: 1 }));
    const goToPage = (page: number) => setFilters(current => ({ ...current, page }));

    const total = logs.data?.total ?? 0;
    const pageCount = Math.ceil(total / filters.pageSize);
    const hasFilters = Boolean(filters.search || filters.action || filters.success || filters.from || filters.to);

    return (
        <Page
            title="Audit log"
            description="Sign-ins, sign-outs, role changes and catalogue edits, newest first. Entries cannot be edited or deleted."
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    <div className="lg:w-72">
                        <SearchInput
                            value={filters.search}
                            onChange={search => setFilter({ search })}
                            placeholder="Search user, target, details..."
                        />
                    </div>
                    <select
                        className="select lg:w-48"
                        aria-label="Action"
                        value={filters.action}
                        onChange={e => setFilter({ action: e.target.value })}
                    >
                        <option value="">All actions</option>
                        {actions.data?.map(action => (
                            <option key={action} value={action}>
                                {action}
                            </option>
                        ))}
                    </select>
                    <select
                        className="select lg:w-40"
                        aria-label="Outcome"
                        value={filters.success}
                        onChange={e => setFilter({ success: e.target.value as AuditLogFilters['success'] })}
                    >
                        <option value="">All outcomes</option>
                        <option value="true">Succeeded</option>
                        <option value="false">Failed</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="opacity-70">From</span>
                        <input
                            type="date"
                            className="input"
                            value={filters.from}
                            max={filters.to || undefined}
                            onChange={e => setFilter({ from: e.target.value })}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="opacity-70">To</span>
                        <input
                            type="date"
                            className="input"
                            value={filters.to}
                            min={filters.from || undefined}
                            onChange={e => setFilter({ to: e.target.value })}
                        />
                    </label>
                    {hasFilters && (
                        <button className="btn btn-ghost" onClick={() => setFilters(current => ({ ...emptyAuditFilters, pageSize: current.pageSize }))}>
                            Clear filters
                        </button>
                    )}
                </div>

                {logs.isError ? (
                    <div role="alert" className="alert alert-error alert-soft">
                        <span>Could not load the audit log: {getErrorMessage(logs.error)}</span>
                        <button className="btn btn-sm" onClick={() => logs.refetch()}>
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>Details</th>
                                    <th>IP address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.isLoading ? (
                                    Array.from({ length: 5 }, (_, i) => (
                                        <tr key={i} aria-hidden="true">
                                            <td colSpan={columnCount}>
                                                <div className="skeleton h-5 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : logs.data?.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnCount} className="py-10 text-center opacity-70">
                                            {hasFilters ? 'No entries match your filters.' : 'Nothing has been recorded yet.'}
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data?.items.map(log => (
                                        <tr key={log.id} className="hover:bg-base-200">
                                            <td className="whitespace-nowrap">{new Date(log.timestampUtc + 'Z').toLocaleString()}</td>
                                            <td>{log.userName ?? <span className="opacity-40">System</span>}</td>
                                            <td>
                                                <span className={`badge badge-soft badge-sm whitespace-nowrap ${log.success ? 'badge-success' : 'badge-error'}`}>
                                                    {log.action}
                                                    {!log.success && ' (failed)'}
                                                </span>
                                            </td>
                                            <td>{log.target ?? <span className="opacity-40">—</span>}</td>
                                            <td className="max-w-md">
                                                {log.details ? (
                                                    <span className="line-clamp-2" title={log.details}>
                                                        {log.details}
                                                    </span>
                                                ) : (
                                                    <span className="opacity-40">—</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap" title={log.userAgent ?? undefined}>
                                                {log.ipAddress ?? <span className="opacity-40">—</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <DataTablePagination
                    pageIndex={filters.page - 1}
                    pageCount={pageCount}
                    pageSize={filters.pageSize}
                    rowCount={total}
                    pageSizeOptions={pageSizeOptions}
                    onFirst={() => goToPage(1)}
                    onPrevious={() => goToPage(filters.page - 1)}
                    onNext={() => goToPage(filters.page + 1)}
                    onLast={() => goToPage(pageCount)}
                    onPageSizeChange={pageSize => setFilter({ pageSize })}
                />
            </div>
        </Page>
    );
}
