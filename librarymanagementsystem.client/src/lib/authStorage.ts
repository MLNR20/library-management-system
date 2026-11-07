// Mirrors the Dtos in LibraryManagementSystem.Server/Dtos/Auth.
export interface AuthUser {
    id: string;
    userName: string;
    email: string;
}

export interface AuthSession {
    /** Short-lived; sent with every request. */
    accessToken: string;
    /** When the access token stops working. After that the refresh token gets a new one. */
    expiresAtUtc: string;
    /** Long-lived and single-use: every refresh returns a new one. */
    refreshToken: string;
    user: AuthUser;
    roles: string[];
}

const STORAGE_KEY = 'lms.auth';

/** The saved session, or null when there is none or it is unreadable. Its access token may have expired: see refreshSession. */
export function loadSession(): AuthSession | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw) as AuthSession;
        // A session saved before refresh tokens existed has none; it cannot be renewed, so sign in again.
        if (!session.accessToken || !session.refreshToken) {
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
