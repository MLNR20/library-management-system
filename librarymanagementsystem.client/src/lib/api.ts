import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, loadSession, saveSession } from './authStorage.ts';
import type { AuthSession } from './authStorage.ts';

// Defaults to the same-origin /api path, which the Vite dev server proxies to the ASP.NET backend.
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
    headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized: (() => void) | undefined;

/** Called when the server rejects the saved token (expired, tampered, user removed). */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
    onUnauthorized = handler;
}

let onSessionRefreshed: ((session: AuthSession) => void) | undefined;

/** Called with every session the refresh endpoint (or another tab) produced, so the UI state follows the stored one. */
export function setSessionRefreshedHandler(handler: ((session: AuthSession) => void) | undefined) {
    onSessionRefreshed = handler;
}

let refreshing: Promise<AuthSession | null> | null = null;

/**
 * Trades the refresh token for a new session. Resolves null when the server says the session is over (sign in again) and
 * throws when the server cannot be reached (stay signed in and try later). Concurrent callers share one request, because a
 * refresh token works only once.
 */
export function refreshSession(): Promise<AuthSession | null> {
    refreshing ??= doRefresh().finally(() => {
        refreshing = null;
    });
    return refreshing;
}

async function doRefresh(): Promise<AuthSession | null> {
    const current = loadSession();
    if (!current) return null;

    try {
        // A plain axios call: this must not run through the interceptors below, or a failed refresh would try to refresh.
        const { data } = await axios.post<AuthSession>(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: current.refreshToken });
        saveSession(data);
        onSessionRefreshed?.(data);
        return data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            // Another tab may have refreshed first and stored the newer token; use that one instead of giving up.
            const latest = loadSession();
            if (latest && latest.refreshToken !== current.refreshToken) {
                onSessionRefreshed?.(latest);
                return latest;
            }
            return null;
        }
        throw error;
    }
}

api.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    response => response,
    async error => {
        // A 401 from the login/register calls just means bad credentials; only a rejected token ends the session.
        const isAuthCall = String(error.config?.url ?? '').startsWith('/auth/');
        if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthCall) {
            // Most likely the access token expired: renew it once and replay the request.
            const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
            if (config && !config._retried && loadSession()) {
                config._retried = true;
                try {
                    const next = await refreshSession();
                    if (next) {
                        config.headers.Authorization = `Bearer ${next.accessToken}`;
                        return api(config);
                    }
                } catch {
                    // The server cannot be reached: report the original failure and keep the session.
                    return Promise.reject(error);
                }
            }
            clearSession();
            onUnauthorized?.();
        }
        return Promise.reject(error);
    },
);

/** Turns an axios/ProblemDetails/validation error into a message that is safe to show. */
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | string
            | { title?: string; detail?: string; errors?: Record<string, string[]> }
            | undefined;
        if (typeof data === 'string' && data) return data;
        if (data && typeof data === 'object') {
            const firstValidation = data.errors && Object.values(data.errors).flat()[0];
            if (firstValidation) return firstValidation;
            if (data.detail) return data.detail;
            if (data.title) return data.title;
        }
        if (!error.response) return 'Cannot reach the server. Is the backend running?';
        return `Request failed (${error.response.status})`;
    }
    return error instanceof Error ? error.message : 'Something went wrong';
}
