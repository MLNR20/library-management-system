import { useMemo } from 'react';
import {
    tableHooks,
    useCancelReservation,
    useRequestReservation,
    useReservations,
    useTableAvailability,
} from '../api/tables.ts';
import { ReservationRequestPage } from '../components/tables/ReservationRequestPage.tsx';

/** What is taken on a day, in the grid's shape. */
function useTableSlots(date: string) {
    const availability = useTableAvailability(date);
    return { data: availability.data?.map(slot => ({ ...slot, rowId: slot.tableId })), isError: availability.isError };
}

/** Students file a request for a table; it only holds the table once a librarian approves it. */
export function StudentTablesPage() {
    const tables = tableHooks.useList();
    const reservations = useReservations();
    const request = useRequestReservation();
    const cancel = useCancelReservation();

    const tableList = tables.data;
    const rows = useMemo(
        () =>
            (tableList ?? [])
                .filter(table => table.isActive)
                .map(table => ({
                    id: table.id,
                    name: table.name,
                    title: `${table.name} · ${table.seats} seats${table.sectionName ? ` · ${table.sectionName}` : ''}`,
                })),
        [tableList],
    );

    return (
        <ReservationRequestPage
            title="Reserve a table"
            description="Ask for a table in a reading room. A librarian has to approve your request before the table is yours."
            noun="table"
            targetLabel="Table"
            notePlaceholder="e.g. Group study for the chemistry exam"
            rows={rows}
            optionLabel={row => row.title ?? row.name}
            emptyText="There are no tables to reserve yet."
            footnote="A table is only yours once a librarian approves."
            useAvailability={useTableSlots}
            submit={({ targetId, ...body }, options) => request.mutate({ tableId: targetId, ...body }, options)}
            submitting={request.isPending}
            myHeading="My reservations"
            myEmptyText="You have no reservations yet."
            mine={(reservations.data ?? []).map(r => ({
                id: r.id,
                title: r.tableName,
                subtitle: r.sectionName,
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
