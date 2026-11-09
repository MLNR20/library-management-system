import { useState } from 'react';
import type { FormEvent } from 'react';
import { Page } from '../components/layout/Page.tsx';
import {
    findOverlap,
    formatReservationTime,
    MAX_RESERVATION_HOURS,
    ReservationStatus,
    reservationStatusBadges,
    reservationStatusLabels,
    tableHooks,
    useCancelReservation,
    useRequestReservation,
    useReservations,
    useTableAvailability,
} from '../api/tables.ts';
import { TableAvailability } from '../components/tables/TableAvailability.tsx';
import { getErrorMessage } from '../lib/api.ts';

const todayLocal = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Students file a request for a table; it only holds the table once a librarian approves it. */
export function StudentTablesPage() {
    const tables = tableHooks.useList();
    const reservations = useReservations();
    const request = useRequestReservation();
    const cancel = useCancelReservation();

    const [tableId, setTableId] = useState('');
    const [date, setDate] = useState(todayLocal());
    const [from, setFrom] = useState('14:00');
    const [to, setTo] = useState('16:00');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string>();
    const [sent, setSent] = useState(false);

    const availability = useTableAvailability(date);
    const slots = availability.data ?? [];
    const reserved = tableId ? findOverlap(slots, tableId, ReservationStatus.Approved, date, from, to) : undefined;
    const alsoRequested = tableId && !reserved ? findOverlap(slots, tableId, ReservationStatus.Pending, date, from, to) : undefined;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSent(false);

        const start = new Date(`${date}T${from}`);
        const end = new Date(`${date}T${to}`);
        if (!tableId) return setError('Choose a table.');
        if (!(end > start)) return setError('The reservation must end after it starts.');
        if (start <= new Date()) return setError('The reservation must start in the future.');
        if ((end.getTime() - start.getTime()) / 3600000 > MAX_RESERVATION_HOURS) {
            return setError(`A reservation can last at most ${MAX_RESERVATION_HOURS} hours.`);
        }

        if (reserved) return setError('That table is already reserved for part of that time. Pick a free slot in the availability view.');

        setError(undefined);
        request.mutate(
            { tableId, startUtc: start.toISOString(), endUtc: end.toISOString(), note: note.trim() || null },
            {
                onSuccess: () => {
                    setSent(true);
                    setNote('');
                },
                onError: err => setError(getErrorMessage(err)),
            },
        );
    };

    const now = Date.now();

    return (
        <Page
            title="Reserve a table"
            description="Ask for a table in a reading room. A librarian has to approve your request before the table is yours."
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
                <form onSubmit={submit} className="card card-border h-fit bg-base-100 shadow-sm">
                    <div className="card-body gap-3">
                        <h2 className="card-title">New request</h2>

                        <label className="form-control">
                            <span className="label-text mb-1">Table</span>
                            <select className="select w-full" value={tableId} onChange={e => setTableId(e.target.value)} required>
                                <option value="">Select a table</option>
                                {(tables.data ?? []).map(table => (
                                    <option key={table.id} value={table.id}>
                                        {table.name} · {table.seats} seats{table.sectionName ? ` · ${table.sectionName}` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="form-control">
                            <span className="label-text mb-1">Date</span>
                            <input type="date" className="input w-full" value={date} min={todayLocal()} onChange={e => setDate(e.target.value)} required />
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="form-control">
                                <span className="label-text mb-1">From</span>
                                <input type="time" className="input w-full" value={from} onChange={e => setFrom(e.target.value)} required />
                            </label>
                            <label className="form-control">
                                <span className="label-text mb-1">To</span>
                                <input type="time" className="input w-full" value={to} onChange={e => setTo(e.target.value)} required />
                            </label>
                        </div>

                        <label className="form-control">
                            <span className="label-text mb-1">What is it for? (optional)</span>
                            <textarea
                                className="textarea w-full"
                                rows={2}
                                maxLength={300}
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. Group study for the chemistry exam"
                            />
                        </label>

                        <p className="text-xs opacity-60">Up to {MAX_RESERVATION_HOURS} hours per reservation.</p>

                        {reserved && !error && (
                            <div role="alert" className="alert alert-error alert-soft">
                                That table is already reserved for part of that time.
                            </div>
                        )}
                        {alsoRequested && !error && (
                            <div role="status" className="alert alert-warning alert-soft">
                                Someone has already asked for this table at that time. A librarian will decide who gets it.
                            </div>
                        )}
                        {error && (
                            <div role="alert" className="alert alert-error alert-soft">
                                {error}
                            </div>
                        )}
                        {sent && (
                            <div role="status" className="alert alert-success alert-soft">
                                Request sent. You will see it below once a librarian decides.
                            </div>
                        )}

                        <button className="btn btn-primary" disabled={request.isPending}>
                            {request.isPending ? 'Sending…' : 'Request table'}
                        </button>
                    </div>
                </form>

                <div className="flex min-w-0 flex-col gap-6">
                <TableAvailability
                    tables={tables.data ?? []}
                    slots={slots}
                    isError={availability.isError}
                    date={date}
                    from={from}
                    to={to}
                    selectedTableId={tableId}
                    onSelectTable={setTableId}
                />

                <section aria-labelledby="my-reservations">
                    <h2 id="my-reservations" className="mb-3 text-lg font-bold">
                        My reservations
                    </h2>
                    {reservations.isLoading ? (
                        <span className="loading loading-spinner" />
                    ) : (reservations.data ?? []).length === 0 ? (
                        <p className="opacity-70">You have no reservations yet.</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {(reservations.data ?? []).map(reservation => {
                                const open =
                                    (reservation.status === ReservationStatus.Pending || reservation.status === ReservationStatus.Approved) &&
                                    new Date(reservation.endUtc).getTime() > now;
                                return (
                                    <li key={reservation.id} className="card card-border bg-base-100 shadow-sm">
                                        <div className="card-body gap-1 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h3 className="font-bold">
                                                    {reservation.tableName}
                                                    {reservation.sectionName && (
                                                        <span className="font-normal opacity-70"> · {reservation.sectionName}</span>
                                                    )}
                                                </h3>
                                                <span className={`badge ${reservationStatusBadges[reservation.status]}`}>
                                                    {reservationStatusLabels[reservation.status]}
                                                </span>
                                            </div>
                                            <p className="text-sm">{formatReservationTime(reservation.startUtc, reservation.endUtc)}</p>
                                            {reservation.note && <p className="text-sm opacity-70">{reservation.note}</p>}
                                            {reservation.decidedByName && (
                                                <p className="text-sm opacity-70">
                                                    {reservation.status === ReservationStatus.Rejected ? 'Rejected' : 'Decided'} by{' '}
                                                    {reservation.decidedByName}
                                                    {reservation.decisionNote ? `: ${reservation.decisionNote}` : ''}
                                                </p>
                                            )}
                                            {open && (
                                                <div className="card-actions justify-end">
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        disabled={cancel.isPending}
                                                        onClick={() => cancel.mutate(reservation.id)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {cancel.isError && (
                        <div role="alert" className="alert alert-error alert-soft mt-3">
                            {getErrorMessage(cancel.error)}
                        </div>
                    )}
                </section>
                </div>
            </div>
        </Page>
    );
}
