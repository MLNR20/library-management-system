import { useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import { DataTable } from '../components/data-table/DataTable.tsx';
import { createDataTableColumnHelper } from '../components/data-table/tableConfig.ts';
import { CardSkeleton } from '../components/ui/Card.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { useToast } from '../components/ui/toastContext.ts';
import libraryIllustration from '../assets/illustrations/library-bro.svg';
import studyingIllustration from '../assets/illustrations/studying-bro.svg';
import { BookIcon, ClockIcon } from '../components/ui/icons.tsx';
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
    const toast = useToast();
    const [error, setError] = useState<string>();
    const [tab, setTab] = useState<'now' | 'history'>('now');

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
                <div className="flex flex-col gap-4" role="status" aria-label="Loading your books">
                    <div className="flex gap-6 border-b border-base-300 pb-3" aria-hidden="true">
                        <div className="skeleton h-5 w-24" />
                        <div className="skeleton h-5 w-28" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </div>
            ) : items.length === 0 ? (
                <EmptyState image={libraryIllustration} title="You have not reserved any books yet">Find one under "Find a book" and press Reserve.</EmptyState>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* One line that scrolls sideways on a narrow screen, instead of wrapping. */}
                    <div role="tablist" className="tabs tabs-border flex-nowrap overflow-x-auto border-b border-base-300" aria-label="My books">
                        <button
                            role="tab"
                            id="my-books-tab-now"
                            aria-selected={tab === 'now'}
                            aria-controls="my-books-panel"
                            className={`tab shrink-0 gap-2 whitespace-nowrap ${tab === 'now' ? 'tab-active' : ''}`}
                            onClick={() => setTab('now')}
                        >
                            <BookIcon className="size-5" />
                            Now
                            <span className="badge badge-sm">{current.length}</span>
                        </button>
                        <button
                            role="tab"
                            id="my-books-tab-history"
                            aria-selected={tab === 'history'}
                            aria-controls="my-books-panel"
                            className={`tab shrink-0 gap-2 whitespace-nowrap ${tab === 'history' ? 'tab-active' : ''}`}
                            onClick={() => setTab('history')}
                        >
                            <ClockIcon className="size-5" />
                            History
                            <span className="badge badge-sm">{past.length}</span>
                        </button>
                    </div>

                    <div id="my-books-panel" role="tabpanel" aria-labelledby={`my-books-tab-${tab}`}>
                        {tab === 'now' ? (
                            current.length === 0 ? (
                                <EmptyState image={libraryIllustration} title="Nothing reserved or on loan right now">
                                    Books you reserve or borrow are shown here.
                                </EmptyState>
                            ) : (
                                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {current.map(reservation => (
                                        <li key={reservation.id}>
                                            <ReservationCard
                                                reservation={reservation}
                                                busy={busy}
                                                onCancel={() =>
                                                    run(() =>
                                                        cancel.mutate(reservation.id, {
                                                            onError,
                                                            onSuccess: () => toast.success(`Reservation cancelled: ${reservation.bookTitle}`),
                                                        }),
                                                    )
                                                }
                                                onCollect={() =>
                                                    run(() =>
                                                        collect.mutate(reservation.id, {
                                                            onError,
                                                            onSuccess: () => toast.success(`Collected: ${reservation.bookTitle} is now on loan`),
                                                        }),
                                                    )
                                                }
                                                onRequestReturn={() =>
                                                    run(() => {
                                                        if (reservation.borrowingId) {
                                                            requestReturn.mutate(reservation.borrowingId, {
                                                                onError,
                                                                onSuccess: () => toast.success('Return requested: a librarian will approve it'),
                                                            });
                                                        }
                                                    })
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )
                        ) : past.length === 0 ? (
                            <EmptyState image={studyingIllustration} title="Nothing in your history yet">
                                Returned and cancelled reservations are kept here.
                            </EmptyState>
                        ) : (
                            <HistoryTable reservations={past} />
                        )}
                    </div>
                </div>
            )}
        </Page>
    );
}

const helper = createDataTableColumnHelper<BookReservation>();

// Kept at module scope so the table gets stable columns. Read-only: there is no actions column.
const historyColumns = helper.columns([
    helper.accessor('bookTitle', { header: 'Book' }),
    helper.accessor('reservedAtUtc', { header: 'Reserved', cell: info => formatDay(info.getValue()) }),
    helper.accessor(reservation => bookReservationStatusLabels[reservation.status], {
        id: 'status',
        header: 'Status',
        filterFn: 'equalsString',
        cell: info => {
            const reservation = info.row.original;
            return (
                <>
                    <span className={`badge ${bookReservationStatusBadges[reservation.status]}`}>{info.getValue()}</span>
                    {reservation.returnApprovedAtUtc && (
                        <div className="text-xs opacity-60">
                            approved {formatDay(reservation.returnApprovedAtUtc)}
                            {reservation.returnApprovedByName ? ` by ${reservation.returnApprovedByName}` : ''}
                        </div>
                    )}
                </>
            );
        },
    }),
]);

const historyFilters = [
    {
        columnId: 'status',
        label: 'Statuses',
        options: [BookReservationStatus.Returned, BookReservationStatus.Cancelled].map(status => ({
            label: bookReservationStatusLabels[status],
            value: bookReservationStatusLabels[status],
        })),
    },
];

/** Past reservations (returned or cancelled), in the shared data table: searchable, sortable and read-only. */
function HistoryTable({ reservations }: { reservations: BookReservation[] }) {
    return (
        <DataTable
            data={reservations}
            columns={historyColumns}
            filters={historyFilters}
            searchPlaceholder="Search books..."
            initialPageSize={5}
            pageSizeOptions={[5, 10, 20]}
        />
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
        <article className="card card-border h-full border-base-content/15 bg-base-100">
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
