import axios from 'axios';
import { clearSession, getAccessToken } from './authStorage.ts';

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

api.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        // A 401 from the login/register calls just means bad credentials; only a rejected token ends the session.
        const isAuthCall = String(error.config?.url ?? '').startsWith('/auth/');
        if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthCall) {
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
