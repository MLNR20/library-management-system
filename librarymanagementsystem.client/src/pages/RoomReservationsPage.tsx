import { ReservationDecisions } from '../components/tables/ReservationDecisions.tsx';
import { useApproveRoomReservation, useRejectRoomReservation, useRoomReservations } from '../api/rooms.ts';

/** Librarians and administrators decide the students' requests for a whole reading room. */
export function RoomReservationsPage() {
    const reservations = useRoomReservations();
    const approve = useApproveRoomReservation();
    const reject = useRejectRoomReservation();

    return (
        <ReservationDecisions
            title="Room reservations"
            description="Approve or reject the reading rooms students have asked for. An approval holds the whole room, including its tables, so it cannot overlap another room or table reservation."
            targetLabel="Reading room"
            items={(reservations.data ?? []).map(r => ({
                id: r.id,
                userName: r.userName,
                target: r.roomName,
                targetNote: null,
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
