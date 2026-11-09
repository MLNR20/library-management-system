import { ReservationDecisions } from '../components/tables/ReservationDecisions.tsx';
import { useApproveReservation, useRejectReservation, useReservations } from '../api/tables.ts';

/** Librarians and administrators decide the students' table requests. */
export function ReservationsPage() {
    const reservations = useReservations();
    const approve = useApproveReservation();
    const reject = useRejectReservation();

    return (
        <ReservationDecisions
            title="Table reservations"
            description="Approve or reject the tables students have asked for. An approval holds the table, so two approved reservations can never overlap."
            targetLabel="Table"
            items={(reservations.data ?? []).map(r => ({
                id: r.id,
                userName: r.userName,
                target: r.tableName,
                targetNote: r.sectionName,
                startUtc: r.startUtc,
                endUtc: r.endUtc,
                note: r.note,
                status: r.status,
                requestedAtUtc: r.requestedAtUtc,
                decidedByName: r.decidedByName,
            }))}
            isLoading={reservations.isLoading}
            approve={(id, onError) => approve.mutate(id, { onError })}
            approving={approve.isPending}
            reject={(id, reason, onDone, onError) => reject.mutate({ id, reason }, { onSuccess: onDone, onError })}
            rejecting={reject.isPending}
        />
    );
}
