import { useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import {
    bookReservationStatusBadges,
    bookReservationStatusLabels,
    BookReservationStatus,
    formatDay,
    reservationActions,
    useApproveBookReturn,
    useBookReservations,
} from '../api/bookReservations.ts';
import { bookStatusLabels } from '../api/resources.ts';
import { getErrorMessage } from '../lib/api.ts';

/** Librarians and administrators approve the returns students ask for; only then is the book available again. */
export function BookReturnsPage() {
    const reservations = useBookReservations();
    const approve = useApproveBookReturn();
    const [onlyWaiting, setOnlyWaiting] = useState(true);
    const [error, setError] = useState<string>();

    const items = reservations.data ?? [];
    const waitingCount = items.filter(r => r.status === BookReservationStatus.ReturnRequested).length;
    // Oldest request first when deciding; the server order (newest first) when browsing.
    const visible = onlyWaiting
        ? items
              .filter(r => r.status === BookReservationStatus.ReturnRequested)
              .sort((a, b) => (a.returnRequestedAtUtc ?? '').localeCompare(b.returnRequestedAtUtc ?? ''))
        : items;

    return (
        <Page
            title="Book returns"
            description="Approve the books students say they have brought back. Approving makes the book available again."
            actions={
                <div role="tablist" className="tabs tabs-box">
                    <button role="tab" className={`tab ${onlyWaiting ? 'tab-active' : ''}`} onClick={() => setOnlyWaiting(true)}>
                        Waiting ({waitingCount})
                    </button>
                    <button role="tab" className={`tab ${onlyWaiting ? '' : 'tab-active'}`} onClick={() => setOnlyWaiting(false)}>
                        All reservations
                    </button>
                </div>
            }
        >
            {error && (
                <div role="alert" className="alert alert-error alert-soft mb-4">
                    {error}
                </div>
            )}

            {reservations.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    Could not load the reservations: {getErrorMessage(reservations.error)}
                </div>
            ) : reservations.isLoading ? (
                <span className="loading loading-spinner" />
            ) : visible.length === 0 ? (
                <p className="opacity-70">{onlyWaiting ? 'No returns are waiting for approval.' : 'There are no book reservations yet.'}</p>
            ) : (
                <div className="overflow-x-auto rounded-box border border-base-300">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Book</th>
                                <th>Reserved</th>
                                <th>Due</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(reservation => {
                                const { canApproveReturn } = reservationActions(reservation);

                                return (
                                    <tr key={reservation.id}>
                                        <td>{reservation.studentName}</td>
                                        <td>
                                            {reservation.bookTitle}
                                            <div className="text-xs opacity-60">Book: {bookStatusLabels[reservation.bookStatus]}</div>
                                        </td>
                                        <td className="whitespace-nowrap">{formatDay(reservation.reservedAtUtc)}</td>
                                        <td className="whitespace-nowrap">
                                            {reservation.dueAtUtc ? formatDay(reservation.dueAtUtc) : <span className="opacity-50">—</span>}
                                        </td>
                                        <td>
                                            <span className={`badge ${bookReservationStatusBadges[reservation.status]}`}>
                                                {bookReservationStatusLabels[reservation.status]}
                                            </span>
                                            {reservation.returnRequestedAtUtc && reservation.status === BookReservationStatus.ReturnRequested && (
                                                <div className="text-xs opacity-60">asked {formatDay(reservation.returnRequestedAtUtc)}</div>
                                            )}
                                            {reservation.returnApprovedByName && (
                                                <div className="text-xs opacity-60">approved by {reservation.returnApprovedByName}</div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap text-right">
                                            {canApproveReturn && reservation.borrowingId && (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    disabled={approve.isPending}
                                                    onClick={() => {
                                                        setError(undefined);
                                                        approve.mutate(reservation.borrowingId!, { onError: err => setError(getErrorMessage(err)) });
                                                    }}
                                                >
                                                    Approve return
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Page>
    );
}
