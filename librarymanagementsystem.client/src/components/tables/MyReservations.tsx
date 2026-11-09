import {
    formatReservationTime,
    ReservationStatus,
    reservationStatusBadges,
    reservationStatusLabels,
} from '../../api/tables.ts';
import { getErrorMessage } from '../../lib/api.ts';

/** What the list needs to show of a table or room reservation. */
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
    id: string;
    heading: string;
    emptyText: string;
    items: ReservationItem[];
    isLoading: boolean;
    onCancel: (id: string) => void;
    cancelPending: boolean;
    cancelError: Error | null;
    /** The current time, for knowing which reservations can still be cancelled. */
    now: number;
}

/** A student's own reservations, with a cancel button while one is waiting or approved and not over. */
export function MyReservations({ id, heading, emptyText, items, isLoading, onCancel, cancelPending, cancelError, now }: Props) {
    return (
        <section aria-labelledby={id}>
            <h2 id={id} className="mb-3 text-lg font-bold">
                {heading}
            </h2>
            {isLoading ? (
                <span className="loading loading-spinner" />
            ) : items.length === 0 ? (
                <p className="opacity-70">{emptyText}</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {items.map(item => {
                        const open =
                            (item.status === ReservationStatus.Pending || item.status === ReservationStatus.Approved) &&
                            new Date(item.endUtc).getTime() > now;
                        return (
                            <li key={item.id} className="card card-border bg-base-100 shadow-sm">
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
                    })}
                </ul>
            )}
            {cancelError && (
                <div role="alert" className="alert alert-error alert-soft mt-3">
                    {getErrorMessage(cancelError)}
                </div>
            )}
        </section>
    );
}
