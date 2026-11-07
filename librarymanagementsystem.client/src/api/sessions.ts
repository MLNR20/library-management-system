import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.ts';

// Mirrors Dtos/Auth/SessionDtos in LibraryManagementSystem.Server. Everyone only ever sees their own sessions.

export interface UserSession {
    id: string;
    createdAtUtc: string;
    lastSeenAtUtc: string;
    expiresAtUtc: string;
    ipAddress: string | null;
    userAgent: string | null;
    /** The session this request came from. */
    isCurrent: boolean;
}

const sessionsKey = ['sessions'] as const;

export function useSessions() {
    return useQuery({
        queryKey: sessionsKey,
        queryFn: async () => (await api.get<UserSession[]>('/sessions')).data,
    });
}

export function useRevokeSession() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: async id => {
            await api.delete(`/sessions/${id}`);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: sessionsKey }),
    });
}

/** Ends every session but this one. Resolves with how many were ended. */
export function useRevokeOtherSessions() {
    const queryClient = useQueryClient();
    return useMutation<number, Error, void>({
        mutationFn: async () => (await api.post<number>('/sessions/revoke-others')).data,
        onSettled: () => queryClient.invalidateQueries({ queryKey: sessionsKey }),
    });
}

/** "Chrome on Windows" from a user agent string; falls back to "Unknown device". Good enough to tell devices apart. */
export function describeDevice(userAgent: string | null): string {
    if (!userAgent) return 'Unknown device';
    const browser = /Edg\//.test(userAgent)
        ? 'Edge'
        : /OPR\/|Opera/.test(userAgent)
          ? 'Opera'
          : /Firefox\//.test(userAgent)
            ? 'Firefox'
            : /Chrome\//.test(userAgent)
              ? 'Chrome'
              : /Safari\//.test(userAgent)
                ? 'Safari'
                : null;
    const os = /Windows/.test(userAgent)
        ? 'Windows'
        : /Android/.test(userAgent)
          ? 'Android'
          : /iPhone|iPad|iOS/.test(userAgent)
            ? 'iOS'
            : /Mac OS X|Macintosh/.test(userAgent)
              ? 'macOS'
              : /Linux/.test(userAgent)
                ? 'Linux'
                : null;
    if (browser && os) return `${browser} on ${os}`;
    return browser ?? os ?? 'Unknown device';
}
