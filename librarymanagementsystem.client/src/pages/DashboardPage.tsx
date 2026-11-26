import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page } from '../components/layout/Page.tsx';
import { StatCard } from '../components/ui/Card.tsx';
import { AuthorIcon, BookIcon, GenreIcon, LoanIcon } from '../components/ui/icons.tsx';
import { authorHooks, BookStatus, bookHooks, bookStatusLabels, genreHooks } from '../api/resources.ts';
import { statusColors } from '../components/library-map/palette.ts';
import { BookReservationStatus, formatDay, reservationActions, useBookReservations, useCollectBook } from '../api/bookReservations.ts';
import { getErrorMessage } from '../lib/api.ts';
import { Link } from 'react-router';
import { useApproveRoomReservation, useRoomReservations } from '../api/rooms.ts';
import { formatReservationTime, ReservationStatus } from '../api/tables.ts';

const tooltipStyle = {
    background: 'var(--color-base-100)',
    border: '1px solid var(--color-base-300)',
    borderRadius: 'var(--radius-box)',
};

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
    return (
        <div className="card card-border border-base-content/15 bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title text-base">{title}</h3>
                {empty ? (
                    <p className="py-16 text-center text-sm opacity-60">Nothing to chart yet.</p>
                ) : (
                    <div className="h-72">{children}</div>
                )}
            </div>
        </div>
    );
}

function countBy<T>(items: T[], key: (item: T) => string): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Books a student has reserved that are waiting to be handed over; handing one over opens the loan. */
function BooksToHandOver() {
    const reservations = useBookReservations();
    const collect = useCollectBook();
    const [error, setError] = useState<string>();

    // Oldest first: the student who reserved longest ago is served first.
    const waiting = (reservations.data ?? [])
        .filter(r => r.status === BookReservationStatus.Reserved)
        .sort((a, b) => a.reservedAtUtc.localeCompare(b.reservedAtUtc));

    return (
        <div className="card card-border mt-4 border-base-content/15 bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title text-base">
                    Books to be borrowed
                    {reservations.data && <span className="badge badge-info">{waiting.length}</span>}
                </h3>
                <p className="text-sm opacity-70">Reserved by students and waiting for a librarian to hand over.</p>

                {error && (
                    <div role="alert" className="alert alert-error alert-soft">
                        {error}
                    </div>
                )}

                {reservations.isError ? (
                    <div role="alert" className="alert alert-error alert-soft">
                        Could not load the reservations: {getErrorMessage(reservations.error)}
                    </div>
                ) : reservations.isLoading ? (
                    <span className="loading loading-spinner" />
                ) : waiting.length === 0 ? (
                    <p className="py-4 text-center text-sm opacity-60">No books are waiting to be handed over.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Book</th>
                                    <th>Student</th>
                                    <th>Reserved</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {waiting.map(reservation => (
                                    <tr key={reservation.id}>
                                        <td>{reservation.bookTitle}</td>
                                        <td>{reservation.studentName}</td>
                                        <td className="whitespace-nowrap">{formatDay(reservation.reservedAtUtc)}</td>
                                        <td className="text-right">
                                            <button
                                                className="btn btn-primary btn-sm"
                                                disabled={collect.isPending || !reservationActions(reservation).canCollect}
                                                onClick={() => {
                                                    setError(undefined);
                                                    collect.mutate(reservation.id, { onError: err => setError(getErrorMessage(err)) });
                                                }}
                                            >
                                                Hand over
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Reading-room requests a student has made that no librarian has decided yet. Rejecting (with a reason) is on the room page. */
function RoomsToApprove() {
    const reservations = useRoomReservations();
    const approve = useApproveRoomReservation();
    const [error, setError] = useState<string>();

    // Oldest request first, as on the room page.
    const pending = (reservations.data ?? [])
        .filter(r => r.status === ReservationStatus.Pending)
        .sort((a, b) => a.requestedAtUtc.localeCompare(b.requestedAtUtc));

    return (
        <div className="card card-border mt-4 border-base-content/15 bg-base-100 shadow-sm">
            <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="card-title text-base">
                        Rooms to be approved
                        {reservations.data && <span className="badge badge-warning">{pending.length}</span>}
                    </h3>
                    <Link to="/room-reservations" className="link text-sm">
                        Review, reject or see all
                    </Link>
                </div>
                <p className="text-sm opacity-70">Reading rooms students have asked for, waiting for a librarian.</p>

                {error && (
                    <div role="alert" className="alert alert-error alert-soft">
                        {error}
                    </div>
                )}

                {reservations.isError ? (
                    <div role="alert" className="alert alert-error alert-soft">
                        Could not load the room reservations: {getErrorMessage(reservations.error)}
                    </div>
                ) : reservations.isLoading ? (
                    <span className="loading loading-spinner" />
                ) : pending.length === 0 ? (
                    <p className="py-4 text-center text-sm opacity-60">No rooms are waiting for approval.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Student</th>
                                    <th>When</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map(reservation => (
                                    <tr key={reservation.id}>
                                        <td>{reservation.roomName}</td>
                                        <td>{reservation.userName}</td>
                                        <td className="whitespace-nowrap">{formatReservationTime(reservation.startUtc, reservation.endUtc)}</td>
                                        <td className="text-right">
                                            <button
                                                className="btn btn-success btn-sm"
                                                disabled={approve.isPending}
                                                onClick={() => {
                                                    setError(undefined);
                                                    approve.mutate(reservation.id, { onError: err => setError(getErrorMessage(err)) });
                                                }}
                                            >
                                                Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export function DashboardPage() {
    const books = bookHooks.useList().data;
    const authors = authorHooks.useList().data;
    const genres = genreHooks.useList().data;

    const count = (items: unknown[] | undefined) => items?.length ?? '—';
    const borrowed = books?.filter(b => b.status === BookStatus.Borrowed).length;

    const byGenre = useMemo(() => countBy(books ?? [], book => book.genreName), [books]);
    const byStatus = useMemo(
        () =>
            Object.values(BookStatus)
                .map(status => ({
                    name: bookStatusLabels[status],
                    count: (books ?? []).filter(book => book.status === status).length,
                    color: statusColors[status],
                }))
                .filter(entry => entry.count > 0),
        [books],
    );
    // A book can sit on several floors; it counts once for each.
    const byFloor = useMemo(
        () => countBy((books ?? []).flatMap(book => [...new Set(book.rows.map(row => row.floorName))]), floor => floor),
        [books],
    );

    return (
        <Page title="Dashboard" description="A quick look at the catalogue.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Books" value={count(books)} hint="Titles in the catalogue" icon={<BookIcon />} />
                <StatCard label="Borrowed" value={borrowed ?? '—'} hint="Currently on loan" icon={<LoanIcon />} />
                <StatCard label="Authors" value={count(authors)} icon={<AuthorIcon />} />
                <StatCard label="Genres" value={count(genres)} icon={<GenreIcon />} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <BooksToHandOver />
                <RoomsToApprove />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Books by genre" empty={byGenre.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byGenre} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} interval={0} />
                            <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-base-200)' }} />
                            <Bar dataKey="count" name="Books" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Books by status" empty={byStatus.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={byStatus} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                                {byStatus.map(entry => (
                                    <Cell key={entry.name} fill={entry.color} stroke="var(--color-base-100)" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Books by floor" empty={byFloor.length === 0}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byFloor} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-base-200)' }} />
                            <Bar dataKey="count" name="Books" fill="var(--color-secondary)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </Page>
    );
}
