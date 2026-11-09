import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { createCrudHooks } from '../lib/crud.ts';

// Mirrors Dtos/Reservations in LibraryManagementSystem.Server.

export interface StudyTable {
    id: string;
    name: string;
    seats: number;
    /** An inactive table is out of service and cannot be reserved. */
    isActive: boolean;
    /** Null when the table is not assigned to a section; otherwise a reading room. */
    sectionId: string | null;
    sectionName: string | null;
}
export interface StudyTableRequest {
    name: string;
    seats: number;
    isActive: boolean;
    /** Must be a reading room when given. */
    sectionId: string | null;
}

/** Numeric values match the server's ReservationStatus enum. */
export const ReservationStatus = {
    Pending: 0,
    Approved: 1,
    Rejected: 2,
    Cancelled: 3,
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const reservationStatusLabels: Record<ReservationStatus, string> = {
    [ReservationStatus.Pending]: 'Waiting for approval',
    [ReservationStatus.Approved]: 'Approved',
    [ReservationStatus.Rejected]: 'Rejected',
    [ReservationStatus.Cancelled]: 'Cancelled',
};

export const reservationStatusBadges: Record<ReservationStatus, string> = {
    [ReservationStatus.Pending]: 'badge-warning',
    [ReservationStatus.Approved]: 'badge-success',
    [ReservationStatus.Rejected]: 'badge-error',
    [ReservationStatus.Cancelled]: 'badge-neutral',
};

export interface TableReservation {
    id: string;
    tableId: string;
    tableName: string;
    sectionName: string | null;
    userId: string;
    userName: string;
    startUtc: string;
    endUtc: string;
    note: string | null;
    status: ReservationStatus;
    requestedAtUtc: string;
    decidedAtUtc: string | null;
    decidedByName: string | null;
    decisionNote: string | null;
}

export interface TableReservationRequest {
    tableId: string;
    startUtc: string;
    endUtc: string;
    note: string | null;
}

/** A reservation lasts at most this long (mirrors TableReservation.MaxDuration on the server). */
export const MAX_RESERVATION_HOURS = 4;

export const tableHooks = createCrudHooks<StudyTable, StudyTableRequest>('tables');

const reservationsKey = ['table-reservations'] as const;

/** Students get their own reservations; librarians and administrators get everyone's. */
export function useReservations() {
    return useQuery({
        queryKey: reservationsKey,
        queryFn: async () => (await api.get<TableReservation[]>('/table-reservations')).data,
        refetchInterval: 60 * 1000,
    });
}

/** A taken slot on a table: Approved holds it, Pending is requested but undecided. Carries no user details. */
export interface TableBusySlot {
    tableId: string;
    startUtc: string;
    endUtc: string;
    status: ReservationStatus;
}

/** Slots taken on `date` (a local yyyy-MM-dd), refreshed every 30 seconds so the view stays live. */
export function useTableAvailability(date: string) {
    return useQuery({
        queryKey: [...reservationsKey, 'availability', date],
        queryFn: async () => {
            const from = new Date(`${date}T00:00`);
            const to = new Date(from);
            to.setDate(to.getDate() + 1);
            const response = await api.get<TableBusySlot[]>('/table-reservations/availability', {
                params: { from: from.toISOString(), to: to.toISOString() },
            });
            return response.data;
        },
        refetchInterval: 30 * 1000,
    });
}

/** The first slot on `tableId` with the given status that overlaps the local `from`–`to` range on `date`, if any. */
export function findOverlap(
    slots: TableBusySlot[],
    tableId: string,
    status: ReservationStatus,
    date: string,
    from: string,
    to: string,
) {
    const start = new Date(`${date}T${from}`).getTime();
    const end = new Date(`${date}T${to}`).getTime();
    if (!(end > start)) return undefined;
    return slots.find(
        slot =>
            slot.tableId === tableId &&
            slot.status === status &&
            new Date(slot.startUtc).getTime() < end &&
            new Date(slot.endUtc).getTime() > start,
    );
}

function useReservationMutation<TVars>(fn: (vars: TVars) => Promise<TableReservation>) {
    const queryClient = useQueryClient();
    return useMutation<TableReservation, Error, TVars>({
        mutationFn: fn,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsKey }),
    });
}

export const useRequestReservation = () =>
    useReservationMutation(async (body: TableReservationRequest) => (await api.post<TableReservation>('/table-reservations', body)).data);

export const useApproveReservation = () =>
    useReservationMutation(async (id: string) => (await api.post<TableReservation>(`/table-reservations/${id}/approve`)).data);

export const useRejectReservation = () =>
    useReservationMutation(
        async ({ id, reason }: { id: string; reason: string | null }) =>
            (await api.post<TableReservation>(`/table-reservations/${id}/reject`, { reason })).data,
    );

export const useCancelReservation = () =>
    useReservationMutation(async (id: string) => (await api.post<TableReservation>(`/table-reservations/${id}/cancel`)).data);

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/** "Nov 8, 2026, 2:00 PM – 4:00 PM" in the viewer's own time zone. */
export function formatReservationTime(startUtc: string, endUtc: string) {
    return `${formatter.format(new Date(startUtc))} – ${timeFormatter.format(new Date(endUtc))}`;
}
