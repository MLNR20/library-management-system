import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.ts';

// Mirrors Dtos/TimeCards in LibraryManagementSystem.Server. Each user only ever sees and changes their own time card.

export interface ClockEntry {
    id: string;
    clockInUtc: string;
    clockOutUtc: string | null;
}

export interface ClockState {
    isClockedIn: boolean;
    /** Start of the open entry; null when clocked out. */
    clockedInAtUtc: string | null;
    /** Finished entries only; add the time since `clockedInAtUtc` for a live total. */
    todayHours: number;
    todayMinutes: number;
    todayEntries: ClockEntry[];
}

export interface TimeCard {
    id: string;
    userId: string;
    userName: string;
    /** yyyy-MM-dd (the UTC day the card was opened on). */
    date: string;
    /** Finished entries only. */
    totalHours: number;
    totalMinutes: number;
    /** A shift on this card is still running. */
    isOpen: boolean;
    entries: ClockEntry[];
}

export interface TimeCardFilters {
    /** yyyy-MM-dd; empty means no limit. */
    from: string;
    to: string;
}

const clockKey = ['clock'] as const;

/** Administrators get every user's time cards; everyone else only their own. */
export function useTimeCards(filters: TimeCardFilters) {
    return useQuery({
        queryKey: [...clockKey, 'cards', filters],
        queryFn: async () =>
            (await api.get<TimeCard[]>('/clock/cards', { params: { from: filters.from || undefined, to: filters.to || undefined } }))
                .data,
    });
}

export function useClockState() {
    return useQuery({
        queryKey: clockKey,
        queryFn: async () => (await api.get<ClockState>('/clock')).data,
    });
}

function useClockMutation(path: 'in' | 'out') {
    const queryClient = useQueryClient();
    return useMutation<ClockState, Error, void>({
        mutationFn: async () => (await api.post<ClockState>(`/clock/${path}`)).data,
        onSuccess: state => {
            queryClient.setQueryData(clockKey, state);
            // The time cards page lists the same entries.
            void queryClient.invalidateQueries({ queryKey: [...clockKey, 'cards'] });
        },
        // A 409 means another tab already changed it; reload so the button matches reality.
        onError: () => queryClient.invalidateQueries({ queryKey: clockKey }),
    });
}

export const useClockIn = () => useClockMutation('in');
export const useClockOut = () => useClockMutation('out');
