import { Page } from '../components/layout/Page.tsx';
import { StatCard } from '../components/ui/Card.tsx';
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
    const loans = borrowings.data ?? [];

    const open = loans.filter(loan => loan.returnedAtUtc === null);
    const overdue = open.filter(loan => loan.isOverdue);
    const accruing = sum(open);
    const charged = sum(loans.filter(loan => loan.returnedAtUtc !== null));
    const lateReturns = loans.filter(loan => loan.returnedAtUtc !== null && loan.penaltyAmount > 0);

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
                        />
                        <StatCard label="Books on loan" value={open.length} hint={open.length === 1 ? '1 book out' : `${open.length} books out`} />
                        <StatCard label="Overdue now" value={overdue.length} hint={overdue.length > 0 ? 'Return them soon' : 'All on time'} />
                        <StatCard
                            label="Penalties on returned books"
                            value={amount.format(charged)}
                            hint={`${lateReturns.length} late ${lateReturns.length === 1 ? 'return' : 'returns'}`}
                        />
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">On loan now</h2>
                        {open.length === 0 ? (
                            <p className="opacity-70">You have no books on loan right now.</p>
                        ) : (
                            <LoanTable loans={open} showReturned={false} />
                        )}
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">Returned</h2>
                        {loans.length === open.length ? (
                            <p className="opacity-70">You have not returned any books yet.</p>
                        ) : (
                            <LoanTable loans={loans.filter(loan => loan.returnedAtUtc !== null)} showReturned />
                        )}
                    </section>
                </div>
            )}
        </Page>
    );
}

function sum(loans: Borrowing[]) {
    return loans.reduce((total, loan) => total + loan.penaltyAmount, 0);
}

function LoanTable({ loans, showReturned }: { loans: Borrowing[]; showReturned: boolean }) {
    return (
        <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table">
                <thead>
                    <tr>
                        <th>Book</th>
                        <th>Borrowed</th>
                        <th>Due</th>
                        {showReturned && <th>Returned</th>}
                        <th className="text-right">Days late</th>
                        <th className="text-right">Penalty</th>
                    </tr>
                </thead>
                <tbody>
                    {loans.map(loan => (
                        <tr key={loan.id}>
                            <td>{loan.bookTitle}</td>
                            <td>{formatDay(loan.borrowedAtUtc)}</td>
                            <td className={loan.isOverdue && !loan.returnedAtUtc ? 'font-semibold text-error' : ''}>
                                {formatDay(loan.dueAtUtc)}
                            </td>
                            {showReturned && <td>{loan.returnedAtUtc ? formatDay(loan.returnedAtUtc) : ''}</td>}
                            <td className="text-right">{loan.overdueDays}</td>
                            <td className="text-right">{amount.format(loan.penaltyAmount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
