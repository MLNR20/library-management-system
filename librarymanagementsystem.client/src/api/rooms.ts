import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { roomReservationsKey, useReservationMutation } from './tables.ts';
import type { ReservationStatus } from './tables.ts';

// Mirrors Dtos/Reservations in LibraryManagementSystem.Server: reserving a whole reading room.
// A room is a Section whose model is ReadingRoom (see api/resources.ts); statuses and helpers are shared with tables.ts.

export interface RoomReservation {
    id: string;
    sectionId: string;
    roomName: string;
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

export interface RoomReservationRequest {
    /** Must be a reading room. */
    sectionId: string;
    startUtc: string;
    endUtc: string;
    note: string | null;
}

/** Students get their own reservations; librarians and administrators get everyone's. */
export function useRoomReservations() {
    return useQuery({
        queryKey: roomReservationsKey,
        queryFn: async () => (await api.get<RoomReservation[]>('/room-reservations')).data,
        refetchInterval: 60 * 1000,
    });
}

/** A taken slot in a room: Approved holds it, Pending is requested but undecided. A table reserved in the room counts too. */
export interface RoomBusySlot {
    sectionId: string;
    startUtc: string;
    endUtc: string;
    status: ReservationStatus;
}

/** Slots taken on `date` (a local yyyy-MM-dd), refreshed every 30 seconds so the view stays live. */
export function useRoomAvailability(date: string) {
    return useQuery({
        queryKey: [...roomReservationsKey, 'availability', date],
        queryFn: async () => {
            const from = new Date(`${date}T00:00`);
            const to = new Date(from);
            to.setDate(to.getDate() + 1);
            const response = await api.get<RoomBusySlot[]>('/room-reservations/availability', {
                params: { from: from.toISOString(), to: to.toISOString() },
            });
            return response.data;
        },
        refetchInterval: 30 * 1000,
    });
}

/**
 * Files a request. `idempotencyKey` makes a retry or double submit of the same request return the reservation already
 * filed instead of creating another; reuse the key for retries and use a fresh one for a different request.
 */
export const useRequestRoomReservation = () =>
    useReservationMutation(
        async ({ idempotencyKey, ...body }: RoomReservationRequest & { idempotencyKey: string }) =>
            (await api.post<RoomReservation>('/room-reservations', body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    );

export const useApproveRoomReservation = () =>
    useReservationMutation(async (id: string) => (await api.post<RoomReservation>(`/room-reservations/${id}/approve`)).data);

export const useRejectRoomReservation = () =>
    useReservationMutation(
        async ({ id, reason }: { id: string; reason: string | null }) =>
            (await api.post<RoomReservation>(`/room-reservations/${id}/reject`, { reason })).data,
    );

export const useCancelRoomReservation = () =>
    useReservationMutation(async (id: string) => (await api.post<RoomReservation>(`/room-reservations/${id}/cancel`)).data);
