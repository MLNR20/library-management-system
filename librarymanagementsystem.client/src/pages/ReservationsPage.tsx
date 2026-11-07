import { useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import {
    formatReservationTime,
    ReservationStatus,
    reservationStatusBadges,
    reservationStatusLabels,
    useApproveReservation,
    useRejectReservation,
    useReservations,
} from '../api/tables.ts';
import type { TableReservation } from '../api/tables.ts';
import { getErrorMessage } from '../lib/api.ts';

/** Librarians and administrators decide the students' table requests. */
export function ReservationsPage() {
    const reservations = useReservations();
    const approve = useApproveReservation();
    const reject = useRejectReservation();

    const [onlyPending, setOnlyPending] = useState(true);
    const [rejecting, setRejecting] = useState<TableReservation | null>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string>();

    const all = reservations.data ?? [];
    const pendingCount = all.filter(r => r.status === ReservationStatus.Pending).length;
    // Oldest request first when deciding; newest first when browsing history.
    const visible = onlyPending
        ? all.filter(r => r.status === ReservationStatus.Pending).sort((a, b) => a.requestedAtUtc.localeCompare(b.requestedAtUtc))
        : all;

    const closeReject = () => {
        setRejecting(null);
        setReason('');
    };

    return (
        <Page
            title="Table reservations"
            description="Approve or reject the tables students have asked for. An approval holds the table, so two approved reservations can never overlap."
            actions={
                <div role="tablist" className="tabs tabs-box">
                    <button role="tab" className={`tab ${onlyPending ? 'tab-active' : ''}`} onClick={() => setOnlyPending(true)}>
                        Waiting ({pendingCount})
                    </button>
                    <button role="tab" className={`tab ${onlyPending ? '' : 'tab-active'}`} onClick={() => setOnlyPending(false)}>
                        All
                    </button>
                </div>
            }
        >
            {error && (
                <div role="alert" className="alert alert-error alert-soft mb-4">
                    {error}
                </div>
            )}

            {reservations.isLoading ? (
                <span className="loading loading-spinner" />
            ) : visible.length === 0 ? (
                <p className="opacity-70">{onlyPending ? 'Nothing is waiting for approval.' : 'There are no reservations yet.'}</p>
            ) : (
                <div className="overflow-x-auto rounded-box border border-base-300">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Table</th>
                                <th>When</th>
                                <th>Purpose</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(reservation => (
                                <tr key={reservation.id}>
                                    <td>{reservation.userName}</td>
                                    <td>
                                        {reservation.tableName}
                                        {reservation.sectionName && <div className="text-xs opacity-60">{reservation.sectionName}</div>}
                                    </td>
                                    <td className="whitespace-nowrap">{formatReservationTime(reservation.startUtc, reservation.endUtc)}</td>
                                    <td className="max-w-xs">{reservation.note ?? <span className="opacity-50">—</span>}</td>
                                    <td>
                                        <span className={`badge ${reservationStatusBadges[reservation.status]}`}>
                                            {reservationStatusLabels[reservation.status]}
                                        </span>
                                        {reservation.decidedByName && <div className="text-xs opacity-60">by {reservation.decidedByName}</div>}
                                    </td>
                                    <td className="whitespace-nowrap text-right">
                                        {reservation.status === ReservationStatus.Pending && (
                                            <div className="flex justify-end gap-2">
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
                                                <button
                                                    className="btn btn-outline btn-error btn-sm"
                                                    onClick={() => {
                                                        setError(undefined);
                                                        setRejecting(reservation);
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={rejecting !== null} title="Reject reservation" onClose={closeReject} className="max-w-md">
                <form
                    className="flex flex-col gap-4"
                    onSubmit={event => {
                        event.preventDefault();
                        if (!rejecting) return;
                        reject.mutate(
                            { id: rejecting.id, reason: reason.trim() || null },
                            {
                                onSuccess: closeReject,
                                onError: err => {
                                    closeReject();
                                    setError(getErrorMessage(err));
                                },
                            },
                        );
                    }}
                >
                    <p>
                        Reject {rejecting?.userName}&rsquo;s request for {rejecting?.tableName}? They will see your reason.
                    </p>
                    <textarea
                        className="textarea w-full"
                        rows={3}
                        maxLength={300}
                        placeholder="Reason (optional)"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-ghost" onClick={closeReject}>
                            Back
                        </button>
                        <button className="btn btn-error" disabled={reject.isPending}>
                            Reject
                        </button>
                    </div>
                </form>
            </Modal>
        </Page>
    );
}
