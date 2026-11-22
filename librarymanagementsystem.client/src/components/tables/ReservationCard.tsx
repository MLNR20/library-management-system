import {
    formatReservationTime,
    ReservationStatus,
    reservationStatusBadges,
    reservationStatusLabels,
} from '../../api/tables.ts';

/** What a card needs to show of a table or room reservation. */
export interface ReservationItem {
    id: string;
    title: string;
    subtitle: string | null;
    startUtc: string;
    endUtc: string;
    note: string | null;
    status: ReservationStatus;
    decidedByName: string | null;
    decisionNote: string | null;
}

interface Props {
    item: ReservationItem;
    /** The current time, for knowing whether the reservation can still be cancelled. */
    now: number;
    onCancel: (id: string) => void;
    cancelPending: boolean;
}

/**
 * One table or room reservation: what and where, when, the note, the librarian's decision and a status badge,
 * with a cancel button while it is waiting or approved and not over. Renders a list item, so put it in a `<ul>`.
 */
export function ReservationCard({ item, now, onCancel, cancelPending }: Props) {
    const open =
        (item.status === ReservationStatus.Pending || item.status === ReservationStatus.Approved) &&
        new Date(item.endUtc).getTime() > now;

    return (
        <li className="card border border-base-300 bg-base-100">
            <div className="card-body gap-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">
                        {item.title}
                        {item.subtitle && <span className="font-normal opacity-70"> · {item.subtitle}</span>}
                    </h3>
                    <span className={`badge ${reservationStatusBadges[item.status]}`}>{reservationStatusLabels[item.status]}</span>
                </div>
                <p className="text-sm">{formatReservationTime(item.startUtc, item.endUtc)}</p>
                {item.note && <p className="text-sm opacity-70">{item.note}</p>}
                {item.decidedByName && (
                    <p className="text-sm opacity-70">
                        {item.status === ReservationStatus.Rejected ? 'Rejected' : 'Decided'} by {item.decidedByName}
                        {item.decisionNote ? `: ${item.decisionNote}` : ''}
                    </p>
                )}
                {open && (
                    <div className="card-actions justify-end">
                        <button className="btn btn-ghost btn-sm" disabled={cancelPending} onClick={() => onCancel(item.id)}>
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}
