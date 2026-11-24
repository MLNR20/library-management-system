import { DataTable } from '../components/data-table/DataTable.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import { useMemo, useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import { StatCard } from '../components/ui/Card.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import libraryIllustration from '../assets/illustrations/library-bro.svg';
import { BanknotesIcon, CheckCircleIcon, LoanIcon, ReceiptIcon, WarningIcon } from '../components/ui/icons.tsx';
import { useBorrowings } from '../api/borrowings.ts';
import type { Borrowing } from '../api/borrowings.ts';
import { formatDay } from '../api/bookReservations.ts';
import { getErrorMessage } from '../lib/api.ts';

const amount = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * What the student owes the library: loans still out, which of them are late, and the penalty that has built up. A loan's
 * penalty keeps growing a day at a time while it is overdue and is fixed once a librarian approves the return.
 */
export function StudentLoanBalancePage() {
    const borrowings = useBorrowings();
    const loans = borrowings.data;
    const [tab, setTab] = useState<'open' | 'returned'>('open');

    // The tables need stable arrays, so split the loans once per fetch.
    const { open, returned } = useMemo(
        () => ({
            open: (loans ?? []).filter(loan => loan.returnedAtUtc === null),
            returned: (loans ?? []).filter(loan => loan.returnedAtUtc !== null),
        }),
        [loans],
    );
    const overdue = open.filter(loan => loan.isOverdue);
    const accruing = sum(open);
    const charged = sum(returned);
    const lateReturns = returned.filter(loan => loan.penaltyAmount > 0);

    return (
        <Page
            title="Loan balance"
            description="The books you have on loan and any penalty for returning them late. Bring a book back by its due date to avoid one."
        >
            {borrowings.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    Could not load your loans: {getErrorMessage(borrowings.error)}
                </div>
            ) : borrowings.isLoading ? (
                <span className="loading loading-spinner" />
            ) : (
                <div className="flex flex-col gap-8">
                    <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Balance due"
                            value={amount.format(accruing)}
                            hint={overdue.length > 0 ? 'Still growing while a book is overdue' : 'Nothing overdue'}
                            icon={<BanknotesIcon />}
                            tone={accruing > 0 ? 'error' : 'primary'}
                        />
                        <StatCard
                            label="Books on loan"
                            value={open.length}
                            hint={open.length === 1 ? '1 book out' : `${open.length} books out`}
                            icon={<LoanIcon />}
                        />
                        <StatCard
                            label="Overdue now"
                            value={overdue.length}
                            hint={overdue.length > 0 ? 'Return them soon' : 'All on time'}
                            icon={<WarningIcon />}
                            tone={overdue.length > 0 ? 'warning' : 'success'}
                        />
                        <StatCard
                            label="Penalties on returned books"
                            value={amount.format(charged)}
                            hint={`${lateReturns.length} late ${lateReturns.length === 1 ? 'return' : 'returns'}`}
                            icon={<ReceiptIcon />}
                            tone={charged > 0 ? 'error' : 'primary'}
                        />
                    </section>

                    <section className="flex flex-col gap-3">
                        <div role="tablist" className="tabs tabs-border border-b border-base-300" aria-label="Loans">
                            <button
                                role="tab"
                                id="loans-tab-open"
                                aria-selected={tab === 'open'}
                                aria-controls="loans-panel"
                                className={`tab gap-2 ${tab === 'open' ? 'tab-active' : ''}`}
                                onClick={() => setTab('open')}
                            >
                                <LoanIcon className="size-5" />
                                On loan now
                                <span className="badge badge-sm">{open.length}</span>
                            </button>
                            <button
                                role="tab"
                                id="loans-tab-returned"
                                aria-selected={tab === 'returned'}
                                aria-controls="loans-panel"
                                className={`tab gap-2 ${tab === 'returned' ? 'tab-active' : ''}`}
                                onClick={() => setTab('returned')}
                            >
                                <CheckCircleIcon className="size-5" />
                                Returned
                                <span className="badge badge-sm">{returned.length}</span>
                            </button>
                        </div>

                        <div id="loans-panel" role="tabpanel" aria-labelledby={`loans-tab-${tab}`}>
                            {tab === 'open' ? (
                                open.length === 0 ? (
                                    <EmptyState image={libraryIllustration} title="You have no books on loan right now">
                                        Find one under "Find a book" and reserve it; it will show up here once you collect it.
                                    </EmptyState>
                                ) : (
                                    <LoanTable loans={open} showReturned={false} />
                                )
                            ) : returned.length === 0 ? (
                                <EmptyState illustration="history" title="You have not returned any books yet">
                                    Books you bring back, and any penalty, are listed here.
                                </EmptyState>
                            ) : (
                                <LoanTable loans={returned} showReturned />
                            )}
                        </div>
                    </section>
                </div>
            )}
        </Page>
    );
}

function sum(loans: Borrowing[]) {
    return loans.reduce((total, loan) => total + loan.penaltyAmount, 0);
}

const helper = createDataTableColumnHelper<Borrowing>();

// Dates sort on the ISO string and show formatted; kept at module scope so the table gets stable columns.
const bookColumn = helper.accessor('bookTitle', { header: 'Book' });
const borrowedColumn = helper.accessor('borrowedAtUtc', { header: 'Borrowed', cell: info => formatDay(info.getValue()) });
const dueColumn = helper.accessor('dueAtUtc', {
    header: 'Due',
    cell: info => (
        <span className={info.row.original.isOverdue && !info.row.original.returnedAtUtc ? 'font-semibold text-error' : ''}>
            {formatDay(info.getValue())}
        </span>
    ),
});
const returnedColumn = helper.accessor(loan => loan.returnedAtUtc ?? '', {
    id: 'returnedAtUtc',
    header: 'Returned',
    cell: info => (info.getValue() ? formatDay(info.getValue()) : ''),
});
const daysLateColumn = helper.accessor('overdueDays', { header: 'Days late' });
const penaltyColumn = helper.accessor('penaltyAmount', { header: 'Penalty', cell: info => amount.format(info.getValue()) });

const onLoanColumns = helper.columns([bookColumn, borrowedColumn, dueColumn, daysLateColumn, penaltyColumn]);
const returnedColumns = helper.columns([bookColumn, borrowedColumn, dueColumn, returnedColumn, daysLateColumn, penaltyColumn]);

function LoanTable({ loans, showReturned }: { loans: Borrowing[]; showReturned: boolean }) {
    return (
        <DataTable
            data={loans}
            columns={showReturned ? returnedColumns : onLoanColumns}
            searchPlaceholder="Search books..."
            initialPageSize={5}
            pageSizeOptions={[5, 10, 20]}
        />
    );
}
