import { useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import {
    bookReservationStatusBadges,
    bookReservationStatusLabels,
    BookReservationStatus,
    formatDay,
    reservationActions,
    useBookReservations,
    useCancelBookReservation,
    useCollectBook,
    useRequestBookReturn,
} from '../api/bookReservations.ts';
import type { BookReservation } from '../api/bookReservations.ts';
import { bookStatusLabels } from '../api/resources.ts';
import { getErrorMessage } from '../lib/api.ts';

/** The student's own reservations: what is held for them, what is on loan, and what is waiting for a librarian. */
export function StudentMyBooksPage() {
    const reservations = useBookReservations();
    const cancel = useCancelBookReservation();
    const collect = useCollectBook();
    const requestReturn = useRequestBookReturn();
    const [error, setError] = useState<string>();

    const run = (start: () => void) => {
        setError(undefined);
        start();
    };
    const onError = (err: Error) => setError(getErrorMessage(err));
    const busy = cancel.isPending || collect.isPending || requestReturn.isPending;

    const items = reservations.data ?? [];
    const current = items.filter(r => r.status !== BookReservationStatus.Returned && r.status !== BookReservationStatus.Cancelled);
    const past = items.filter(r => r.status === BookReservationStatus.Returned || r.status === BookReservationStatus.Cancelled);

    return (
        <Page
            title="My books"
            description="Books you have reserved or borrowed. When you bring a book back, ask to return it here; it counts as returned once a librarian approves."
        >
            {error && (
                <div role="alert" className="alert alert-error alert-soft mb-4">
                    {error}
                </div>
            )}

            {reservations.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    Could not load your books: {getErrorMessage(reservations.error)}
                </div>
            ) : reservations.isLoading ? (
                <span className="loading loading-spinner" />
            ) : items.length === 0 ? (
                <p className="opacity-70">You have not reserved any books yet. Find one under "Find a book" and press Reserve.</p>
            ) : (
                <div className="flex flex-col gap-8">
                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">Now</h2>
                        {current.length === 0 ? (
                            <p className="opacity-70">Nothing reserved or on loan right now.</p>
                        ) : (
                            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {current.map(reservation => (
                                    <li key={reservation.id}>
                                        <ReservationCard
                                            reservation={reservation}
                                            busy={busy}
                                            onCancel={() => run(() => cancel.mutate(reservation.id, { onError }))}
                                            onCollect={() => run(() => collect.mutate(reservation.id, { onError }))}
                                            onRequestReturn={() =>
                                                run(() => {
                                                    if (reservation.borrowingId) requestReturn.mutate(reservation.borrowingId, { onError });
                                                })
                                            }
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {past.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold">History</h2>
                            <div className="overflow-x-auto rounded-box border border-base-300">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Book</th>
                                            <th>Reserved</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {past.map(reservation => (
                                            <tr key={reservation.id}>
                                                <td>{reservation.bookTitle}</td>
                                                <td>{formatDay(reservation.reservedAtUtc)}</td>
                                                <td>
                                                    <span className={`badge ${bookReservationStatusBadges[reservation.status]}`}>
                                                        {bookReservationStatusLabels[reservation.status]}
                                                    </span>
                                                    {reservation.returnApprovedAtUtc && (
                                                        <div className="text-xs opacity-60">
                                                            approved {formatDay(reservation.returnApprovedAtUtc)}
                                                            {reservation.returnApprovedByName ? ` by ${reservation.returnApprovedByName}` : ''}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </Page>
    );
}

interface CardProps {
    reservation: BookReservation;
    busy: boolean;
    onCancel: () => void;
    onCollect: () => void;
    onRequestReturn: () => void;
}

function ReservationCard({ reservation, busy, onCancel, onCollect, onRequestReturn }: CardProps) {
    const { canCancel, canCollect, canRequestReturn } = reservationActions(reservation);
    const waiting = reservation.status === BookReservationStatus.ReturnRequested;
    const overdue = reservation.isOverdue && !waiting;

    return (
        <article className="card card-border h-full bg-base-100 shadow-sm">
            <div className="card-body gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="card-title text-base">{reservation.bookTitle}</h3>
                    <span className={`badge shrink-0 ${bookReservationStatusBadges[reservation.status]}`}>
                        {bookReservationStatusLabels[reservation.status]}
                    </span>
                </div>
                <p className="text-sm opacity-70">
                    Book status: {bookStatusLabels[reservation.bookStatus]} · reserved {formatDay(reservation.reservedAtUtc)}
                </p>

                {reservation.dueAtUtc && !waiting && (
                    <p className={`text-sm ${overdue ? 'font-semibold text-error' : ''}`}>
                        Due {formatDay(reservation.dueAtUtc)}
                        {overdue ? ' (overdue)' : ''}
                    </p>
                )}
                {waiting && (
                    <p className="text-sm">
                        You asked to return it
                        {reservation.returnRequestedAtUtc ? ` on ${formatDay(reservation.returnRequestedAtUtc)}` : ''}. A librarian has to approve
                        it; you will not be charged for the wait.
                    </p>
                )}

                {(canCancel || canCollect || canRequestReturn) && (
                    <div className="card-actions mt-2 justify-end">
                        {canCancel && (
                            <button type="button" className="btn btn-outline btn-error btn-sm" disabled={busy} onClick={onCancel}>
                                Cancel reservation
                            </button>
                        )}
                        {canCollect && (
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onCollect}>
                                I have collected it
                            </button>
                        )}
                        {canRequestReturn && (
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onRequestReturn}>
                                Return this book
                            </button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
