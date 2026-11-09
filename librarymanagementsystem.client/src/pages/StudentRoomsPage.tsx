import { useMemo } from 'react';
import { SectionModel, sectionHooks } from '../api/resources.ts';
import {
    useCancelRoomReservation,
    useRequestRoomReservation,
    useRoomAvailability,
    useRoomReservations,
} from '../api/rooms.ts';
import { tableHooks } from '../api/tables.ts';
import { ReservationRequestPage } from '../components/tables/ReservationRequestPage.tsx';

/** What is taken on a day, in the grid's shape. */
function useRoomSlots(date: string) {
    const availability = useRoomAvailability(date);
    return { data: availability.data?.map(slot => ({ ...slot, rowId: slot.sectionId })), isError: availability.isError };
}

/** Students file a request for a whole reading room; it only holds the room once a librarian approves it. */
export function StudentRoomsPage() {
    const sections = sectionHooks.useList();
    const tables = tableHooks.useList();
    const reservations = useRoomReservations();
    const request = useRequestRoomReservation();
    const cancel = useCancelRoomReservation();

    const sectionList = sections.data;
    const tableList = tables.data;
    const rows = useMemo(
        () =>
            (sectionList ?? [])
                .filter(section => section.model === SectionModel.ReadingRoom)
                .map(section => {
                    const inRoom = (tableList ?? []).filter(table => table.isActive && table.sectionId === section.id);
                    const seats = inRoom.reduce((total, table) => total + table.seats, 0);
                    return {
                        id: section.id,
                        name: section.name,
                        title: `${section.name} · ${section.floorName} · ${inRoom.length} tables, ${seats} seats`,
                    };
                }),
        [sectionList, tableList],
    );

    return (
        <ReservationRequestPage
            title="Reserve a reading room"
            description="Ask for a whole reading room, for a group or an event. A librarian has to approve your request, and an approved room holds its tables too."
            noun="reading room"
            targetLabel="Reading room"
            notePlaceholder="e.g. Study group of twelve for finals"
            rows={rows}
            optionLabel={row => row.title ?? row.name}
            emptyText="There are no reading rooms to reserve yet."
            footnote="A room is only yours once a librarian approves, and then its tables are taken for that time."
            useAvailability={useRoomSlots}
            submit={({ targetId, ...body }, options) => request.mutate({ sectionId: targetId, ...body }, options)}
            submitting={request.isPending}
            myHeading="My room reservations"
            myEmptyText="You have no room reservations yet."
            mine={(reservations.data ?? []).map(r => ({
                id: r.id,
                title: r.roomName,
                subtitle: null,
                startUtc: r.startUtc,
                endUtc: r.endUtc,
                note: r.note,
                status: r.status,
                decidedByName: r.decidedByName,
                decisionNote: r.decisionNote,
            }))}
            mineLoading={reservations.isLoading}
            cancel={id => cancel.mutate(id)}
            cancelling={cancel.isPending}
            cancelError={cancel.isError ? cancel.error : null}
        />
    );
}
