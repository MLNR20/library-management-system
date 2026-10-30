import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
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
