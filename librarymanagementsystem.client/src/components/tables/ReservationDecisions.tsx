import { useState } from 'react';
import { Page } from '../layout/Page.tsx';
import { Modal } from '../ui/Modal.tsx';
import {
    formatReservationTime,
    ReservationStatus,
    reservationStatusBadges,
    reservationStatusLabels,
} from '../../api/tables.ts';
import { getErrorMessage } from '../../lib/api.ts';

/** What staff need to see of a table or room reservation to decide it. */
export interface DecisionItem {
    id: string;
    userName: string;
    target: string;
    targetNote: string | null;
    startUtc: string;
    endUtc: string;
    note: string | null;
    status: ReservationStatus;
    requestedAtUtc: string;
    decidedByName: string | null;
}

interface Props {
    title: string;
    description: string;
    /** Column title for what was asked for: "Table" or "Room". */
    targetLabel: string;
    items: DecisionItem[];
    isLoading: boolean;
    approve: (id: string, onError: (error: Error) => void) => void;
    approving: boolean;
    reject: (id: string, reason: string | null, onDone: () => void, onError: (error: Error) => void) => void;
    rejecting: boolean;
}

/** Librarians and administrators decide the students' requests: approve, or reject with a reason they will see. */
export function ReservationDecisions({ title, description, targetLabel, items, isLoading, approve, approving, reject, rejecting }: Props) {
    const [onlyPending, setOnlyPending] = useState(true);
    const [rejectingItem, setRejectingItem] = useState<DecisionItem | null>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string>();

    const pendingCount = items.filter(r => r.status === ReservationStatus.Pending).length;
    // Oldest request first when deciding; the list keeps its server order (newest first) when browsing history.
    const visible = onlyPending
        ? items.filter(r => r.status === ReservationStatus.Pending).sort((a, b) => a.requestedAtUtc.localeCompare(b.requestedAtUtc))
        : items;

    const closeReject = () => {
        setRejectingItem(null);
        setReason('');
    };

    return (
        <Page
            title={title}
            description={description}
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

            {isLoading ? (
                <span className="loading loading-spinner" />
            ) : visible.length === 0 ? (
                <p className="opacity-70">{onlyPending ? 'Nothing is waiting for approval.' : 'There are no reservations yet.'}</p>
            ) : (
                <div className="overflow-x-auto rounded-box border border-base-300">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>{targetLabel}</th>
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
                                        {reservation.target}
                                        {reservation.targetNote && <div className="text-xs opacity-60">{reservation.targetNote}</div>}
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
                                                    disabled={approving}
                                                    onClick={() => {
                                                        setError(undefined);
                                                        approve(reservation.id, err => setError(getErrorMessage(err)));
                                                    }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-outline btn-error btn-sm"
                                                    onClick={() => {
                                                        setError(undefined);
                                                        setRejectingItem(reservation);
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

            <Modal open={rejectingItem !== null} title="Reject reservation" onClose={closeReject} className="max-w-md">
                <form
                    className="flex flex-col gap-4"
                    onSubmit={event => {
                        event.preventDefault();
                        if (!rejectingItem) return;
                        reject(rejectingItem.id, reason.trim() || null, closeReject, err => {
                            closeReject();
                            setError(getErrorMessage(err));
                        });
                    }}
                >
                    <p>
                        Reject {rejectingItem?.userName}&rsquo;s request for {rejectingItem?.target}? They will see your reason.
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
                        <button className="btn btn-error" disabled={rejecting}>
                            Reject
                        </button>
                    </div>
                </form>
            </Modal>
        </Page>
    );
}
