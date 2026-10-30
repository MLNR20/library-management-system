import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_ROLE, LIBRARIAN_ROLE } from '../api/admin.ts';
import { api, setUnauthorizedHandler } from '../lib/api.ts';
import { clearSession, loadSession, saveSession } from '../lib/authStorage.ts';
import type { AuthSession } from '../lib/authStorage.ts';
import { AuthContext } from './authContext.ts';
import type { AuthContextValue, LoginRequest, RegisterRequest } from './authContext.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [session, setSession] = useState<AuthSession | null>(loadSession);

    const endSession = useCallback(() => {
        clearSession();
        setSession(null);
        // Cached lists belong to the user who is leaving.
        queryClient.clear();
    }, [queryClient]);

    const startSession = useCallback((next: AuthSession) => {
        saveSession(next);
        setSession(next);
    }, []);

    // The server rejected the saved token.
    useEffect(() => {
        setUnauthorizedHandler(endSession);
        return () => setUnauthorizedHandler(undefined);
    }, [endSession]);

    // Sign out on the client the moment the token expires, instead of waiting for a failed request.
    useEffect(() => {
        if (!session) return;
        const msLeft = Date.parse(session.expiresAtUtc) - Date.now();
        // setTimeout overflows (fires immediately) past ~24.8 days; tokens last at most a day.
        const timer = setTimeout(endSession, Math.max(msLeft, 0));
        return () => clearTimeout(timer);
    }, [session, endSession]);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            user: session?.user ?? null,
            roles: session?.roles ?? [],
            isAdmin: session?.roles?.includes(ADMIN_ROLE) ?? false,
            isStaff: session?.roles?.some(role => role === ADMIN_ROLE || role === LIBRARIAN_ROLE) ?? false,
            login: async (request: LoginRequest) => {
                // The response has the same shape as the saved session.
                const { data } = await api.post<AuthSession>('/auth/login', request);
                startSession(data);
            },
            register: async (request: RegisterRequest) => {
                const { data } = await api.post<AuthSession>('/auth/register', request);
                startSession(data);
            },
            // Only a deliberate sign-out is recorded; expiry and rejected tokens go through endSession directly.
            logout: () => {
                if (session) {
                    // Sent with the token explicitly because endSession clears the stored one first.
                    api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${session.accessToken}` } }).catch(() => {
                        // The audit entry is best effort; signing out must not depend on it.
                    });
                }
                endSession();
            },
        }),
        [session, startSession, endSession],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
