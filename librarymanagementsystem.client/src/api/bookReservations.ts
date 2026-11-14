import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { BookStatus } from './resources.ts';

// Mirrors Dtos/BookReservations and Dtos/Borrowings in LibraryManagementSystem.Server.

/** Numeric values match the server's BookReservationStatus enum. */
export const BookReservationStatus = {
    Reserved: 0,
    Borrowed: 1,
    ReturnRequested: 2,
    Returned: 3,
    Cancelled: 4,
} as const;
export type BookReservationStatus = (typeof BookReservationStatus)[keyof typeof BookReservationStatus];

export interface BookReservation {
    id: string;
    studentId: string;
    studentName: string;
    bookId: string;
    bookTitle: string;
    /** The book's own status right now; the actions on offer follow it. */
    bookStatus: BookStatus;
    status: BookReservationStatus;
    reservedAtUtc: string;
    /** The loan opened when the student collected the book. */
    borrowingId: string | null;
    dueAtUtc: string | null;
    /** Still out and past its due date. */
    isOverdue: boolean;
    returnRequestedAtUtc: string | null;
    returnApprovedAtUtc: string | null;
    returnApprovedByName: string | null;
}

export const bookReservationStatusLabels: Record<BookReservationStatus, string> = {
    [BookReservationStatus.Reserved]: 'Reserved for you',
    [BookReservationStatus.Borrowed]: 'On loan',
    [BookReservationStatus.ReturnRequested]: 'Waiting for the librarian',
    [BookReservationStatus.Returned]: 'Returned',
    [BookReservationStatus.Cancelled]: 'Cancelled',
};

export const bookReservationStatusBadges: Record<BookReservationStatus, string> = {
    [BookReservationStatus.Reserved]: 'badge-info',
    [BookReservationStatus.Borrowed]: 'badge-warning',
    [BookReservationStatus.ReturnRequested]: 'badge-secondary',
    [BookReservationStatus.Returned]: 'badge-success',
    [BookReservationStatus.Cancelled]: 'badge-neutral',
};

/**
 * What a reservation may do. It follows the book's own status as well as the reservation's, so a button never offers a
 * step the book is not ready for (for instance a return while the book is already waiting for the librarian).
 */
export function reservationActions(reservation: BookReservation) {
    const { status, bookStatus } = reservation;
    return {
        canCancel: status === BookReservationStatus.Reserved && bookStatus === BookStatus.Reserved,
        canCollect: status === BookReservationStatus.Reserved && bookStatus === BookStatus.Reserved,
        canRequestReturn:
            status === BookReservationStatus.Borrowed && reservation.borrowingId !== null && bookStatus === BookStatus.Borrowed,
        canApproveReturn:
            status === BookReservationStatus.ReturnRequested &&
            reservation.borrowingId !== null &&
            bookStatus === BookStatus.ReturnPending,
    };
}

const reservationsKey = ['book-reservations'] as const;

/** Students get their own reservations; librarians and administrators get everyone's. */
export function useBookReservations() {
    return useQuery({
        queryKey: reservationsKey,
        queryFn: async () => (await api.get<BookReservation[]>('/book-reservations')).data,
        refetchInterval: 30 * 1000,
    });
}

/** Every step changes the book's status too, so the catalogue refreshes with the reservations. */
function useReservationMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
    const queryClient = useQueryClient();
    return useMutation<unknown, Error, TVars>({
        mutationFn: fn,
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: reservationsKey }),
                queryClient.invalidateQueries({ queryKey: ['books'] }),
            ]),
    });
}

export const useReserveBook = () =>
    useReservationMutation(async (bookId: string) => (await api.post<BookReservation>('/book-reservations', { bookId })).data);

export const useCancelBookReservation = () =>
    useReservationMutation(async (id: string) => (await api.post<BookReservation>(`/book-reservations/${id}/cancel`)).data);

export const useCollectBook = () =>
    useReservationMutation(async (id: string) => (await api.post<BookReservation>(`/book-reservations/${id}/collect`)).data);

/** The student says the book is back; it stays on loan until a librarian approves. */
export const useRequestBookReturn = () =>
    useReservationMutation(async (borrowingId: string) => (await api.post(`/borrowings/${borrowingId}/return`)).data);

/** Librarians and administrators only. */
export const useApproveBookReturn = () =>
    useReservationMutation(async (borrowingId: string) => (await api.post(`/borrowings/${borrowingId}/approve-return`)).data);

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export const formatDay = (utc: string) => dateFormatter.format(new Date(utc));
