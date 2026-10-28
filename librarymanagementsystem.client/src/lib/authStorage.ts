// Mirrors the Dtos in LibraryManagementSystem.Server/Dtos/Auth.
export interface AuthUser {
    id: string;
    userName: string;
    email: string;
}

export interface AuthSession {
    accessToken: string;
    expiresAtUtc: string;
    user: AuthUser;
    roles: string[];
}

const STORAGE_KEY = 'lms.auth';

function isExpired(session: AuthSession): boolean {
    return Date.parse(session.expiresAtUtc) <= Date.now();
}

/** The saved session, or null when there is none, it is unreadable, or the token has expired. */
export function loadSession(): AuthSession | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw) as AuthSession;
        if (!session.accessToken || isExpired(session)) {
            clearSession();
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export function saveSession(session: AuthSession): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        // Storage can be unavailable (private mode); the session then lasts until the page reloads.
    }
}

export function clearSession(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear.
    }
}

export function getAccessToken(): string | null {
    return loadSession()?.accessToken ?? null;
}
