import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_ROLE, LIBRARIAN_ROLE } from '../api/admin.ts';
import { api, refreshSession, setSessionRefreshedHandler, setUnauthorizedHandler } from '../lib/api.ts';
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

    // The state follows whatever session was stored last, whether this tab refreshed it or another one did.
    useEffect(() => {
        setSessionRefreshedHandler(setSession);
        const onStorage = () => {
            const stored = loadSession();
            if (stored) setSession(stored);
            else endSession();
        };
        window.addEventListener('storage', onStorage);
        return () => {
            setSessionRefreshedHandler(undefined);
            window.removeEventListener('storage', onStorage);
        };
    }, [endSession]);

    // Renew the access token a minute before it runs out, so requests rarely meet an expired one. The server ending
    // the session (revoked, signed out elsewhere) is the only thing that signs this tab out.
    useEffect(() => {
        if (!session) return;
        const msLeft = Date.parse(session.expiresAtUtc) - Date.now();
        const timer = setTimeout(() => {
            refreshSession()
                .then(next => {
                    if (!next) endSession();
                })
                .catch(() => {
                    // Offline: the next request tries again.
                });
        }, Math.max(msLeft - 60_000, 0));
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
                return data;
            },
            register: async (request: RegisterRequest) => {
                const { data } = await api.post<AuthSession>('/auth/register', request);
                startSession(data);
                return data;
            },
            // Only a deliberate sign-out is recorded; expiry and rejected tokens go through endSession directly.
            logout: () => {
                if (session) {
                    // The refresh token is the proof, so this works even when the access token has expired. Ending the
                    // session on the server is best effort; signing out here must not depend on it.
                    api.post('/auth/logout', { refreshToken: session.refreshToken }).catch(() => {});
                }
                endSession();
            },
        }),
        [session, startSession, endSession],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
