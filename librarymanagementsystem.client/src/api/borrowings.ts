import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import { getAccessToken } from '../lib/authStorage.ts';

// Mirrors Dtos/Borrowings and Hubs/BorrowingHub in LibraryManagementSystem.Server.

export interface Borrowing {
    id: string;
    bookId: string;
    bookTitle: string;
    userId: string;
    userName: string;
    borrowedAtUtc: string;
    dueAtUtc: string;
    /** Null while the book is still out. */
    returnedAtUtc: string | null;
    isOverdue: boolean;
    overdueDays: number;
    penaltyAmount: number;
}

/** Students get their own loans, newest first; librarians and administrators get everyone's. */
export function useBorrowings() {
    return useQuery({
        queryKey: ['borrowings'],
        queryFn: async () => (await api.get<Borrowing[]>('/borrowings')).data,
        refetchInterval: 30 * 1000,
    });
}

export interface BorrowingHandlers {
    /** A loan was opened or returned. */
    onBorrowingChanged?: (borrowing: Borrowing) => void;
    /** An overdue loan's penalty grew. */
    onPenaltyUpdated?: (borrowing: Borrowing) => void;
}

/**
 * Opens the real-time connection (the caller starts and stops it). Users receive their own loans' events;
 * administrators receive everyone's.
 */
export function createBorrowingHub({ onBorrowingChanged, onPenaltyUpdated }: BorrowingHandlers): HubConnection {
    const hub = new HubConnectionBuilder()
        .withUrl(`${import.meta.env.VITE_API_BASE_URL ?? '/api'}/hubs/borrowings`, {
            accessTokenFactory: () => getAccessToken() ?? '',
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

    if (onBorrowingChanged) hub.on('BorrowingChanged', onBorrowingChanged);
    if (onPenaltyUpdated) hub.on('PenaltyUpdated', onPenaltyUpdated);

    return hub;
}
